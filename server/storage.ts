import { 
  users, 
  drivers,
  corporateBookings,
  rentalBookings, 
  vendorRegistrations,
  contactMessages,
  blogPosts,
  portfolioClients,
  bangladeshLocations,
  marketingSettings,
  legalPages,
  websiteSettings,
  onboardingTokens,
  passwordResetTokens,
  notifications,
  submissionStatusHistory,
  surveys,
  carpoolRoutes,
  carpoolPickupPoints,
  carpoolTimeSlots,
  carpoolBookings,
  carpoolBlackoutDates,
  userWallets,
  walletTransactions,
  subscriptions,
  subscriptionInvoices,
  vehicleTrips,
  tripBookings,
  complaints,
  type User, 
  type InsertUser,
  type Driver,
  type InsertDriver,
  type UpdateDriver,
  type CorporateBooking,
  type InsertCorporateBooking,
  type RentalBooking,
  type InsertRentalBooking,
  type VendorRegistration,
  type InsertVendorRegistration,
  type ContactMessage,
  type InsertContactMessage,
  type BlogPost,
  type InsertBlogPost,
  type UpdateBlogPost,
  type PortfolioClient,
  type InsertPortfolioClient,
  type UpdatePortfolioClient,
  type BangladeshLocation,
  type InsertBangladeshLocation,
  type MarketingSettings,
  type InsertMarketingSettings,
  type UpdateMarketingSettings,
  type LegalPage,
  type InsertLegalPage,
  type UpdateLegalPage,
  type WebsiteSettings,
  type InsertWebsiteSettings,
  type UpdateWebsiteSettings,
  type OnboardingToken,
  type InsertOnboardingToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Notification,
  type InsertNotification,
  type SubmissionStatusHistory,
  type InsertSubmissionStatusHistory,
  type Survey,
  type InsertSurvey,
  type CarpoolRoute,
  type InsertCarpoolRoute,
  type UpdateCarpoolRoute,
  type CarpoolPickupPoint,
  type InsertCarpoolPickupPoint,
  type CarpoolTimeSlot,
  type InsertCarpoolTimeSlot,
  type CarpoolBooking,
  type InsertCarpoolBooking,
  type UpdateCarpoolBooking,
  type CarpoolBlackoutDate,
  type InsertCarpoolBlackoutDate,
  type UserWallet,
  type InsertUserWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type Subscription,
  type InsertSubscription,
  type SubscriptionInvoice,
  type InsertSubscriptionInvoice,
  type VehicleTrip,
  type InsertVehicleTrip,
  type TripBooking,
  type InsertTripBooking,
  type Complaint,
  type InsertComplaint,
  type UpdateComplaint
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, like, sql, lt, and, inArray } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { alias } from "drizzle-orm/pg-core";

