import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, jsonb, numeric, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Permission level types
export type PermissionLevel = {
  view: boolean;
  edit: boolean;
  downloadCsv?: boolean; // Only for sections with CSV export
};

export type UserPermissions = {
  blogPosts?: PermissionLevel;
  portfolioClients?: PermissionLevel;
  corporateBookings?: PermissionLevel;
  rentalBookings?: PermissionLevel;
  carpoolBookings?: PermissionLevel;
  carpoolRouteManagement?: PermissionLevel;
  carpoolBlackoutDates?: PermissionLevel;
  vendorRegistrations?: PermissionLevel;
  contactMessages?: PermissionLevel;
  marketingSettings?: PermissionLevel;
  websiteSettings?: PermissionLevel;
  legalPages?: PermissionLevel;
  driverManagement?: PermissionLevel; // Renamed from "drivers"
  driverAssignment?: boolean; // Special: stays as boolean (it's an action, not CRUD)
  driverAssignmentViewPII?: boolean; // Allow viewing customer PII (name, phone) in driver assignment page
  employeeManagement?: PermissionLevel;
  complaintManagement?: PermissionLevel;
  subscriptionManagement?: PermissionLevel; // Finance: subscription management
  walletManagement?: PermissionLevel; // Finance: wallet and refund management
  subscriptionCancellation?: boolean; // Action: cancel subscriptions with prorated refund
  walletRefunds?: boolean; // Action: issue manual refunds to user wallets
  userBanManagement?: boolean; // Action: ban/unban users from the platform
};

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("customer"), // customer, employee, superadmin
  permissions: json("permissions").$type<UserPermissions>().default({}),
  temporaryPassword: boolean("temporary_password").default(false),
  officeLocation: text("office_location"),
  homeLocation: text("home_location"),
  isBanned: boolean("is_banned").default(false),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  bannedBy: varchar("banned_by"), // Admin user ID who banned
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 64 }).notNull().unique(),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: text("email").notNull(),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const corporateBookings = pgTable("corporate_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  userId: varchar("user_id"),
  companyName: text("company_name").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  officeAddress: text("office_address"),
  serviceType: text("service_type"),
  contractType: text("contract_type"),
  status: text("status"),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rentalBookings = pgTable("rental_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  userId: varchar("user_id"),
  driverId: varchar("driver_id"),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  pickupDate: text("pickup_date"), // Keep existing field
  duration: text("duration"), // Keep existing field
  startDate: text("start_date"),
  endDate: text("end_date"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  serviceType: text("service_type"),
  vehicleType: text("vehicle_type").notNull(),
  capacity: text("capacity"),
  vehicleCapacity: text("vehicle_capacity").notNull(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  isReturnTrip: boolean("is_return_trip").default(false),
  status: text("status"),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorRegistrations = pgTable("vendor_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  location: text("location").notNull(),
  vehicleTypes: json("vehicle_types").$type<string[]>().default([]),
  serviceModality: text("service_modality").notNull(),
  experience: text("experience").notNull(),
  additionalInfo: text("additional_info"),
  status: text("status"),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: text("status"),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissionStatusHistory = pgTable("submission_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionType: text("submission_type").notNull(), // 'corporate' | 'rental' | 'vendor' | 'contact'
  submissionId: varchar("submission_id").notNull(), // Foreign key to the submission
  referenceId: varchar("reference_id", { length: 6 }).notNull(), // For easy lookup
  changedByUserId: varchar("changed_by_user_id"), // Employee who made the change
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_history_submission").on(table.submissionType, table.submissionId),
  index("idx_history_reference").on(table.referenceId),
  index("idx_history_user").on(table.changedByUserId),
]);

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull(),
  submissionType: text("submission_type").notNull(), // 'corporate' | 'rental' | 'vendor' | 'contact'
  submissionId: varchar("submission_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  npsScore: integer("nps_score"), // 0-10 rating, null if not submitted yet
  feedback: text("feedback"), // Optional text feedback
  submittedAt: timestamp("submitted_at"), // When survey was completed
  expiresAt: timestamp("expires_at").notNull(), // 7 days from creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_survey_reference").on(table.referenceId),
  index("idx_survey_token").on(table.token),
]);

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  category: text("category").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  featuredImage: text("featured_image"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  readTime: integer("read_time").default(5),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  author: text("author").default("OfficeXpress Team"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const portfolioClients = pgTable("portfolio_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo").notNull(),
  images: json("images").$type<string[]>().default([]),
  testimonial: text("testimonial"),
  clientRepresentative: text("client_representative"),
  position: text("position"),
  rating: integer("rating").default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bangladeshLocations = pgTable("bangladesh_locations_complete", {
  id: serial("id").primaryKey(),
  
  // Administrative Hierarchy
  divisionId: integer("division_id"),
  divisionName: varchar("division_name").notNull(),
  divisionNameBn: varchar("division_name_bn"),
  divisionLat: numeric("division_lat"),
  divisionLng: numeric("division_lng"),
  
  districtId: integer("district_id"),
  districtName: varchar("district_name").notNull(),
  districtNameBn: varchar("district_name_bn"),
  districtLat: numeric("district_lat"),
  districtLng: numeric("district_lng"),
  
  upazilaId: integer("upazila_id"),
  upazilaName: varchar("upazila_name"),
  upazilaNameBn: varchar("upazila_name_bn"),
  
  // Post Office Information
  postOffice: varchar("post_office"),
  postCode: varchar("post_code"),
  
  // Search and Display Fields
  fullLocationEn: varchar("full_location_en").notNull(), // "Post Office, Upazila, District, Division"
  fullLocationBn: varchar("full_location_bn"), // Bengali equivalent
  searchText: varchar("search_text"), // Combined searchable text
  locationType: varchar("location_type").default("post_office"),
});

export const marketingSettings = pgTable("marketing_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Facebook Marketing
  facebookPixelId: text("facebook_pixel_id"),
  facebookAccessToken: text("facebook_access_token"),
  facebookAppId: text("facebook_app_id"),
  facebookPageId: text("facebook_page_id"),
  facebookEnabled: boolean("facebook_enabled").default(false),
  
  // Google Marketing
  googleAnalyticsId: text("google_analytics_id"),
  googleTagManagerId: text("google_tag_manager_id"),
  googleAdsConversionId: text("google_ads_conversion_id"),
  googleSearchConsoleId: text("google_search_console_id"),
  googleEnabled: boolean("google_enabled").default(false),
  
  // UTM Campaign Defaults
  utmSource: text("utm_source").default("officexpress"),
  utmMedium: text("utm_medium").default("website"),
  utmCampaign: text("utm_campaign").default("default"),
  
  // General Settings
  cookieConsentEnabled: boolean("cookie_consent_enabled").default(true),
  gdprCompliance: boolean("gdpr_compliance").default(true),
  trackingEnabled: boolean("tracking_enabled").default(true),
  
  // Logo Settings
  logoPath: text("logo_path"),
  
  // Conversion Goals
  conversionGoals: json("conversion_goals").$type<{
    name: string;
    type: string;
    value: number;
    currency: string;
  }[]>().default([]),
  
  // System fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const legalPages = pgTable("legal_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'terms' or 'privacy'
  title: text("title").notNull(),
  content: text("content").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const websiteSettings = pgTable("website_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Logo Settings
  logoPath: text("logo_path"),
  faviconPath: text("favicon_path"),
  
  // Color Settings
  headerBackgroundColor: text("header_background_color").default("#1e293b"), // slate-800
  headerTextColor: text("header_text_color").default("#ffffff"), // white
  footerBackgroundColor: text("footer_background_color").default("#1e293b"), // slate-800
  footerTextColor: text("footer_text_color").default("#ffffff"), // white
  
  // Text Colors
  primaryTextColor: text("primary_text_color").default("#1f2937"), // gray-800
  secondaryTextColor: text("secondary_text_color").default("#6b7280"), // gray-500
  accentColor: text("accent_color").default("#4c9096"), // brand color
  linkColor: text("link_color").default("#3b82f6"), // blue-500
  linkHoverColor: text("link_hover_color").default("#2563eb"), // blue-600
  
  // Button Colors
  primaryButtonColor: text("primary_button_color").default("#4c9096"), // brand color
  primaryButtonTextColor: text("primary_button_text_color").default("#ffffff"), // white
  secondaryButtonColor: text("secondary_button_color").default("#f3f4f6"), // gray-100
  secondaryButtonTextColor: text("secondary_button_text_color").default("#1f2937"), // gray-800
  
  // Background Colors
  pageBackgroundColor: text("page_background_color").default("#ffffff"), // white
  sectionBackgroundColor: text("section_background_color").default("#f9fafb"), // gray-50
  cardBackgroundColor: text("card_background_color").default("#ffffff"), // white
  
  // Typography Settings
  fontFamily: text("font_family").default("Inter, sans-serif"),
  headingFontFamily: text("heading_font_family").default("Inter, sans-serif"),
  
  // Site Information
  siteTitle: text("site_title").default("OfficeXpress"),
  siteTagline: text("site_tagline").default("Professional Transportation Services"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  contactAddress: text("contact_address"),
  
  // Social Media Links
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  
  // System fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  licensePlate: text("license_plate").notNull(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: text("vehicle_year").notNull(),
  vehicleCapacity: text("vehicle_capacity").notNull().default('4'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  bookingId: varchar("booking_id"),
  bookingType: text("booking_type"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  isRead: boolean("is_read").default(false),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Carpool Routes Table
export const carpoolRoutes = pgTable("carpool_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fromLocation: text("from_location").notNull(),
  fromLatitude: numeric("from_latitude", { precision: 10, scale: 7 }),
  fromLongitude: numeric("from_longitude", { precision: 10, scale: 7 }),
  toLocation: text("to_location").notNull(),
  toLatitude: numeric("to_latitude", { precision: 10, scale: 7 }),
  toLongitude: numeric("to_longitude", { precision: 10, scale: 7 }),
  estimatedDistance: text("estimated_distance").notNull(),
  description: text("description"),
  pricePerSeat: numeric("price_per_seat", { precision: 10, scale: 2 }).notNull(),
  weekdays: integer("weekdays").array().default([1, 2, 3, 4, 5]), // 0=Sunday, 1=Monday, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Carpool Pickup Points Table
export const carpoolPickupPoints = pgTable("carpool_pickup_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => carpoolRoutes.id),
  pointType: text("point_type").notNull().default("pickup"), // "pickup" or "dropoff"
  name: text("name").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  sequenceOrder: integer("sequence_order").notNull(),
  isVisible: boolean("is_visible").default(true), // Whether point is visible to customers
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Carpool Time Slots Table
export const carpoolTimeSlots = pgTable("carpool_time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => carpoolRoutes.id),
  departureTime: text("departure_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Carpool Bookings Table
export const carpoolBookings = pgTable("carpool_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  routeId: varchar("route_id").notNull().references(() => carpoolRoutes.id),
  timeSlotId: varchar("time_slot_id").notNull().references(() => carpoolTimeSlots.id),
  driverId: varchar("driver_id").references(() => drivers.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  travelDate: text("travel_date").notNull(),
  boardingPointId: varchar("boarding_point_id").notNull().references(() => carpoolPickupPoints.id),
  dropOffPointId: varchar("drop_off_point_id").notNull().references(() => carpoolPickupPoints.id),
  shareToken: varchar("share_token", { length: 32 }).unique(),
  shareTokenExpiry: timestamp("share_token_expiry"),
  status: text("status").default("pending"),
  completionEmailSentAt: timestamp("completion_email_sent_at"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_booking_counts").on(table.routeId, table.timeSlotId, table.travelDate, table.status),
]);

// Carpool Blackout Dates Table (for holidays and service closures)
export const carpoolBlackoutDates = pgTable("carpool_blackout_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_blackout_active_dates").on(table.isActive, table.startDate, table.endDate),
]);

// User Wallets Table - For tracking user balance
export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet Transactions Table - Ledger for all money in/out
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => userWallets.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Positive for credits, negative for debits
  type: text("type").notNull(), // 'credit' or 'debit'
  reason: text("reason").notNull(), // 'top_up', 'subscription_purchase', 'refund_failed_trip', 'withdrawal', etc.
  description: text("description"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_wallet_transactions").on(table.walletId, table.createdAt),
]);

// Subscriptions Table - Monthly route subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  routeId: varchar("route_id").notNull().references(() => carpoolRoutes.id),
  timeSlotId: varchar("time_slot_id").notNull().references(() => carpoolTimeSlots.id),
  boardingPointId: varchar("boarding_point_id").notNull().references(() => carpoolPickupPoints.id),
  dropOffPointId: varchar("drop_off_point_id").notNull().references(() => carpoolPickupPoints.id),
  weekdays: text("weekdays").array().default([]), // ['sunday', 'monday', etc.] - days user subscribed to
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  pricePerTrip: numeric("price_per_trip", { precision: 10, scale: 2 }).notNull(),
  totalMonthlyPrice: numeric("total_monthly_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default('0.00'),
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  paymentMethod: text("payment_method").notNull().default("online"), // 'online' (wallet) or 'cash' (pay to driver)
  cancellationDate: timestamp("cancellation_date"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by"), // Admin user ID who cancelled (for admin cancellations)
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }), // Amount refunded upon cancellation
  baseAmount: numeric("base_amount", { precision: 10, scale: 2 }), // Original price before any discount
  netAmountPaid: numeric("net_amount_paid", { precision: 10, scale: 2 }), // What user actually paid after discounts
  couponCode: text("coupon_code"), // Coupon code used (for audit trail)
  billingCycleDays: integer("billing_cycle_days").default(30), // Number of days in billing cycle
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_subscription_user").on(table.userId, table.status),
  index("idx_subscription_dates").on(table.startDate, table.endDate, table.status),
]);

// Subscription Service Days Table - Daily service tracking for refunds
export const subscriptionServiceDays = pgTable("subscription_service_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  serviceDate: timestamp("service_date").notNull(), // The date this service day is for
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'trip_generated', 'completed', 'trip_not_generated', 'refunded'
  vehicleTripId: varchar("vehicle_trip_id").references(() => vehicleTrips.id), // Link to the trip if one was generated
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }), // Amount refunded for this day
  refundProcessedAt: timestamp("refund_processed_at"), // When refund was processed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_service_day_subscription_unique").on(table.subscriptionId, table.serviceDate),
  index("idx_service_day_status").on(table.status, table.serviceDate),
]);

// Subscription Invoices Table - Monthly billing records
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  billingMonth: text("billing_month").notNull(), // Format: "2024-11"
  amountDue: numeric("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).default('0.00'),
  walletTransactionId: varchar("wallet_transaction_id").references(() => walletTransactions.id),
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'failed', 'refunded'
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_invoice_subscription").on(table.subscriptionId, table.billingMonth),
  index("idx_invoice_user").on(table.userId, table.status),
]);

// Vehicle Trips Table - Daily shared trip instances (enhanced with AI generation fields)
export const vehicleTrips = pgTable("vehicle_trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripReferenceId: varchar("trip_reference_id", { length: 10 }).notNull().unique(), // Human-readable trip ID for customer reference
  routeId: varchar("route_id").notNull().references(() => carpoolRoutes.id),
  timeSlotId: varchar("time_slot_id").notNull().references(() => carpoolTimeSlots.id),
  tripDate: text("trip_date").notNull(), // Format: "2024-11-14"
  driverId: varchar("driver_id").references(() => drivers.id),
  vehicleCapacity: integer("vehicle_capacity").notNull().default(4),
  bookedSeats: integer("booked_seats").notNull().default(0),
  recommendedVehicleType: text("recommended_vehicle_type"), // 'sedan', '7_seater', '10_seater', '14_seater', '32_seater'
  status: text("status").notNull().default("pending_assignment"), // 'pending_assignment', 'low_capacity_warning', 'confirmed', 'in_progress', 'completed', 'cancelled'
  departureTime: text("departure_time"),
  completionTime: text("completion_time"),
  generatedBy: text("generated_by").default("manual"), // 'ai' or 'manual'
  aiConfidenceScore: numeric("ai_confidence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  aiRationale: text("ai_rationale"), // AI explanation for trip grouping
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vehicle_trip_date").on(table.tripDate, table.routeId, table.timeSlotId),
  index("idx_vehicle_trip_status").on(table.status, table.tripDate),
  index("idx_vehicle_trip_reference").on(table.tripReferenceId),
]);

// Trip Bookings Table - Individual user bookings on vehicle trips
export const tripBookings = pgTable("trip_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleTripId: varchar("vehicle_trip_id").notNull().references(() => vehicleTrips.id),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  boardingPointId: varchar("boarding_point_id").notNull().references(() => carpoolPickupPoints.id),
  dropOffPointId: varchar("drop_off_point_id").notNull().references(() => carpoolPickupPoints.id),
  pickupSequence: integer("pickup_sequence"), // Order in which passengers will be picked up
  status: text("status").notNull().default("expected"), // 'expected', 'picked_up', 'completed', 'no_show', 'cancelled'
  pickupTime: text("pickup_time"),
  dropoffTime: text("dropoff_time"),
  refundProcessed: boolean("refund_processed").default(false),
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_trip_booking_vehicle").on(table.vehicleTripId, table.status),
  index("idx_trip_booking_user").on(table.userId, table.createdAt),
]);

// Complaints Table - User complaints for specific trips
export const complaints = pgTable("complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 6 }).notNull().unique(),
  tripBookingId: varchar("trip_booking_id").references(() => tripBookings.id), // Can be null for general complaints
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(), // 'Driver Issue', 'Vehicle Condition', 'Route Deviation', 'Delay', 'Safety Concern', 'Other'
  severity: text("severity").notNull(), // 'Low', 'Medium', 'High', 'Critical'
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'investigating', 'resolved', 'closed'
  resolution: text("resolution"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_complaint_user").on(table.userId, table.status),
  index("idx_complaint_booking").on(table.tripBookingId),
  index("idx_complaint_severity").on(table.severity, table.status),
]);

// Insert schemas
export const insertCorporateBookingSchema = createInsertSchema(corporateBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  status: true,
  completionEmailSentAt: true,
  statusUpdatedAt: true,
  createdAt: true,
});

export const insertRentalBookingSchema = createInsertSchema(rentalBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  driverId: true,
  status: true,
  completionEmailSentAt: true,
  statusUpdatedAt: true,
  createdAt: true,
});

export const insertVendorRegistrationSchema = createInsertSchema(vendorRegistrations).omit({
  id: true,
  referenceId: true,
  status: true,
  completionEmailSentAt: true,
  statusUpdatedAt: true,
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  referenceId: true,
  status: true,
  completionEmailSentAt: true,
  statusUpdatedAt: true,
  createdAt: true,
});

export const insertSubmissionStatusHistorySchema = createInsertSchema(submissionStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  submittedAt: true,
  createdAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioClientSchema = createInsertSchema(portfolioClients).omit({
  id: true,
  createdAt: true,
});

export const insertBangladeshLocationSchema = createInsertSchema(bangladeshLocations).omit({
  id: true,
});

export const insertMarketingSettingsSchema = createInsertSchema(marketingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  role: true,
  permissions: true,
  temporaryPassword: true,
  createdAt: true,
  lastLogin: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const updateBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const updatePortfolioClientSchema = createInsertSchema(portfolioClients).omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string(),
});

export const updateMarketingSettingsSchema = createInsertSchema(marketingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const insertLegalPageSchema = createInsertSchema(legalPages).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLegalPageSchema = createInsertSchema(legalPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const insertWebsiteSettingsSchema = createInsertSchema(websiteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWebsiteSettingsSchema = createInsertSchema(websiteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
});

export const insertOnboardingTokenSchema = createInsertSchema(onboardingTokens).omit({
  id: true,
  used: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  used: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const updateRentalBookingSchema = createInsertSchema(rentalBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  driverId: true,
  createdAt: true,
}).extend({
  id: z.string(),
}).partial();

export const updateCorporateBookingSchema = createInsertSchema(corporateBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  createdAt: true,
}).extend({
  id: z.string(),
}).partial();

// Carpool Insert Schemas
export const insertCarpoolRouteSchema = createInsertSchema(carpoolRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCarpoolRouteSchema = createInsertSchema(carpoolRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  id: z.string(),
});

export const insertCarpoolPickupPointSchema = createInsertSchema(carpoolPickupPoints).omit({
  id: true,
  createdAt: true,
});

export const insertCarpoolTimeSlotSchema = createInsertSchema(carpoolTimeSlots).omit({
  id: true,
  createdAt: true,
});

export const insertCarpoolBookingSchema = createInsertSchema(carpoolBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  driverId: true,
  shareToken: true,
  shareTokenExpiry: true,
  status: true,
  completionEmailSentAt: true,
  statusUpdatedAt: true,
  createdAt: true,
});

export const insertCarpoolBlackoutDateSchema = createInsertSchema(carpoolBlackoutDates).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateCarpoolBookingSchema = createInsertSchema(carpoolBookings).omit({
  id: true,
  referenceId: true,
  userId: true,
  createdAt: true,
}).extend({
  id: z.string(),
}).partial();

// Wallet and Subscription Insert Schemas
export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({
  id: true,
  invoiceNumber: true,
  amountPaid: true,
  walletTransactionId: true,
  status: true,
  paidAt: true,
  createdAt: true,
});

export const insertSubscriptionServiceDaySchema = createInsertSchema(subscriptionServiceDays).omit({
  id: true,
  refundProcessedAt: true,
  createdAt: true,
});

export const insertVehicleTripSchema = createInsertSchema(vehicleTrips).omit({
  id: true,
  tripReferenceId: true,
  bookedSeats: true,
  status: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateVehicleTripSchema = createInsertSchema(vehicleTrips).omit({
  id: true,
  tripReferenceId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
}).partial();

export const insertTripBookingSchema = createInsertSchema(tripBookings).omit({
  id: true,
  status: true,
  refundProcessed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplaintSchema = createInsertSchema(complaints).omit({
  id: true,
  referenceId: true,
  status: true,
  resolution: true,
  resolvedByUserId: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateComplaintSchema = createInsertSchema(complaints).omit({
  id: true,
  referenceId: true,
  userId: true,
  tripBookingId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
}).partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CorporateBooking = typeof corporateBookings.$inferSelect;
export type InsertCorporateBooking = z.infer<typeof insertCorporateBookingSchema>;
export type RentalBooking = typeof rentalBookings.$inferSelect;
export type InsertRentalBooking = z.infer<typeof insertRentalBookingSchema>;
export type VendorRegistration = typeof vendorRegistrations.$inferSelect;
export type InsertVendorRegistration = z.infer<typeof insertVendorRegistrationSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type PortfolioClient = typeof portfolioClients.$inferSelect;
export type InsertPortfolioClient = z.infer<typeof insertPortfolioClientSchema>;
export type UpdateBlogPost = z.infer<typeof updateBlogPostSchema>;
export type UpdatePortfolioClient = z.infer<typeof updatePortfolioClientSchema>;
export type BangladeshLocation = typeof bangladeshLocations.$inferSelect;
export type InsertBangladeshLocation = z.infer<typeof insertBangladeshLocationSchema>;
export type MarketingSettings = typeof marketingSettings.$inferSelect;
export type InsertMarketingSettings = z.infer<typeof insertMarketingSettingsSchema>;
export type UpdateMarketingSettings = z.infer<typeof updateMarketingSettingsSchema>;
export type LegalPage = typeof legalPages.$inferSelect;
export type InsertLegalPage = z.infer<typeof insertLegalPageSchema>;
export type UpdateLegalPage = z.infer<typeof updateLegalPageSchema>;
export type WebsiteSettings = typeof websiteSettings.$inferSelect;
export type InsertWebsiteSettings = z.infer<typeof insertWebsiteSettingsSchema>;
export type UpdateWebsiteSettings = z.infer<typeof updateWebsiteSettingsSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type UpdateDriver = z.infer<typeof updateDriverSchema>;
export type OnboardingToken = typeof onboardingTokens.$inferSelect;
export type InsertOnboardingToken = z.infer<typeof insertOnboardingTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateRentalBooking = z.infer<typeof updateRentalBookingSchema>;
export type UpdateCorporateBooking = z.infer<typeof updateCorporateBookingSchema>;
export type SubmissionStatusHistory = typeof submissionStatusHistory.$inferSelect;
export type InsertSubmissionStatusHistory = z.infer<typeof insertSubmissionStatusHistorySchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type CarpoolRoute = typeof carpoolRoutes.$inferSelect;
export type InsertCarpoolRoute = z.infer<typeof insertCarpoolRouteSchema>;
export type UpdateCarpoolRoute = z.infer<typeof updateCarpoolRouteSchema>;
export type CarpoolPickupPoint = typeof carpoolPickupPoints.$inferSelect;
export type InsertCarpoolPickupPoint = z.infer<typeof insertCarpoolPickupPointSchema>;
export type CarpoolTimeSlot = typeof carpoolTimeSlots.$inferSelect;
export type InsertCarpoolTimeSlot = z.infer<typeof insertCarpoolTimeSlotSchema>;
export type CarpoolBooking = typeof carpoolBookings.$inferSelect;
export type InsertCarpoolBooking = z.infer<typeof insertCarpoolBookingSchema>;
export type UpdateCarpoolBooking = z.infer<typeof updateCarpoolBookingSchema>;
export type CarpoolBlackoutDate = typeof carpoolBlackoutDates.$inferSelect;
export type InsertCarpoolBlackoutDate = z.infer<typeof insertCarpoolBlackoutDateSchema>;
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = z.infer<typeof insertSubscriptionInvoiceSchema>;
export type SubscriptionServiceDay = typeof subscriptionServiceDays.$inferSelect;
export type InsertSubscriptionServiceDay = z.infer<typeof insertSubscriptionServiceDaySchema>;
export type VehicleTrip = typeof vehicleTrips.$inferSelect;
export type InsertVehicleTrip = z.infer<typeof insertVehicleTripSchema>;
export type UpdateVehicleTrip = z.infer<typeof updateVehicleTripSchema>;
export type TripBooking = typeof tripBookings.$inferSelect;
export type InsertTripBooking = z.infer<typeof insertTripBookingSchema>;
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type UpdateComplaint = z.infer<typeof updateComplaintSchema>;
