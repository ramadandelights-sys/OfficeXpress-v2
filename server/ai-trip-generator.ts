import OpenAI from 'openai';
import * as cron from 'node-cron';
import { storage } from './storage';
import type { IStorage } from './storage';
import { z } from 'zod';
import type { Subscription, CarpoolRoute, CarpoolTimeSlot, CarpoolPickupPoint, User } from '@shared/schema';
import { sendAITripPlannerReportEmail, sendDriverAssignmentNeededEmail } from './lib/resend';

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

const VEHICLE_TYPES = {
  sedan: { label: 'Sedan', capacity: 4, minPassengers: 1 },
  '7_seater': { label: '7-Seater', capacity: 7, minPassengers: 5 },
  '10_seater': { label: '10-Seater', capacity: 10, minPassengers: 8 },
  '14_seater': { label: '14-Seater', capacity: 14, minPassengers: 11 },
  '32_seater': { label: '32-Seater', capacity: 32, minPassengers: 15 },
} as const;

const MIN_PASSENGERS_FOR_TRIP = 1;

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
    subscriptionId: z.string(),
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

      if (activeSubscriptions.length === 0) {
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

      let tripGrouping: AITripGrouping;
      try {
        tripGrouping = await this.generateAITripGrouping(subscriptionsWithDetails, tripDate);
        console.log(`[AITripGenerator] AI generated ${tripGrouping.trips.length} trips`);
      } catch (aiError: any) {
        console.error('[AITripGenerator] AI grouping failed, falling back to rule-based:', aiError.message);
        errors.push(`AI grouping failed: ${aiError.message}`);
        tripGrouping = this.generateFallbackTripGrouping(subscriptionsWithDetails);
        generatedBy = 'fallback';
      }

      for (const tripData of tripGrouping.trips) {
        // Skip trips with fewer than minimum passengers
        if (tripData.passengerIds.length < MIN_PASSENGERS_FOR_TRIP) {
          console.log(`[AITripGenerator] Skipping trip - only ${tripData.passengerIds.length} passengers (minimum ${MIN_PASSENGERS_FOR_TRIP} required)`);
          lowCapacityTrips++;
          continue;
        }
        
        try {
          const tripReferenceId = generateTripReferenceId();
          const vehicleConfig = VEHICLE_TYPES[tripData.recommendedVehicleType];
          const status = 'pending_assignment'; // No more low_capacity_warning status

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
              passengersAssigned++;
            }
          }

          console.log(`[AITripGenerator] Created trip ${tripReferenceId} with ${tripData.passengerIds.length} passengers`);
        } catch (tripError: any) {
          errors.push(`Error creating trip: ${tripError.message}`);
          console.error('[AITripGenerator] Error creating trip:', tripError);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[AITripGenerator] Completed in ${duration}ms. Trips: ${tripsGenerated}, Low capacity: ${lowCapacityTrips}, Passengers: ${passengersAssigned}`);

      // Send email report to admin
      await this.sendExecutionReportEmail({
        tripDate,
        bookingsReceived: activeSubscriptions.length,
        tripsCreated: tripsGenerated,
        passengersAssigned,
        lowCapacityTrips,
        generatedBy,
        errors,
        isWeekend: false,
        isBlackout: false,
      });

      // Send driver assignment needed notifications if trips were created
      if (tripsGenerated > 0) {
        await this.notifyAdminsForDriverAssignment(tripDate, tripGrouping.trips, subscriptionsWithDetails);
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
              recommendedVehicle: VEHICLE_TYPES[tripData.recommendedVehicleType]?.label || tripData.recommendedVehicleType,
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
4. SKIP (do not create) trips with fewer than ${MIN_PASSENGERS_FOR_TRIP} passengers - set "isLowCapacity: false" for all trips you create
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
      
      const tripReferenceId = generateTripReferenceId();
      const vehicleConfig = VEHICLE_TYPES[tripData.recommendedVehicleType];
      const status = 'pending_assignment'; // No more low_capacity_warning status

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

      createdTrips.push({
        id: vehicleTrip.id,
        tripReferenceId,
        passengerCount: tripData.passengerIds.length,
        recommendedVehicle: tripData.recommendedVehicleType,
        isLowCapacity: false, // All created trips meet minimum requirement
      });
    }

    return {
      date: tripDate,
      generatedBy,
      tripsGenerated: createdTrips.length,
      lowCapacityTrips: 0, // We no longer create low capacity trips
      passengersAssigned: subscriptionsWithDetails.length,
      trips: createdTrips,
    };
  }
}

let aiTripGeneratorInstance: AITripGeneratorService | null = null;

export function getAITripGeneratorService(storage: IStorage): AITripGeneratorService {
  if (!aiTripGeneratorInstance) {
    aiTripGeneratorInstance = new AITripGeneratorService(storage);
  }
  return aiTripGeneratorInstance;
}

export function startAITripGeneratorService(
  storage: IStorage,
  schedule?: string,
  enabled?: boolean
) {
  const service = getAITripGeneratorService(storage);
  const cronSchedule = schedule || process.env.AI_TRIP_GENERATION_SCHEDULE || '0 18 * * *';
  const isEnabled = enabled !== undefined ? enabled : process.env.AI_TRIP_GENERATION_ENABLED !== 'false';
  
  service.start(cronSchedule, isEnabled);
  return service;
}
