import { sql } from 'drizzle-orm';
import { db } from './db';

export async function createTables() {
  console.log("Creating tables directly via SQL...");
  
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar UNIQUE,
        first_name varchar,
        last_name varchar,
        profile_image_url varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    // Create sessions table  
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar PRIMARY KEY,
        sess jsonb NOT NULL,
        expire timestamp NOT NULL
      )
    `);

    // Create sessions index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `);

    // Create corporate bookings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS corporate_bookings (
        id serial PRIMARY KEY,
        company_name varchar NOT NULL,
        contact_person varchar NOT NULL,
        email varchar NOT NULL,
        phone varchar NOT NULL,
        pickup_location varchar NOT NULL,
        destination varchar NOT NULL,
        date varchar NOT NULL,
        time varchar NOT NULL,
        passengers integer NOT NULL,
        special_requirements text,
        status varchar DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      )
    `);

    // Create rental bookings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rental_bookings (
        id serial PRIMARY KEY,
        full_name varchar NOT NULL,
        email varchar NOT NULL,
        phone varchar NOT NULL,
        pickup_location varchar NOT NULL,
        pickup_date varchar NOT NULL,
        pickup_time varchar NOT NULL,
        duration varchar NOT NULL,
        vehicle_type varchar NOT NULL,
        special_requirements text,
        status varchar DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      )
    `);

    // Create vendor registrations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_registrations (
        id serial PRIMARY KEY,
        company_name varchar NOT NULL,
        contact_person varchar NOT NULL,
        email varchar NOT NULL,
        phone varchar NOT NULL,
        address text NOT NULL,
        vehicle_types text[] NOT NULL,
        fleet_size integer NOT NULL,
        years_experience integer NOT NULL,
        license_number varchar NOT NULL,
        insurance_details text,
        status varchar DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      )
    `);

    // Create blog posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id serial PRIMARY KEY,
        title varchar NOT NULL,
        content text NOT NULL,
        excerpt varchar,
        author varchar,
        published_date varchar,
        image_url varchar,
        status varchar DEFAULT 'published',
        created_at timestamp DEFAULT now()
      )
    `);

    // Create portfolio clients table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolio_clients (
        id serial PRIMARY KEY,
        name varchar NOT NULL,
        logo_url varchar,
        description text,
        project_details text,
        testimonial text,
        testimonial_author varchar,
        client_type varchar DEFAULT 'corporate',
        featured boolean DEFAULT false,
        created_at timestamp DEFAULT now()
      )
    `);

    // Create contact messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id serial PRIMARY KEY,
        full_name varchar NOT NULL,
        email varchar NOT NULL,
        phone varchar,
        subject varchar NOT NULL,
        message text NOT NULL,
        status varchar DEFAULT 'new',
        created_at timestamp DEFAULT now()
      )
    `);

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}