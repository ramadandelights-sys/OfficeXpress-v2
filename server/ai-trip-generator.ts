import OpenAI from 'openai';
import * as cron from 'node-cron';
import { storage } from './storage';
import type { IStorage } from './storage';
import { z } from 'zod';
import type { Subscription, CarpoolRoute, CarpoolTimeSlot, CarpoolPickupPoint, User, CarpoolBooking, InsertSubscriptionServiceDay } from '@shared/schema';
import { sendAITripPlannerReportEmail, sendDriverAssignmentNeededEmail, sendMissedServiceNotificationEmail } from './lib/resend';

const ADMIN_EMAIL = 'hesham@officexpress.org';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EnrichedSubscription extends Subscription {
  route: CarpoolRoute | undefined;
  timeSlot: CarpoolTimeSlot | undefined;
  boardingPoint: CarpoolPickupPoint | undefined;
  dropOffPoint: CarpoolPickupPoint | undefined;
  user: User | undefined;
}

interface EnrichedCarpoolBooking extends CarpoolBooking {
  route: CarpoolRoute | undefined;
  timeSlot: CarpoolTimeSlot | undefined;
  boardingPoint: CarpoolPickupPoint | undefined;
  dropOffPoint: CarpoolPickupPoint | undefined;
}

interface UnifiedBooking {
  id: string;
  routeId: string;
  timeSlotId: string;
  boardingPointId: string;
  dropOffPointId: string;
  userId: string | null;
  customerName: string;
  phone: string;
  bookingType: 'subscription' | 'individual';
  priority: number;
  route: CarpoolRoute | undefined;
  timeSlot: CarpoolTimeSlot | undefined;
  boardingPoint: CarpoolPickupPoint | undefined;
  dropOffPoint: CarpoolPickupPoint | undefined;
  subscriptionId?: string;
  carpoolBookingId?: string;
}

const VEHICLE_TYPES = {
  sedan: { label: 'Sedan', capacity: 4, minPassengers: 1 },
  '7_seater': { label: '7-Seater', capacity: 7, minPassengers: 5 },
  '10_seater': { label: '10-Seater', capacity: 10, minPassengers: 8 },
  '14_seater': { label: '14-Seater', capacity: 14, minPassengers: 11 },
  '32_seater': { label: '32-Seater', capacity: 32, minPassengers: 15 },
} as const;

const MIN_PASSENGERS_FOR_TRIP = 3;

const AITripGroupingSchema = z.object({
  trips: z.array(z.object({
    routeId: z.string(),
    timeSlotId: z.string(),
    passengerIds: z.array(z.string()),
    recommendedVehicleType: z.enum(['sedan', '7_seater', '10_seater', '14_seater', '32_seater']),
    pickupSequence: z.array(z.string()),
    rationale: z.string(),
    confidenceScore: z.number().min(0).max(1),
    isLowCapacity: z.boolean(),
  })),
  unassignedPassengers: z.array(z.object({
    bookingId: z.string(),
    reason: z.string(),
  })).optional(),
});

type AITripGrouping = z.infer<typeof AITripGroupingSchema>;

