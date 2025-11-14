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
  type InsertComplaint
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, like, sql, lt, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: 'customer' | 'employee' | 'superadmin'): Promise<User[]>;
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
  getActiveSubscriptionsByUser(userId: string): Promise<Subscription[]>;
  getAllSubscriptionsByUser(userId: string): Promise<Subscription[]>;
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
  
  // Complaint operations
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  getComplaint(id: string): Promise<Complaint | undefined>;
  getComplaintsByUser(userId: string): Promise<Complaint[]>;
  getComplaintsByStatus(status: string): Promise<Complaint[]>;
  updateComplaint(id: string, data: Partial<Omit<Complaint, 'id' | 'createdAt'>>): Promise<Complaint>;
  
  // Admin subscription operations
  getAllSubscriptions(): Promise<(Subscription & { 
    userName: string;
    userPhone: string;
    routeName: string;
    fromLocation: string;
    toLocation: string;
    timeSlot: string;
    weekdays: string[];
  })[]>;
  getSubscriptionStats(): Promise<{
    totalActive: number;
    totalPendingCancellation: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenue: number;
    monthlyRevenue: number;
  }>;
  
  // Admin wallet operations
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
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
    return await db.select().from(users).where(eq(users.role, role));
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
    const [settings] = await db.insert(marketingSettings).values([{
      ...settingsData,
      conversionGoals: settingsData.conversionGoals || []
    }]).returning();
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
    const [page] = await db.insert(legalPages).values([pageData]).returning();
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
    const [settings] = await db.insert(websiteSettings).values([settingsData]).returning();
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
    const [notification] = await db.insert(notifications).values([notificationData]).returning();
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
    const [updated] = await db
      .update(carpoolRoutes)
      .set({ ...route, updatedAt: new Date() })
      .where(eq(carpoolRoutes.id, route.id))
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
      const description = amount >= 0 
        ? `Wallet credited with ${Math.abs(amount)}`
        : `Wallet debited with ${Math.abs(amount)}`;
      
      await tx
        .insert(walletTransactions)
        .values({
          walletId: walletId,
          userId: currentWallet.userId,
          amount: Math.abs(amount).toString(),
          type: transactionType,
          description: description,
          balanceAfter: newBalance.toString(),
          status: 'completed',
          createdAt: new Date()
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
  
  async getActiveSubscriptionsByUser(userId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.createdAt));
  }
  
  async getAllSubscriptionsByUser(userId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
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
      
      // Calculate current passenger count
      const currentPassengers = existingBookings.reduce((sum, b) => {
        return sum + (b.numberOfPassengers || 1);
      }, 0);
      
      // Check if adding this booking would exceed capacity
      const newPassengers = booking.numberOfPassengers || 1;
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
  
  // Complaint operations
  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [created] = await db
      .insert(complaints)
      .values(complaint)
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
  
  // Admin subscription operations
  async getAllSubscriptions(): Promise<(Subscription & { 
    userName: string;
    userPhone: string;
    routeName: string;
    fromLocation: string;
    toLocation: string;
    timeSlot: string;
    weekdays: string[];
  })[]> {
    const result = await db
      .select({
        subscription: subscriptions,
        user: users,
        route: carpoolRoutes,
        timeSlot: carpoolTimeSlots
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(carpoolRoutes, eq(subscriptions.carpoolRouteId, carpoolRoutes.id))
      .leftJoin(carpoolTimeSlots, eq(subscriptions.timeSlotId, carpoolTimeSlots.id))
      .orderBy(desc(subscriptions.createdAt));
      
    return result.map(row => ({
      ...row.subscription,
      userName: row.user?.name || 'Unknown',
      userPhone: row.user?.phone || 'Unknown',
      routeName: row.route?.name || 'Unknown Route',
      fromLocation: row.route?.fromLocation || '',
      toLocation: row.route?.toLocation || '',
      timeSlot: row.timeSlot ? `${row.timeSlot.departureTime} - ${row.timeSlot.arrivalTime}` : '',
      weekdays: row.subscription.weekdays || []
    }));
  }
  
  async getSubscriptionStats(): Promise<{
    totalActive: number;
    totalPendingCancellation: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenue: number;
    monthlyRevenue: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
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
        totalRevenue: sql<number>`coalesce(sum(${subscriptions.monthlyFee}), 0)::float`,
        monthlyRevenue: sql<number>`coalesce(sum(case when ${subscriptions.status} = 'active' then ${subscriptions.monthlyFee} else 0 end), 0)::float`
      })
      .from(subscriptions);
      
    const counts = statusCounts.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalActive: counts['active'] || 0,
      totalPendingCancellation: counts['pending_cancellation'] || 0,
      totalCancelled: counts['cancelled'] || 0,
      totalExpired: counts['expired'] || 0,
      totalRevenue: Number(revenueStats[0]?.totalRevenue || 0),
      monthlyRevenue: Number(revenueStats[0]?.monthlyRevenue || 0)
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
    
    const transactionStats = await db
      .select({
        walletId: walletTransactions.walletId,
        lastTransactionDate: sql<Date>`max(${walletTransactions.createdAt})`,
        totalCredits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'credit' then ${walletTransactions.amount} else 0 end), 0)::float`,
        totalDebits: sql<number>`coalesce(sum(case when ${walletTransactions.type} = 'debit' then ${walletTransactions.amount} else 0 end), 0)::float`
      })
      .from(walletTransactions)
      .where(sql`${walletTransactions.walletId} = ANY(${walletIds})`)
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
      const newBalance = type === 'credit' 
        ? wallet.balance + amount 
        : wallet.balance - amount;
      
      // Check for negative balance
      if (newBalance < 0) {
        throw new Error('Cannot adjust wallet: would result in negative balance');
      }
      
      // Update wallet balance
      await tx
        .update(userWallets)
        .set({ 
          balance: newBalance,
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
          amount,
          description: `Admin adjustment: ${reason}`,
          category: 'admin_adjustment',
          referenceId: adminUserId, // Store admin user ID as reference
          balanceAfter: newBalance,
          status: 'completed'
        })
        .returning();
        
      return transaction;
    });
  }
}

export const storage = new DatabaseStorage();
