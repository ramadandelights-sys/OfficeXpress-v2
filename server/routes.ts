import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCorporateBookingSchema,
  insertRentalBookingSchema,
  insertVendorRegistrationSchema,
  insertContactMessageSchema,
  insertBlogPostSchema,
  insertPortfolioClientSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
