// Vercel serverless function for corporate bookings
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { pgTable, text, varchar, timestamp } = require('drizzle-orm/pg-core');
const { sql, desc } = require('drizzle-orm');
const { z } = require('zod');

// Configure Neon for serverless
neonConfig.webSocketConstructor = require('ws');

// Database schema
const corporateBookings = pgTable("corporate_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceType: text("service_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Validation schema
const insertCorporateBookingSchema = z.object({
  companyName: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  serviceType: z.string().optional(),
});

// Database connection with error handling
let db = null;
function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool });
  }
  return db;
}

module.exports = async function handler(req, res) {
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
    if (req.method === 'POST') {
      try {
        // Validate the request data
        const bookingData = insertCorporateBookingSchema.parse(req.body);
        
        // Get database connection
        const database = getDb();
        
        // Insert booking into database
        const [booking] = await database
          .insert(corporateBookings)
          .values(bookingData)
          .returning();
        
        res.json({ 
          success: true, 
          message: "Corporate booking submitted successfully",
          booking: booking
        });
        return;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          res.status(400).json({ 
            success: false,
            message: "Invalid booking data", 
            errors: validationError.errors 
          });
        } else {
          throw validationError;
        }
        return;
      }
    }

    if (req.method === 'GET') {
      try {
        const database = getDb();
        const bookings = await database
          .select()
          .from(corporateBookings)
          .orderBy(desc(corporateBookings.createdAt));
        res.json(bookings);
        return;
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ 
          success: false,
          message: "Failed to fetch bookings" 
        });
        return;
      }
    }

    res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  } catch (error) {
    console.error('Corporate bookings API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}