// Create aliases for pickup and drop-off points (same table, different uses)
const pickupPoints = alias(carpoolPickupPoints, 'pickup_points');
const dropOffPoints = alias(carpoolPickupPoints, 'drop_off_points');

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: 'customer' | 'employee' | 'superadmin'): Promise<User[]>;
  getUsersWithDriverAssignmentPermission(): Promise<User[]>;
  linkExistingBookingsToUser(userId: string, phone: string): Promise<void>;
  
  // Onboarding token operations
  createOnboardingToken(token: InsertOnboardingToken): Promise<OnboardingToken>;
  getOnboardingToken(token: string): Promise<OnboardingToken | undefined>;
  markOnboardingTokenAsUsed(token: string): Promise<void>;
  deleteExpiredOnboardingTokens(): Promise<void>;
  
  // Password reset token operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  
  // Driver operations
  getDrivers(): Promise<Driver[]>;
  getActiveDrivers(): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByPhone(phone: string): Promise<Driver | undefined>;
  searchDriversByPhone(phonePartial: string): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(driver: UpdateDriver): Promise<Driver>;
  deleteDriver(id: string): Promise<void>;
  
  // Corporate bookings
  createCorporateBooking(booking: InsertCorporateBooking): Promise<CorporateBooking>;
  getCorporateBooking(id: string): Promise<CorporateBooking | undefined>;
  getCorporateBookings(): Promise<CorporateBooking[]>;
  getCorporateBookingsByUser(userId: string): Promise<CorporateBooking[]>;
  updateCorporateBooking(id: string, data: Partial<Omit<CorporateBooking, 'id' | 'referenceId' | 'userId' | 'createdAt'>>): Promise<CorporateBooking>;
  
  // Rental bookings
  createRentalBooking(booking: InsertRentalBooking): Promise<RentalBooking>;
  getRentalBooking(id: string): Promise<RentalBooking | undefined>;
  getRentalBookings(): Promise<RentalBooking[]>;
  getRentalBookingsByUser(userId: string): Promise<RentalBooking[]>;
  getRentalBookingsByPhone(phone: string): Promise<RentalBooking[]>;
  getCorporateBookingsByPhone(phone: string): Promise<CorporateBooking[]>;
  assignDriverToRental(rentalId: string, driverId: string): Promise<RentalBooking>;
  updateRentalBooking(id: string, data: Partial<Omit<RentalBooking, 'id' | 'referenceId' | 'userId' | 'driverId' | 'createdAt'>>): Promise<RentalBooking>;
  
  // Vendor registrations
  createVendorRegistration(vendor: InsertVendorRegistration): Promise<VendorRegistration>;
  getVendorRegistration(id: string): Promise<VendorRegistration | undefined>;
  getVendorRegistrations(): Promise<VendorRegistration[]>;
  updateVendorRegistration(id: string, data: Partial<Omit<VendorRegistration, 'id' | 'referenceId' | 'createdAt'>>): Promise<VendorRegistration>;
  
  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  getContactMessages(): Promise<ContactMessage[]>;
  updateContactMessage(id: string, data: Partial<Omit<ContactMessage, 'id' | 'referenceId' | 'createdAt'>>): Promise<ContactMessage>;
  
  // Blog posts
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getBlogPosts(): Promise<BlogPost[]>;
  getPublishedBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  
  // Portfolio clients
  createPortfolioClient(client: InsertPortfolioClient): Promise<PortfolioClient>;
  getPortfolioClients(): Promise<PortfolioClient[]>;
  updatePortfolioClient(client: UpdatePortfolioClient): Promise<PortfolioClient>;
  deletePortfolioClient(id: string): Promise<void>;
  
  // Admin blog operations
  getAllBlogPosts(): Promise<BlogPost[]>;
  updateBlogPost(post: UpdateBlogPost): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  
  // Bangladesh locations
  getBangladeshLocations(): Promise<BangladeshLocation[]>;
  searchBangladeshLocations(query: string): Promise<BangladeshLocation[]>;
  importComprehensiveBangladeshLocations(): Promise<void>;
  
  // Marketing settings
  getMarketingSettings(): Promise<MarketingSettings | null>;
  createMarketingSettings(settings: InsertMarketingSettings): Promise<MarketingSettings>;
  updateMarketingSettings(settings: UpdateMarketingSettings): Promise<MarketingSettings | null>;
  deleteMarketingSettings(id: string): Promise<boolean>;
  
  // Legal pages
  getLegalPages(): Promise<LegalPage[]>;
  getLegalPage(id: string): Promise<LegalPage | undefined>;
  getLegalPageByType(type: 'terms' | 'privacy'): Promise<LegalPage | undefined>;
  createLegalPage(page: InsertLegalPage): Promise<LegalPage>;
  updateLegalPage(page: UpdateLegalPage): Promise<LegalPage | null>;
  deleteLegalPage(id: string): Promise<boolean>;
  
  // Website settings
  getWebsiteSettings(): Promise<WebsiteSettings | null>;
  createWebsiteSettings(settings: InsertWebsiteSettings): Promise<WebsiteSettings>;
  updateWebsiteSettings(settings: UpdateWebsiteSettings): Promise<WebsiteSettings | null>;
  deleteWebsiteSettings(id: string): Promise<boolean>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  markNotificationEmailSent(id: string): Promise<void>;
  
  // Status history
  createStatusHistory(history: InsertSubmissionStatusHistory): Promise<SubmissionStatusHistory>;
  getStatusHistoryByReferenceId(referenceId: string): Promise<SubmissionStatusHistory[]>;
  getStatusHistoryBySubmission(submissionType: string, submissionId: string): Promise<SubmissionStatusHistory[]>;
  updateSubmissionStatus(
    submissionType: 'corporate' | 'rental' | 'vendor' | 'contact',
    submissionId: string,
    referenceId: string,
    newStatus: string,
    changedByUserId: string | null
  ): Promise<{ submission: any, history: SubmissionStatusHistory }>;
  
  // Survey operations
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurveyByToken(token: string): Promise<Survey | undefined>;
  getSurveyByReferenceId(referenceId: string): Promise<Survey | undefined>;
  updateSurveyResponse(token: string, npsScore: number, feedback?: string): Promise<Survey>;
  
  // Carpool route operations
  getCarpoolRoutes(): Promise<CarpoolRoute[]>;
  getActiveCarpoolRoutes(): Promise<CarpoolRoute[]>;
  getCarpoolRoute(id: string): Promise<CarpoolRoute | undefined>;
  createCarpoolRoute(route: InsertCarpoolRoute): Promise<CarpoolRoute>;
  updateCarpoolRoute(route: UpdateCarpoolRoute): Promise<CarpoolRoute>;
  deleteCarpoolRoute(id: string): Promise<void>;
  
  // Carpool pickup point operations
  getCarpoolPickupPoints(routeId: string, pointType?: string): Promise<CarpoolPickupPoint[]>;
  getCarpoolPickupPoint(id: string): Promise<CarpoolPickupPoint | undefined>;
  createCarpoolPickupPoint(pickupPoint: InsertCarpoolPickupPoint): Promise<CarpoolPickupPoint>;
  updateCarpoolPickupPoint(id: string, data: Partial<Omit<CarpoolPickupPoint, 'id' | 'createdAt'>>): Promise<CarpoolPickupPoint>;
  deleteCarpoolPickupPoint(id: string): Promise<void>;
  
  // Carpool time slot operations
  getAllCarpoolTimeSlots(): Promise<CarpoolTimeSlot[]>;
  getCarpoolTimeSlots(routeId: string): Promise<CarpoolTimeSlot[]>;
  getActiveCarpoolTimeSlots(routeId: string): Promise<CarpoolTimeSlot[]>;
  getCarpoolTimeSlot(id: string): Promise<CarpoolTimeSlot | undefined>;
  createCarpoolTimeSlot(timeSlot: InsertCarpoolTimeSlot): Promise<CarpoolTimeSlot>;
  updateCarpoolTimeSlot(id: string, data: Partial<Omit<CarpoolTimeSlot, 'id' | 'createdAt'>>): Promise<CarpoolTimeSlot>;
  deleteCarpoolTimeSlot(id: string): Promise<void>;
  
  // Carpool booking operations
  getCarpoolBookings(): Promise<CarpoolBooking[]>;
  getCarpoolBooking(id: string): Promise<CarpoolBooking | undefined>;
  getCarpoolBookingByShareToken(token: string): Promise<CarpoolBooking | undefined>;
  getCarpoolBookingsByUser(userId: string): Promise<CarpoolBooking[]>;
  getCarpoolBookingsByPhone(phone: string): Promise<CarpoolBooking[]>;
  getCarpoolBookingsByRouteAndDate(routeId: string, timeSlotId: string, travelDate: string): Promise<CarpoolBooking[]>;
  createCarpoolBooking(booking: InsertCarpoolBooking): Promise<CarpoolBooking>;
  updateCarpoolBooking(booking: UpdateCarpoolBooking): Promise<CarpoolBooking>;
  assignDriverToCarpool(bookingId: string, driverId: string): Promise<CarpoolBooking>;
  updateCarpoolBookingStatus(id: string, status: string): Promise<CarpoolBooking>;
  deleteCarpoolBooking(id: string): Promise<void>;
  getCarpoolBookingsByPickupPoint(pickupPointId: string): Promise<CarpoolBooking[]>;
  getCarpoolBookingsByTimeSlot(timeSlotId: string): Promise<CarpoolBooking[]>;
  getSubscriptionsByPickupPoint(pickupPointId: string): Promise<Subscription[]>;
  getSubscriptionsByTimeSlot(timeSlotId: string): Promise<Subscription[]>;
  getTripsByTimeSlot(timeSlotId: string): Promise<VehicleTrip[]>;
  
  // Carpool blackout date operations
  getCarpoolBlackoutDates(): Promise<CarpoolBlackoutDate[]>;
  getActiveCarpoolBlackoutDates(): Promise<CarpoolBlackoutDate[]>;
  getCarpoolBlackoutDate(id: string): Promise<CarpoolBlackoutDate | undefined>;
  createCarpoolBlackoutDate(blackoutDate: InsertCarpoolBlackoutDate): Promise<CarpoolBlackoutDate>;
  updateCarpoolBlackoutDate(id: string, data: Partial<Omit<CarpoolBlackoutDate, 'id' | 'createdAt'>>): Promise<CarpoolBlackoutDate>;
  deleteCarpoolBlackoutDate(id: string): Promise<void>;
  
  // Wallet operations
  getUserWallet(userId: string): Promise<UserWallet | undefined>;
  createUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  updateWalletBalance(walletId: string, amount: number): Promise<UserWallet>;
  
  // Wallet transaction operations
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;
  getWalletTransactionsByUser(userId: string): Promise<WalletTransaction[]>;
  
  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getActiveSubscriptionsByUser(userId: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]>;
  getAllSubscriptionsByUser(userId: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]>;
  getActiveSubscriptions(): Promise<Subscription[]>;
  updateSubscription(id: string, data: Partial<Omit<Subscription, 'id' | 'userId' | 'createdAt'>>): Promise<Subscription>;
  cancelSubscription(id: string): Promise<Subscription>;
  
  // Subscription invoice operations
  createSubscriptionInvoice(invoice: InsertSubscriptionInvoice): Promise<SubscriptionInvoice>;
  getSubscriptionInvoice(id: string): Promise<SubscriptionInvoice | undefined>;
  getInvoicesByUser(userId: string): Promise<SubscriptionInvoice[]>;
  getInvoicesBySubscription(subscriptionId: string): Promise<SubscriptionInvoice[]>;
  updateInvoice(id: string, data: Partial<Omit<SubscriptionInvoice, 'id' | 'createdAt'>>): Promise<SubscriptionInvoice>;
  generateInvoiceNumber(): Promise<string>;
  
  // Vehicle trip operations
  createVehicleTrip(trip: InsertVehicleTrip): Promise<VehicleTrip>;
  getVehicleTrip(id: string): Promise<VehicleTrip | undefined>;
  getVehicleTripsByDate(tripDate: string): Promise<VehicleTrip[]>;
  getVehicleTripsByRouteAndDate(routeId: string, tripDate: string): Promise<VehicleTrip[]>;
  updateVehicleTrip(id: string, data: Partial<Omit<VehicleTrip, 'id' | 'createdAt'>>): Promise<VehicleTrip>;
  assignDriverToVehicleTrip(tripId: string, driverId: string): Promise<VehicleTrip>;
  
  // Trip booking operations
  createTripBooking(booking: InsertTripBooking): Promise<TripBooking>;
  getTripBooking(id: string): Promise<TripBooking | undefined>;
  getTripBookingsByUser(userId: string): Promise<TripBooking[]>;
  getTripBookingsByVehicleTrip(vehicleTripId: string): Promise<TripBooking[]>;
  updateTripBooking(id: string, data: Partial<Omit<TripBooking, 'id' | 'createdAt'>>): Promise<TripBooking>;
  getAllTripBookingsForAdmin(): Promise<{
    id: string;
    vehicleTripId: string | null;
    subscriptionId: string | null;
    userId: string | null;
    status: string;
    pickupSequence: number | null;
    createdAt: Date;
    bookingType: 'subscription' | 'individual';
    tripReferenceId: string | null;
    tripDate: string | null;
    tripStatus: string | null;
    customerName: string | null;
    customerPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    departureTime: string | null;
    boardingPointName: string | null;
    dropOffPointName: string | null;
    driverName: string | null;
    driverPhone: string | null;
    vehicleType: string | null;
    referenceId: string | null;
  }[]>;
  
  // Complaint operations
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  getComplaint(id: string): Promise<Complaint | undefined>;
  getComplaintsByUser(userId: string): Promise<Complaint[]>;
  getComplaintsByStatus(status: string): Promise<Complaint[]>;
  getAllComplaints(filters?: { 
    status?: string; 
    severity?: string; 
    dateFrom?: Date; 
    dateTo?: Date 
  }): Promise<Complaint[]>;
  updateComplaint(id: string, data: Partial<Omit<Complaint, 'id' | 'createdAt'>>): Promise<Complaint>;
  updateComplaintStatus(id: string, status: string, resolution: string | null, resolvedByUserId: string | null): Promise<Complaint>;
  getComplaintStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    resolutionRate: number;
  }>;
  getUserTripBookings(userId: string, daysBack?: number): Promise<TripBooking[]>;
  
  // Admin subscription operations
  getAllSubscriptions(): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
    weekdays: string[];
  })[]>;
  getSubscriptionsByStatus(status: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]>;
  getAllSubscriptionsWithDetails(): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]>;
  getSubscriptionWithDetails(id: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  }) | undefined>;
  getSubscriptionStats(): Promise<{
    totalActive: number;
    totalPendingCancellation: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageSubscriptionValue: number;
    subscriptionsByRoute: Array<{ routeId: string; routeName: string; count: number; revenue: number; }>;
  }>;
  
  // Admin wallet operations
  getWalletTransactionsWithDetails(walletId: string): Promise<WalletTransaction[]>;
  getAllWallets(): Promise<(UserWallet & {
    userName: string;
    userPhone: string;
    lastTransactionDate: Date | null;
    totalCredits: number;
    totalDebits: number;
  })[]>;
  adminAdjustWalletBalance(
    walletId: string,
    amount: number,
    type: 'credit' | 'debit',
    reason: string,
    adminUserId: string
  ): Promise<WalletTransaction>;
  
  // AI Trip Generator operations
  getCarpoolRouteById(id: string): Promise<CarpoolRoute | undefined>;
  getCarpoolTimeSlotById(id: string): Promise<CarpoolTimeSlot | undefined>;
  getCarpoolPickupPointById(id: string): Promise<CarpoolPickupPoint | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  isBlackoutDate(date: Date): Promise<boolean>;
  getActiveSubscriptionsByWeekday(weekday: number): Promise<Subscription[]>;
  createAIGeneratedTrip(trip: {
    tripReferenceId: string;
    routeId: string;
    timeSlotId: string;
    tripDate: string;
    vehicleCapacity: number;
    recommendedVehicleType: string;
    status: string;
    generatedBy: string;
    aiConfidenceScore: string;
    aiRationale: string;
  }): Promise<VehicleTrip>;
  createTripBookingFromSubscription(booking: {
    vehicleTripId: string;
    subscriptionId: string;
    userId: string;
    boardingPointId: string;
    dropOffPointId: string;
    pickupSequence: number;
  }): Promise<TripBooking>;
  getVehicleTripByReferenceId(tripReferenceId: string): Promise<VehicleTrip | undefined>;
  getVehicleTripsWithDetails(tripDate: string): Promise<(VehicleTrip & {
    routeName: string;
    fromLocation: string;
    toLocation: string;
    departureTimeSlot: string;
    driverName: string | null;
    driverPhone: string | null;
    passengerCount: number;
    passengers: {
      id: string;
      userName: string;
      userPhone: string;
      boardingPointName: string;
      dropOffPointName: string;
      pickupSequence: number | null;
      status: string;
    }[];
  })[]>;
  mergeVehicleTrips(targetTripId: string, sourceTripId: string): Promise<VehicleTrip>;
  
  // Admin subscription cancellation with refund
  adminCancelSubscription(subscriptionId: string, adminId: string, reason: string): Promise<{ subscription: Subscription; refundAmount: number }>;
  
  // Admin manual refund operations
  issueManualRefund(userId: string, amount: number, reason: string, adminId: string): Promise<WalletTransaction>;
  
  // User ban/unban operations
  banUser(userId: string, adminId: string, reason: string): Promise<User>;
  unbanUser(userId: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // Helper to create fallback user query without ban columns
  private async selectUserWithFallback(whereClause: any): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(whereClause);
      return user || undefined;
    } catch (error: any) {
      // Fallback for production where ban columns might not exist yet
      if (error.message?.includes('is_banned') || error.message?.includes('banned_at') || 
          error.message?.includes('ban_reason') || error.message?.includes('banned_by')) {
        console.log('[Storage] Ban columns not found, using fallback query');
        const [user] = await db.select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          name: users.name,
          password: users.password,
          role: users.role,
          permissions: users.permissions,
          temporaryPassword: users.temporaryPassword,
          officeLocation: users.officeLocation,
          homeLocation: users.homeLocation,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin,
        }).from(users).where(whereClause);
        if (user) {
          return { ...user, isBanned: false, bannedAt: null, banReason: null, bannedBy: null } as User;
        }
        return undefined;
      }
      throw error;
    }
  }
  
  private async selectUsersWithFallback(whereClause: any): Promise<User[]> {
    try {
      return await db.select().from(users).where(whereClause);
    } catch (error: any) {
      // Fallback for production where ban columns might not exist yet
      if (error.message?.includes('is_banned') || error.message?.includes('banned_at') || 
          error.message?.includes('ban_reason') || error.message?.includes('banned_by')) {
        console.log('[Storage] Ban columns not found, using fallback query for multiple users');
        const userList = await db.select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          name: users.name,
          password: users.password,
          role: users.role,
          permissions: users.permissions,
          temporaryPassword: users.temporaryPassword,
          officeLocation: users.officeLocation,
          homeLocation: users.homeLocation,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin,
        }).from(users).where(whereClause);
        return userList.map(user => ({ 
          ...user, 
          isBanned: false, 
          bannedAt: null, 
          banReason: null, 
          bannedBy: null 
        } as User));
      }
      throw error;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.selectUserWithFallback(eq(users.id, id));
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return this.selectUserWithFallback(eq(users.phone, phone));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    return this.selectUserWithFallback(eq(users.email, email));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        role: 'customer',
        permissions: {},
        temporaryPassword: false
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: 'customer' | 'employee' | 'superadmin'): Promise<User[]> {
    return this.selectUsersWithFallback(eq(users.role, role));
  }

  async getUsersWithDriverAssignmentPermission(): Promise<User[]> {
    // Get all superadmins (they have all permissions by default)
    const superadmins = await this.selectUsersWithFallback(eq(users.role, 'superadmin'));
    
    // Get employees with driverAssignment permission set to true
    const employees = await this.selectUsersWithFallback(eq(users.role, 'employee'));
    const employeesWithPermission = employees.filter(emp => 
      emp.permissions && (emp.permissions as any).driverAssignment === true
    );
    
    return [...superadmins, ...employeesWithPermission];
  }

  async linkExistingBookingsToUser(userId: string, phone: string): Promise<void> {
    // Link corporate bookings
    await db
      .update(corporateBookings)
      .set({ userId })
      .where(eq(corporateBookings.phone, phone));
    
    // Link rental bookings
    await db
      .update(rentalBookings)
      .set({ userId })
      .where(eq(rentalBookings.phone, phone));
  }

  // Onboarding token operations
  async createOnboardingToken(tokenData: InsertOnboardingToken): Promise<OnboardingToken> {
    const [token] = await db
      .insert(onboardingTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getOnboardingToken(token: string): Promise<OnboardingToken | undefined> {
    const [onboardingToken] = await db
      .select()
      .from(onboardingTokens)
      .where(eq(onboardingTokens.token, token));
    return onboardingToken || undefined;
  }

  async markOnboardingTokenAsUsed(token: string): Promise<void> {
    await db
      .update(onboardingTokens)
      .set({ used: true })
      .where(eq(onboardingTokens.token, token));
  }

  async deleteExpiredOnboardingTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(onboardingTokens)
      .where(lt(onboardingTokens.expiresAt, now));
  }

  // Password reset token operations
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    const now = new Date();
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, now));
  }

  // Driver operations
  async getDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(desc(drivers.createdAt));
  }

  async getActiveDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).where(eq(drivers.isActive, true));
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async getDriverByPhone(phone: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone));
    return driver || undefined;
  }

  async searchDriversByPhone(phonePartial: string): Promise<Driver[]> {
    return await db.select().from(drivers).where(like(drivers.phone, `%${phonePartial}%`)).limit(10);
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriver(driverData: UpdateDriver): Promise<Driver> {
    const [driver] = await db
      .update(drivers)
      .set({
        ...driverData,
        updatedAt: new Date()
      })
      .where(eq(drivers.id, driverData.id))
      .returning();
    return driver;
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  async createCorporateBooking(booking: InsertCorporateBooking): Promise<CorporateBooking> {
    const [newBooking] = await db
      .insert(corporateBookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async getCorporateBooking(id: string): Promise<CorporateBooking | undefined> {
    const [booking] = await db.select().from(corporateBookings).where(eq(corporateBookings.id, id));
    return booking || undefined;
  }

  async getCorporateBookings(): Promise<CorporateBooking[]> {
    return await db.select().from(corporateBookings).orderBy(desc(corporateBookings.createdAt));
  }

  async getCorporateBookingsByUser(userId: string): Promise<CorporateBooking[]> {
    return await db.select().from(corporateBookings)
      .where(eq(corporateBookings.userId, userId))
      .orderBy(desc(corporateBookings.createdAt));
  }

  async updateCorporateBooking(id: string, data: Partial<Omit<CorporateBooking, 'id' | 'referenceId' | 'userId' | 'createdAt'>>): Promise<CorporateBooking> {
    const [booking] = await db
      .update(corporateBookings)
      .set(data)
      .where(eq(corporateBookings.id, id))
      .returning();
    return booking;
  }

  async createRentalBooking(booking: InsertRentalBooking): Promise<RentalBooking> {
    const [newBooking] = await db
      .insert(rentalBookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async getRentalBooking(id: string): Promise<RentalBooking | undefined> {
    const [booking] = await db.select().from(rentalBookings).where(eq(rentalBookings.id, id));
    return booking || undefined;
  }

  async getRentalBookings(): Promise<RentalBooking[]> {
    return await db.select().from(rentalBookings).orderBy(desc(rentalBookings.createdAt));
  }

  async getRentalBookingsByUser(userId: string): Promise<RentalBooking[]> {
    return await db.select().from(rentalBookings)
      .where(eq(rentalBookings.userId, userId))
      .orderBy(desc(rentalBookings.createdAt));
  }

  async getRentalBookingsByPhone(phone: string): Promise<RentalBooking[]> {
    return await db.select().from(rentalBookings)
      .where(eq(rentalBookings.phone, phone))
      .orderBy(desc(rentalBookings.createdAt));
  }

  async getCorporateBookingsByPhone(phone: string): Promise<CorporateBooking[]> {
    return await db.select().from(corporateBookings)
      .where(eq(corporateBookings.phone, phone))
      .orderBy(desc(corporateBookings.createdAt));
  }

  async assignDriverToRental(rentalId: string, driverId: string): Promise<RentalBooking> {
    const [booking] = await db
      .update(rentalBookings)
      .set({ driverId })
      .where(eq(rentalBookings.id, rentalId))
      .returning();
    return booking;
  }

  async updateRentalBooking(id: string, data: Partial<Omit<RentalBooking, 'id' | 'referenceId' | 'userId' | 'driverId' | 'createdAt'>>): Promise<RentalBooking> {
    const [booking] = await db
      .update(rentalBookings)
      .set(data)
      .where(eq(rentalBookings.id, id))
      .returning();
    return booking;
  }

  async createVendorRegistration(vendor: InsertVendorRegistration): Promise<VendorRegistration> {
    const [newVendor] = await db
      .insert(vendorRegistrations)
      .values({
        ...vendor,
        vehicleTypes: vendor.vehicleTypes as string[] || []
      })
      .returning();
    return newVendor;
  }

  async getVendorRegistration(id: string): Promise<VendorRegistration | undefined> {
    const [vendor] = await db.select().from(vendorRegistrations).where(eq(vendorRegistrations.id, id));
    return vendor || undefined;
  }

  async getVendorRegistrations(): Promise<VendorRegistration[]> {
    return await db.select().from(vendorRegistrations).orderBy(desc(vendorRegistrations.createdAt));
  }

  async updateVendorRegistration(id: string, data: Partial<Omit<VendorRegistration, 'id' | 'referenceId' | 'createdAt'>>): Promise<VendorRegistration> {
    const [vendor] = await db
      .update(vendorRegistrations)
      .set(data)
      .where(eq(vendorRegistrations.id, id))
      .returning();
    return vendor;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message || undefined;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async updateContactMessage(id: string, data: Partial<Omit<ContactMessage, 'id' | 'referenceId' | 'createdAt'>>): Promise<ContactMessage> {
    const [message] = await db
      .update(contactMessages)
      .set(data)
      .where(eq(contactMessages.id, id))
      .returning();
    return message;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    // Generate unique slug to avoid duplicates
    const uniqueSlug = await this.generateUniqueSlug(post.slug);
    
    const [newPost] = await db
      .insert(blogPosts)
      .values({
        ...post,
        slug: uniqueSlug,
        tags: post.tags as string[] || []
      })
      .returning();
    return newPost;
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts)
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post || undefined;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post || undefined;
  }

  // Generate a unique slug by checking for duplicates and adding numbers
  async generateUniqueSlug(baseSlug: string): Promise<string> {
    let uniqueSlug = baseSlug;
    let counter = 1;
    
    while (await this.getBlogPostBySlug(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return uniqueSlug;
  }

  async createPortfolioClient(client: InsertPortfolioClient): Promise<PortfolioClient> {
    const [newClient] = await db
      .insert(portfolioClients)
      .values({
        ...client,
        images: client.images as string[] || []
      })
      .returning();
    return newClient;
  }

  async getPortfolioClients(): Promise<PortfolioClient[]> {
    return await db.select().from(portfolioClients).orderBy(desc(portfolioClients.createdAt));
  }

  async updatePortfolioClient(client: UpdatePortfolioClient): Promise<PortfolioClient> {
    const [updatedClient] = await db
      .update(portfolioClients)
      .set({
        ...client,
        images: client.images as string[] || []
      })
      .where(eq(portfolioClients.id, client.id))
      .returning();
    return updatedClient;
  }

  async deletePortfolioClient(id: string): Promise<void> {
    await db.delete(portfolioClients).where(eq(portfolioClients.id, id));
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async updateBlogPost(post: UpdateBlogPost): Promise<BlogPost> {
    const [updatedPost] = await db
      .update(blogPosts)
      .set({
        ...post,
        tags: post.tags as string[] || [],
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, post.id))
      .returning();
    return updatedPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async getBangladeshLocations(): Promise<BangladeshLocation[]> {
    return await db.select().from(bangladeshLocations).orderBy(bangladeshLocations.fullLocationEn);
  }

  async searchBangladeshLocations(query: string): Promise<BangladeshLocation[]> {
    const searchTerm = `%${query}%`;
    return await db
      .select()
      .from(bangladeshLocations)
      .where(
        or(
          ilike(bangladeshLocations.postOffice, searchTerm),
          ilike(bangladeshLocations.upazilaName, searchTerm),
          ilike(bangladeshLocations.districtName, searchTerm),
          ilike(bangladeshLocations.divisionName, searchTerm),
          ilike(bangladeshLocations.fullLocationEn, searchTerm),
          ilike(bangladeshLocations.searchText, searchTerm)
        )
      )
      .orderBy(bangladeshLocations.fullLocationEn)
      .limit(15);
  }

  async importComprehensiveBangladeshLocations(): Promise<void> {
    try {
      console.log("Fetching comprehensive Bangladesh location data...");
      
      // Fetch all data from GitHub repository
      const [divisionsRes, districtsRes, upazilasRes, postcodesRes] = await Promise.all([
        fetch('https://raw.githubusercontent.com/ifahimreza/bangladesh-geojson/master/bd-divisions.json'),
        fetch('https://raw.githubusercontent.com/ifahimreza/bangladesh-geojson/master/bd-districts.json'),
        fetch('https://raw.githubusercontent.com/ifahimreza/bangladesh-geojson/master/bd-upazilas.json'),
        fetch('https://raw.githubusercontent.com/ifahimreza/bangladesh-geojson/master/bd-postcodes.json')
      ]);

      const [divisionsData, districtsData, upazilasData, postcodesData] = await Promise.all([
        divisionsRes.json(),
        districtsRes.json(),
        upazilasRes.json(),
        postcodesRes.json()
      ]);

      console.log("Data fetched successfully, processing...");

      // Create lookup maps for faster processing
      const divisionsMap = new Map(
        divisionsData.divisions.map((div: any) => [div.id, div])
      );
      const districtsMap = new Map(
        districtsData.districts.map((dist: any) => [dist.id, dist])
      );
      const upazilasMap = new Map(
        upazilasData.upazilas.map((upz: any) => [upz.id, upz])
      );

      // Clear existing data
      await db.delete(bangladeshLocations);

      const processedLocations: any[] = [];
      let processedCount = 0;

      // Process postcodes data to create comprehensive location entries
      for (const postcode of postcodesData.postcodes) {
        const division = divisionsMap.get(postcode.division_id);
        const district = districtsMap.get(postcode.district_id);
        
        if (!division || !district) continue;

        // Find matching upazila
        const upazila = Array.from(upazilasMap.values()).find(
          (u: any) => u.district_id === postcode.district_id && 
                     u.name.toLowerCase().includes(postcode.upazila.toLowerCase().replace(' sadar', '').replace(' upo', ''))
        );

        // Create search text combining all searchable fields
        const searchParts = [
          postcode.postOffice,
          postcode.upazila,
          (district as any).name,
          (division as any).name,
          (district as any).bn_name,
          (division as any).bn_name
        ].filter(Boolean);

        // Create display name: "Post Office, Upazila, District, Division (PostCode)"
        const fullLocationEn = `${postcode.postOffice}, ${postcode.upazila}, ${(district as any).name}, ${(division as any).name} (${postcode.postCode})`;
        const fullLocationBn = (upazila as any)?.bn_name ? 
          `${postcode.postOffice}, ${(upazila as any).bn_name}, ${(district as any).bn_name}, ${(division as any).bn_name} (${postcode.postCode})` : null;

        const locationEntry = {
          divisionId: (division as any).id,
          divisionName: (division as any).name,
          divisionNameBn: (division as any).bn_name,
          divisionLat: (division as any).lat ? Number((division as any).lat) : null,
          divisionLng: (division as any).long ? Number((division as any).long) : null,
          
          districtId: (district as any).id,
          districtName: (district as any).name,
          districtNameBn: (district as any).bn_name,
          districtLat: (district as any).lat ? Number((district as any).lat) : null,
          districtLng: (district as any).long ? Number((district as any).long) : null,
          
          upazilaId: (upazila as any)?.id || null,
          upazilaName: postcode.upazila,
          upazilaNameBn: (upazila as any)?.bn_name || null,
          
          postOffice: postcode.postOffice,
          postCode: postcode.postCode,
          
          fullLocationEn,
          fullLocationBn,
          searchText: searchParts.join(' ').toLowerCase(),
          locationType: 'post_office' as const
        };

        processedLocations.push(locationEntry);
        processedCount++;

        // Batch insert every 100 records for better performance
        if (processedLocations.length >= 100) {
          await db.insert(bangladeshLocations).values(processedLocations);
          processedLocations.length = 0;
          console.log(`Processed ${processedCount} locations...`);
        }
      }

      // Insert remaining locations
      if (processedLocations.length > 0) {
        await db.insert(bangladeshLocations).values(processedLocations);
      }

      console.log(`Successfully imported ${processedCount} comprehensive Bangladesh locations`);
    } catch (error) {
      console.error("Error importing comprehensive Bangladesh locations:", error);
      throw error;
    }
  }

  // Marketing settings implementation
  async getMarketingSettings(): Promise<MarketingSettings | null> {
    const [settings] = await db.select().from(marketingSettings).limit(1);
    return settings || null;
  }

  async createMarketingSettings(settingsData: InsertMarketingSettings): Promise<MarketingSettings> {
    const [settings] = await db.insert(marketingSettings).values(settingsData).returning();
    return settings;
  }

  async updateMarketingSettings(settingsData: UpdateMarketingSettings): Promise<MarketingSettings | null> {
    const { id, ...updateData } = settingsData;
    const [settings] = await db
      .update(marketingSettings)
      .set({ 
        ...updateData, 
        conversionGoals: updateData.conversionGoals || [],
        updatedAt: new Date() 
      })
      .where(eq(marketingSettings.id, id))
      .returning();
    return settings || null;
  }

  async deleteMarketingSettings(id: string): Promise<boolean> {
    const result = await db.delete(marketingSettings).where(eq(marketingSettings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Legal pages implementation
  async getLegalPages(): Promise<LegalPage[]> {
    return await db.select().from(legalPages).orderBy(desc(legalPages.updatedAt));
  }

  async getLegalPage(id: string): Promise<LegalPage | undefined> {
    const [page] = await db.select().from(legalPages).where(eq(legalPages.id, id));
    return page || undefined;
  }

  async getLegalPageByType(type: 'terms' | 'privacy'): Promise<LegalPage | undefined> {
    const [page] = await db.select().from(legalPages).where(eq(legalPages.type, type));
    return page || undefined;
  }

  async createLegalPage(pageData: InsertLegalPage): Promise<LegalPage> {
    const [page] = await db.insert(legalPages).values(pageData).returning();
    return page;
  }

  async updateLegalPage(pageData: UpdateLegalPage): Promise<LegalPage | null> {
    const { id, ...updateData } = pageData;
    const [page] = await db
      .update(legalPages)
      .set({ ...updateData, updatedAt: new Date(), lastUpdated: new Date() })
      .where(eq(legalPages.id, id))
      .returning();
    return page || null;
  }

  async deleteLegalPage(id: string): Promise<boolean> {
    const result = await db.delete(legalPages).where(eq(legalPages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Website settings implementation
  async getWebsiteSettings(): Promise<WebsiteSettings | null> {
    const [settings] = await db.select().from(websiteSettings).limit(1);
    return settings || null;
  }

  async createWebsiteSettings(settingsData: InsertWebsiteSettings): Promise<WebsiteSettings> {
    const [settings] = await db.insert(websiteSettings).values(settingsData).returning();
    return settings;
  }

  async updateWebsiteSettings(settingsData: UpdateWebsiteSettings): Promise<WebsiteSettings | null> {
    const { id, ...updateData } = settingsData;
    const [settings] = await db
      .update(websiteSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(websiteSettings.id, id))
      .returning();
    return settings || null;
  }

  async deleteWebsiteSettings(id: string): Promise<boolean> {
    const result = await db.delete(websiteSettings).where(eq(websiteSettings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Notifications implementation
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        sql`${notifications.userId} = ${userId} AND ${notifications.isRead} = false`
      )
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async markNotificationEmailSent(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ emailSent: true })
      .where(eq(notifications.id, id));
  }

  // Status history operations
  async createStatusHistory(history: InsertSubmissionStatusHistory): Promise<SubmissionStatusHistory> {
    const [statusHistory] = await db
      .insert(submissionStatusHistory)
      .values(history)
      .returning();
    return statusHistory;
  }

  async getStatusHistoryByReferenceId(referenceId: string): Promise<SubmissionStatusHistory[]> {
    return await db
      .select()
      .from(submissionStatusHistory)
      .where(eq(submissionStatusHistory.referenceId, referenceId))
      .orderBy(desc(submissionStatusHistory.createdAt));
  }

  async getStatusHistoryBySubmission(submissionType: string, submissionId: string): Promise<SubmissionStatusHistory[]> {
    return await db
      .select()
      .from(submissionStatusHistory)
      .where(
        and(
          eq(submissionStatusHistory.submissionType, submissionType),
          eq(submissionStatusHistory.submissionId, submissionId)
        )
      )
      .orderBy(desc(submissionStatusHistory.createdAt));
  }

  async updateSubmissionStatus(
    submissionType: 'corporate' | 'rental' | 'vendor' | 'contact',
    submissionId: string,
    referenceId: string,
    newStatus: string,
    changedByUserId: string | null
  ): Promise<{ submission: any, history: SubmissionStatusHistory }> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      let submission: any;
      let oldStatus: string | null = null;

      // Determine table and get current submission
      if (submissionType === 'corporate') {
        const [current] = await tx.select().from(corporateBookings).where(eq(corporateBookings.id, submissionId));
        if (!current) throw new Error('Submission not found');
        oldStatus = current.status;
        
        [submission] = await tx
          .update(corporateBookings)
          .set({ status: newStatus, statusUpdatedAt: new Date() })
          .where(eq(corporateBookings.id, submissionId))
          .returning();
      } else if (submissionType === 'rental') {
        const [current] = await tx.select().from(rentalBookings).where(eq(rentalBookings.id, submissionId));
        if (!current) throw new Error('Submission not found');
        oldStatus = current.status;
        
        [submission] = await tx
          .update(rentalBookings)
          .set({ status: newStatus, statusUpdatedAt: new Date() })
          .where(eq(rentalBookings.id, submissionId))
          .returning();
      } else if (submissionType === 'vendor') {
        const [current] = await tx.select().from(vendorRegistrations).where(eq(vendorRegistrations.id, submissionId));
        if (!current) throw new Error('Submission not found');
        oldStatus = current.status;
        
        [submission] = await tx
          .update(vendorRegistrations)
          .set({ status: newStatus, statusUpdatedAt: new Date() })
          .where(eq(vendorRegistrations.id, submissionId))
          .returning();
      } else {
        const [current] = await tx.select().from(contactMessages).where(eq(contactMessages.id, submissionId));
        if (!current) throw new Error('Submission not found');
        oldStatus = current.status;
        
        [submission] = await tx
          .update(contactMessages)
          .set({ status: newStatus, statusUpdatedAt: new Date() })
          .where(eq(contactMessages.id, submissionId))
          .returning();
      }

      // Create history entry
      const [history] = await tx
        .insert(submissionStatusHistory)
        .values({
          submissionType,
          submissionId,
          referenceId,
          changedByUserId,
          oldStatus,
          newStatus
        })
        .returning();

      return { submission, history };
    });
  }

  // Survey operations
  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [createdSurvey] = await db
      .insert(surveys)
      .values(survey)
      .returning();
    return createdSurvey;
  }

  async getSurveyByToken(token: string): Promise<Survey | undefined> {
    const [survey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.token, token));
    return survey || undefined;
  }

  async getSurveyByReferenceId(referenceId: string): Promise<Survey | undefined> {
    const [survey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.referenceId, referenceId))
      .orderBy(desc(surveys.createdAt));
    return survey || undefined;
  }

  async updateSurveyResponse(token: string, npsScore: number, feedback?: string): Promise<Survey> {
    // First, get the survey to check expiry
    const survey = await this.getSurveyByToken(token);
    if (!survey) {
      throw new Error('Survey not found');
    }
    
    // Check if survey has expired
    if (new Date() > new Date(survey.expiresAt)) {
      throw new Error('Survey has expired');
    }
    
    // Check if survey has already been submitted
    if (survey.submittedAt) {
      throw new Error('Survey has already been submitted');
    }
    
    // Update the survey response
    const [updatedSurvey] = await db
      .update(surveys)
      .set({ 
        npsScore, 
        feedback: feedback || null,
        submittedAt: new Date()
      })
      .where(eq(surveys.token, token))
      .returning();
    return updatedSurvey;
  }

  // Carpool route operations
  async getCarpoolRoutes(): Promise<CarpoolRoute[]> {
    return await db.select().from(carpoolRoutes).orderBy(carpoolRoutes.name);
  }

  async getActiveCarpoolRoutes(): Promise<CarpoolRoute[]> {
    return await db
      .select()
      .from(carpoolRoutes)
      .where(eq(carpoolRoutes.isActive, true))
      .orderBy(carpoolRoutes.name);
  }

  async getCarpoolRoute(id: string): Promise<CarpoolRoute | undefined> {
    const [route] = await db
      .select()
      .from(carpoolRoutes)
      .where(eq(carpoolRoutes.id, id));
    return route || undefined;
  }

  async createCarpoolRoute(route: InsertCarpoolRoute): Promise<CarpoolRoute> {
    const [created] = await db
      .insert(carpoolRoutes)
      .values(route)
      .returning();
    return created;
  }

  async updateCarpoolRoute(route: UpdateCarpoolRoute): Promise<CarpoolRoute> {
    if (!route.id) throw new Error('Route ID is required');
    const { id, ...updateData } = route;
    const [updated] = await db
      .update(carpoolRoutes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(carpoolRoutes.id, id))
      .returning();
    if (!updated) throw new Error('Route not found');
    return updated;
  }

  async deleteCarpoolRoute(id: string): Promise<void> {
    await db.delete(carpoolRoutes).where(eq(carpoolRoutes.id, id));
  }

  // Carpool pickup point operations
  async getCarpoolPickupPoints(routeId: string, pointType?: string): Promise<CarpoolPickupPoint[]> {
    const baseCondition = eq(carpoolPickupPoints.routeId, routeId);
    const whereCondition = pointType 
      ? and(baseCondition, eq(carpoolPickupPoints.pointType, pointType))
      : baseCondition;
    
    return await db
      .select()
      .from(carpoolPickupPoints)
      .where(whereCondition)
      .orderBy(carpoolPickupPoints.sequenceOrder);
  }

  async getCarpoolPickupPoint(id: string): Promise<CarpoolPickupPoint | undefined> {
    const [point] = await db
      .select()
      .from(carpoolPickupPoints)
      .where(eq(carpoolPickupPoints.id, id));
    return point || undefined;
  }

  async createCarpoolPickupPoint(pickupPoint: InsertCarpoolPickupPoint): Promise<CarpoolPickupPoint> {
    // Validate pointType - must be either "pickup" or "dropoff"
    if (pickupPoint.pointType && !['pickup', 'dropoff'].includes(pickupPoint.pointType)) {
      throw new Error(`Invalid pointType: ${pickupPoint.pointType}. Must be either "pickup" or "dropoff"`);
    }
    
    // Set default pointType if not provided
    const pointData = {
      ...pickupPoint,
      pointType: pickupPoint.pointType || 'pickup'
    };
    
    const [created] = await db
      .insert(carpoolPickupPoints)
      .values(pointData)
      .returning();
    return created;
  }

  async updateCarpoolPickupPoint(id: string, data: Partial<Omit<CarpoolPickupPoint, 'id' | 'createdAt'>>): Promise<CarpoolPickupPoint> {
    // Validate pointType if provided in update
    if (data.pointType && !['pickup', 'dropoff'].includes(data.pointType)) {
      throw new Error(`Invalid pointType: ${data.pointType}. Must be either "pickup" or "dropoff"`);
    }
    
    const [updated] = await db
      .update(carpoolPickupPoints)
      .set(data)
      .where(eq(carpoolPickupPoints.id, id))
      .returning();
    if (!updated) throw new Error('Pickup point not found');
    return updated;
  }

  async deleteCarpoolPickupPoint(id: string): Promise<void> {
    await db.delete(carpoolPickupPoints).where(eq(carpoolPickupPoints.id, id));
  }

  // Carpool time slot operations
  async getAllCarpoolTimeSlots(): Promise<CarpoolTimeSlot[]> {
    return await db
      .select()
      .from(carpoolTimeSlots)
      .orderBy(carpoolTimeSlots.departureTime);
  }

  async getCarpoolTimeSlots(routeId: string): Promise<CarpoolTimeSlot[]> {
    return await db
      .select()
      .from(carpoolTimeSlots)
      .where(eq(carpoolTimeSlots.routeId, routeId))
      .orderBy(carpoolTimeSlots.departureTime);
  }

  async getActiveCarpoolTimeSlots(routeId: string): Promise<CarpoolTimeSlot[]> {
    return await db
      .select()
      .from(carpoolTimeSlots)
      .where(and(
        eq(carpoolTimeSlots.routeId, routeId),
        eq(carpoolTimeSlots.isActive, true)
      ))
      .orderBy(carpoolTimeSlots.departureTime);
  }

  async getCarpoolTimeSlot(id: string): Promise<CarpoolTimeSlot | undefined> {
    const [slot] = await db
      .select()
      .from(carpoolTimeSlots)
      .where(eq(carpoolTimeSlots.id, id));
    return slot || undefined;
  }

  async createCarpoolTimeSlot(timeSlot: InsertCarpoolTimeSlot): Promise<CarpoolTimeSlot> {
    const [created] = await db
      .insert(carpoolTimeSlots)
      .values(timeSlot)
      .returning();
    return created;
  }

  async updateCarpoolTimeSlot(id: string, data: Partial<Omit<CarpoolTimeSlot, 'id' | 'createdAt'>>): Promise<CarpoolTimeSlot> {
    const [updated] = await db
      .update(carpoolTimeSlots)
      .set(data)
      .where(eq(carpoolTimeSlots.id, id))
      .returning();
    if (!updated) throw new Error('Time slot not found');
    return updated;
  }

  async deleteCarpoolTimeSlot(id: string): Promise<void> {
    await db.delete(carpoolTimeSlots).where(eq(carpoolTimeSlots.id, id));
  }

  // Carpool booking operations
  async getCarpoolBookings(): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .orderBy(desc(carpoolBookings.createdAt));
  }

  async getCarpoolBooking(id: string): Promise<CarpoolBooking | undefined> {
    const [booking] = await db
      .select()
      .from(carpoolBookings)
      .where(eq(carpoolBookings.id, id));
    return booking || undefined;
  }

  async getCarpoolBookingByShareToken(token: string): Promise<CarpoolBooking | undefined> {
    const [booking] = await db
      .select()
      .from(carpoolBookings)
      .where(and(
        eq(carpoolBookings.shareToken, token),
        sql`${carpoolBookings.shareTokenExpiry} > NOW()` // Token not expired
      ));
    return booking || undefined;
  }

  async getCarpoolBookingsByUser(userId: string): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .where(eq(carpoolBookings.userId, userId))
      .orderBy(desc(carpoolBookings.createdAt));
  }

  async getCarpoolBookingsByPhone(phone: string): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .where(eq(carpoolBookings.phone, phone))
      .orderBy(desc(carpoolBookings.createdAt));
  }

  async getCarpoolBookingsByRouteAndDate(routeId: string, timeSlotId: string, travelDate: string): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .where(and(
        eq(carpoolBookings.routeId, routeId),
        eq(carpoolBookings.timeSlotId, timeSlotId),
        eq(carpoolBookings.travelDate, travelDate)
      ))
      .orderBy(desc(carpoolBookings.createdAt));
  }

  async createCarpoolBooking(booking: InsertCarpoolBooking): Promise<CarpoolBooking> {
    // Generate a unique 6-character reference ID
    const referenceId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Generate a shareable link token (32 characters) and set expiry to 30 days
    const shareToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const shareTokenExpiry = new Date();
    shareTokenExpiry.setDate(shareTokenExpiry.getDate() + 30); // 30 days from now
    
    const [created] = await db
      .insert(carpoolBookings)
      .values({
        ...booking,
        referenceId,
        shareToken,
        shareTokenExpiry,
        status: 'pending'
      })
      .returning();
    return created;
  }

  async updateCarpoolBooking(booking: UpdateCarpoolBooking): Promise<CarpoolBooking> {
    if (!booking.id) throw new Error('Booking ID is required');
    const [updated] = await db
      .update(carpoolBookings)
      .set(booking)
      .where(eq(carpoolBookings.id, booking.id))
      .returning();
    if (!updated) throw new Error('Booking not found');
    return updated;
  }

  async assignDriverToCarpool(bookingId: string, driverId: string): Promise<CarpoolBooking> {
    const [updated] = await db
      .update(carpoolBookings)
      .set({ 
        driverId, 
        status: 'confirmed',
        statusUpdatedAt: new Date()
      })
      .where(eq(carpoolBookings.id, bookingId))
      .returning();
    if (!updated) throw new Error('Booking not found');
    return updated;
  }

  async updateCarpoolBookingStatus(id: string, status: string): Promise<CarpoolBooking> {
    const [updated] = await db
      .update(carpoolBookings)
      .set({ 
        status,
        statusUpdatedAt: new Date()
      })
      .where(eq(carpoolBookings.id, id))
      .returning();
    if (!updated) throw new Error('Booking not found');
    return updated;
  }

  async deleteCarpoolBooking(id: string): Promise<void> {
    // Delete related notifications first
    await db
      .delete(notifications)
      .where(eq(notifications.bookingId, id));
    
    // Delete the booking
    const result = await db
      .delete(carpoolBookings)
      .where(eq(carpoolBookings.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Booking not found');
    }
  }

  async getCarpoolBookingsByPickupPoint(pickupPointId: string): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .where(or(
        eq(carpoolBookings.boardingPointId, pickupPointId),
        eq(carpoolBookings.dropOffPointId, pickupPointId)
      ));
  }

  async getCarpoolBookingsByTimeSlot(timeSlotId: string): Promise<CarpoolBooking[]> {
    return await db
      .select()
      .from(carpoolBookings)
      .where(eq(carpoolBookings.timeSlotId, timeSlotId));
  }

  async getSubscriptionsByPickupPoint(pickupPointId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(or(
        eq(subscriptions.boardingPointId, pickupPointId),
        eq(subscriptions.dropOffPointId, pickupPointId)
      ));
  }

  async getSubscriptionsByTimeSlot(timeSlotId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.timeSlotId, timeSlotId));
  }

  async getTripsByTimeSlot(timeSlotId: string): Promise<VehicleTrip[]> {
    return await db
      .select()
      .from(vehicleTrips)
      .where(eq(vehicleTrips.timeSlotId, timeSlotId));
  }

  // Carpool blackout date operations
  async getCarpoolBlackoutDates(): Promise<CarpoolBlackoutDate[]> {
    return await db
      .select()
      .from(carpoolBlackoutDates)
      .orderBy(desc(carpoolBlackoutDates.startDate));
  }

  async getActiveCarpoolBlackoutDates(): Promise<CarpoolBlackoutDate[]> {
    return await db
      .select()
      .from(carpoolBlackoutDates)
      .where(eq(carpoolBlackoutDates.isActive, true))
      .orderBy(desc(carpoolBlackoutDates.startDate));
  }

  async getCarpoolBlackoutDate(id: string): Promise<CarpoolBlackoutDate | undefined> {
    const [blackoutDate] = await db
      .select()
      .from(carpoolBlackoutDates)
      .where(eq(carpoolBlackoutDates.id, id));
    return blackoutDate || undefined;
  }

  async createCarpoolBlackoutDate(blackoutDate: InsertCarpoolBlackoutDate): Promise<CarpoolBlackoutDate> {
    const [created] = await db
      .insert(carpoolBlackoutDates)
      .values(blackoutDate)
      .returning();
    return created;
  }

  async updateCarpoolBlackoutDate(id: string, data: Partial<Omit<CarpoolBlackoutDate, 'id' | 'createdAt'>>): Promise<CarpoolBlackoutDate> {
    const [updated] = await db
      .update(carpoolBlackoutDates)
      .set(data)
      .where(eq(carpoolBlackoutDates.id, id))
      .returning();
    if (!updated) throw new Error('Blackout date not found');
    return updated;
  }

  async deleteCarpoolBlackoutDate(id: string): Promise<void> {
    await db.delete(carpoolBlackoutDates).where(eq(carpoolBlackoutDates.id, id));
  }
  
  // Wallet operations
  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, userId));
    return wallet || undefined;
  }
  
  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const [created] = await db
      .insert(userWallets)
      .values(wallet)
      .returning();
    return created;
  }
  
  async updateWalletBalance(walletId: string, amount: number): Promise<UserWallet> {
    // Start a transaction for atomic operations
    return await db.transaction(async (tx) => {
      // Fetch current wallet to get current balance
      const [currentWallet] = await tx
        .select()
        .from(userWallets)
        .where(eq(userWallets.id, walletId));
      
      if (!currentWallet) {
        throw new Error('Wallet not found');
      }
      
      // Calculate new balance (amount is delta: positive for credit, negative for debit)
      const currentBalance = parseFloat(currentWallet.balance);
      const newBalance = currentBalance + amount;
      
      // Overdraft protection: prevent negative balance
      if (newBalance < 0) {
        throw new Error(`Insufficient funds. Current balance: ${currentBalance}, Attempted debit: ${Math.abs(amount)}`);
      }
      
      // Update wallet balance
      const [updatedWallet] = await tx
        .update(userWallets)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date()
        })
        .where(eq(userWallets.id, walletId))
        .returning();
      
      // Create wallet transaction record atomically
      const transactionType = amount >= 0 ? 'credit' : 'debit';
      const reason = amount >= 0 ? 'top_up' : 'subscription_purchase';
      const description = amount >= 0 
        ? `Wallet credited with ৳${Math.abs(amount)}`
        : `Wallet debited ৳${Math.abs(amount)}`;
      
      await tx
        .insert(walletTransactions)
        .values({
          walletId: walletId,
          amount: Math.abs(amount).toString(),
          type: transactionType,
          reason: reason,
          description: description,
          metadata: { balanceAfter: newBalance.toString() }
        });
      
      return updatedWallet;
    });
  }
  
  // Wallet transaction operations
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [created] = await db
      .insert(walletTransactions)
      .values(transaction)
      .returning();
    return created;
  }
  
  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
  }
  
  async getWalletTransactionsByUser(userId: string): Promise<WalletTransaction[]> {
    const wallet = await this.getUserWallet(userId);
    if (!wallet) return [];
    return this.getWalletTransactions(wallet.id);
  }
  
  // Subscription operations
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
    return created;
  }
  
  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));
    return subscription || undefined;
  }
  
  async getActiveSubscriptionsByUser(userId: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]> {
    const result = await db
      .select({
        subscription: subscriptions,
        userName: users.name,
        userPhone: users.phone,
        routeName: carpoolRoutes.name,
        fromLocation: carpoolRoutes.fromLocation,
        toLocation: carpoolRoutes.toLocation,
        timeSlot: carpoolTimeSlots.departureTime,
        pickupPointName: pickupPoints.name,
        dropOffPointName: dropOffPoints.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPoints, eq(subscriptions.boardingPointId, pickupPoints.id))
      .leftJoin(dropOffPoints, eq(subscriptions.dropOffPointId, dropOffPoints.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.createdAt));

    return result.map(r => ({
      ...r.subscription,
      userName: r.userName || 'Unknown User',
      userPhone: r.userPhone || '',
      routeName: r.routeName || 'Unknown Route',
      fromLocation: r.fromLocation || '',
      toLocation: r.toLocation || '',
      timeSlot: r.timeSlot || '',
      pickupPointName: r.pickupPointName || 'Not specified',
      dropOffPointName: r.dropOffPointName || 'Not specified',
    }));
  }
  
  async getAllSubscriptionsByUser(userId: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]> {
    const result = await db
      .select({
        subscription: subscriptions,
        userName: users.name,
        userPhone: users.phone,
        routeName: carpoolRoutes.name,
        fromLocation: carpoolRoutes.fromLocation,
        toLocation: carpoolRoutes.toLocation,
        timeSlot: carpoolTimeSlots.departureTime,
        pickupPointName: pickupPoints.name,
        dropOffPointName: dropOffPoints.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPoints, eq(subscriptions.boardingPointId, pickupPoints.id))
      .leftJoin(dropOffPoints, eq(subscriptions.dropOffPointId, dropOffPoints.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
    
    return result.map(r => ({
      ...r.subscription,
      userName: r.userName || 'Unknown User',
      userPhone: r.userPhone || '',
      routeName: r.routeName || 'Unknown Route',
      fromLocation: r.fromLocation || '',
      toLocation: r.toLocation || '',
      timeSlot: r.timeSlot || '',
      pickupPointName: r.pickupPointName || 'Not specified',
      dropOffPointName: r.dropOffPointName || 'Not specified',
    }));
  }
  
  async getActiveSubscriptions(): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .orderBy(desc(subscriptions.createdAt));
  }
  
  async updateSubscription(id: string, data: Partial<Omit<Subscription, 'id' | 'userId' | 'createdAt'>>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id))
      .returning();
    if (!updated) throw new Error('Subscription not found');
    return updated;
  }
  
  async cancelSubscription(id: string): Promise<Subscription> {
    return this.updateSubscription(id, {
      status: 'cancelled',
      cancellationDate: new Date()
    });
  }
  
  // Subscription invoice operations
  async createSubscriptionInvoice(invoice: InsertSubscriptionInvoice): Promise<SubscriptionInvoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const [created] = await db
      .insert(subscriptionInvoices)
      .values({
        ...invoice,
        invoiceNumber
      })
      .returning();
    return created;
  }
  
  async getSubscriptionInvoice(id: string): Promise<SubscriptionInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, id));
    return invoice || undefined;
  }
  
  async getInvoicesByUser(userId: string): Promise<SubscriptionInvoice[]> {
    return await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.userId, userId))
      .orderBy(desc(subscriptionInvoices.createdAt));
  }
  
  async getInvoicesBySubscription(subscriptionId: string): Promise<SubscriptionInvoice[]> {
    return await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionInvoices.createdAt));
  }
  
  async updateInvoice(id: string, data: Partial<Omit<SubscriptionInvoice, 'id' | 'createdAt'>>): Promise<SubscriptionInvoice> {
    const [updated] = await db
      .update(subscriptionInvoices)
      .set(data)
      .where(eq(subscriptionInvoices.id, id))
      .returning();
    if (!updated) throw new Error('Invoice not found');
    return updated;
  }
  
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await db
      .select({ count: sql`COUNT(*)` })
      .from(subscriptionInvoices);
    const invoiceCount = Number(count[0].count) + 1;
    return `INV-${year}${month}-${String(invoiceCount).padStart(5, '0')}`;
  }
  
  // Vehicle trip operations
  async createVehicleTrip(trip: InsertVehicleTrip): Promise<VehicleTrip> {
    const [created] = await db
      .insert(vehicleTrips)
      .values(trip)
      .returning();
    return created;
  }
  
  async getVehicleTrip(id: string): Promise<VehicleTrip | undefined> {
    const [trip] = await db
      .select()
      .from(vehicleTrips)
      .where(eq(vehicleTrips.id, id));
    return trip || undefined;
  }
  
  async getVehicleTripsByDate(tripDate: string): Promise<VehicleTrip[]> {
    return await db
      .select()
      .from(vehicleTrips)
      .where(eq(vehicleTrips.tripDate, tripDate))
      .orderBy(vehicleTrips.departureTime);
  }
  
  async getVehicleTripsByRouteAndDate(routeId: string, tripDate: string): Promise<VehicleTrip[]> {
    return await db
      .select()
      .from(vehicleTrips)
      .where(
        and(
          eq(vehicleTrips.routeId, routeId),
          eq(vehicleTrips.tripDate, tripDate)
        )
      )
      .orderBy(vehicleTrips.departureTime);
  }
  
  async updateVehicleTrip(id: string, data: Partial<Omit<VehicleTrip, 'id' | 'createdAt'>>): Promise<VehicleTrip> {
    const [updated] = await db
      .update(vehicleTrips)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(vehicleTrips.id, id))
      .returning();
    if (!updated) throw new Error('Vehicle trip not found');
    return updated;
  }
  
  async assignDriverToVehicleTrip(tripId: string, driverId: string): Promise<VehicleTrip> {
    return this.updateVehicleTrip(tripId, {
      driverId,
      status: 'assigned'
    });
  }
  
  // Trip booking operations
  async createTripBooking(booking: InsertTripBooking): Promise<TripBooking> {
    // Validate capacity if vehicle trip is specified
    if (booking.vehicleTripId) {
      // Get the vehicle trip to check capacity
      const vehicleTrip = await this.getVehicleTrip(booking.vehicleTripId);
      
      if (!vehicleTrip) {
        throw new Error(`Vehicle trip not found: ${booking.vehicleTripId}`);
      }
      
      // Get existing bookings for this vehicle trip
      const existingBookings = await this.getTripBookingsByVehicleTrip(booking.vehicleTripId);
      
      // Calculate current passenger count (1 passenger per booking since numberOfPassengers is not tracked)
      const currentPassengers = existingBookings.length;
      
      // Check if adding this booking would exceed capacity
      const newPassengers = 1;
      const totalPassengers = currentPassengers + newPassengers;
      
      if (vehicleTrip.vehicleCapacity && totalPassengers > vehicleTrip.vehicleCapacity) {
        throw new Error(
          `Vehicle capacity exceeded. Vehicle capacity: ${vehicleTrip.vehicleCapacity}, ` +
          `Current passengers: ${currentPassengers}, ` +
          `Requested passengers: ${newPassengers}`
        );
      }
    }
    
    // Verify subscription reference if provided
    if (booking.subscriptionId) {
      const subscription = await this.getSubscription(booking.subscriptionId);
      
      if (!subscription) {
        throw new Error(`Subscription not found: ${booking.subscriptionId}`);
      }
      
      if (subscription.status !== 'active') {
        throw new Error(`Subscription ${booking.subscriptionId} is not active. Current status: ${subscription.status}`);
      }
      
      // Ensure the subscription belongs to the same user
      if (booking.userId && subscription.userId !== booking.userId) {
        throw new Error(`Subscription ${booking.subscriptionId} does not belong to user ${booking.userId}`);
      }
    }
    
    const [created] = await db
      .insert(tripBookings)
      .values(booking)
      .returning();
    return created;
  }
  
  async getTripBooking(id: string): Promise<TripBooking | undefined> {
    const [booking] = await db
      .select()
      .from(tripBookings)
      .where(eq(tripBookings.id, id));
    return booking || undefined;
  }
  
  async getTripBookingsByUser(userId: string): Promise<TripBooking[]> {
    return await db
      .select()
      .from(tripBookings)
      .where(eq(tripBookings.userId, userId))
      .orderBy(desc(tripBookings.createdAt));
  }
  
  async getTripBookingsByVehicleTrip(vehicleTripId: string): Promise<TripBooking[]> {
    return await db
      .select()
      .from(tripBookings)
      .where(eq(tripBookings.vehicleTripId, vehicleTripId))
      .orderBy(tripBookings.createdAt);
  }
  
  async updateTripBooking(id: string, data: Partial<Omit<TripBooking, 'id' | 'createdAt'>>): Promise<TripBooking> {
    const [updated] = await db
      .update(tripBookings)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tripBookings.id, id))
      .returning();
    if (!updated) throw new Error('Trip booking not found');
    return updated;
  }
  
  async getAllTripBookingsForAdmin(): Promise<{
    id: string;
    vehicleTripId: string | null;
    subscriptionId: string | null;
    userId: string | null;
    status: string;
    pickupSequence: number | null;
    createdAt: Date;
    bookingType: 'subscription' | 'individual';
    tripReferenceId: string | null;
    tripDate: string | null;
    tripStatus: string | null;
    customerName: string | null;
    customerPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    departureTime: string | null;
    boardingPointName: string | null;
    dropOffPointName: string | null;
    driverName: string | null;
    driverPhone: string | null;
    vehicleType: string | null;
    referenceId: string | null;
  }[]> {
    const result: {
      id: string;
      vehicleTripId: string | null;
      subscriptionId: string | null;
      userId: string | null;
      status: string;
      pickupSequence: number | null;
      createdAt: Date;
      bookingType: 'subscription' | 'individual';
      tripReferenceId: string | null;
      tripDate: string | null;
      tripStatus: string | null;
      customerName: string | null;
      customerPhone: string | null;
      routeName: string | null;
      fromLocation: string | null;
      toLocation: string | null;
      departureTime: string | null;
      boardingPointName: string | null;
      dropOffPointName: string | null;
      driverName: string | null;
      driverPhone: string | null;
      vehicleType: string | null;
      referenceId: string | null;
    }[] = [];
    
    // 1. Get trip bookings (from monthly subscriptions assigned to trips)
    const subscriptionBookings = await db
      .select({
        booking: tripBookings,
        trip: vehicleTrips,
        user: users,
        route: carpoolRoutes,
        timeSlot: carpoolTimeSlots,
        boardingPoint: carpoolPickupPoints,
        driver: drivers,
      })
      .from(tripBookings)
      .leftJoin(vehicleTrips, eq(tripBookings.vehicleTripId, vehicleTrips.id))
      .leftJoin(users, eq(tripBookings.userId, users.id))
      .leftJoin(carpoolRoutes, eq(vehicleTrips.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(vehicleTrips.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(carpoolPickupPoints, eq(tripBookings.boardingPointId, carpoolPickupPoints.id))
      .leftJoin(drivers, eq(vehicleTrips.driverId, drivers.id))
      .orderBy(desc(tripBookings.createdAt));
    
    const dropOffPoints = await db
      .select({
        bookingId: tripBookings.id,
        dropOff: carpoolPickupPoints,
      })
      .from(tripBookings)
      .leftJoin(carpoolPickupPoints, eq(tripBookings.dropOffPointId, carpoolPickupPoints.id));
    
    const dropOffMap = new Map(dropOffPoints.map(d => [d.bookingId, d.dropOff]));
    
    for (const row of subscriptionBookings) {
      result.push({
        id: row.booking.id,
        vehicleTripId: row.booking.vehicleTripId,
        subscriptionId: row.booking.subscriptionId,
        userId: row.booking.userId,
        status: row.booking.status,
        pickupSequence: row.booking.pickupSequence,
        createdAt: row.booking.createdAt,
        bookingType: 'subscription',
        tripReferenceId: row.trip?.tripReferenceId || null,
        tripDate: row.trip?.tripDate || null,
        tripStatus: row.trip?.status || null,
        customerName: row.user?.name || null,
        customerPhone: row.user?.phone || null,
        routeName: row.route?.name || null,
        fromLocation: row.route?.fromLocation || null,
        toLocation: row.route?.toLocation || null,
        departureTime: row.timeSlot?.departureTime || null,
        boardingPointName: row.boardingPoint?.name || null,
        dropOffPointName: dropOffMap.get(row.booking.id)?.name || null,
        driverName: row.driver?.name || null,
        driverPhone: row.driver?.phone || null,
        vehicleType: row.trip?.recommendedVehicleType || null,
        referenceId: null,
      });
    }
    
    // 2. Get individual carpool bookings (ad-hoc one-time bookings)
    const individualBookings = await db
      .select({
        booking: carpoolBookings,
        route: carpoolRoutes,
        timeSlot: carpoolTimeSlots,
        boardingPoint: carpoolPickupPoints,
        driver: drivers,
      })
      .from(carpoolBookings)
      .leftJoin(carpoolRoutes, eq(carpoolBookings.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(carpoolBookings.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(carpoolPickupPoints, eq(carpoolBookings.boardingPointId, carpoolPickupPoints.id))
      .leftJoin(drivers, eq(carpoolBookings.driverId, drivers.id))
      .orderBy(desc(carpoolBookings.createdAt));
    
    const individualDropOffPoints = await db
      .select({
        bookingId: carpoolBookings.id,
        dropOff: carpoolPickupPoints,
      })
      .from(carpoolBookings)
      .leftJoin(carpoolPickupPoints, eq(carpoolBookings.dropOffPointId, carpoolPickupPoints.id));
    
    const individualDropOffMap = new Map(individualDropOffPoints.map(d => [d.bookingId, d.dropOff]));
    
    for (const row of individualBookings) {
      result.push({
        id: row.booking.id,
        vehicleTripId: null,
        subscriptionId: null,
        userId: row.booking.userId,
        status: row.booking.status || 'pending',
        pickupSequence: null,
        createdAt: row.booking.createdAt,
        bookingType: 'individual',
        tripReferenceId: null,
        tripDate: row.booking.travelDate,
        tripStatus: null,
        customerName: row.booking.customerName,
        customerPhone: row.booking.phone,
        routeName: row.route?.name || null,
        fromLocation: row.route?.fromLocation || null,
        toLocation: row.route?.toLocation || null,
        departureTime: row.timeSlot?.departureTime || null,
        boardingPointName: row.boardingPoint?.name || null,
        dropOffPointName: individualDropOffMap.get(row.booking.id)?.name || null,
        driverName: row.driver?.name || null,
        driverPhone: row.driver?.phone || null,
        vehicleType: null,
        referenceId: row.booking.referenceId,
      });
    }
    
    // Sort all results by createdAt descending
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return result;
  }
  
  // Complaint operations
  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    // Generate a unique reference ID for the complaint
    const referenceId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [created] = await db
      .insert(complaints)
      .values({
        ...complaint,
        status: complaint.status || "open",
        referenceId
      })
      .returning();
    return created;
  }
  
  async getComplaint(id: string): Promise<Complaint | undefined> {
    const [complaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id));
    return complaint || undefined;
  }
  
  async getComplaintsByUser(userId: string): Promise<Complaint[]> {
    return await db
      .select()
      .from(complaints)
      .where(eq(complaints.userId, userId))
      .orderBy(desc(complaints.createdAt));
  }
  
  async getComplaintsByStatus(status: string): Promise<Complaint[]> {
    return await db
      .select()
      .from(complaints)
      .where(eq(complaints.status, status))
      .orderBy(desc(complaints.createdAt));
  }
  
  async updateComplaint(id: string, data: Partial<Omit<Complaint, 'id' | 'createdAt'>>): Promise<Complaint> {
    const [updated] = await db
      .update(complaints)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(complaints.id, id))
      .returning();
    if (!updated) throw new Error('Complaint not found');
    return updated;
  }
  
  async getAllComplaints(filters?: { 
    status?: string; 
    severity?: string; 
    dateFrom?: Date; 
    dateTo?: Date 
  }): Promise<Complaint[]> {
    let query = db.select().from(complaints);
    const conditions = [];
    
    if (filters) {
      if (filters.status) {
        conditions.push(eq(complaints.status, filters.status));
      }
      if (filters.severity) {
        conditions.push(eq(complaints.severity, filters.severity));
      }
      if (filters.dateFrom) {
        conditions.push(sql`${complaints.createdAt} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${complaints.createdAt} <= ${filters.dateTo}`);
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(complaints.createdAt));
  }
  
  async updateComplaintStatus(id: string, status: string, resolution: string | null, resolvedByUserId: string | null): Promise<Complaint> {
    const updateData: any = {
      status,
      resolution,
      resolvedByUserId,
      updatedAt: new Date()
    };
    
    // Set resolvedAt if status is resolved or closed
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }
    
    const [updated] = await db
      .update(complaints)
      .set(updateData)
      .where(eq(complaints.id, id))
      .returning();
    if (!updated) throw new Error('Complaint not found');
    return updated;
  }
  
  async getComplaintStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    resolutionRate: number;
  }> {
    const allComplaints = await db.select().from(complaints);
    
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    allComplaints.forEach(complaint => {
      // Count by category
      byCategory[complaint.category] = (byCategory[complaint.category] || 0) + 1;
      
      // Count by severity
      bySeverity[complaint.severity] = (bySeverity[complaint.severity] || 0) + 1;
      
      // Count by status
      byStatus[complaint.status] = (byStatus[complaint.status] || 0) + 1;
    });
    
    const total = allComplaints.length;
    const resolved = allComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    
    return {
      total,
      byCategory,
      bySeverity,
      byStatus,
      resolutionRate
    };
  }
  
  async getUserTripBookings(userId: string, daysBack: number = 30): Promise<TripBooking[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    
    return await db
      .select()
      .from(tripBookings)
      .where(and(
        eq(tripBookings.userId, userId),
        sql`${tripBookings.createdAt} >= ${dateThreshold}`
      ))
      .orderBy(desc(tripBookings.createdAt));
  }
  
  // Admin subscription operations
  async getAllSubscriptions(): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
    weekdays: string[];
  })[]> {
    const pickupPointsTable = alias(carpoolPickupPoints, 'pickupPoints');
    const dropOffPointsTable = alias(carpoolPickupPoints, 'dropOffPoints');

    const result = await db
      .select({
        subscription: subscriptions,
        user: users,
        route: carpoolRoutes,
        timeSlot: carpoolTimeSlots,
        pickupPoint: pickupPointsTable,
        dropOffPoint: dropOffPointsTable,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPointsTable, eq(subscriptions.boardingPointId, pickupPointsTable.id))
      .leftJoin(dropOffPointsTable, eq(subscriptions.dropOffPointId, dropOffPointsTable.id))
      .orderBy(desc(subscriptions.createdAt));
      
    return result.map(row => ({
      ...row.subscription,
      userName: row.user?.name || 'Unknown',
      userPhone: row.user?.phone || 'Unknown',
      routeName: row.route?.name || 'Unknown Route',
      fromLocation: row.route?.fromLocation || '',
      toLocation: row.route?.toLocation || '',
      timeSlot: row.timeSlot?.departureTime || '',
      pickupPointName: row.pickupPoint?.name || 'Not specified',
      dropOffPointName: row.dropOffPoint?.name || 'Not specified',
      weekdays: row.subscription.weekdays || []
    }));
  }
  
  async getSubscriptionsByStatus(status: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]> {
    const pickupPointsTable = alias(carpoolPickupPoints, "pickupPoints");
    const dropOffPointsTable = alias(carpoolPickupPoints, "dropOffPoints");

    const result = await db
      .select({
        subscription: subscriptions,
        userName: users.name,
        userPhone: users.phone,
        routeName: carpoolRoutes.name,
        fromLocation: carpoolRoutes.fromLocation,
        toLocation: carpoolRoutes.toLocation,
        timeSlot: carpoolTimeSlots.departureTime,
        pickupPointName: pickupPointsTable.name,
        dropOffPointName: dropOffPointsTable.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPointsTable, eq(subscriptions.boardingPointId, pickupPointsTable.id))
      .leftJoin(dropOffPointsTable, eq(subscriptions.dropOffPointId, dropOffPointsTable.id))
      .where(eq(subscriptions.status, status))
      .orderBy(desc(subscriptions.createdAt));
    
    return result.map(r => ({
      ...r.subscription,
      userName: r.userName || 'Unknown User',
      userPhone: r.userPhone || '',
      routeName: r.routeName || 'Unknown Route',
      fromLocation: r.fromLocation || '',
      toLocation: r.toLocation || '',
      timeSlot: r.timeSlot || '',
      pickupPointName: r.pickupPointName || 'Not specified',
      dropOffPointName: r.dropOffPointName || 'Not specified',
    }));
  }

  async getAllSubscriptionsWithDetails(): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  })[]> {
    const pickupPointsTable = alias(carpoolPickupPoints, "pickupPoints");
    const dropOffPointsTable = alias(carpoolPickupPoints, "dropOffPoints");

    const result = await db
      .select({
        subscription: subscriptions,
        userName: users.name,
        userPhone: users.phone,
        routeName: carpoolRoutes.name,
        fromLocation: carpoolRoutes.fromLocation,
        toLocation: carpoolRoutes.toLocation,
        timeSlot: carpoolTimeSlots.departureTime,
        pickupPointName: pickupPointsTable.name,
        dropOffPointName: dropOffPointsTable.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPointsTable, eq(subscriptions.boardingPointId, pickupPointsTable.id))
      .leftJoin(dropOffPointsTable, eq(subscriptions.dropOffPointId, dropOffPointsTable.id))
      .orderBy(desc(subscriptions.createdAt));
    
    return result.map(r => ({
      ...r.subscription,
      userName: r.userName || 'Unknown User',
      userPhone: r.userPhone || '',
      routeName: r.routeName || 'Unknown Route',
      fromLocation: r.fromLocation || '',
      toLocation: r.toLocation || '',
      timeSlot: r.timeSlot || '',
      pickupPointName: r.pickupPointName || 'Not specified',
      dropOffPointName: r.dropOffPointName || 'Not specified',
    }));
  }

  async getSubscriptionWithDetails(id: string): Promise<(Subscription & { 
    userName: string | null;
    userPhone: string | null;
    routeName: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    timeSlot: string | null;
    pickupPointName: string | null;
    dropOffPointName: string | null;
  }) | undefined> {
    const pickupPointsTable = alias(carpoolPickupPoints, "pickupPoints");
    const dropOffPointsTable = alias(carpoolPickupPoints, "dropOffPoints");

    const result = await db
      .select({
        subscription: subscriptions,
        userName: users.name,
        userPhone: users.phone,
        routeName: carpoolRoutes.name,
        fromLocation: carpoolRoutes.fromLocation,
        toLocation: carpoolRoutes.toLocation,
        timeSlot: carpoolTimeSlots.departureTime,
        pickupPointName: pickupPointsTable.name,
        dropOffPointName: dropOffPointsTable.name,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(pickupPointsTable, eq(subscriptions.boardingPointId, pickupPointsTable.id))
      .leftJoin(dropOffPointsTable, eq(subscriptions.dropOffPointId, dropOffPointsTable.id))
      .where(eq(subscriptions.id, id));
    
    if (result.length === 0) return undefined;
    
    const r = result[0];
    return {
      ...r.subscription,
      userName: r.userName || 'Unknown User',
      userPhone: r.userPhone || '',
      routeName: r.routeName || 'Unknown Route',
      fromLocation: r.fromLocation || '',
      toLocation: r.toLocation || '',
      timeSlot: r.timeSlot || '',
      pickupPointName: r.pickupPointName || 'Not specified',
      dropOffPointName: r.dropOffPointName || 'Not specified',
    };
  }

  async getWalletTransactionsWithDetails(walletId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async getSubscriptionStats(): Promise<{
    totalActive: number;
    totalPendingCancellation: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageSubscriptionValue: number;
    subscriptionsByRoute: Array<{ routeId: string; routeName: string; count: number; revenue: number; }>;
  }> {
    // Get counts by status
    const statusCounts = await db
      .select({
        status: subscriptions.status,
        count: sql<number>`count(*)::int`
      })
      .from(subscriptions)
      .groupBy(subscriptions.status);
      
    // Get revenue stats
    const revenueStats = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${subscriptions.totalMonthlyPrice}), 0)::float`,
        monthlyRevenue: sql<number>`coalesce(sum(case when ${subscriptions.status} = 'active' then ${subscriptions.totalMonthlyPrice} else 0 end), 0)::float`
      })
      .from(subscriptions);
    
    // Get subscriptions by route
    const routeStats = await db
      .select({
        routeId: subscriptions.routeId,
        routeName: carpoolRoutes.name,
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${subscriptions.totalMonthlyPrice}), 0)::float`
      })
      .from(subscriptions)
      .leftJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.routeId, carpoolRoutes.name);
      
    const counts = statusCounts.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
    
    const totalActive = counts['active'] || 0;
    const monthlyRecurringRevenue = Number(revenueStats[0]?.monthlyRevenue || 0);
    const averageSubscriptionValue = totalActive > 0 ? monthlyRecurringRevenue / totalActive : 0;
    
    return {
      totalActive,
      totalPendingCancellation: counts['pending_cancellation'] || 0,
      totalCancelled: counts['cancelled'] || 0,
      totalExpired: counts['expired'] || 0,
      totalRevenue: Number(revenueStats[0]?.totalRevenue || 0),
      monthlyRecurringRevenue,
      averageSubscriptionValue,
      subscriptionsByRoute: routeStats.map(r => ({
        routeId: r.routeId,
        routeName: r.routeName || 'Unknown Route',
        count: Number(r.count),
        revenue: Number(r.revenue)
      }))
    };
  }
  
  // Admin wallet operations
  async getAllWallets(): Promise<(UserWallet & {
    userName: string;
    userPhone: string;
    lastTransactionDate: Date | null;
    totalCredits: number;
    totalDebits: number;
  })[]> {
    // Get all wallets with user info
    const walletsWithUsers = await db
      .select({
        wallet: userWallets,
        user: users
      })
      .from(userWallets)
      .leftJoin(users, eq(userWallets.userId, users.id))
      .orderBy(desc(userWallets.updatedAt));
      
    // Get transaction stats for each wallet
    const walletIds = walletsWithUsers.map(w => w.wallet.id);
    
    // Handle empty wallets case
    if (walletIds.length === 0) {
      return [];
    }
    
    const transactionStats = await db
      .select({
        walletId: walletTransactions.walletId,
        lastTransactionDate: sql<Date>`max(${walletTransactions.createdAt})`,
        totalCredits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'credit' then ${walletTransactions.amount} else 0 end), 0)::float`,
        totalDebits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'debit' then ${walletTransactions.amount} else 0 end), 0)::float`
      })
      .from(walletTransactions)
      .where(inArray(walletTransactions.walletId, walletIds))
      .groupBy(walletTransactions.walletId);
      
    // Combine the data
    const statsMap = new Map(transactionStats.map(s => [s.walletId, s]));
    
    return walletsWithUsers.map(row => {
      const stats = statsMap.get(row.wallet.id);
      return {
        ...row.wallet,
        userName: row.user?.name || 'Unknown',
        userPhone: row.user?.phone || 'Unknown',
        lastTransactionDate: stats?.lastTransactionDate || null,
        totalCredits: Number(stats?.totalCredits || 0),
        totalDebits: Number(stats?.totalDebits || 0)
      };
    });
  }
  
  async adminAdjustWalletBalance(
    walletId: string,
    amount: number,
    type: 'credit' | 'debit',
    reason: string,
    adminUserId: string
  ): Promise<WalletTransaction> {
    return await db.transaction(async (tx) => {
      // Get the wallet to verify it exists and get current balance
      const [wallet] = await tx
        .select()
        .from(userWallets)
        .where(eq(userWallets.id, walletId));
        
      if (!wallet) throw new Error('Wallet not found');
      
      // Calculate new balance
      const currentBalance = parseFloat(wallet.balance) || 0;
      const newBalance = type === 'credit' 
        ? currentBalance + amount 
        : currentBalance - amount;
      
      // Check for negative balance
      if (newBalance < 0) {
        throw new Error('Cannot adjust wallet: would result in negative balance');
      }
      
      // Update wallet balance
      await tx
        .update(userWallets)
        .set({ 
          balance: newBalance.toString(),
          updatedAt: new Date()
        })
        .where(eq(userWallets.id, walletId));
      
      // Create transaction record with admin adjustment metadata
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId,
          userId: wallet.userId,
          type,
          amount: amount.toString(),
          description: `Admin adjustment: ${reason}`,
          category: 'admin_adjustment',
          referenceId: adminUserId, // Store admin user ID as reference
          balanceAfter: newBalance.toString(),
          status: 'completed'
        })
        .returning();
        
      return transaction;
    });
  }
  
  // Helper methods for automated trip generation and subscription renewal
  
  // Get active subscriptions for a specific weekday (0 = Sunday, 1 = Monday, etc.)
  async getActiveSubscriptionsByWeekday(weekday: number): Promise<Subscription[]> {
    const today = new Date();
    // Exclude weekends (Saturday = 6, Sunday = 0)
    if (weekday === 0 || weekday === 6) {
      return [];
    }
    
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          sql`${subscriptions.startDate} <= ${today}`,
          sql`${subscriptions.endDate} >= ${today}`
        )
      );
  }
  
  // Get or create a vehicle trip for a specific route, time slot, and date
  async getOrCreateVehicleTrip(routeId: string, timeSlotId: string, tripDate: string): Promise<VehicleTrip> {
    // First, try to get existing vehicle trip
    const [existingTrip] = await db
      .select()
      .from(vehicleTrips)
      .where(
        and(
          eq(vehicleTrips.routeId, routeId),
          eq(vehicleTrips.timeSlotId, timeSlotId),
          eq(vehicleTrips.tripDate, tripDate)
        )
      );
    
    if (existingTrip) {
      return existingTrip;
    }
    
    // Get route details for capacity
    const [route] = await db
      .select()
      .from(carpoolRoutes)
      .where(eq(carpoolRoutes.id, routeId));
    
    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }
    
    // Create new vehicle trip
    const [newTrip] = await db
      .insert(vehicleTrips)
      .values({
        routeId,
        timeSlotId,
        tripDate,
        vehicleCapacity: route.defaultVehicleCapacity || 4,
        status: 'scheduled' // Changed from 'pending_assignment' to 'scheduled' as per requirements
      })
      .returning();
    
    return newTrip;
  }
  
  // Efficiently create multiple trip bookings
  async bulkCreateTripBookings(bookings: InsertTripBooking[]): Promise<TripBooking[]> {
    if (bookings.length === 0) {
      return [];
    }
    
    return await db.transaction(async (tx) => {
      // Validate all bookings first
      for (const booking of bookings) {
        if (booking.vehicleTripId) {
          // Get the vehicle trip to check capacity
          const [vehicleTrip] = await tx
            .select()
            .from(vehicleTrips)
            .where(eq(vehicleTrips.id, booking.vehicleTripId));
          
          if (!vehicleTrip) {
            throw new Error(`Vehicle trip not found: ${booking.vehicleTripId}`);
          }
          
          // Get existing bookings count
          const [bookingCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(tripBookings)
            .where(eq(tripBookings.vehicleTripId, booking.vehicleTripId));
          
          const currentPassengers = bookingCount?.count || 0;
          const newPassengers = bookings.filter(b => b.vehicleTripId === booking.vehicleTripId).length;
          
          if (vehicleTrip.vehicleCapacity && (currentPassengers + newPassengers) > vehicleTrip.vehicleCapacity) {
            throw new Error(
              `Vehicle capacity exceeded for trip ${booking.vehicleTripId}. ` +
              `Capacity: ${vehicleTrip.vehicleCapacity}, Current: ${currentPassengers}, New: ${newPassengers}`
            );
          }
        }
      }
      
      // Insert all bookings
      const createdBookings = await tx
        .insert(tripBookings)
        .values(bookings)
        .returning();
      
      // Update booked seats count for each vehicle trip
      const vehicleTripIds = [...new Set(bookings.map(b => b.vehicleTripId).filter(Boolean))];
      for (const tripId of vehicleTripIds) {
        if (tripId) {
          const [bookingCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(tripBookings)
            .where(eq(tripBookings.vehicleTripId, tripId));
          
          await tx
            .update(vehicleTrips)
            .set({ 
              bookedSeats: bookingCount?.count || 0,
              updatedAt: new Date()
            })
            .where(eq(vehicleTrips.id, tripId));
        }
      }
      
      return createdBookings;
    });
  }
  
  // Get subscriptions expiring on a specific date
  async getExpiringSubscriptions(date: Date): Promise<Subscription[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          sql`${subscriptions.endDate} >= ${startOfDay}`,
          sql`${subscriptions.endDate} <= ${endOfDay}`,
          or(
            eq(subscriptions.status, 'active'),
            eq(subscriptions.status, 'pending_cancellation')
          )
        )
      );
  }
  
  // Extend subscription end date by specified months
  async extendSubscription(id: string, months: number = 1): Promise<Subscription> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));
    
    if (!subscription) {
      throw new Error(`Subscription not found: ${id}`);
    }
    
    // Calculate new end date
    const currentEndDate = new Date(subscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);
    
    // Update subscription
    const [updated] = await db
      .update(subscriptions)
      .set({
        endDate: newEndDate,
        status: 'active', // Ensure status is active after renewal
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id))
      .returning();
    
    return updated;
  }
  
  // Check if a date is a blackout date
  async isBlackoutDate(date: Date): Promise<boolean> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    const [blackoutDate] = await db
      .select()
      .from(carpoolBlackoutDates)
      .where(
        and(
          sql`${carpoolBlackoutDates.startDate} <= ${dateOnly}`,
          sql`${carpoolBlackoutDates.endDate} >= ${dateOnly}`
        )
      )
      .limit(1);
    
    return !!blackoutDate;
  }
  
  // Refund-related methods for automatic refund processing
  
  // Get trips that need refunds (cancelled, no-show, or on blackout dates)
  async getRefundableTrips(): Promise<(TripBooking & { 
    vehicleTrip: VehicleTrip,
    subscription: Subscription,
    route: CarpoolRoute 
  })[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get active blackout dates
    const activeBlackouts = await db
      .select()
      .from(carpoolBlackoutDates)
      .where(
        and(
          eq(carpoolBlackoutDates.isActive, true),
          sql`${carpoolBlackoutDates.startDate} <= ${now}`,
          sql`${carpoolBlackoutDates.endDate} >= ${now}`
        )
      );
    
    // Get trip bookings that need refunds
    const refundableBookings = await db
      .select({
        booking: tripBookings,
        trip: vehicleTrips,
        subscription: subscriptions,
        route: carpoolRoutes
      })
      .from(tripBookings)
      .innerJoin(vehicleTrips, eq(tripBookings.vehicleTripId, vehicleTrips.id))
      .innerJoin(subscriptions, eq(tripBookings.subscriptionId, subscriptions.id))
      .innerJoin(carpoolRoutes, eq(vehicleTrips.routeId, carpoolRoutes.id))
      .where(
        and(
          eq(tripBookings.refundProcessed, false),
          or(
            // Cancelled trips
            eq(vehicleTrips.status, 'cancelled'),
            // No-show trips (past departure time with scheduled status)
            and(
              eq(tripBookings.status, 'no_show'),
              sql`${vehicleTrips.createdAt} < ${oneDayAgo}`
            ),
            // Trips on blackout dates
            activeBlackouts.length > 0 ? sql`
              EXISTS (
                SELECT 1 FROM ${carpoolBlackoutDates}
                WHERE ${carpoolBlackoutDates.isActive} = true
                AND DATE(${vehicleTrips.tripDate}) 
                BETWEEN DATE(${carpoolBlackoutDates.startDate}) 
                AND DATE(${carpoolBlackoutDates.endDate})
              )
            ` : sql`false`
          )
        )
      );
    
    return refundableBookings.map(row => ({
      ...row.booking,
      vehicleTrip: row.trip,
      subscription: row.subscription,
      route: row.route
    }));
  }
  
  // Process a single refund
  async processRefund(
    userId: string,
    amount: number,
    reason: string,
    referenceId: string,
    referenceType: 'trip_booking' | 'subscription' | 'blackout'
  ): Promise<WalletTransaction> {
    return await db.transaction(async (tx) => {
      // Get or create wallet for user
      let [wallet] = await tx
        .select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId));
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        [wallet] = await tx
          .insert(userWallets)
          .values({
            userId,
            balance: 0
          })
          .returning();
      }
      
      // Calculate new balance
      const newBalance = Number(wallet.balance) + amount;
      
      // Update wallet balance
      await tx
        .update(userWallets)
        .set({
          balance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(userWallets.id, wallet.id));
      
      // Create transaction record
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet.id,
          amount,
          type: 'credit',
          reason: 'refund',
          description: reason,
          metadata: {
            referenceId,
            referenceType,
            processedAt: new Date().toISOString()
          }
        })
        .returning();
      
      return transaction;
    });
  }
  
  // Mark a trip booking as refunded
  async markTripBookingRefunded(bookingId: string, refundAmount: number): Promise<TripBooking> {
    const [updated] = await db
      .update(tripBookings)
      .set({
        refundProcessed: true,
        refundAmount: refundAmount.toString(),
        updatedAt: new Date()
      })
      .where(eq(tripBookings.id, bookingId))
      .returning();
    
    if (!updated) throw new Error('Trip booking not found');
    return updated;
  }
  
  // Calculate pro-rated refund for subscription
  async calculateProRatedRefund(subscription: Subscription, endDate?: Date): Promise<number> {
    const now = new Date();
    const effectiveEndDate = endDate || now;
    
    // Don't refund if subscription already ended
    if (new Date(subscription.endDate) <= effectiveEndDate) {
      return 0;
    }
    
    // Calculate remaining days
    const remainingDays = Math.ceil(
      (new Date(subscription.endDate).getTime() - effectiveEndDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // Calculate total subscription days
    const totalDays = Math.ceil(
      (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // Calculate refund
    const monthlyFee = Number(subscription.totalMonthlyPrice);
    const dailyRate = monthlyFee / 30;
    const refundAmount = dailyRate * remainingDays;
    
    return Math.max(0, refundAmount);
  }
  
  // Bulk process multiple refunds in a transaction
  async bulkProcessRefunds(refunds: {
    userId: string;
    amount: number;
    reason: string;
    referenceId: string;
    referenceType: 'trip_booking' | 'subscription' | 'blackout';
    bookingId?: string;
  }[]): Promise<{ transactions: WalletTransaction[], errors: string[] }> {
    const errors: string[] = [];
    const transactions: WalletTransaction[] = [];
    
    await db.transaction(async (tx) => {
      for (const refund of refunds) {
        try {
          // Get or create wallet
          let [wallet] = await tx
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, refund.userId));
          
          if (!wallet) {
            [wallet] = await tx
              .insert(userWallets)
              .values({
                userId: refund.userId,
                balance: 0
              })
              .returning();
          }
          
          // Update wallet balance
          const newBalance = Number(wallet.balance) + refund.amount;
          await tx
            .update(userWallets)
            .set({
              balance: newBalance,
              updatedAt: new Date()
            })
            .where(eq(userWallets.id, wallet.id));
          
          // Create transaction
          const [transaction] = await tx
            .insert(walletTransactions)
            .values({
              walletId: wallet.id,
              amount: refund.amount,
              type: 'credit',
              reason: 'refund',
              description: refund.reason,
              metadata: {
                referenceId: refund.referenceId,
                referenceType: refund.referenceType,
                processedAt: new Date().toISOString()
              }
            })
            .returning();
          
          transactions.push(transaction);
          
          // Mark booking as refunded if applicable
          if (refund.bookingId) {
            await tx
              .update(tripBookings)
              .set({
                refundProcessed: true,
                refundAmount: refund.amount.toString(),
                updatedAt: new Date()
              })
              .where(eq(tripBookings.id, refund.bookingId));
          }
        } catch (error) {
          errors.push(`Failed to process refund for user ${refund.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
    
    return { transactions, errors };
  }
  
  // Get pending refunds for admin view
  async getPendingRefunds(): Promise<{
    tripRefunds: Array<{
      bookingId: string;
      userId: string;
      userName: string;
      tripDate: string;
      route: string;
      reason: string;
      amount: number;
    }>;
    subscriptionRefunds: Array<{
      subscriptionId: string;
      userId: string;
      userName: string;
      route: string;
      remainingDays: number;
      amount: number;
    }>;
  }> {
    // Get refundable trips
    const refundableTrips = await this.getRefundableTrips();
    
    // Get users for trip refunds
    const userIds = [...new Set(refundableTrips.map(t => t.userId))];
    let userMap = new Map<string, typeof users.$inferSelect>();
    
    if (userIds.length > 0) {
      const usersData = await db
        .select()
        .from(users)
        .where(inArray(users.id, userIds));
      userMap = new Map(usersData.map(u => [u.id, u]));
    }
    
    const tripRefunds = refundableTrips.map(trip => {
      const user = userMap.get(trip.userId);
      const amount = Number(trip.route.pricePerSeat);
      let reason = 'Trip cancelled';
      
      if (trip.vehicleTrip.status === 'cancelled') {
        reason = 'Trip cancelled by operator';
      } else if (trip.status === 'no_show') {
        reason = 'Driver no-show';
      }
      
      return {
        bookingId: trip.id,
        userId: trip.userId,
        userName: user?.name || 'Unknown',
        tripDate: trip.vehicleTrip.tripDate,
        route: trip.route.name,
        reason,
        amount
      };
    });
    
    // Get cancelled subscriptions needing refunds
    const cancelledSubs = await db
      .select({
        subscription: subscriptions,
        user: users,
        route: carpoolRoutes
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .innerJoin(carpoolRoutes, eq(subscriptions.routeId, carpoolRoutes.id))
      .where(
        and(
          eq(subscriptions.status, 'cancelled'),
          sql`${subscriptions.cancellationDate} IS NOT NULL`,
          sql`${subscriptions.endDate} > NOW()`
        )
      );
    
    const subscriptionRefunds = [];
    for (const sub of cancelledSubs) {
      const refundAmount = await this.calculateProRatedRefund(sub.subscription);
      if (refundAmount > 0) {
        const remainingDays = Math.ceil(
          (new Date(sub.subscription.endDate).getTime() - new Date().getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        subscriptionRefunds.push({
          subscriptionId: sub.subscription.id,
          userId: sub.subscription.userId,
          userName: sub.user.name,
          route: sub.route.name,
          remainingDays,
          amount: refundAmount
        });
      }
    }
    
    return { tripRefunds, subscriptionRefunds };
  }
  
  // Get refund history
  async getRefundHistory(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<(WalletTransaction & {
    userName: string;
    userPhone: string;
  })[]> {
    let query = db
      .select({
        transaction: walletTransactions,
        wallet: userWallets,
        user: users
      })
      .from(walletTransactions)
      .innerJoin(userWallets, eq(walletTransactions.walletId, userWallets.id))
      .innerJoin(users, eq(userWallets.userId, users.id))
      .where(eq(walletTransactions.reason, 'refund'))
      .$dynamic();
    
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(userWallets.userId, filters.userId));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${walletTransactions.createdAt} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${walletTransactions.createdAt} <= ${filters.endDate}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query
      .orderBy(desc(walletTransactions.createdAt))
      .limit(filters?.limit || 100);
    
    return results.map(row => ({
      ...row.transaction,
      userName: row.user.name,
      userPhone: row.user.phone
    }));
  }
  
  // Get refund statistics
  async getRefundStats(): Promise<{
    totalRefunded: number;
    refundsByReason: Record<string, { count: number; amount: number }>;
    monthlyTrends: Array<{ month: string; count: number; amount: number }>;
  }> {
    // Get all refunds
    const refunds = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.reason, 'refund'));
    
    // Calculate total
    const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    
    // Group by reason (from description)
    const refundsByReason: Record<string, { count: number; amount: number }> = {};
    
    refunds.forEach(refund => {
      const reason = refund.description || 'Other';
      if (!refundsByReason[reason]) {
        refundsByReason[reason] = { count: 0, amount: 0 };
      }
      refundsByReason[reason].count++;
      refundsByReason[reason].amount += Number(refund.amount);
    });
    
    // Calculate monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData: Record<string, { count: number; amount: number }> = {};
    
    refunds
      .filter(r => r.createdAt >= sixMonthsAgo)
      .forEach(refund => {
        const monthKey = new Date(refund.createdAt).toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, amount: 0 };
        }
        monthlyData[monthKey].count++;
        monthlyData[monthKey].amount += Number(refund.amount);
      });
    
    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      }));
    
    return {
      totalRefunded,
      refundsByReason,
      monthlyTrends
    };
  }
  
  // AI Trip Generator operations
  async getCarpoolRouteById(id: string): Promise<CarpoolRoute | undefined> {
    const [route] = await db.select().from(carpoolRoutes).where(eq(carpoolRoutes.id, id));
    return route || undefined;
  }
  
  async getCarpoolTimeSlotById(id: string): Promise<CarpoolTimeSlot | undefined> {
    const [timeSlot] = await db.select().from(carpoolTimeSlots).where(eq(carpoolTimeSlots.id, id));
    return timeSlot || undefined;
  }
  
  async getCarpoolPickupPointById(id: string): Promise<CarpoolPickupPoint | undefined> {
    const [point] = await db.select().from(carpoolPickupPoints).where(eq(carpoolPickupPoints.id, id));
    return point || undefined;
  }
  
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }
  
  async createAIGeneratedTrip(trip: {
    tripReferenceId: string;
    routeId: string;
    timeSlotId: string;
    tripDate: string;
    vehicleCapacity: number;
    recommendedVehicleType: string;
    status: string;
    generatedBy: string;
    aiConfidenceScore: string;
    aiRationale: string;
  }): Promise<VehicleTrip> {
    const [newTrip] = await db
      .insert(vehicleTrips)
      .values({
        tripReferenceId: trip.tripReferenceId,
        routeId: trip.routeId,
        timeSlotId: trip.timeSlotId,
        tripDate: trip.tripDate,
        vehicleCapacity: trip.vehicleCapacity,
        bookedSeats: 0,
        recommendedVehicleType: trip.recommendedVehicleType,
        status: trip.status,
        generatedBy: trip.generatedBy,
        aiConfidenceScore: trip.aiConfidenceScore,
        aiRationale: trip.aiRationale,
        generatedAt: new Date(),
      })
      .returning();
    
    if (!newTrip) throw new Error('Failed to create AI-generated trip');
    return newTrip;
  }

  async createTripBookingFromSubscription(booking: {
    vehicleTripId: string;
    subscriptionId: string;
    userId: string;
    boardingPointId: string;
    dropOffPointId: string;
    pickupSequence: number;
  }): Promise<TripBooking> {
    const [newBooking] = await db
      .insert(tripBookings)
      .values({
        vehicleTripId: booking.vehicleTripId,
        subscriptionId: booking.subscriptionId,
        userId: booking.userId,
        boardingPointId: booking.boardingPointId,
        dropOffPointId: booking.dropOffPointId,
        pickupSequence: booking.pickupSequence,
        status: 'expected',
      })
      .returning();
    
    if (!newBooking) throw new Error('Failed to create trip booking');
    
    await db
      .update(vehicleTrips)
      .set({ 
        bookedSeats: sql`${vehicleTrips.bookedSeats} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(vehicleTrips.id, booking.vehicleTripId));
    
    return newBooking;
  }
  
  async getVehicleTripByReferenceId(tripReferenceId: string): Promise<VehicleTrip | undefined> {
    const [trip] = await db
      .select()
      .from(vehicleTrips)
      .where(eq(vehicleTrips.tripReferenceId, tripReferenceId));
    return trip || undefined;
  }
  
  async getVehicleTripsWithDetails(tripDate: string): Promise<(VehicleTrip & {
    routeName: string;
    fromLocation: string;
    toLocation: string;
    departureTimeSlot: string;
    driverName: string | null;
    driverPhone: string | null;
    passengerCount: number;
    passengers: {
      id: string;
      userName: string;
      userPhone: string;
      boardingPointName: string;
      dropOffPointName: string;
      pickupSequence: number | null;
      status: string;
    }[];
  })[]> {
    const trips = await db
      .select({
        trip: vehicleTrips,
        route: carpoolRoutes,
        timeSlot: carpoolTimeSlots,
        driver: drivers,
      })
      .from(vehicleTrips)
      .leftJoin(carpoolRoutes, eq(vehicleTrips.routeId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(vehicleTrips.timeSlotId, carpoolTimeSlots.id))
      .leftJoin(drivers, eq(vehicleTrips.driverId, drivers.id))
      .where(eq(vehicleTrips.tripDate, tripDate))
      .orderBy(carpoolTimeSlots.departureTime);
    
    const result = [];
    
    for (const row of trips) {
      const bookings = await db
        .select({
          booking: tripBookings,
          user: users,
          boardingPoint: carpoolPickupPoints,
        })
        .from(tripBookings)
        .leftJoin(users, eq(tripBookings.userId, users.id))
        .leftJoin(carpoolPickupPoints, eq(tripBookings.boardingPointId, carpoolPickupPoints.id))
        .where(eq(tripBookings.vehicleTripId, row.trip.id))
        .orderBy(tripBookings.pickupSequence);
      
      const dropOffPoints = await db
        .select({
          bookingId: tripBookings.id,
          dropOff: carpoolPickupPoints,
        })
        .from(tripBookings)
        .leftJoin(carpoolPickupPoints, eq(tripBookings.dropOffPointId, carpoolPickupPoints.id))
        .where(eq(tripBookings.vehicleTripId, row.trip.id));
      
      const dropOffMap = new Map(dropOffPoints.map(d => [d.bookingId, d.dropOff]));
      
      result.push({
        ...row.trip,
        routeName: row.route?.name || 'Unknown Route',
        fromLocation: row.route?.fromLocation || '',
        toLocation: row.route?.toLocation || '',
        departureTimeSlot: row.timeSlot?.departureTime || '',
        driverName: row.driver?.name || null,
        driverPhone: row.driver?.phone || null,
        passengerCount: bookings.length,
        passengers: bookings.map(b => ({
          id: b.booking.id,
          userName: b.user?.name || 'Unknown',
          userPhone: b.user?.phone || '',
          boardingPointName: b.boardingPoint?.name || 'Unknown',
          dropOffPointName: dropOffMap.get(b.booking.id)?.name || 'Unknown',
          pickupSequence: b.booking.pickupSequence,
          status: b.booking.status,
        })),
      });
    }
    
    return result;
  }
  
  async mergeVehicleTrips(targetTripId: string, sourceTripId: string): Promise<VehicleTrip> {
    return await db.transaction(async (tx) => {
      const [targetTrip] = await tx.select().from(vehicleTrips).where(eq(vehicleTrips.id, targetTripId));
      const [sourceTrip] = await tx.select().from(vehicleTrips).where(eq(vehicleTrips.id, sourceTripId));
      
      if (!targetTrip || !sourceTrip) {
        throw new Error('One or both trips not found');
      }
      
      const targetBookings = await tx.select().from(tripBookings).where(eq(tripBookings.vehicleTripId, targetTripId));
      const maxSequence = targetBookings.reduce((max, b) => Math.max(max, b.pickupSequence || 0), 0);
      
      const sourceBookings = await tx.select().from(tripBookings).where(eq(tripBookings.vehicleTripId, sourceTripId));
      
      for (let i = 0; i < sourceBookings.length; i++) {
        await tx
          .update(tripBookings)
          .set({
            vehicleTripId: targetTripId,
            pickupSequence: maxSequence + i + 1,
            updatedAt: new Date(),
          })
          .where(eq(tripBookings.id, sourceBookings[i].id));
      }
      
      const newPassengerCount = targetBookings.length + sourceBookings.length;
      
      let newVehicleType = targetTrip.recommendedVehicleType;
      if (newPassengerCount > 14) newVehicleType = '32_seater';
      else if (newPassengerCount > 10) newVehicleType = '14_seater';
      else if (newPassengerCount > 7) newVehicleType = '10_seater';
      else if (newPassengerCount > 4) newVehicleType = '7_seater';
      else newVehicleType = 'sedan';
      
      const [updatedTrip] = await tx
        .update(vehicleTrips)
        .set({
          bookedSeats: newPassengerCount,
          recommendedVehicleType: newVehicleType,
          status: newPassengerCount >= 3 ? 'pending_assignment' : 'low_capacity_warning',
          updatedAt: new Date(),
        })
        .where(eq(vehicleTrips.id, targetTripId))
        .returning();
      
      await tx
        .update(vehicleTrips)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(vehicleTrips.id, sourceTripId));
      
      return updatedTrip;
    });
  }
  
  async adminCancelSubscription(subscriptionId: string, adminId: string, reason: string): Promise<{ subscription: Subscription; refundAmount: number }> {
    return await db.transaction(async (tx) => {
      const [subscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      if (subscription.status === 'cancelled') {
        throw new Error('Subscription is already cancelled');
      }
      
      let refundAmount = 0;
      
      if (subscription.paymentMethod === 'online') {
        const now = new Date();
        const endDate = new Date(subscription.endDate);
        const startDate = new Date(subscription.startDate);
        
        if (endDate > now) {
          const totalDays = differenceInDays(endDate, startDate);
          const remainingDays = differenceInDays(endDate, now);
          const totalPrice = parseFloat(subscription.totalMonthlyPrice);
          
          if (totalDays > 0 && remainingDays > 0) {
            refundAmount = Math.round((totalPrice * remainingDays / totalDays) * 100) / 100;
          }
        }
        
        if (refundAmount > 0) {
          let wallet = await tx
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, subscription.userId))
            .then(rows => rows[0]);
          
          if (!wallet) {
            const [newWallet] = await tx
              .insert(userWallets)
              .values({ userId: subscription.userId, balance: '0.00' })
              .returning();
            wallet = newWallet;
          }
          
          const currentBalance = parseFloat(wallet.balance);
          const newBalance = currentBalance + refundAmount;
          
          await tx
            .update(userWallets)
            .set({ balance: newBalance.toString(), updatedAt: new Date() })
            .where(eq(userWallets.id, wallet.id));
          
          await tx
            .insert(walletTransactions)
            .values({
              walletId: wallet.id,
              amount: refundAmount.toString(),
              type: 'credit',
              reason: 'admin_subscription_cancellation',
              description: `Prorated refund for subscription cancellation: ${reason}`,
              metadata: { adminId, subscriptionId, refundAmount }
            });
        }
      }
      
      const [updatedSubscription] = await tx
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancellationDate: new Date(),
          cancellationReason: reason,
          cancelledBy: adminId,
          refundAmount: refundAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, subscriptionId))
        .returning();
      
      return { subscription: updatedSubscription, refundAmount };
    });
  }
  
  async issueManualRefund(userId: string, amount: number, reason: string, adminId: string): Promise<WalletTransaction> {
    return await db.transaction(async (tx) => {
      let wallet = await tx
        .select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId))
        .then(rows => rows[0]);
      
      if (!wallet) {
        const [newWallet] = await tx
          .insert(userWallets)
          .values({ userId, balance: '0.00' })
          .returning();
        wallet = newWallet;
      }
      
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + amount;
      
      await tx
        .update(userWallets)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(userWallets.id, wallet.id));
      
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet.id,
          amount: amount.toString(),
          type: 'credit',
          reason: 'admin_manual_refund',
          description: reason,
          metadata: { adminId, balanceAfter: newBalance.toString() }
        })
        .returning();
      
      return transaction;
    });
  }
  
  async banUser(userId: string, adminId: string, reason: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        isBanned: true,
        bannedAt: new Date(),
        banReason: reason,
        bannedBy: adminId
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) {
      throw new Error('User not found');
    }
    
    return updated;
  }
  
  async unbanUser(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        isBanned: false,
        bannedAt: null,
        banReason: null,
        bannedBy: null
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) {
      throw new Error('User not found');
    }
    
    return updated;
  }
}

export const storage = new DatabaseStorage();
