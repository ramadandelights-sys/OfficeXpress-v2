import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  updatePortfolioClientSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Logo serving route
  app.get("/logo.jpg", (req, res) => {
    const logoPath = path.resolve(import.meta.dirname, "..", "attached_assets", "OfficeXpress_logo_1756864809144.jpg");
    if (fs.existsSync(logoPath)) {
      res.sendFile(logoPath);
    } else {
      res.status(404).send("Logo not found");
    }
  });

  // Corporate booking routes
  app.post("/api/corporate-bookings", async (req, res) => {
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
  app.post("/api/rental-bookings", async (req, res) => {
    try {
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
  app.post("/api/vendor-registrations", async (req, res) => {
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
  app.post("/api/contact-messages", async (req, res) => {
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

  app.get("/api/blog-posts/:id", async (req, res) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
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
      console.log("Received blog post data:", JSON.stringify(req.body, null, 2));
      
      // Transform the data before validation
      const transformedData = {
        ...req.body,
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

      console.log("Validated blog post data:", JSON.stringify(postData, null, 2));
      const post = await storage.createBlogPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Blog post creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blog post", error: error.message });
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
      const postData = updateBlogPostSchema.parse({ ...req.body, id: req.params.id });
      const post = await storage.updateBlogPost(postData);
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update blog post" });
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

  const httpServer = createServer(app);
  return httpServer;
}
