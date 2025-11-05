import { IStorage } from './storage.js';
import { sendCarpoolInsufficientBookingEmail } from './email.js';
import { format } from 'date-fns';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const NOTIFICATION_HOURS_BEFORE = 2; // Send notification 2 hours before departure
const MINIMUM_PASSENGERS = 3;

let notificationInterval: NodeJS.Timeout | null = null;

export function startCarpoolNotificationService(storage: IStorage) {
  console.log('[Carpool Notifications] Starting notification service...');
  console.log(`[Carpool Notifications] Check interval: ${CHECK_INTERVAL_MS / 60000} minutes`);
  console.log(`[Carpool Notifications] Notification window: ${NOTIFICATION_HOURS_BEFORE} hours before departure`);
  console.log(`[Carpool Notifications] Minimum passengers: ${MINIMUM_PASSENGERS}`);

  // Run immediately on startup
  checkAndNotifyInsufficientBookings(storage).catch(error => {
    console.error('[Carpool Notifications] Error in initial check:', error);
  });

  // Then run periodically
  notificationInterval = setInterval(async () => {
    try {
      await checkAndNotifyInsufficientBookings(storage);
    } catch (error) {
      console.error('[Carpool Notifications] Error in scheduled check:', error);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[Carpool Notifications] Service started successfully');
}

export function stopCarpoolNotificationService() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
    console.log('[Carpool Notifications] Service stopped');
  }
}

async function checkAndNotifyInsufficientBookings(storage: IStorage) {
  console.log('[Carpool Notifications] Running scheduled check...');

  try {
    // Calculate the time window for checking (2 hours from now, ±15 minutes for flexibility)
    const now = new Date();
    const notificationTime = new Date(now.getTime() + NOTIFICATION_HOURS_BEFORE * 60 * 60 * 1000);
    const windowStart = new Date(notificationTime.getTime() - 15 * 60 * 1000); // 15 min before
    const windowEnd = new Date(notificationTime.getTime() + 15 * 60 * 1000); // 15 min after

    console.log(`[Carpool Notifications] Checking trips between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Get all time slots in the notification window
    const allTimeSlots = await storage.getAllCarpoolTimeSlots();
    const upcomingTimeSlots = allTimeSlots.filter(slot => {
      const departureTime = new Date(slot.departureTime);
      return departureTime >= windowStart && departureTime <= windowEnd && slot.isActive;
    });

    console.log(`[Carpool Notifications] Found ${upcomingTimeSlots.length} time slots in notification window`);

    if (upcomingTimeSlots.length === 0) {
      return;
    }

    // Check each time slot for insufficient bookings
    for (const timeSlot of upcomingTimeSlots) {
      await checkTimeSlotBookings(storage, timeSlot);
    }

    console.log('[Carpool Notifications] Check completed successfully');
  } catch (error) {
    console.error('[Carpool Notifications] Error during check:', error);
    throw error;
  }
}

async function checkTimeSlotBookings(storage: IStorage, timeSlot: any) {
  try {
    // Get all bookings for this time slot
    const allBookings = await storage.getCarpoolBookings();
    
    // Active bookings are those that count toward the minimum (pending or confirmed)
    const activeBookings = allBookings.filter(
      booking => booking.timeSlotId === timeSlot.id && 
                 (booking.status === 'pending' || booking.status === 'confirmed')
    );

    console.log(`[Carpool Notifications] Time slot ${timeSlot.id}: ${activeBookings.length} active bookings (pending + confirmed)`);

    // If we have enough passengers, nothing to do
    if (activeBookings.length >= MINIMUM_PASSENGERS) {
      console.log(`[Carpool Notifications] Time slot ${timeSlot.id}: Sufficient bookings (${activeBookings.length}/${MINIMUM_PASSENGERS})`);
      return;
    }

    // Not enough passengers - need to cancel and notify
    console.log(`[Carpool Notifications] Time slot ${timeSlot.id}: Insufficient bookings (${activeBookings.length}/${MINIMUM_PASSENGERS}) - sending notifications`);

    // Get route details for email
    const route = await storage.getCarpoolRoute(timeSlot.routeId);
    if (!route) {
      console.error(`[Carpool Notifications] Route ${timeSlot.routeId} not found`);
      return;
    }

    const departureTimeFormatted = format(new Date(timeSlot.departureTime), 'PPpp');

    // Send notification to each affected customer and update booking status
    for (const booking of activeBookings) {
      try {
        // Only send email if customer provided email address
        if (booking.email) {
          await sendCarpoolInsufficientBookingEmail({
            customerName: booking.customerName,
            customerEmail: booking.email,
            routeName: route.name,
            fromLocation: route.fromLocation,
            toLocation: route.toLocation,
            departureTime: departureTimeFormatted,
            bookingReference: booking.referenceId,
          });
        } else {
          console.log(`[Carpool Notifications] Skipping email for booking ${booking.referenceId} - no email address`);
        }

        // Update booking status to insufficient_bookings
        await storage.updateCarpoolBookingStatus(booking.id, 'insufficient_bookings');

        console.log(`[Carpool Notifications] Processed booking ${booking.referenceId}`);
      } catch (error) {
        console.error(`[Carpool Notifications] Error processing booking ${booking.referenceId}:`, error);
        // Continue with other bookings even if one fails
      }
    }

    // Deactivate the time slot to prevent new bookings
    await storage.updateCarpoolTimeSlot(timeSlot.id, {
      isActive: false
    });

    console.log(`[Carpool Notifications] Time slot ${timeSlot.id} deactivated due to insufficient bookings`);
  } catch (error) {
    console.error(`[Carpool Notifications] Error checking time slot ${timeSlot.id}:`, error);
    throw error;
  }
}
