import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, jsonb, numeric, serial, index } from "drizzle-orm/pg-core";
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
  vendorRegistrations?: PermissionLevel;
  contactMessages?: PermissionLevel;
  marketingSettings?: PermissionLevel;
  websiteSettings?: PermissionLevel;
  legalPages?: PermissionLevel;
  driverManagement?: PermissionLevel; // Renamed from "drivers"
  driverAssignment?: boolean; // Special: stays as boolean (it's an action, not CRUD)
  employeeManagement?: PermissionLevel;
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
