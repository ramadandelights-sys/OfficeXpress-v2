import { 
  users, 
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
  type InsertBangladeshLocation,
  type MarketingSettings,
  type InsertMarketingSettings,
  type UpdateMarketingSettings,
  type LegalPage,
  type InsertLegalPage,
  type UpdateLegalPage,
  type WebsiteSettings,
  type InsertWebsiteSettings,
  type UpdateWebsiteSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