function generateTripReferenceId(): string {
  const prefix = 'TRP';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}${timestamp}${random}`;
}

export function startAITripGeneratorService(storage: IStorage) {
  const service = new AITripGeneratorService(storage);
  service.start();
  return service;
}

export class AITripGeneratorService {
  private storage: IStorage;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  start(cronSchedule: string = '0 20 * * *', enabled: boolean = true) {
    if (!enabled) {
      console.log('[AITripGenerator] Service is disabled by configuration');
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('[AITripGenerator] OpenAI API key not configured, service disabled');
      return;
    }

    this.stop();

    console.log(`[AITripGenerator] Starting service with schedule: ${cronSchedule}`);

    this.cronJob = cron.schedule(cronSchedule, async () => {
      console.log(`[AITripGenerator] Running scheduled trip generation at ${new Date().toISOString()}`);
      await this.generateTripsForNextDay();
    }, {
      scheduled: true,
      timezone: "Asia/Dhaka"
    });

    console.log('[AITripGenerator] Service started successfully');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[AITripGenerator] Service stopped');
    }
  }

  async generateTripsForNextDay(): Promise<{
    date: string;
    dayOfWeek: number;
    isBlackout: boolean;
    isWeekend: boolean;
    tripsGenerated: number;
    lowCapacityTrips: number;
    passengersAssigned: number;
    errors: string[];
    generatedBy: 'ai' | 'fallback';
  }> {
    if (this.isRunning) {
      console.log('[AITripGenerator] Already running, skipping duplicate execution');
      return {
        date: '',
        dayOfWeek: 0,
        isBlackout: false,
        isWeekend: false,
        tripsGenerated: 0,
        lowCapacityTrips: 0,
        passengersAssigned: 0,
        errors: ['Service already running'],
        generatedBy: 'fallback'
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let tripsGenerated = 0;
    let lowCapacityTrips = 0;
    let passengersAssigned = 0;
    let generatedBy: 'ai' | 'fallback' = 'ai';

    try {
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const tomorrow = new Date(bdTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tripDate = tomorrow.toISOString().split('T')[0];
      const dayOfWeek = tomorrow.getDay();

      console.log(`[AITripGenerator] Generating trips for ${tripDate} (Day: ${dayOfWeek})`);

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        console.log(`[AITripGenerator] Skipping weekend day`);
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: false,
          isWeekend: true,
          tripsGenerated: 0,
          lowCapacityTrips: 0,
          passengersAssigned: 0,
          errors: [],
          generatedBy
        };
      }

      const isBlackout = await this.storage.isBlackoutDate(tomorrow);
      if (isBlackout) {
        console.log(`[AITripGenerator] Skipping blackout date: ${tripDate}`);
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: true,
          isWeekend: false,
          tripsGenerated: 0,
          lowCapacityTrips: 0,
          passengersAssigned: 0,
          errors: [],
          generatedBy
        };
      }

      const activeSubscriptions = await this.storage.getActiveSubscriptionsByWeekday(dayOfWeek);
      console.log(`[AITripGenerator] Found ${activeSubscriptions.length} active subscriptions`);

      const individualBookings = await this.storage.getIndividualBookingsForDate(tripDate);
      console.log(`[AITripGenerator] Found ${individualBookings.length} individual bookings`);

      const totalBookings = activeSubscriptions.length + individualBookings.length;
      if (totalBookings === 0) {
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: false,
          isWeekend: false,
          tripsGenerated: 0,
          lowCapacityTrips: 0,
          passengersAssigned: 0,
          errors: [],
          generatedBy
        };
      }

      const subscriptionsWithDetails = await this.enrichSubscriptionData(activeSubscriptions);
      const individualWithDetails = await this.enrichIndividualBookingData(individualBookings);

      const unifiedBookings = this.createUnifiedBookings(subscriptionsWithDetails, individualWithDetails);
      console.log(`[AITripGenerator] Unified ${unifiedBookings.length} bookings (${subscriptionsWithDetails.length} subscriptions, ${individualWithDetails.length} individual)`);

      let tripGrouping: AITripGrouping;
      try {
        tripGrouping = await this.generateAITripGroupingUnified(unifiedBookings, tripDate);
        console.log(`[AITripGenerator] AI generated ${tripGrouping.trips.length} trips`);
      } catch (aiError: any) {
        console.error('[AITripGenerator] AI grouping failed, falling back to rule-based:', aiError.message);
        errors.push(`AI grouping failed: ${aiError.message}`);
        tripGrouping = this.generateFallbackTripGroupingUnified(unifiedBookings);
        generatedBy = 'fallback';
      }

      for (const tripData of tripGrouping.trips) {
        if (tripData.passengerIds.length < MIN_PASSENGERS_FOR_TRIP) {
          console.log(`[AITripGenerator] Skipping trip - only ${tripData.passengerIds.length} passengers (minimum ${MIN_PASSENGERS_FOR_TRIP} required)`);
          lowCapacityTrips++;
          
          const affectedSubscriptionBookings = tripData.passengerIds
            .map(id => unifiedBookings.find(b => b.id === id))
            .filter((b): b is UnifiedBooking => b !== undefined && b.bookingType === 'subscription');
          
          if (affectedSubscriptionBookings.length > 0) {
            const routeName = affectedSubscriptionBookings[0]?.route?.name || 'Unknown Route';
            
            for (const booking of affectedSubscriptionBookings) {
              if (booking.subscriptionId) {
                try {
                  await this.createServiceDayRecord(
                    booking.subscriptionId,
                    tripDate,
                    'trip_not_generated'
                  );
                } catch (err) {
                  console.error(`[AITripGenerator] Failed to create service day record for subscription ${booking.subscriptionId}:`, err);
                }
              }
            }
            
            await this.notifyMissedServiceSubscribers(affectedSubscriptionBookings, tripDate, routeName);
          }
          
          continue;
        }
        
        try {
          const tripReferenceId = generateTripReferenceId();
          const vehicleConfig = VEHICLE_TYPES[tripData.recommendedVehicleType as keyof typeof VEHICLE_TYPES];
          const status = 'pending_assignment';

          const vehicleTrip = await this.storage.createAIGeneratedTrip({
            tripReferenceId,
            routeId: tripData.routeId,
            timeSlotId: tripData.timeSlotId,
            tripDate,
            vehicleCapacity: vehicleConfig.capacity,
            recommendedVehicleType: tripData.recommendedVehicleType,
            status,
            generatedBy,
            aiConfidenceScore: tripData.confidenceScore.toString(),
            aiRationale: tripData.rationale,
          });

          tripsGenerated++;

          for (let i = 0; i < tripData.passengerIds.length; i++) {
            const bookingId = tripData.passengerIds[i];
            const booking = unifiedBookings.find(b => b.id === bookingId);
            if (booking) {
              if (booking.bookingType === 'subscription' && booking.subscriptionId) {
                await this.storage.createTripBookingFromSubscription({
                  vehicleTripId: vehicleTrip.id,
                  subscriptionId: booking.subscriptionId,
                  userId: booking.userId || '',
                  boardingPointId: booking.boardingPointId,
                  dropOffPointId: booking.dropOffPointId,
                  pickupSequence: tripData.pickupSequence.indexOf(bookingId) + 1,
                });
                
                try {
                  await this.createServiceDayRecord(
                    booking.subscriptionId,
                    tripDate,
                    'trip_generated',
                    vehicleTrip.id
                  );
                } catch (err) {
                  console.error(`[AITripGenerator] Failed to create service day record for subscription ${booking.subscriptionId}:`, err);
                }
              } else if (booking.bookingType === 'individual' && booking.carpoolBookingId) {
                await this.storage.createTripBookingFromIndividual({
                  vehicleTripId: vehicleTrip.id,
                  carpoolBookingId: booking.carpoolBookingId,
                  userId: booking.userId,
                  boardingPointId: booking.boardingPointId,
                  dropOffPointId: booking.dropOffPointId,
                  pickupSequence: tripData.pickupSequence.indexOf(bookingId) + 1,
                });
              }
              passengersAssigned++;
            }
          }

          console.log(`[AITripGenerator] Created trip ${tripReferenceId} with ${tripData.passengerIds.length} passengers`);
        } catch (tripError: any) {
          errors.push(`Error creating trip: ${tripError.message}`);
          console.error('[AITripGenerator] Error creating trip:', tripError);
        }
      }

      // Handle unassigned passengers from AI grouping
      if (tripGrouping.unassignedPassengers && tripGrouping.unassignedPassengers.length > 0) {
        console.log(`[AITripGenerator] Processing ${tripGrouping.unassignedPassengers.length} unassigned passengers`);
        
        const unassignedSubscriptionBookings: UnifiedBooking[] = [];
        
        for (const unassigned of tripGrouping.unassignedPassengers) {
          const booking = unifiedBookings.find(b => b.id === unassigned.bookingId);
          if (!booking) {
            console.log(`[AITripGenerator] Could not find booking for unassigned passenger: ${unassigned.bookingId}`);
            continue;
          }
          
          if (booking.bookingType === 'subscription' && booking.subscriptionId) {
            try {
              await this.createServiceDayRecord(
                booking.subscriptionId,
                tripDate,
                'trip_not_generated'
              );
              unassignedSubscriptionBookings.push(booking);
              console.log(`[AITripGenerator] Created trip_not_generated record for unassigned subscription ${booking.subscriptionId}: ${unassigned.reason}`);
            } catch (err) {
              console.error(`[AITripGenerator] Failed to create service day record for unassigned subscription ${booking.subscriptionId}:`, err);
            }
          }
        }
        
        // Notify all unassigned subscription holders
        if (unassignedSubscriptionBookings.length > 0) {
          // Group by route for notifications
          const routeGroups = new Map<string, UnifiedBooking[]>();
          for (const booking of unassignedSubscriptionBookings) {
            const routeName = booking.route?.name || 'Unknown Route';
            if (!routeGroups.has(routeName)) {
              routeGroups.set(routeName, []);
            }
            routeGroups.get(routeName)!.push(booking);
          }
          
          for (const [routeName, bookings] of routeGroups) {
            await this.notifyMissedServiceSubscribers(bookings, tripDate, routeName);
          }
          
          console.log(`[AITripGenerator] Notified ${unassignedSubscriptionBookings.length} unassigned subscribers`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AITripGenerator] Completed in ${duration}ms. Trips: ${tripsGenerated}, Low capacity: ${lowCapacityTrips}, Passengers: ${passengersAssigned}`);

      // Send email report to admin
      await this.sendExecutionReportEmail({
        tripDate,
        bookingsReceived: totalBookings,
        tripsCreated: tripsGenerated,
        passengersAssigned,
        lowCapacityTrips,
        generatedBy,
        errors,
        isWeekend: false,
        isBlackout: false,
        subscriptionCount: activeSubscriptions.length,
        individualCount: individualBookings.length,
      });

      // Send driver assignment needed notifications if trips were created
      if (tripsGenerated > 0) {
        await this.notifyAdminsForDriverAssignmentUnified(tripDate, tripGrouping.trips, unifiedBookings);
      }

      return {
        date: tripDate,
        dayOfWeek,
        isBlackout: false,
        isWeekend: false,
        tripsGenerated,
        lowCapacityTrips,
        passengersAssigned,
        errors,
        generatedBy
      };
    } catch (error: any) {
      console.error('[AITripGenerator] Fatal error:', error);
      errors.push(`Fatal error: ${error.message}`);
      
      // Still send error report to admin
      await this.sendExecutionReportEmail({
        tripDate: new Date().toISOString().split('T')[0],
        bookingsReceived: 0,
        tripsCreated: tripsGenerated,
        passengersAssigned,
        lowCapacityTrips,
        generatedBy: 'fallback',
        errors,
        isWeekend: false,
        isBlackout: false,
      });
      
      return {
        date: '',
        dayOfWeek: 0,
        isBlackout: false,
        isWeekend: false,
        tripsGenerated,
        lowCapacityTrips,
        passengersAssigned,
        errors,
        generatedBy: 'fallback'
      };
    } finally {
      this.isRunning = false;
    }
  }

  // Send execution report email to admin
  private async sendExecutionReportEmail(data: {
    tripDate: string;
    bookingsReceived: number;
    tripsCreated: number;
    passengersAssigned: number;
    lowCapacityTrips: number;
    generatedBy: 'ai' | 'fallback';
    errors: string[];
    isWeekend: boolean;
    isBlackout: boolean;
    subscriptionCount?: number;
    individualCount?: number;
  }) {
    try {
      await sendAITripPlannerReportEmail({
        adminEmail: ADMIN_EMAIL,
        timestamp: new Date(),
        tripDate: data.tripDate,
        bookingsReceived: data.bookingsReceived,
        tripsCreated: data.tripsCreated,
        passengersAssigned: data.passengersAssigned,
        lowCapacityTrips: data.lowCapacityTrips,
        generatedBy: data.generatedBy,
        errors: data.errors,
        isWeekend: data.isWeekend,
        isBlackout: data.isBlackout,
        subscriptionCount: data.subscriptionCount,
        individualCount: data.individualCount,
      });
      console.log('[AITripGenerator] Execution report email sent successfully');
    } catch (emailError) {
      console.error('[AITripGenerator] Failed to send execution report email:', emailError);
    }
  }

  // Notify admins/employees with driver assignment permission
  private async notifyAdminsForDriverAssignment(
    tripDate: string,
    trips: AITripGrouping['trips'],
    subscriptionsWithDetails: EnrichedSubscription[]
  ) {
    try {
      // Get users with driver assignment permission
      const usersWithPermission = await this.storage.getUsersWithDriverAssignmentPermission();
      
      if (usersWithPermission.length === 0) {
        console.log('[AITripGenerator] No users found with driver assignment permission');
        return;
      }
      
      for (const tripData of trips) {
        const firstSub = subscriptionsWithDetails.find(s => s.id === tripData.passengerIds[0]);
        const routeName = firstSub?.route?.name || 'Unknown Route';
        const departureTime = firstSub?.timeSlot?.departureTime || 'Unknown Time';
        
        // Generate a reference for notification
        const tripRef = `TRP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        
        // Create in-app notifications and send emails to each user with permission
        for (const user of usersWithPermission) {
          // Create in-app notification
          await this.storage.createNotification({
            userId: user.id,
            type: 'driver_assignment_needed',
            title: 'Driver Assignment Required',
            message: `A new carpool trip needs driver assignment: ${routeName} on ${tripDate} at ${departureTime} (${tripData.passengerIds.length} passengers)`,
            metadata: {
              tripDate,
              routeId: tripData.routeId,
              timeSlotId: tripData.timeSlotId,
              passengerCount: tripData.passengerIds.length,
              recommendedVehicle: tripData.recommendedVehicleType,
            } as Record<string, any>,
          });
          
          // Send email if user has email
          if (user.email) {
            await sendDriverAssignmentNeededEmail({
              email: user.email,
              recipientName: user.name,
              tripReferenceId: tripRef,
              tripDate,
              routeName,
              departureTime,
              passengerCount: tripData.passengerIds.length,
              recommendedVehicle: VEHICLE_TYPES[tripData.recommendedVehicleType as keyof typeof VEHICLE_TYPES]?.label || tripData.recommendedVehicleType,
              tripType: 'carpool',
            });
          }
        }
      }
      
      console.log(`[AITripGenerator] Sent driver assignment notifications to ${usersWithPermission.length} users for ${trips.length} trips`);
    } catch (notifyError) {
      console.error('[AITripGenerator] Failed to send driver assignment notifications:', notifyError);
    }
  }

  private async enrichSubscriptionData(subscriptions: Subscription[]): Promise<EnrichedSubscription[]> {
    const enrichedData: EnrichedSubscription[] = [];
    for (const sub of subscriptions) {
      const route = await this.storage.getCarpoolRouteById(sub.routeId);
      const timeSlot = await this.storage.getCarpoolTimeSlotById(sub.timeSlotId);
      const boardingPoint = await this.storage.getCarpoolPickupPointById(sub.boardingPointId);
      const dropOffPoint = await this.storage.getCarpoolPickupPointById(sub.dropOffPointId);
      const user = await this.storage.getUserById(sub.userId);

      enrichedData.push({
        ...sub,
        route,
        timeSlot,
        boardingPoint,
        dropOffPoint,
        user,
      });
    }
    return enrichedData;
  }

  private async enrichIndividualBookingData(bookings: CarpoolBooking[]): Promise<EnrichedCarpoolBooking[]> {
    const enrichedData: EnrichedCarpoolBooking[] = [];
    for (const booking of bookings) {
      const route = await this.storage.getCarpoolRouteById(booking.routeId);
      const timeSlot = await this.storage.getCarpoolTimeSlotById(booking.timeSlotId);
      const boardingPoint = await this.storage.getCarpoolPickupPointById(booking.boardingPointId);
      const dropOffPoint = await this.storage.getCarpoolPickupPointById(booking.dropOffPointId);

      enrichedData.push({
        ...booking,
        route,
        timeSlot,
        boardingPoint,
        dropOffPoint,
      });
    }
    return enrichedData;
  }

  private createUnifiedBookings(
    subscriptions: EnrichedSubscription[],
    individualBookings: EnrichedCarpoolBooking[]
  ): UnifiedBooking[] {
    const unifiedBookings: UnifiedBooking[] = [];

    for (const sub of subscriptions) {
      unifiedBookings.push({
        id: `sub_${sub.id}`,
        routeId: sub.routeId,
        timeSlotId: sub.timeSlotId,
        boardingPointId: sub.boardingPointId,
        dropOffPointId: sub.dropOffPointId,
        userId: sub.userId,
        customerName: sub.user?.name || 'Unknown',
        phone: sub.user?.phone || '',
        bookingType: 'subscription',
        priority: 1,
        route: sub.route,
        timeSlot: sub.timeSlot,
        boardingPoint: sub.boardingPoint,
        dropOffPoint: sub.dropOffPoint,
        subscriptionId: sub.id,
      });
    }

    for (const booking of individualBookings) {
      unifiedBookings.push({
        id: `ind_${booking.id}`,
        routeId: booking.routeId,
        timeSlotId: booking.timeSlotId,
        boardingPointId: booking.boardingPointId,
        dropOffPointId: booking.dropOffPointId,
        userId: booking.userId || null,
        customerName: booking.customerName,
        phone: booking.phone,
        bookingType: 'individual',
        priority: 2,
        route: booking.route,
        timeSlot: booking.timeSlot,
        boardingPoint: booking.boardingPoint,
        dropOffPoint: booking.dropOffPoint,
        carpoolBookingId: booking.id,
      });
    }

    return unifiedBookings;
  }

  private async notifyAdminsForDriverAssignmentUnified(
    tripDate: string,
    trips: AITripGrouping['trips'],
    unifiedBookings: UnifiedBooking[]
  ) {
    try {
      const usersWithPermission = await this.storage.getUsersWithDriverAssignmentPermission();
      
      for (const tripData of trips) {
        const firstBooking = unifiedBookings.find(b => b.id === tripData.passengerIds[0]);
        const routeName = firstBooking?.route?.name || 'Unknown Route';
        const departureTime = firstBooking?.timeSlot?.departureTime || 'Unknown Time';
        const tripRef = generateTripReferenceId();
        
        for (const user of usersWithPermission) {
          await this.storage.createNotification({
            userId: user.id,
            type: 'driver_assignment_needed',
            title: 'Driver Assignment Required',
            message: `A new carpool trip needs driver assignment: ${routeName} on ${tripDate} at ${departureTime} (${tripData.passengerIds.length} passengers)`,
            metadata: {
              tripDate,
              routeId: tripData.routeId,
              timeSlotId: tripData.timeSlotId,
              passengerCount: tripData.passengerIds.length,
              recommendedVehicle: tripData.recommendedVehicleType,
            } as Record<string, any>,
          });
          
          if (user.email) {
            await sendDriverAssignmentNeededEmail({
              email: user.email,
              recipientName: user.name,
              tripReferenceId: tripRef,
              tripDate,
              routeName,
              departureTime,
              passengerCount: tripData.passengerIds.length,
              recommendedVehicle: VEHICLE_TYPES[tripData.recommendedVehicleType as keyof typeof VEHICLE_TYPES]?.label || tripData.recommendedVehicleType,
              tripType: 'carpool',
            });
          }
        }
      }
      
      console.log(`[AITripGenerator] Sent driver assignment notifications to ${usersWithPermission.length} users for ${trips.length} trips`);
    } catch (notifyError) {
      console.error('[AITripGenerator] Failed to send driver assignment notifications:', notifyError);
    }
  }

  private async createServiceDayRecord(
    subscriptionId: string,
    serviceDate: string,
    status: 'scheduled' | 'trip_generated' | 'trip_not_generated',
    vehicleTripId?: string
  ): Promise<void> {
    await this.storage.createSubscriptionServiceDay({
      subscriptionId,
      serviceDate: new Date(serviceDate),
      status,
      vehicleTripId: vehicleTripId || null,
    });
    console.log(`[AITripGenerator] Created service day record: subscription=${subscriptionId}, date=${serviceDate}, status=${status}`);
  }

  private async notifyMissedServiceSubscribers(
    affectedBookings: UnifiedBooking[],
    tripDate: string,
    routeName: string
  ): Promise<void> {
    try {
      for (const booking of affectedBookings) {
        if (!booking.userId) continue;
        
        const user = await this.storage.getUserById(booking.userId);
        if (!user) continue;
        
        await this.storage.createNotification({
          userId: booking.userId,
          type: 'trip_not_generated',
          title: 'Trip Could Not Be Arranged',
          message: `Your trip on ${tripDate} for the ${routeName} route couldn't be arranged due to insufficient bookings. A refund will be credited to your wallet.`,
          metadata: {
            tripDate,
            routeName,
            subscriptionId: booking.subscriptionId,
          } as Record<string, any>,
        });
        
        if (user.email) {
          await sendMissedServiceNotificationEmail({
            email: user.email,
            customerName: user.name,
            tripDate,
            routeName,
          });
        }
      }
      
      console.log(`[AITripGenerator] Sent missed service notifications to ${affectedBookings.length} subscribers`);
    } catch (notifyError) {
      console.error('[AITripGenerator] Failed to send missed service notifications:', notifyError);
    }
  }

  private async generateAITripGroupingUnified(bookings: UnifiedBooking[], tripDate: string): Promise<AITripGrouping> {
    const bookingSummary = bookings.map((b: UnifiedBooking) => ({
      id: b.id,
      routeId: b.routeId,
      routeName: b.route?.name || 'Unknown',
      timeSlotId: b.timeSlotId,
      officeEntryTime: b.timeSlot?.departureTime || 'Unknown',
      boardingPointId: b.boardingPointId,
      boardingPointName: b.boardingPoint?.name || 'Unknown',
      boardingPointSequence: b.boardingPoint?.sequenceOrder || 0,
      dropOffPointId: b.dropOffPointId,
      dropOffPointName: b.dropOffPoint?.name || 'Unknown',
      dropOffPointSequence: b.dropOffPoint?.sequenceOrder || 0,
      passengerName: b.customerName,
      bookingType: b.bookingType,
      priority: b.priority,
    }));

    const routeGroups = new Map<string, typeof bookingSummary>();
    for (const booking of bookingSummary) {
      const key = `${booking.routeId}-${booking.timeSlotId}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, []);
      }
      routeGroups.get(key)!.push(booking);
    }

    const prompt = `You are a carpool trip optimizer for an office transportation service. Analyze the following passenger bookings and group them into optimal trips.

DATE: ${tripDate}

BOOKINGS BY ROUTE AND TIME SLOT:
${Array.from(routeGroups.entries()).map(([key, subs]) => {
  const first = subs[0];
  const monthlyCount = subs.filter(s => s.bookingType === 'subscription').length;
  const individualCount = subs.filter(s => s.bookingType === 'individual').length;
  return `
Route: ${first.routeName} (ID: ${first.routeId})
Office Entry Time: ${first.officeEntryTime} (Time Slot ID: ${first.timeSlotId})
Monthly Subscribers: ${monthlyCount}, Individual Bookings: ${individualCount}
Passengers (${subs.length}):
${subs.map(s => `  - ID: ${s.id}, Name: ${s.passengerName}, Type: ${s.bookingType.toUpperCase()} (Priority: ${s.priority}), Pickup: ${s.boardingPointName} (seq: ${s.boardingPointSequence}), Drop: ${s.dropOffPointName} (seq: ${s.dropOffPointSequence})`).join('\n')}
`;
}).join('\n---\n')}

VEHICLE OPTIONS:
- sedan: 4 passengers max
- 7_seater: 7 passengers max  
- 10_seater: 10 passengers max
- 14_seater: 14 passengers max
- 32_seater: 32 passengers max

PRIORITY RULES:
1. MONTHLY SUBSCRIBERS (bookingType: subscription, priority: 1) MUST be assigned first - they have prepaid and guaranteed service
2. INDIVIDUAL BOOKINGS (bookingType: individual, priority: 2) fill remaining capacity only after subscribers are assigned
3. If a trip has limited capacity, ALWAYS prefer subscribers over individuals

GROUPING RULES:
1. Group passengers by same route AND same time slot
2. Order pickup sequence by boarding point sequence number (lower = earlier pickup)
3. Recommend smallest vehicle that fits all passengers
4. SKIP trips with fewer than 3 passengers - set "isLowCapacity: false" for trips you create
5. Each passenger should be assigned to exactly one trip
6. Provide confidence score (0-1) based on optimization quality
7. Provide brief rationale for each trip grouping

Respond with valid JSON in this exact format:
{
  "trips": [
    {
      "routeId": "route-uuid",
      "timeSlotId": "timeslot-uuid", 
      "passengerIds": ["sub_subscription-id-1", "ind_booking-id-2"],
      "recommendedVehicleType": "sedan",
      "pickupSequence": ["sub_subscription-id-1", "ind_booking-id-2"],
      "rationale": "Brief explanation including subscriber priority",
      "confidenceScore": 0.95,
      "isLowCapacity": false
    }
  ],
  "unassignedPassengers": []
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a trip optimization expert. Always respond with valid JSON matching the requested schema. Prioritize monthly subscribers over individual bookings.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsed = JSON.parse(content);
    const validated = AITripGroupingSchema.parse(parsed);

    const corrected = this.enforceSubscriberPriority(validated, bookings);
    return corrected;
  }

  private enforceSubscriberPriority(grouping: AITripGrouping, bookings: UnifiedBooking[]): AITripGrouping {
    const allSubscriptions = bookings.filter(b => b.bookingType === 'subscription');
    const allIndividuals = bookings.filter(b => b.bookingType === 'individual');
    
    const assignedSubscriberIds = new Set<string>();
    const assignedIndividualIds = new Set<string>();
    
    for (const trip of grouping.trips) {
      trip.passengerIds.forEach(id => {
        if (id.startsWith('sub_')) assignedSubscriberIds.add(id);
        else if (id.startsWith('ind_')) assignedIndividualIds.add(id);
      });
    }
    
    const unassignedSubscribers = allSubscriptions.filter(s => !assignedSubscriberIds.has(s.id));
    
    const subscribersByRouteTime: Record<string, UnifiedBooking[]> = {};
    unassignedSubscribers.forEach(s => {
      const key = `${s.routeId}-${s.timeSlotId}`;
      if (!subscribersByRouteTime[key]) subscribersByRouteTime[key] = [];
      subscribersByRouteTime[key].push(s);
    });

    const correctedTrips: AITripGrouping['trips'] = [];
    const unassignedPassengers: { bookingId: string; reason: string; }[] = [];

    for (const trip of grouping.trips) {
      const routeTimeKey = `${trip.routeId}-${trip.timeSlotId}`;
      const missingSubscribers = subscribersByRouteTime[routeTimeKey] || [];
      
      const tripBookings = trip.passengerIds
        .map(id => bookings.find(b => b.id === id))
        .filter((b): b is UnifiedBooking => b !== undefined);

      let subscriptionsInTrip = tripBookings.filter(b => b.bookingType === 'subscription');
      let individualsInTrip = tripBookings.filter(b => b.bookingType === 'individual');
      
      subscriptionsInTrip = [...subscriptionsInTrip, ...missingSubscribers];
      delete subscribersByRouteTime[routeTimeKey];
      
      const subscriberCount = subscriptionsInTrip.length;
      let vehicleCapacity = VEHICLE_TYPES[trip.recommendedVehicleType as keyof typeof VEHICLE_TYPES]?.capacity || 4;
      let vehicleType = trip.recommendedVehicleType;
      
      if (subscriberCount > vehicleCapacity) {
        if (subscriberCount > 14) { vehicleType = '32_seater'; vehicleCapacity = 32; }
        else if (subscriberCount > 10) { vehicleType = '14_seater'; vehicleCapacity = 14; }
        else if (subscriberCount > 7) { vehicleType = '10_seater'; vehicleCapacity = 10; }
        else if (subscriberCount > 4) { vehicleType = '7_seater'; vehicleCapacity = 7; }
      }

      const sortedSubscriptions = subscriptionsInTrip.sort((a, b) => 
        (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0)
      );
      const sortedIndividuals = individualsInTrip.sort((a, b) => 
        (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0)
      );

      const finalPassengers: UnifiedBooking[] = [...sortedSubscriptions];
      const remainingSlots = vehicleCapacity - subscriberCount;
      
      const acceptedIndividuals = sortedIndividuals.slice(0, Math.max(0, remainingSlots));
      const rejectedIndividuals = sortedIndividuals.slice(Math.max(0, remainingSlots));
      
      finalPassengers.push(...acceptedIndividuals);
      rejectedIndividuals.forEach(i => unassignedPassengers.push({
        bookingId: i.id,
        reason: 'Capacity full after prioritizing monthly subscribers'
      }));

      const sortedFinal = finalPassengers.sort((a, b) => 
        (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0)
      );

      correctedTrips.push({
        routeId: trip.routeId,
        timeSlotId: trip.timeSlotId,
        passengerIds: sortedFinal.map(b => b.id),
        recommendedVehicleType: vehicleType as any,
        pickupSequence: sortedFinal.map(b => b.id),
        rationale: `[Priority enforced: ${sortedSubscriptions.length} subscribers guaranteed, ${acceptedIndividuals.length} individuals added]`,
        confidenceScore: trip.confidenceScore,
        isLowCapacity: trip.isLowCapacity,
      });
    }

    Object.values(subscribersByRouteTime).flat().forEach(s => {
      console.error(`[AITripGenerator] CRITICAL: Subscriber ${s.id} has no matching trip - this should not happen`);
      unassignedPassengers.push({ bookingId: s.id, reason: 'No trip found for route/time' });
    });

    return { trips: correctedTrips, unassignedPassengers };
  }

  private generateFallbackTripGroupingUnified(bookings: UnifiedBooking[]): AITripGrouping {
    const routeGroups: Record<string, UnifiedBooking[]> = {};
    for (const booking of bookings) {
      const key = `${booking.routeId}-${booking.timeSlotId}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      routeGroups[key].push(booking);
    }

    const trips: AITripGrouping['trips'] = [];
    const unassignedPassengers: { bookingId: string; reason: string; }[] = [];

    for (const key of Object.keys(routeGroups)) {
      const groupBookings = routeGroups[key];
      
      const subscriptions = groupBookings
        .filter(b => b.bookingType === 'subscription')
        .sort((a, b) => (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0));
      
      const individuals = groupBookings
        .filter(b => b.bookingType === 'individual')
        .sort((a, b) => (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0));

      const subscriberCount = subscriptions.length;
      
      if (subscriberCount < MIN_PASSENGERS_FOR_TRIP && (subscriberCount + individuals.length) < MIN_PASSENGERS_FOR_TRIP) {
        console.log(`[AITripGenerator] Skipping route ${groupBookings[0].routeId} - only ${subscriberCount + individuals.length} total passengers (minimum ${MIN_PASSENGERS_FOR_TRIP} required)`);
        subscriptions.forEach(s => unassignedPassengers.push({ bookingId: s.id, reason: 'Insufficient passengers for trip' }));
        individuals.forEach(i => unassignedPassengers.push({ bookingId: i.id, reason: 'Insufficient passengers for trip' }));
        continue;
      }
      
      let vehicleType: 'sedan' | '7_seater' | '10_seater' | '14_seater' | '32_seater' = 'sedan';
      let vehicleCapacity = 4;
      
      if (subscriberCount > 14) { vehicleType = '32_seater'; vehicleCapacity = 32; }
      else if (subscriberCount > 10) { vehicleType = '14_seater'; vehicleCapacity = 14; }
      else if (subscriberCount > 7) { vehicleType = '10_seater'; vehicleCapacity = 10; }
      else if (subscriberCount > 4) { vehicleType = '7_seater'; vehicleCapacity = 7; }

      const assignedPassengers: UnifiedBooking[] = [...subscriptions];
      
      const remainingCapacity = vehicleCapacity - subscriberCount;
      const individualSlotsAvailable = Math.max(0, remainingCapacity);
      const assignedIndividuals = individuals.slice(0, individualSlotsAvailable);
      const unassignedIndividuals = individuals.slice(individualSlotsAvailable);
      
      assignedPassengers.push(...assignedIndividuals);
      unassignedIndividuals.forEach(i => unassignedPassengers.push({ 
        bookingId: i.id, 
        reason: 'No remaining capacity after prioritizing subscribers' 
      }));

      if (assignedPassengers.length < MIN_PASSENGERS_FOR_TRIP) {
        console.log(`[AITripGenerator] Skipping route ${groupBookings[0].routeId} - only ${assignedPassengers.length} assignable passengers`);
        assignedPassengers.forEach(p => unassignedPassengers.push({ bookingId: p.id, reason: 'Trip below minimum passenger threshold' }));
        continue;
      }

      const sortedAssigned = assignedPassengers.sort((a, b) => 
        (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0)
      );

      const finalSubscriberCount = sortedAssigned.filter(b => b.bookingType === 'subscription').length;
      const finalIndividualCount = sortedAssigned.filter(b => b.bookingType === 'individual').length;

      trips.push({
        routeId: groupBookings[0].routeId,
        timeSlotId: groupBookings[0].timeSlotId,
        passengerIds: sortedAssigned.map(b => b.id),
        recommendedVehicleType: vehicleType,
        pickupSequence: sortedAssigned.map(b => b.id),
        rationale: `Grouped ${sortedAssigned.length} passengers (${finalSubscriberCount} subscribers GUARANTEED, ${finalIndividualCount} individual). Vehicle sized for subscribers first.`,
        confidenceScore: 0.9,
        isLowCapacity: false,
      });
    }

    return { trips, unassignedPassengers };
  }

  private async generateAITripGrouping(subscriptions: EnrichedSubscription[], tripDate: string): Promise<AITripGrouping> {
    const subscriptionSummary = subscriptions.map((s: EnrichedSubscription) => ({
      id: s.id,
      routeId: s.routeId,
      routeName: s.route?.name || 'Unknown',
      timeSlotId: s.timeSlotId,
      officeEntryTime: s.timeSlot?.departureTime || 'Unknown',
      boardingPointId: s.boardingPointId,
      boardingPointName: s.boardingPoint?.name || 'Unknown',
      boardingPointSequence: s.boardingPoint?.sequenceOrder || 0,
      dropOffPointId: s.dropOffPointId,
      dropOffPointName: s.dropOffPoint?.name || 'Unknown',
      dropOffPointSequence: s.dropOffPoint?.sequenceOrder || 0,
      passengerName: s.user?.name || 'Unknown',
    }));

    const routeGroups = new Map<string, typeof subscriptionSummary>();
    for (const sub of subscriptionSummary) {
      const key = `${sub.routeId}-${sub.timeSlotId}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, []);
      }
      routeGroups.get(key)!.push(sub);
    }

    const prompt = `You are a carpool trip optimizer for an office transportation service. Analyze the following passenger bookings and group them into optimal trips.

DATE: ${tripDate}

BOOKINGS BY ROUTE AND TIME SLOT:
${Array.from(routeGroups.entries()).map(([key, subs]) => {
  const first = subs[0];
  return `
Route: ${first.routeName} (ID: ${first.routeId})
Office Entry Time: ${first.officeEntryTime} (Time Slot ID: ${first.timeSlotId})
Passengers (${subs.length}):
${subs.map(s => `  - ID: ${s.id}, Name: ${s.passengerName}, Pickup: ${s.boardingPointName} (seq: ${s.boardingPointSequence}), Drop: ${s.dropOffPointName} (seq: ${s.dropOffPointSequence})`).join('\n')}
`;
}).join('\n---\n')}

VEHICLE OPTIONS:
- sedan: 4 passengers max
- 7_seater: 7 passengers max  
- 10_seater: 10 passengers max
- 14_seater: 14 passengers max
- 32_seater: 32 passengers max

RULES:
1. Group passengers by same route AND same time slot (office entry time)
2. Order pickup sequence by boarding point sequence number (lower = earlier pickup)
3. Recommend smallest vehicle that fits all passengers in the group
4. SKIP (do not create) trips with fewer than 3 passengers - set "isLowCapacity: false" for all trips you create
5. Each passenger should be assigned to exactly one trip (passengers on low-capacity routes go to unassignedPassengers)
6. Provide confidence score (0-1) based on optimization quality
7. Provide brief rationale for each trip grouping

Respond with valid JSON in this exact format:
{
  "trips": [
    {
      "routeId": "route-uuid",
      "timeSlotId": "timeslot-uuid", 
      "passengerIds": ["subscription-id-1", "subscription-id-2"],
      "recommendedVehicleType": "sedan",
      "pickupSequence": ["subscription-id-1", "subscription-id-2"],
      "rationale": "Brief explanation of grouping",
      "confidenceScore": 0.95,
      "isLowCapacity": false
    }
  ],
  "unassignedPassengers": []
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a trip optimization expert. Always respond with valid JSON matching the requested schema.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsed = JSON.parse(content);
    const validated = AITripGroupingSchema.parse(parsed);

    return validated;
  }

  private generateFallbackTripGrouping(subscriptions: EnrichedSubscription[]): AITripGrouping {
    const routeGroups: Record<string, EnrichedSubscription[]> = {};
    for (const sub of subscriptions) {
      const key = `${sub.routeId}-${sub.timeSlotId}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      routeGroups[key].push(sub);
    }

    const trips: AITripGrouping['trips'] = [];

    for (const key of Object.keys(routeGroups)) {
      const subs = routeGroups[key];
      const sorted = subs.sort((a: EnrichedSubscription, b: EnrichedSubscription) => 
        (a.boardingPoint?.sequenceOrder || 0) - (b.boardingPoint?.sequenceOrder || 0)
      );

      const passengerCount = sorted.length;
      
      // Skip routes with fewer than minimum passengers - don't create trips for them
      if (passengerCount < MIN_PASSENGERS_FOR_TRIP) {
        console.log(`[AITripGenerator] Skipping route ${sorted[0].routeId} - only ${passengerCount} passengers (minimum ${MIN_PASSENGERS_FOR_TRIP} required)`);
        continue;
      }
      
      let vehicleType: 'sedan' | '7_seater' | '10_seater' | '14_seater' | '32_seater' = 'sedan';
      
      if (passengerCount > 14) vehicleType = '32_seater';
      else if (passengerCount > 10) vehicleType = '14_seater';
      else if (passengerCount > 7) vehicleType = '10_seater';
      else if (passengerCount > 4) vehicleType = '7_seater';

      trips.push({
        routeId: sorted[0].routeId,
        timeSlotId: sorted[0].timeSlotId,
        passengerIds: sorted.map((s: EnrichedSubscription) => s.id),
        recommendedVehicleType: vehicleType,
        pickupSequence: sorted.map((s: EnrichedSubscription) => s.id),
        rationale: 'Generated using rule-based fallback (AI unavailable)',
        confidenceScore: 0.7,
        isLowCapacity: false, // Only trips meeting minimum are created
      });
    }

    return { trips, unassignedPassengers: [] };
  }

  async generateTripsForDate(date: Date): Promise<any> {
    const tripDate = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    console.log(`[AITripGenerator] Manual generation for ${tripDate}`);

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      return { error: 'Cannot generate trips for weekend days', date: tripDate };
    }

    const isBlackout = await this.storage.isBlackoutDate(date);
    if (isBlackout) {
      return { error: 'Cannot generate trips for blackout date', date: tripDate };
    }

    const existingTrips = await this.storage.getVehicleTripsByDate(tripDate);
    if (existingTrips.length > 0) {
      return { error: 'Trips already exist for this date', date: tripDate, existingTrips: existingTrips.length };
    }

    const activeSubscriptions = await this.storage.getActiveSubscriptionsByWeekday(dayOfWeek);
    if (activeSubscriptions.length === 0) {
      return { message: 'No active subscriptions for this day', date: tripDate, tripsGenerated: 0 };
    }

    const subscriptionsWithDetails = await this.enrichSubscriptionData(activeSubscriptions);

    let tripGrouping: AITripGrouping;
    let generatedBy: 'ai' | 'fallback' = 'ai';

    try {
      tripGrouping = await this.generateAITripGrouping(subscriptionsWithDetails, tripDate);
    } catch (aiError: any) {
      console.error('[AITripGenerator] AI failed, using fallback:', aiError.message);
      tripGrouping = this.generateFallbackTripGrouping(subscriptionsWithDetails);
      generatedBy = 'fallback';
    }

    const createdTrips = [];

    for (const tripData of tripGrouping.trips) {
      // Skip trips with fewer than minimum passengers
      if (tripData.passengerIds.length < MIN_PASSENGERS_FOR_TRIP) {
        console.log(`[AITripGenerator] Skipping trip - only ${tripData.passengerIds.length} passengers (minimum ${MIN_PASSENGERS_FOR_TRIP} required)`);
        continue;
      }

      try {
        const tripReferenceId = generateTripReferenceId();
        const vehicleConfig = VEHICLE_TYPES[tripData.recommendedVehicleType as keyof typeof VEHICLE_TYPES];
        const status = 'pending_assignment';

        const vehicleTrip = await this.storage.createAIGeneratedTrip({
          tripReferenceId,
          routeId: tripData.routeId,
          timeSlotId: tripData.timeSlotId,
          tripDate,
          vehicleCapacity: vehicleConfig.capacity,
          recommendedVehicleType: tripData.recommendedVehicleType,
          status,
          generatedBy,
          aiConfidenceScore: tripData.confidenceScore.toString(),
          aiRationale: tripData.rationale,
        });

        for (let i = 0; i < tripData.passengerIds.length; i++) {
          const subscriptionId = tripData.passengerIds[i];
          const subscription = subscriptionsWithDetails.find(s => s.id === subscriptionId);
          if (subscription) {
            await this.storage.createTripBookingFromSubscription({
              vehicleTripId: vehicleTrip.id,
              subscriptionId: subscription.id,
              userId: subscription.userId,
              boardingPointId: subscription.boardingPointId,
              dropOffPointId: subscription.dropOffPointId,
              pickupSequence: tripData.pickupSequence.indexOf(subscriptionId) + 1,
            });
          }
        }
        
        createdTrips.push(vehicleTrip);
      } catch (e) {
        console.error('Error in manual trip generation:', e);
      }
    }

    return { 
      message: `Successfully generated ${createdTrips.length} trips`, 
      date: tripDate, 
      tripsGenerated: createdTrips.length 
    };
  }
}
