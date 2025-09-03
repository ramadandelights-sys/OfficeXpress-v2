// Vercel serverless function entry point
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../server/storage.js";
import { 
  insertCorporateBookingSchema,
  insertRentalBookingSchema,
  insertVendorRegistrationSchema,
  insertContactMessageSchema,
  insertBlogPostSchema,
  insertPortfolioClientSchema,
  updateBlogPostSchema,
  updatePortfolioClientSchema
} from "../shared/schema.js";
import { z } from "zod";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const path = req.url || '';
    const method = req.method || 'GET';

    // Corporate booking routes
    if (path === '/api/corporate-bookings') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const bookings = await storage.getCorporateBookings();
        res.json(bookings);
        return;
      }
    }

    // Rental booking routes
    if (path === '/api/rental-bookings') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const bookings = await storage.getRentalBookings();
        res.json(bookings);
        return;
      }
    }

    // Vendor registration routes
    if (path === '/api/vendor-registrations') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const vendors = await storage.getVendorRegistrations();
        res.json(vendors);
        return;
      }
    }

    // Contact message routes
    if (path === '/api/contact-messages') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const messages = await storage.getContactMessages();
        res.json(messages);
        return;
      }
    }

    // Blog post routes
    if (path === '/api/blog-posts') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const posts = await storage.getPublishedBlogPosts();
        res.json(posts);
        return;
      }
    }

    // Blog post by ID
    if (path.match(/^\/api\/blog-posts\/[a-zA-Z0-9-]+$/)) {
      const id = path.split('/').pop();
      const post = await storage.getBlogPost(id!);
      if (!post) {
        res.status(404).json({ message: "Blog post not found" });
        return;
      }
      res.json(post);
      return;
    }

    // Portfolio client routes
    if (path === '/api/portfolio-clients') {
      if (method === 'POST') {
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
        return;
      } else if (method === 'GET') {
        const clients = await storage.getPortfolioClients();
        res.json(clients);
        return;
      }
    }

    // Admin routes
    if (path === '/api/admin/blog-posts') {
      if (method === 'GET') {
        const posts = await storage.getAllBlogPosts();
        res.json(posts);
        return;
      } else if (method === 'POST') {
        try {
          const transformedData = {
            ...req.body,
            scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
            tags: Array.isArray(req.body.tags) ? req.body.tags : [],
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

          const post = await storage.createBlogPost(postData);
          res.json(post);
        } catch (error) {
          if (error instanceof z.ZodError) {
            res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
          } else {
            res.status(500).json({ message: "Failed to create blog post" });
          }
        }
        return;
      }
    }

    if (path === '/api/admin/corporate-bookings') {
      const bookings = await storage.getCorporateBookings();
      res.json(bookings);
      return;
    }

    if (path === '/api/admin/rental-bookings') {
      const bookings = await storage.getRentalBookings();
      res.json(bookings);
      return;
    }

    if (path === '/api/admin/vendor-registrations') {
      const vendors = await storage.getVendorRegistrations();
      res.json(vendors);
      return;
    }

    if (path === '/api/admin/contact-messages') {
      const messages = await storage.getContactMessages();
      res.json(messages);
      return;
    }

    // Default response
    res.status(404).json({ 
      message: "API endpoint not found",
      path,
      method
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}