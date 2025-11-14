import * as cron from 'node-cron';
import { storage } from './storage';
import type { IStorage } from './storage';
import type { InsertTripBooking } from '@shared/schema';

export class TripGeneratorService {
  private storage: IStorage;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Start the daily trip generation service
   * @param cronSchedule - Cron schedule string (default: '0 0 * * *' for midnight)
   * @param enabled - Whether the service is enabled (default: true)
   */
  start(cronSchedule: string = '0 0 * * *', enabled: boolean = true) {
    if (!enabled) {
      console.log('[TripGenerator] Service is disabled by configuration');
      return;
    }
    
    // Stop any existing job
    this.stop();
    
    console.log(`[TripGenerator] Starting service with schedule: ${cronSchedule}`);
    
    // Create the cron job
    this.cronJob = cron.schedule(cronSchedule, async () => {
      await this.generateTripsForToday();
    }, {
      scheduled: true,
      timezone: 'Asia/Dhaka' // Bangladesh timezone
    });
    
    console.log('[TripGenerator] Service started successfully');
  }
  
  /**
   * Stop the trip generation service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[TripGenerator] Service stopped');
    }
  }
  
  /**
   * Generate trips for today (can be called manually or by cron)
   * @param dryRun - If true, only simulates without creating records
   * @returns Summary of generated trips and bookings
   */
  async generateTripsForToday(dryRun: boolean = false): Promise<{
    date: string;
    dayOfWeek: number;
    isBlackout: boolean;
    isWeekend: boolean;
    tripsCreated: number;
    bookingsCreated: number;
    errors: string[];
    dryRun: boolean;
  }> {
    if (this.isRunning) {
      console.log('[TripGenerator] Already running, skipping duplicate execution');
      return {
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: new Date().getDay(),
        isBlackout: false,
        isWeekend: false,
        tripsCreated: 0,
        bookingsCreated: 0,
        errors: ['Service already running'],
        dryRun
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let tripsCreated = 0;
    let bookingsCreated = 0;
    
    try {
      // Get current date in Bangladesh timezone
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const tripDate = bdTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const dayOfWeek = bdTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      console.log(`[TripGenerator] Starting trip generation for ${tripDate} (Day: ${dayOfWeek})`);
      
      // Check if weekend (Saturday = 6, Sunday = 0)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        console.log(`[TripGenerator] Skipping weekend day: ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}`);
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: false,
          isWeekend: true,
          tripsCreated: 0,
          bookingsCreated: 0,
          errors: [],
          dryRun
        };
      }
      
      // Check if blackout date
      const isBlackout = await this.storage.isBlackoutDate(bdTime);
      if (isBlackout) {
        console.log(`[TripGenerator] Skipping blackout date: ${tripDate}`);
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: true,
          isWeekend: false,
          tripsCreated: 0,
          bookingsCreated: 0,
          errors: [],
          dryRun
        };
      }
      
      // Get active subscriptions for this weekday
      const activeSubscriptions = await this.storage.getActiveSubscriptionsByWeekday(dayOfWeek);
      console.log(`[TripGenerator] Found ${activeSubscriptions.length} active subscriptions for weekday ${dayOfWeek}`);
      
      if (activeSubscriptions.length === 0) {
        console.log('[TripGenerator] No active subscriptions found');
        return {
          date: tripDate,
          dayOfWeek,
          isBlackout: false,
          isWeekend: false,
          tripsCreated: 0,
          bookingsCreated: 0,
          errors: [],
          dryRun
        };
      }
      
      // Group subscriptions by route and time slot to optimize trip creation
      const tripGroups = new Map<string, typeof activeSubscriptions>();
      for (const subscription of activeSubscriptions) {
        const key = `${subscription.routeId}-${subscription.timeSlotId}`;
        if (!tripGroups.has(key)) {
          tripGroups.set(key, []);
        }
        tripGroups.get(key)!.push(subscription);
      }
      
      console.log(`[TripGenerator] Processing ${tripGroups.size} unique route-timeslot combinations`);
      
      // Process each trip group
      for (const [key, subscriptions] of tripGroups) {
        const [routeId, timeSlotId] = key.split('-');
        
        try {
          // Get or create vehicle trip
          if (!dryRun) {
            const vehicleTrip = await this.storage.getOrCreateVehicleTrip(
              routeId, 
              timeSlotId, 
              tripDate
            );
            
            if (vehicleTrip.createdAt && 
                new Date(vehicleTrip.createdAt).toISOString().split('T')[0] === tripDate) {
              tripsCreated++;
              console.log(`[TripGenerator] Created new vehicle trip: ${vehicleTrip.id}`);
            } else {
              console.log(`[TripGenerator] Using existing vehicle trip: ${vehicleTrip.id}`);
            }
            
            // Create bookings for all subscribers in this group
            const bookings: InsertTripBooking[] = subscriptions.map(subscription => ({
              vehicleTripId: vehicleTrip.id,
              subscriptionId: subscription.id,
              userId: subscription.userId,
              boardingPointId: subscription.boardingPointId,
              dropOffPointId: subscription.dropOffPointId,
              numberOfPassengers: 1
            }));
            
            if (bookings.length > 0) {
              const createdBookings = await this.storage.bulkCreateTripBookings(bookings);
              bookingsCreated += createdBookings.length;
              console.log(`[TripGenerator] Created ${createdBookings.length} bookings for trip ${vehicleTrip.id}`);
            }
          } else {
            // Dry run - just count
            tripsCreated++;
            bookingsCreated += subscriptions.length;
            console.log(`[TripGenerator] [DRY RUN] Would create trip for route ${routeId}, timeslot ${timeSlotId} with ${subscriptions.length} bookings`);
          }
        } catch (error: any) {
          const errorMsg = `Error processing route ${routeId}, timeslot ${timeSlotId}: ${error.message}`;
          console.error(`[TripGenerator] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[TripGenerator] Completed in ${duration}ms. Trips created: ${tripsCreated}, Bookings created: ${bookingsCreated}`);
      
      return {
        date: tripDate,
        dayOfWeek,
        isBlackout: false,
        isWeekend: false,
        tripsCreated,
        bookingsCreated,
        errors,
        dryRun
      };
    } catch (error: any) {
      console.error('[TripGenerator] Fatal error:', error);
      errors.push(`Fatal error: ${error.message}`);
      return {
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: new Date().getDay(),
        isBlackout: false,
        isWeekend: false,
        tripsCreated,
        bookingsCreated,
        errors,
        dryRun
      };
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Generate trips for a specific date (for testing or backfilling)
   * @param date - The date to generate trips for
   * @param dryRun - If true, only simulates without creating records
   */
  async generateTripsForDate(date: Date, dryRun: boolean = false): Promise<{
    date: string;
    dayOfWeek: number;
    isBlackout: boolean;
    isWeekend: boolean;
    tripsCreated: number;
    bookingsCreated: number;
    errors: string[];
    dryRun: boolean;
  }> {
    // Temporarily swap the date
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(date.getTime());
        } else {
          super(...args);
        }
      }
      
      static now() {
        return date.getTime();
      }
    } as any;
    
    try {
      return await this.generateTripsForToday(dryRun);
    } finally {
      // Restore original Date
      global.Date = originalDate;
    }
  }
}

// Export a singleton instance
let tripGeneratorInstance: TripGeneratorService | null = null;

export function getTripGeneratorService(storage: IStorage): TripGeneratorService {
  if (!tripGeneratorInstance) {
    tripGeneratorInstance = new TripGeneratorService(storage);
  }
  return tripGeneratorInstance;
}

export function startTripGeneratorService(
  storage: IStorage, 
  schedule?: string,
  enabled?: boolean
) {
  const service = getTripGeneratorService(storage);
  
  // Get configuration from environment variables
  const cronSchedule = schedule || process.env.TRIP_GENERATION_SCHEDULE || '0 0 * * *'; // Default: midnight
  const isEnabled = enabled !== undefined ? enabled : process.env.TRIP_GENERATION_ENABLED !== 'false'; // Default: true
  
  service.start(cronSchedule, isEnabled);
  return service;
}