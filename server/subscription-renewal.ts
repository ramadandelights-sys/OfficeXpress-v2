import * as cron from 'node-cron';
import { storage } from './storage';
import type { IStorage } from './storage';
import type { Subscription } from '@shared/schema';
import { nanoid } from 'nanoid';

export class SubscriptionRenewalService {
  private storage: IStorage;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Start the subscription renewal service
   * @param cronSchedule - Cron schedule string (default: '0 1 * * *' for 1 AM)
   * @param enabled - Whether the service is enabled (default: true)
   */
  start(cronSchedule: string = '0 1 * * *', enabled: boolean = true) {
    if (!enabled) {
      console.log('[SubscriptionRenewal] Service is disabled by configuration');
      return;
    }
    
    // Stop any existing job
    this.stop();
    
    console.log(`[SubscriptionRenewal] Starting service with schedule: ${cronSchedule}`);
    
    // Create the cron job
    this.cronJob = cron.schedule(cronSchedule, async () => {
      await this.processRenewals();
    }, {
      scheduled: true,
      timezone: 'Asia/Dhaka' // Bangladesh timezone
    });
    
    console.log('[SubscriptionRenewal] Service started successfully');
  }
  
  /**
   * Stop the subscription renewal service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[SubscriptionRenewal] Service stopped');
    }
  }
  
  /**
   * Process subscription renewals (can be called manually or by cron)
   * @param dryRun - If true, only simulates without making changes
   * @returns Summary of processed renewals
   */
  async processRenewals(dryRun: boolean = false): Promise<{
    date: string;
    subscriptionsProcessed: number;
    successfulRenewals: number;
    failedRenewals: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    errors: string[];
    dryRun: boolean;
  }> {
    if (this.isRunning) {
      console.log('[SubscriptionRenewal] Already running, skipping duplicate execution');
      return {
        date: new Date().toISOString().split('T')[0],
        subscriptionsProcessed: 0,
        successfulRenewals: 0,
        failedRenewals: 0,
        expiredSubscriptions: 0,
        cancelledSubscriptions: 0,
        errors: ['Service already running'],
        dryRun
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let subscriptionsProcessed = 0;
    let successfulRenewals = 0;
    let failedRenewals = 0;
    let expiredSubscriptions = 0;
    let cancelledSubscriptions = 0;
    
    try {
      // Get current date in Bangladesh timezone
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const today = bdTime.toISOString().split('T')[0];
      
      console.log(`[SubscriptionRenewal] Processing renewals for ${today}`);
      
      // Get subscriptions expiring today
      const expiringSubscriptions = await this.storage.getExpiringSubscriptions(bdTime);
      console.log(`[SubscriptionRenewal] Found ${expiringSubscriptions.length} expiring subscriptions`);
      
      for (const subscription of expiringSubscriptions) {
        subscriptionsProcessed++;
        
        try {
          if (subscription.status === 'pending_cancellation') {
            // Handle pending cancellation
            if (!dryRun) {
              await this.storage.updateSubscription(subscription.id, {
                status: 'cancelled'
              });
            }
            cancelledSubscriptions++;
            console.log(`[SubscriptionRenewal] Cancelled subscription ${subscription.id} (was pending cancellation)`);
          } else if (subscription.status === 'active') {
            // Attempt renewal for active subscriptions
            const renewed = await this.processSubscriptionRenewal(subscription, dryRun);
            if (renewed) {
              successfulRenewals++;
            } else {
              failedRenewals++;
              expiredSubscriptions++;
            }
          }
        } catch (error: any) {
          const errorMsg = `Error processing subscription ${subscription.id}: ${error.message}`;
          console.error(`[SubscriptionRenewal] ${errorMsg}`);
          errors.push(errorMsg);
          failedRenewals++;
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(
        `[SubscriptionRenewal] Completed in ${duration}ms. ` +
        `Processed: ${subscriptionsProcessed}, Renewed: ${successfulRenewals}, ` +
        `Failed: ${failedRenewals}, Expired: ${expiredSubscriptions}, ` +
        `Cancelled: ${cancelledSubscriptions}`
      );
      
      return {
        date: today,
        subscriptionsProcessed,
        successfulRenewals,
        failedRenewals,
        expiredSubscriptions,
        cancelledSubscriptions,
        errors,
        dryRun
      };
    } catch (error: any) {
      console.error('[SubscriptionRenewal] Fatal error:', error);
      errors.push(`Fatal error: ${error.message}`);
      return {
        date: new Date().toISOString().split('T')[0],
        subscriptionsProcessed,
        successfulRenewals,
        failedRenewals,
        expiredSubscriptions,
        cancelledSubscriptions,
        errors,
        dryRun
      };
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Process renewal for a single subscription
   * @param subscription - The subscription to renew
   * @param dryRun - If true, only simulates without making changes
   * @returns True if renewal was successful
   */
  private async processSubscriptionRenewal(
    subscription: Subscription, 
    dryRun: boolean
  ): Promise<boolean> {
    console.log(`[SubscriptionRenewal] Processing renewal for subscription ${subscription.id}`);
    
    // Get user's wallet
    const wallet = await this.storage.getUserWallet(subscription.userId);
    if (!wallet) {
      console.error(`[SubscriptionRenewal] No wallet found for user ${subscription.userId}`);
      
      if (!dryRun) {
        // Mark subscription as expired
        await this.storage.updateSubscription(subscription.id, {
          status: 'expired'
        });
        
        // Create unpaid invoice
        await this.createUnpaidInvoice(subscription);
        
        // Log notification (in real system, would send email/SMS)
        console.log(
          `[SubscriptionRenewal] NOTIFICATION: Subscription ${subscription.id} expired - no wallet found`
        );
      }
      
      return false;
    }
    
    // Check wallet balance
    const monthlyFee = Number(subscription.totalMonthlyPrice);
    const balance = Number(wallet.balance);
    
    if (balance < monthlyFee) {
      console.log(
        `[SubscriptionRenewal] Insufficient funds for subscription ${subscription.id}. ` +
        `Required: ${monthlyFee}, Available: ${balance}`
      );
      
      if (!dryRun) {
        // Mark subscription as expired
        await this.storage.updateSubscription(subscription.id, {
          status: 'expired'
        });
        
        // Create unpaid invoice
        await this.createUnpaidInvoice(subscription);
        
        // Log notification (in real system, would send email/SMS)
        console.log(
          `[SubscriptionRenewal] NOTIFICATION: Subscription ${subscription.id} expired - ` +
          `insufficient funds (Required: ${monthlyFee}, Available: ${balance})`
        );
      }
      
      return false;
    }
    
    // Process renewal
    if (!dryRun) {
      try {
        // Start transaction
        console.log(`[SubscriptionRenewal] Processing payment for subscription ${subscription.id}`);
        
        // Deduct from wallet
        const transaction = await this.storage.adminAdjustWalletBalance(
          wallet.id,
          monthlyFee,
          'debit',
          `Monthly subscription renewal`,
          subscription.userId
        );
        
        // Generate billing month (next month)
        const nextMonth = new Date(subscription.endDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const billingMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        // Create paid invoice
        const invoice = await this.storage.createSubscriptionInvoice({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          billingMonth,
          amountDue: monthlyFee,
          dueDate: new Date(subscription.endDate),
          amountPaid: monthlyFee,
          walletTransactionId: transaction.id,
          status: 'paid',
          paidAt: new Date()
        });
        
        console.log(`[SubscriptionRenewal] Created invoice ${invoice.invoiceNumber}`);
        
        // Extend subscription
        const extended = await this.storage.extendSubscription(subscription.id, 1);
        
        console.log(
          `[SubscriptionRenewal] Successfully renewed subscription ${subscription.id}. ` +
          `New end date: ${extended.endDate}`
        );
        
        // Log notification (in real system, would send email/SMS)
        console.log(
          `[SubscriptionRenewal] NOTIFICATION: Subscription ${subscription.id} successfully renewed. ` +
          `Amount charged: ${monthlyFee}, New end date: ${extended.endDate}`
        );
        
        return true;
      } catch (error: any) {
        console.error(
          `[SubscriptionRenewal] Error processing renewal for subscription ${subscription.id}:`,
          error
        );
        
        // Mark subscription as expired on error
        await this.storage.updateSubscription(subscription.id, {
          status: 'expired'
        });
        
        // Create unpaid invoice
        await this.createUnpaidInvoice(subscription);
        
        throw error;
      }
    } else {
      console.log(
        `[SubscriptionRenewal] [DRY RUN] Would renew subscription ${subscription.id}. ` +
        `Amount: ${monthlyFee}, Balance: ${balance}`
      );
      return true;
    }
  }
  
  /**
   * Create an unpaid invoice for a failed renewal
   * @param subscription - The subscription that failed to renew
   */
  private async createUnpaidInvoice(subscription: Subscription): Promise<void> {
    try {
      // Generate billing month
      const billingMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
      
      const invoice = await this.storage.createSubscriptionInvoice({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        billingMonth,
        amountDue: Number(subscription.totalMonthlyPrice),
        dueDate: new Date(subscription.endDate)
      });
      
      console.log(
        `[SubscriptionRenewal] Created unpaid invoice ${invoice.invoiceNumber} ` +
        `for subscription ${subscription.id}`
      );
    } catch (error: any) {
      console.error(
        `[SubscriptionRenewal] Error creating unpaid invoice for subscription ${subscription.id}:`,
        error
      );
    }
  }
  
  /**
   * Process renewals for a specific date (for testing or backfilling)
   * @param date - The date to process renewals for
   * @param dryRun - If true, only simulates without making changes
   */
  async processRenewalsForDate(date: Date, dryRun: boolean = false) {
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
      return await this.processRenewals(dryRun);
    } finally {
      // Restore original Date
      global.Date = originalDate;
    }
  }
}

// Export a singleton instance
let subscriptionRenewalInstance: SubscriptionRenewalService | null = null;

export function getSubscriptionRenewalService(storage: IStorage): SubscriptionRenewalService {
  if (!subscriptionRenewalInstance) {
    subscriptionRenewalInstance = new SubscriptionRenewalService(storage);
  }
  return subscriptionRenewalInstance;
}

export function startSubscriptionRenewalService(
  storage: IStorage,
  schedule?: string,
  enabled?: boolean
) {
  const service = getSubscriptionRenewalService(storage);
  
  // Get configuration from environment variables
  const cronSchedule = schedule || process.env.SUBSCRIPTION_RENEWAL_SCHEDULE || '0 1 * * *'; // Default: 1 AM
  const isEnabled = enabled !== undefined ? enabled : process.env.SUBSCRIPTION_RENEWAL_ENABLED !== 'false'; // Default: true
  
  service.start(cronSchedule, isEnabled);
  return service;
}