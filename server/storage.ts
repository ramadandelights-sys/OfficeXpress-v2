import { 
  users, 
  corporateBookings,
  rentalBookings, 
  vendorRegistrations,
  contactMessages,
  blogPosts,
  portfolioClients,
  bangladeshLocations,
  type User, 
  type InsertUser,
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
  type InsertBangladeshLocation
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Corporate bookings
  createCorporateBooking(booking: InsertCorporateBooking): Promise<CorporateBooking>;
  getCorporateBookings(): Promise<CorporateBooking[]>;
  
  // Rental bookings
  createRentalBooking(booking: InsertRentalBooking): Promise<RentalBooking>;
  getRentalBookings(): Promise<RentalBooking[]>;
  
  // Vendor registrations
  createVendorRegistration(vendor: InsertVendorRegistration): Promise<VendorRegistration>;
  getVendorRegistrations(): Promise<VendorRegistration[]>;
  
  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  
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
  importBangladeshLocations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createCorporateBooking(booking: InsertCorporateBooking): Promise<CorporateBooking> {
    const [newBooking] = await db
      .insert(corporateBookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async getCorporateBookings(): Promise<CorporateBooking[]> {
    return await db.select().from(corporateBookings).orderBy(desc(corporateBookings.createdAt));
  }

  async createRentalBooking(booking: InsertRentalBooking): Promise<RentalBooking> {
    const [newBooking] = await db
      .insert(rentalBookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async getRentalBookings(): Promise<RentalBooking[]> {
    return await db.select().from(rentalBookings).orderBy(desc(rentalBookings.createdAt));
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

  async getVendorRegistrations(): Promise<VendorRegistration[]> {
    return await db.select().from(vendorRegistrations).orderBy(desc(vendorRegistrations.createdAt));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [newPost] = await db
      .insert(blogPosts)
      .values({
        ...post,
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
    return await db.select().from(bangladeshLocations).orderBy(bangladeshLocations.fullName);
  }

  async importBangladeshLocations(): Promise<void> {
    // Parse the Google Sheets data and import to database
    const locationsData = [
      // Sample of processed data from the Google Sheet
      { division: "Dhaka", district: "Dhaka", subordinate: "Demra", branch: "Demra", postCode: "1360", fullName: "Demra, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Demra", branch: "Sarulia", postCode: "1361", fullName: "Sarulia, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Demra", branch: "Matuail", postCode: "1362", fullName: "Matuail, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka GPO", branch: "Dhaka GPO", postCode: "1000", fullName: "Dhaka GPO" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Main PO", branch: "Dhaka Main PO", postCode: "1100", fullName: "Dhaka Main PO" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Wari TSO", postCode: "1203", fullName: "Wari, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Gendaria TSO", postCode: "1204", fullName: "Gendaria, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "New Market TSO", postCode: "1205", fullName: "New Market, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Gulshan Model Town", postCode: "1212", fullName: "Gulshan, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Banani TSO", postCode: "1213", fullName: "Banani, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Mirpur TSO", postCode: "1218", fullName: "Mirpur, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Dhaka Sadar", branch: "Uttara Model TwonTSO", postCode: "1231", fullName: "Uttara, Dhaka" },
      { division: "Dhaka", district: "Dhaka", subordinate: "Savar", branch: "Savar", postCode: "1340", fullName: "Savar, Dhaka" },
      { division: "Chittagong", district: "Chittagong", subordinate: "Chittagong Sadar", branch: "Chittagong GPO", postCode: "4000", fullName: "Chittagong" },
      { division: "Chittagong", district: "Cox's Bazar", subordinate: "Cox's Bazar Sadar", branch: "Cox's Bazar", postCode: "4700", fullName: "Cox's Bazar" },
      { division: "Sylhet", district: "Sylhet", subordinate: "Sylhet Sadar", branch: "Sylhet", postCode: "3100", fullName: "Sylhet" },
      { division: "Rajshahi", district: "Rajshahi", subordinate: "Rajshahi Sadar", branch: "Rajshahi", postCode: "6000", fullName: "Rajshahi" },
      { division: "Khulna", district: "Khulna", subordinate: "Khulna Sadar", branch: "Khulna", postCode: "9000", fullName: "Khulna" },
      { division: "Barisal", district: "Barisal", subordinate: "Barisal Sadar", branch: "Barisal", postCode: "8200", fullName: "Barisal" },
      { division: "Rangpur", district: "Rangpur", subordinate: "Rangpur Sadar", branch: "Rangpur", postCode: "5400", fullName: "Rangpur" },
      { division: "Mymensingh", district: "Mymensingh", subordinate: "Mymensingh Sadar", branch: "Mymensingh", postCode: "2200", fullName: "Mymensingh" }
    ];

    // Clear existing data and insert new data
    await db.delete(bangladeshLocations);
    
    for (const location of locationsData) {
      await db.insert(bangladeshLocations).values(location);
    }
  }
}

export const storage = new DatabaseStorage();
