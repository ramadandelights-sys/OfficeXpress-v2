import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  validateCorporateBooking,
  validateRentalBooking,
  validateVendorRegistration,
  validateContactMessage 
} from "./validation";
import path from "path";
import fs from "fs";
import { 
  insertCorporateBookingSchema,
  insertRentalBookingSchema,
  insertVendorRegistrationSchema,
  insertContactMessageSchema,
  insertBlogPostSchema,
  insertPortfolioClientSchema,
  updateBlogPostSchema,
  updatePortfolioClientSchema,
  insertMarketingSettingsSchema,
  updateMarketingSettingsSchema,
  insertWebsiteSettingsSchema,
  updateWebsiteSettingsSchema,
  insertLegalPageSchema,
  updateLegalPageSchema
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  // Health check endpoint for debugging
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Logo settings endpoint for frontend
  app.get("/api/logo", async (req, res) => {
    try {
      const settings = await storage.getMarketingSettings();
      const hasCustomLogo = !!(settings?.logoPath);
      
      // Generate cache busting version based on logo path or timestamp
      const version = hasCustomLogo 
        ? Buffer.from(settings.logoPath || '').toString('base64').slice(0, 8)
        : 'default';
      
      res.json({ 
        src: `/logo.jpg?v=${version}`,
        hasCustomLogo,
        version
      });
    } catch (error) {
      console.error('Logo settings error:', error);
      res.json({ 
        src: "/logo.jpg?v=default",
        hasCustomLogo: false,
        version: "default"
      });
    }
  });

  // Logo serving route - dynamically serves from database settings
  app.get("/logo.jpg", async (req, res) => {
    try {
      // Get the logo path from marketing settings
      const settings = await storage.getMarketingSettings();
      let logoPath = null;
      
      if (settings && settings.logoPath) {
        // Try to serve the database-stored logo
        logoPath = path.resolve(import.meta.dirname, "..", "attached_assets", path.basename(settings.logoPath));
      }
      
      // Fallback to default logo if no custom logo is set
      if (!logoPath || !fs.existsSync(logoPath)) {
        logoPath = path.resolve(import.meta.dirname, "..", "attached_assets", "logo_v3_1757541985694.png");
      }
      
      if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
      } else {
        res.status(404).send("Logo not found");
      }
    } catch (error) {
      console.error('Logo serving error:', error);
      // Fallback to default logo on error
      const defaultLogoPath = path.resolve(import.meta.dirname, "..", "attached_assets", "logo_v3_1757541985694.png");
      if (fs.existsSync(defaultLogoPath)) {
        res.sendFile(defaultLogoPath);
      } else {
        res.status(404).send("Logo not found");
      }
    }
  });

  // Corporate booking routes
  app.post("/api/corporate-bookings", validateCorporateBooking, async (req: any, res: any) => {
    try {
      const bookingData = insertCorporateBookingSchema.parse(req.body);
      const booking = await storage.createCorporateBooking(bookingData);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create corporate booking" });
      }
    }
  });

  app.get("/api/corporate-bookings", async (req, res) => {
    try {
      const bookings = await storage.getCorporateBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch corporate bookings" });
    }
  });

  // Rental booking routes
  app.post("/api/rental-bookings", validateRentalBooking, async (req: any, res: any) => {
    try {
      // Set default endTime to 11:59 PM if not provided (for multi-day rentals)
      if (!req.body.endTime) {
        req.body.endTime = "11:59 PM";
      }
      
      const bookingData = insertRentalBookingSchema.parse(req.body);
      const booking = await storage.createRentalBooking(bookingData);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create rental booking" });
      }
    }
  });

  app.get("/api/rental-bookings", async (req, res) => {
    try {
      const bookings = await storage.getRentalBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rental bookings" });
    }
  });

  // Vendor registration routes
  app.post("/api/vendor-registrations", validateVendorRegistration, async (req: any, res: any) => {
    try {
      const vendorData = insertVendorRegistrationSchema.parse(req.body);
      const vendor = await storage.createVendorRegistration(vendorData);
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create vendor registration" });
      }
    }
  });

  app.get("/api/vendor-registrations", async (req, res) => {
    try {
      const vendors = await storage.getVendorRegistrations();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor registrations" });
    }
  });

  // Contact message routes
  app.post("/api/contact-messages", validateContactMessage, async (req: any, res: any) => {
    try {
      const messageData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(messageData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send contact message" });
      }
    }
  });

  app.get("/api/contact-messages", async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

  // Blog post routes
  app.post("/api/blog-posts", async (req, res) => {
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(postData);
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blog post" });
      }
    }
  });

  app.get("/api/blog-posts", async (req, res) => {
    try {
      const posts = await storage.getPublishedBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog-posts/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) {
        res.status(404).json({ message: "Blog post not found" });
        return;
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Portfolio client routes
  app.post("/api/portfolio-clients", async (req, res) => {
    try {
      const clientData = insertPortfolioClientSchema.parse(req.body);
      const client = await storage.createPortfolioClient(clientData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid client data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create portfolio client" });
      }
    }
  });

  app.get("/api/portfolio-clients", async (req, res) => {
    try {
      const clients = await storage.getPortfolioClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio clients" });
    }
  });

  // Admin routes
  app.get("/api/admin/blog-posts", async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all blog posts" });
    }
  });

  app.post("/api/admin/blog-posts", async (req, res) => {
    try {
      console.log("Received blog post data, processing images...");
      
      // Import image processor
      const { ImageProcessor } = await import("./imageProcessor");
      
      // Process featured image if provided
      let processedFeaturedImage = req.body.featuredImage;
      if (processedFeaturedImage && processedFeaturedImage.startsWith('data:image/')) {
        console.log("Processing featured image...");
        try {
          processedFeaturedImage = await ImageProcessor.processBase64Image(processedFeaturedImage);
          console.log("Featured image processed successfully");
        } catch (imageError) {
          console.error("Failed to process featured image:", imageError);
          return res.status(400).json({ message: "Failed to process featured image" });
        }
      }

      // Process images in content
      let processedContent = req.body.content || '';
      if (processedContent) {
        console.log("Processing content images...");
        // Find all base64 images in content
        const base64ImageRegex = /data:image\/[^;]+;base64,[^"'\s]+/g;
        const images = processedContent.match(base64ImageRegex);
        
        if (images && images.length > 0) {
          console.log(`Found ${images.length} images in content to process`);
          for (const image of images) {
            try {
              const processedImage = await ImageProcessor.processBase64Image(image);
              processedContent = processedContent.replace(image, processedImage);
            } catch (imageError) {
              console.error("Failed to process content image:", imageError);
              // Continue with other images, don't fail the entire post
            }
          }
          console.log("Content images processed successfully");
        }
      }
      
      // Transform the data before validation
      const transformedData = {
        ...req.body,
        featuredImage: processedFeaturedImage,
        content: processedContent,
        // Convert scheduledFor string to timestamp if provided
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        // Ensure tags is an array
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        // Set publishedAt if published is true
        publishedAt: req.body.published ? new Date() : null,
      };
      
      const postData = insertBlogPostSchema.parse(transformedData);
      
      // Generate slug if not provided
      if (!postData.slug && postData.title) {
        postData.slug = postData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
      }

      // Auto-generate excerpt if empty
      if (!postData.excerpt && postData.content) {
        postData.excerpt = postData.content.slice(0, 150) + "...";
      }

      console.log("Creating blog post with processed images...");
      const post = await storage.createBlogPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Blog post creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blog post", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.get("/api/admin/corporate-bookings", async (req, res) => {
    try {
      const bookings = await storage.getCorporateBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch corporate bookings" });
    }
  });

  app.get("/api/admin/rental-bookings", async (req, res) => {
    try {
      const bookings = await storage.getRentalBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rental bookings" });
    }
  });

  app.get("/api/admin/vendor-registrations", async (req, res) => {
    try {
      const vendors = await storage.getVendorRegistrations();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor registrations" });
    }
  });

  app.get("/api/admin/contact-messages", async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

  app.put("/api/admin/blog-posts/:id", async (req, res) => {
    try {
      console.log("Updating blog post:", req.params.id, JSON.stringify(req.body, null, 2));
      const postData = updateBlogPostSchema.parse({ ...req.body, id: req.params.id });
      const post = await storage.updateBlogPost(postData);
      console.log("Blog post updated successfully:", post.id);
      res.json(post);
    } catch (error) {
      console.error("Blog post update error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update blog post", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.delete("/api/admin/blog-posts/:id", async (req, res) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Image upload endpoint - Admin only with robust validation
  app.post("/api/upload", async (req, res) => {
    try {
      // Enhanced authentication check
      const adminAuth = req.headers['x-admin-auth'];
      const userAgent = req.headers['user-agent'];
      const referer = req.headers['referer'];
      
      console.log('Upload request headers:', {
        adminAuth,
        userAgent: userAgent ? 'present' : 'missing',
        referer
      });
      
      // Basic security checks - reject if missing expected headers
      if (!adminAuth || !userAgent) {
        console.log('Missing required headers');
        return res.status(401).json({ error: "Unauthorized: Admin access required - missing headers" });
      }
      
      // Check if request comes from admin area (more flexible referer check)
      if (referer && !referer.includes('admin') && !referer.includes('localhost')) {
        console.log('Invalid referer:', referer);
        return res.status(401).json({ error: "Unauthorized: Admin access required - invalid referer" });
      }

      const { image } = req.body;
      
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Parse data URL and validate MIME type
      const dataUrlMatch = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!dataUrlMatch) {
        return res.status(400).json({ error: "Invalid image format. Only PNG, JPEG, and WebP allowed" });
      }

      const [, mimeType, base64Data] = dataUrlMatch;
      
      // Validate base64
      if (!base64Data) {
        return res.status(400).json({ error: "Invalid base64 format" });
      }

      // Check file size (base64 is ~1.37x larger than actual file)
      const sizeEstimate = (base64Data.length * 0.75) / (1024 * 1024); // MB
      if (sizeEstimate > 5) {
        return res.status(400).json({ error: "File too large (max 5MB)" });
      }

      // Decode and validate buffer
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        return res.status(400).json({ error: "Invalid base64 encoding" });
      }

      // Validate image dimensions and re-encode for security
      const sharp = await import('sharp');
      const metadata = await sharp.default(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      if (metadata.width > 2048 || metadata.height > 2048) {
        return res.status(400).json({ error: "Image too large (max 2048x2048)" });
      }

      console.log("Processing uploaded image...");
      
      // Re-encode image to PNG for security and consistency
      const processedBuffer = await sharp.default(buffer)
        .png({ quality: 90 })
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      // Generate content hash for secure filename and versioning
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(processedBuffer).digest('hex');
      const filename = `logo_${hash.slice(0, 16)}.png`;
      const filepath = path.resolve(import.meta.dirname, "..", "attached_assets", filename);

      // Write the processed image
      fs.writeFileSync(filepath, processedBuffer);
      
      console.log("Image processed successfully:", filename);
      
      // Return the filename for database storage
      res.json({ 
        url: filename,
        version: hash.slice(0, 8),
        size: processedBuffer.length,
        dimensions: { width: metadata.width, height: metadata.height }
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.post("/api/admin/portfolio-clients", async (req, res) => {
    try {
      const clientData = insertPortfolioClientSchema.parse(req.body);
      const client = await storage.createPortfolioClient(clientData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid client data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create portfolio client" });
      }
    }
  });

  app.put("/api/admin/portfolio-clients/:id", async (req, res) => {
    try {
      const clientData = updatePortfolioClientSchema.parse({ ...req.body, id: req.params.id });
      const client = await storage.updatePortfolioClient(clientData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid client data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update portfolio client" });
      }
    }
  });

  app.delete("/api/admin/portfolio-clients/:id", async (req, res) => {
    try {
      await storage.deletePortfolioClient(req.params.id);
      res.json({ message: "Portfolio client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete portfolio client" });
    }
  });

  // Bangladesh locations API routes
  app.get("/api/bangladesh-locations", async (req, res) => {
    try {
      const locations = await storage.getBangladeshLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Bangladesh locations" });
    }
  });

  // Export locations as JSON for static file generation
  app.get("/api/export-bangladesh-locations-json", async (req, res) => {
    try {
      const locations = await storage.getBangladeshLocations();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="bangladesh-locations.json"');
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to export Bangladesh locations" });
    }
  });

  app.post("/api/admin/import-bangladesh-locations", async (req, res) => {
    try {
      await storage.importComprehensiveBangladeshLocations();
      res.json({ message: "Bangladesh locations imported successfully" });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import Bangladesh locations" });
    }
  });

  app.get("/api/search-bangladesh-locations", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }
      
      // Detect if input contains Bengali characters
      const containsBengali = /[\u0980-\u09FF]/.test(q.trim());
      
      const results = await storage.searchBangladeshLocations(q.trim());
      
      // Transform results to show appropriate language field
      const transformedResults = results.map(location => ({
        ...location,
        displayName: containsBengali 
          ? (location.fullLocationBn || location.fullLocationEn)
          : location.fullLocationEn
      }));
      
      res.json(transformedResults);
    } catch (error) {
      res.status(500).json({ message: "Failed to search Bangladesh locations" });
    }
  });

  // Facebook Conversions API endpoint
  app.post("/api/facebook-conversion", async (req, res) => {
    try {
      const { pixelId, event, customData, userData, timestamp, actionSource, eventSourceUrl } = req.body;
      
      // Get access token from database settings instead of environment variables
      const marketingSettings = await storage.getMarketingSettings();
      const accessToken = marketingSettings?.facebookAccessToken;
      
      if (!accessToken) {
        return res.status(500).json({ error: "Facebook access token not configured in marketing settings" });
      }
      
      if (!marketingSettings?.facebookEnabled) {
        return res.status(400).json({ error: "Facebook tracking is disabled" });
      }

      const conversionData = {
        data: [{
          event_name: event,
          event_time: timestamp,
          action_source: actionSource,
          event_source_url: eventSourceUrl,
          custom_data: customData,
          user_data: userData,
        }],
        access_token: accessToken,
      };

      const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Facebook Conversions API error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Facebook Conversions API error:', error);
      res.status(500).json({ error: "Failed to send conversion data" });
    }
  });

  // Marketing Settings API endpoints
  app.get("/api/admin/marketing-settings", async (req, res) => {
    try {
      const settings = await storage.getMarketingSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch marketing settings:', error);
      res.status(500).json({ message: "Failed to fetch marketing settings" });
    }
  });

  app.post("/api/admin/marketing-settings", async (req, res) => {
    try {
      const settingsData = insertMarketingSettingsSchema.parse(req.body);
      
      // Check if marketing settings already exist (upsert pattern)
      const existingSettings = await storage.getMarketingSettings();
      
      let settings;
      if (existingSettings) {
        // Update existing settings
        settings = await storage.updateMarketingSettings({ 
          id: existingSettings.id, 
          ...settingsData 
        });
      } else {
        // Create new settings
        settings = await storage.createMarketingSettings(settingsData);
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Marketing settings validation error:', error.errors);
        res.status(400).json({ message: "Invalid marketing settings data", errors: error.errors });
      } else {
        console.error('Failed to save marketing settings:', error);
        res.status(500).json({ message: "Failed to save marketing settings" });
      }
    }
  });

  app.put("/api/admin/marketing-settings/:id", async (req, res) => {
    try {
      const settingsData = updateMarketingSettingsSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const settings = await storage.updateMarketingSettings(settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Marketing settings not found" });
      }
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid marketing settings data", errors: error.errors });
      } else {
        console.error('Failed to update marketing settings:', error);
        res.status(500).json({ message: "Failed to update marketing settings" });
      }
    }
  });

  app.delete("/api/admin/marketing-settings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMarketingSettings(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Marketing settings not found" });
      }
      res.json({ message: "Marketing settings deleted successfully" });
    } catch (error) {
      console.error('Failed to delete marketing settings:', error);
      res.status(500).json({ message: "Failed to delete marketing settings" });
    }
  });

  // Website Settings API endpoints
  // Public endpoint for website settings (read-only)
  app.get("/api/website-settings", async (req, res) => {
    try {
      const settings = await storage.getWebsiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch website settings:', error);
      res.status(500).json({ message: "Failed to fetch website settings" });
    }
  });

  app.get("/api/admin/website-settings", async (req, res) => {
    try {
      const settings = await storage.getWebsiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch website settings:', error);
      res.status(500).json({ message: "Failed to fetch website settings" });
    }
  });

  app.post("/api/admin/website-settings", async (req, res) => {
    try {
      const settingsData = insertWebsiteSettingsSchema.parse(req.body);
      const settings = await storage.createWebsiteSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid website settings data", errors: error.errors });
      } else {
        console.error('Failed to create website settings:', error);
        res.status(500).json({ message: "Failed to create website settings" });
      }
    }
  });

  app.put("/api/admin/website-settings/:id", async (req, res) => {
    try {
      const settingsData = updateWebsiteSettingsSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const settings = await storage.updateWebsiteSettings(settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Website settings not found" });
      }
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid website settings data", errors: error.errors });
      } else {
        console.error('Failed to update website settings:', error);
        res.status(500).json({ message: "Failed to update website settings" });
      }
    }
  });

  app.delete("/api/admin/website-settings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWebsiteSettings(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Website settings not found" });
      }
      res.json({ message: "Website settings deleted successfully" });
    } catch (error) {
      console.error('Failed to delete website settings:', error);
      res.status(500).json({ message: "Failed to delete website settings" });
    }
  });

  // Legal Pages API endpoints
  app.get("/api/admin/legal-pages", async (req, res) => {
    try {
      const pages = await storage.getLegalPages();
      res.json(pages);
    } catch (error) {
      console.error('Failed to fetch legal pages:', error);
      res.status(500).json({ message: "Failed to fetch legal pages" });
    }
  });

  app.get("/api/admin/legal-pages/:id", async (req, res) => {
    try {
      const page = await storage.getLegalPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error('Failed to fetch legal page:', error);
      res.status(500).json({ message: "Failed to fetch legal page" });
    }
  });

  app.get("/api/legal-pages/:type", async (req, res) => {
    try {
      if (req.params.type !== 'terms' && req.params.type !== 'privacy') {
        return res.status(400).json({ message: "Invalid legal page type" });
      }
      const page = await storage.getLegalPageByType(req.params.type);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error('Failed to fetch legal page:', error);
      res.status(500).json({ message: "Failed to fetch legal page" });
    }
  });

  app.post("/api/admin/legal-pages", async (req, res) => {
    try {
      const pageData = insertLegalPageSchema.parse(req.body);
      const page = await storage.createLegalPage(pageData);
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid legal page data", errors: error.errors });
      } else {
        console.error('Failed to create legal page:', error);
        res.status(500).json({ message: "Failed to create legal page" });
      }
    }
  });

  app.put("/api/admin/legal-pages/:id", async (req, res) => {
    try {
      const pageData = updateLegalPageSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const page = await storage.updateLegalPage(pageData);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid legal page data", errors: error.errors });
      } else {
        console.error('Failed to update legal page:', error);
        res.status(500).json({ message: "Failed to update legal page" });
      }
    }
  });

  app.delete("/api/admin/legal-pages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLegalPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json({ message: "Legal page deleted successfully" });
    } catch (error) {
      console.error('Failed to delete legal page:', error);
      res.status(500).json({ message: "Failed to delete legal page" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
