import { storage } from "./storage";
import { log } from "./vite";
import * as cron from "node-cron";
import type { IStorage } from "./storage";

/**
 * Automated Refund Processing Service
 * Runs every hour to process refunds for:
 * 1. Cancelled trips
 * 2. No-show trips
 * 3. Trips on blackout dates
 * 4. Cancelled subscriptions (pro-rated)
 */

class RefundProcessorService {
  private isProcessing = false;
  private lastProcessedAt: Date | null = null;

  constructor(private storage: IStorage) {}

  /**
   * Process all pending refunds
   */
  async processPendingRefunds(): Promise<{
    processed: number;
    failed: number;
    totalAmount: number;
  }> {
    if (this.isProcessing) {
      log("[RefundProcessor] Already processing, skipping this run");
      return { processed: 0, failed: 0, totalAmount: 0 };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      log("[RefundProcessor] Starting automated refund processing...");
      
      // Get all refundable trips
      const refundableTrips = await this.storage.getRefundableTrips();
      log(`[RefundProcessor] Found ${refundableTrips.length} trips needing refunds`);
      
      let processed = 0;
      let failed = 0;
      let totalAmount = 0;
      
      // Process trip refunds in batches
      const batchSize = 10;
      for (let i = 0; i < refundableTrips.length; i += batchSize) {
        const batch = refundableTrips.slice(i, i + batchSize);
        
        const refundsToProcess = batch.map(trip => {
          const amount = Number(trip.route.pricePerSeat);
          let reason = "Trip cancelled";
          
          if (trip.vehicleTrip.status === 'cancelled') {
            reason = "Trip cancelled by operator";
          } else if (trip.status === 'no_show') {
            reason = "Driver no-show - automatic refund";
          }
          
          return {
            userId: trip.userId,
            amount,
            reason,
            referenceId: trip.id,
            referenceType: 'trip_booking' as const,
            bookingId: trip.id
          };
        });
        
        // Process batch of refunds
        const { transactions, errors } = await this.storage.bulkProcessRefunds(refundsToProcess);
        
        processed += transactions.length;
        failed += errors.length;
        totalAmount += transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        
        if (errors.length > 0) {
          errors.forEach(error => log(`[RefundProcessor] Error: ${error}`));
        }
        
        // Log notifications for successful refunds
        for (const transaction of transactions) {
          const trip = batch.find(t => 
            refundsToProcess.find(r => r.bookingId === t.id)
          );
          if (trip) {
            await this.logRefundNotification(
              trip.userId,
              Number(transaction.amount),
              transaction.description || "Refund processed",
              trip.id
            );
          }
        }
      }
      
      // Process subscription refunds
      const subscriptionRefunds = await this.processSubscriptionRefunds();
      processed += subscriptionRefunds.processed;
      failed += subscriptionRefunds.failed;
      totalAmount += subscriptionRefunds.totalAmount;
      
      // Process blackout date refunds
      const blackoutRefunds = await this.processBlackoutDateRefunds();
      processed += blackoutRefunds.processed;
      failed += blackoutRefunds.failed;
      totalAmount += blackoutRefunds.totalAmount;
      
      // Process missed service day refunds (for online subscribers when trip_not_generated)
      const missedServiceRefunds = await this.processMissedServiceRefunds();
      processed += missedServiceRefunds.processed;
      failed += missedServiceRefunds.failed;
      totalAmount += missedServiceRefunds.totalAmount;
      
      const duration = Date.now() - startTime;
      log(`[RefundProcessor] Completed: ${processed} refunds processed, ${failed} failed, total amount: ৳${totalAmount.toFixed(2)} in ${duration}ms`);
      
      this.lastProcessedAt = new Date();
      
      return { processed, failed, totalAmount };
    } catch (error) {
      log(`[RefundProcessor] Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process pro-rated refunds for cancelled subscriptions
   */
  private async processSubscriptionRefunds(): Promise<{
    processed: number;
    failed: number;
    totalAmount: number;
  }> {
    try {
      log("[RefundProcessor] Processing subscription refunds...");
      
      // Get cancelled subscriptions with future end dates
      const { subscriptionRefunds } = await this.storage.getPendingRefunds();
      
      if (subscriptionRefunds.length === 0) {
        log("[RefundProcessor] No subscription refunds to process");
        return { processed: 0, failed: 0, totalAmount: 0 };
      }
      
      const refundsToProcess = subscriptionRefunds.map(sub => ({
        userId: sub.userId,
        amount: sub.amount,
        reason: `Pro-rated subscription refund - ${sub.remainingDays} days remaining`,
        referenceId: sub.subscriptionId,
        referenceType: 'subscription' as const
      }));
      
      const { transactions, errors } = await this.storage.bulkProcessRefunds(refundsToProcess);
      
      // Log notifications
      for (const transaction of transactions) {
        const sub = subscriptionRefunds.find(s => s.subscriptionId === transaction.metadata?.referenceId);
        if (sub) {
          await this.logRefundNotification(
            sub.userId,
            Number(transaction.amount),
            transaction.description || "Subscription refund processed",
            sub.subscriptionId
          );
        }
      }
      
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      log(`[RefundProcessor] Subscription refunds: ${transactions.length} processed, ${errors.length} failed`);
      
      return {
        processed: transactions.length,
        failed: errors.length,
        totalAmount
      };
    } catch (error) {
      log(`[RefundProcessor] Error processing subscription refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { processed: 0, failed: 0, totalAmount: 0 };
    }
  }

  /**
   * Process refunds for trips affected by blackout dates
   */
  private async processBlackoutDateRefunds(): Promise<{
    processed: number;
    failed: number;
    totalAmount: number;
  }> {
    try {
      log("[RefundProcessor] Processing blackout date refunds...");
      
      // This is already handled in getRefundableTrips() 
      // which checks for trips on blackout dates
      // Additional logic can be added here for bulk blackout compensation
      
      return { processed: 0, failed: 0, totalAmount: 0 };
    } catch (error) {
      log(`[RefundProcessor] Error processing blackout refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { processed: 0, failed: 0, totalAmount: 0 };
    }
  }

  /**
   * Process refunds for missed service days (trip_not_generated) for online subscribers
   * Cash subscribers are not refunded as they pay per trip to the driver
   */
  private async processMissedServiceRefunds(): Promise<{
    processed: number;
    failed: number;
    totalAmount: number;
  }> {
    try {
      log("[RefundProcessor] Processing missed service refunds...");
      
      const missedServiceDays = await this.storage.getMissedServiceDaysForRefund();
      
      if (missedServiceDays.length === 0) {
        log("[RefundProcessor] No missed service refunds to process");
        return { processed: 0, failed: 0, totalAmount: 0 };
      }
      
      log(`[RefundProcessor] Found ${missedServiceDays.length} missed service days needing refunds`);
      
      let processed = 0;
      let failed = 0;
      let totalAmount = 0;
      
      for (const serviceDay of missedServiceDays) {
        try {
          // NEW: Calculate refund using subscription's daily rate if available
          let refundAmount: number;
          const subscription = serviceDay.subscription as any;
          
          if (subscription?.netAmountPaid && subscription?.billingCycleDays && subscription.billingCycleDays > 0) {
            // Use accurate daily rate from subscription data
            const dailyRate = parseFloat(subscription.netAmountPaid) / subscription.billingCycleDays;
            refundAmount = Math.round(dailyRate * 100) / 100;
            log(`[RefundProcessor] Using subscription daily rate: netAmountPaid=${subscription.netAmountPaid}, billingCycleDays=${subscription.billingCycleDays}, dailyRate=${refundAmount}`);
          } else {
            // Fallback to pricePerTrip for legacy subscriptions
            refundAmount = serviceDay.pricePerTrip;
            log(`[RefundProcessor] Using legacy pricePerTrip for refund: ${refundAmount} (netAmountPaid or billingCycleDays not available)`);
          }
          
          const formattedDate = serviceDay.serviceDate.toISOString().split('T')[0];
          
          const wallet = await this.storage.getUserWallet(serviceDay.userId);
          if (!wallet) {
            log(`[RefundProcessor] No wallet found for user ${serviceDay.userId}, skipping refund`);
            failed++;
            continue;
          }
          
          await this.storage.createWalletTransaction({
            walletId: wallet.id,
            amount: String(refundAmount),
            type: 'refund',
            reason: 'missed_service_refund',
            description: `Automatic refund for missed service on ${formattedDate} - trip not generated due to low bookings`,
            metadata: {
              serviceDay: serviceDay.id,
              subscriptionId: serviceDay.subscriptionId
            }
          });
          
          await this.storage.updateWalletBalance(wallet.id, refundAmount);
          
          await this.storage.markServiceDayRefunded(serviceDay.id, refundAmount);
          
          await this.logRefundNotification(
            serviceDay.userId,
            refundAmount,
            `Automatic refund for missed service on ${formattedDate} - trip not generated due to low bookings`,
            serviceDay.id
          );
          
          processed++;
          totalAmount += refundAmount;
        } catch (error) {
          log(`[RefundProcessor] Error processing missed service refund for ${serviceDay.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }
      
      log(`[RefundProcessor] Missed service refunds: ${processed} processed, ${failed} failed, total: ৳${totalAmount.toFixed(2)}`);
      
      return { processed, failed, totalAmount };
    } catch (error) {
      log(`[RefundProcessor] Error processing missed service refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { processed: 0, failed: 0, totalAmount: 0 };
    }
  }

  /**
   * Log refund notification (placeholder for future email/SMS integration)
   */
  private async logRefundNotification(
    userId: string,
    amount: number,
    reason: string,
    referenceId: string
  ): Promise<void> {
    try {
      // Get user's current wallet balance
      const wallet = await this.storage.getUserWallet(userId);
      const newBalance = wallet ? Number(wallet.balance) : 0;
      
      // Create notification record
      await this.storage.createNotification({
        userId,
        type: 'refund',
        title: 'Refund Processed',
        message: `Refund of ৳${amount.toFixed(2)} has been credited to your wallet. Reason: ${reason}. New balance: ৳${newBalance.toFixed(2)}`,
        metadata: {
          amount: String(amount),
          reason,
          referenceId,
          walletBalance: String(newBalance)
        }
      });
      
      log(`[RefundProcessor] Notification logged for user ${userId}: ৳${amount.toFixed(2)} refunded`);
    } catch (error) {
      log(`[RefundProcessor] Failed to log notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a specific trip and process refunds
   */
  async cancelTripAndRefund(tripId: string, reason: string = "Trip cancelled by admin"): Promise<{
    affectedBookings: number;
    totalRefunded: number;
  }> {
    try {
      log(`[RefundProcessor] Cancelling trip ${tripId} and processing refunds...`);
      
      // Update trip status to cancelled
      await this.storage.updateVehicleTrip(tripId, { status: 'cancelled' });
      
      // Get all bookings for this trip
      const bookings = await this.storage.getTripBookingsByVehicleTrip(tripId);
      
      if (bookings.length === 0) {
        log(`[RefundProcessor] No bookings found for trip ${tripId}`);
        return { affectedBookings: 0, totalRefunded: 0 };
      }
      
      // Get trip and route details for refund amount
      const trip = await this.storage.getVehicleTrip(tripId);
      if (!trip) throw new Error(`Trip ${tripId} not found`);
      
      const route = await this.storage.getCarpoolRoute(trip.routeId);
      if (!route) throw new Error(`Route ${trip.routeId} not found`);
      
      const refundAmount = Number(route.pricePerSeat);
      
      // Process refunds for all affected bookings
      const refundsToProcess = bookings
        .filter(booking => !booking.refundProcessed)
        .map(booking => ({
          userId: booking.userId,
          amount: refundAmount,
          reason,
          referenceId: booking.id,
          referenceType: 'trip_booking' as const,
          bookingId: booking.id
        }));
      
      const { transactions, errors } = await this.storage.bulkProcessRefunds(refundsToProcess);
      
      if (errors.length > 0) {
        errors.forEach(error => log(`[RefundProcessor] Error: ${error}`));
      }
      
      const totalRefunded = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      log(`[RefundProcessor] Trip ${tripId} cancelled: ${transactions.length} refunds processed, total: ৳${totalRefunded.toFixed(2)}`);
      
      return {
        affectedBookings: transactions.length,
        totalRefunded
      };
    } catch (error) {
      log(`[RefundProcessor] Error cancelling trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get refund statistics
   */
  async getStats() {
    return await this.storage.getRefundStats();
  }

  /**
   * Get pending refunds for admin review
   */
  async getPendingRefunds() {
    return await this.storage.getPendingRefunds();
  }

  /**
   * Get refund history with filters
   */
  async getRefundHistory(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return await this.storage.getRefundHistory(filters);
  }
}

// Create and export the service instance
let refundProcessor: RefundProcessorService | null = null;
let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the automated refund processing service
 */
export function startRefundProcessorService(storage: IStorage) {
  if (refundProcessor) {
    log("[RefundProcessor] Service already running");
    return refundProcessor;
  }

  refundProcessor = new RefundProcessorService(storage);
  
  // Schedule to run every hour at minute 0
  cronJob = cron.schedule("0 * * * *", async () => {
    try {
      await refundProcessor!.processPendingRefunds();
    } catch (error) {
      log(`[RefundProcessor] Scheduled run failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Also run immediately on startup
  setTimeout(async () => {
    try {
      await refundProcessor!.processPendingRefunds();
    } catch (error) {
      log(`[RefundProcessor] Initial run failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, 5000); // Wait 5 seconds for system to stabilize

  log("[RefundProcessor] Service started - will run every hour");
  return refundProcessor;
}

/**
 * Stop the automated refund processing service
 */
export function stopRefundProcessorService() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  refundProcessor = null;
  log("[RefundProcessor] Service stopped");
}

/**
 * Get the refund processor instance
 */
export function getRefundProcessor(): RefundProcessorService | null {
  return refundProcessor;
}