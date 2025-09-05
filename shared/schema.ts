import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, numeric, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
});

export const corporateBookings = pgTable("corporate_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  officeAddress: text("office_address"),
  serviceType: text("service_type"),
  contractType: text("contract_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rentalBookings = pgTable("rental_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorRegistrations = pgTable("vendor_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  location: text("location").notNull(),
  vehicleTypes: json("vehicle_types").$type<string[]>().default([]),
  serviceModality: text("service_modality").notNull(),
  experience: text("experience"),
  additionalInfo: text("additional_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// Insert schemas
export const insertCorporateBookingSchema = createInsertSchema(corporateBookings).omit({
  id: true,
  createdAt: true,
});

export const insertRentalBookingSchema = createInsertSchema(rentalBookings).omit({
  id: true,
  createdAt: true,
});

export const insertVendorRegistrationSchema = createInsertSchema(vendorRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
