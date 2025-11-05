CREATE TABLE "bangladesh_locations_complete" (
	"id" serial PRIMARY KEY NOT NULL,
	"division_id" integer,
	"division_name" varchar NOT NULL,
	"division_name_bn" varchar,
	"division_lat" numeric,
	"division_lng" numeric,
	"district_id" integer,
	"district_name" varchar NOT NULL,
	"district_name_bn" varchar,
	"district_lat" numeric,
	"district_lng" numeric,
	"upazila_id" integer,
	"upazila_name" varchar,
	"upazila_name_bn" varchar,
	"post_office" varchar,
	"post_code" varchar,
	"full_location_en" varchar NOT NULL,
	"full_location_bn" varchar,
	"search_text" varchar,
	"location_type" varchar DEFAULT 'post_office'
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text NOT NULL,
	"category" text NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"featured_image" text,
	"meta_description" text,
	"meta_keywords" text,
	"read_time" integer DEFAULT 5,
	"published" boolean DEFAULT false,
	"published_at" timestamp,
	"scheduled_for" timestamp,
	"author" text DEFAULT 'OfficeXpress Team',
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "carpool_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"user_id" varchar,
	"route_id" varchar NOT NULL,
	"time_slot_id" varchar NOT NULL,
	"driver_id" varchar,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"travel_date" text NOT NULL,
	"boarding_point_id" varchar NOT NULL,
	"drop_off_point_id" varchar NOT NULL,
	"status" text DEFAULT 'pending',
	"completion_email_sent_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "carpool_bookings_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "carpool_pickup_points" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" varchar NOT NULL,
	"name" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"sequence_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carpool_routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"estimated_distance" text NOT NULL,
	"description" text,
	"price_per_seat" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carpool_time_slots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" varchar NOT NULL,
	"departure_time" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"status" text,
	"completion_email_sent_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_messages_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "corporate_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"user_id" varchar,
	"company_name" text NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"office_address" text,
	"service_type" text,
	"contract_type" text,
	"status" text,
	"completion_email_sent_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_bookings_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"license_plate" text NOT NULL,
	"vehicle_make" text NOT NULL,
	"vehicle_model" text NOT NULL,
	"vehicle_year" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facebook_pixel_id" text,
	"facebook_access_token" text,
	"facebook_app_id" text,
	"facebook_page_id" text,
	"facebook_enabled" boolean DEFAULT false,
	"google_analytics_id" text,
	"google_tag_manager_id" text,
	"google_ads_conversion_id" text,
	"google_search_console_id" text,
	"google_enabled" boolean DEFAULT false,
	"utm_source" text DEFAULT 'officexpress',
	"utm_medium" text DEFAULT 'website',
	"utm_campaign" text DEFAULT 'default',
	"cookie_consent_enabled" boolean DEFAULT true,
	"gdpr_compliance" boolean DEFAULT true,
	"tracking_enabled" boolean DEFAULT true,
	"logo_path" text,
	"conversion_goals" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"booking_id" varchar,
	"booking_type" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"is_read" boolean DEFAULT false,
	"email_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"email" text NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "portfolio_clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo" text NOT NULL,
	"images" json DEFAULT '[]'::json,
	"testimonial" text,
	"client_representative" text,
	"position" text,
	"rating" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"user_id" varchar,
	"driver_id" varchar,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"pickup_date" text,
	"duration" text,
	"start_date" text,
	"end_date" text,
	"start_time" text NOT NULL,
	"end_time" text,
	"service_type" text,
	"vehicle_type" text NOT NULL,
	"capacity" text,
	"vehicle_capacity" text NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"is_return_trip" boolean DEFAULT false,
	"status" text,
	"completion_email_sent_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rental_bookings_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_type" text NOT NULL,
	"submission_id" varchar NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"changed_by_user_id" varchar,
	"old_status" text,
	"new_status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"submission_type" text NOT NULL,
	"submission_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"nps_score" integer,
	"feedback" text,
	"submitted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "surveys_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"permissions" json DEFAULT '{}'::json,
	"temporary_password" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vendor_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(6) NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"location" text NOT NULL,
	"vehicle_types" json DEFAULT '[]'::json,
	"service_modality" text NOT NULL,
	"experience" text NOT NULL,
	"additional_info" text,
	"status" text,
	"completion_email_sent_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_registrations_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "website_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_path" text,
	"favicon_path" text,
	"header_background_color" text DEFAULT '#1e293b',
	"header_text_color" text DEFAULT '#ffffff',
	"footer_background_color" text DEFAULT '#1e293b',
	"footer_text_color" text DEFAULT '#ffffff',
	"primary_text_color" text DEFAULT '#1f2937',
	"secondary_text_color" text DEFAULT '#6b7280',
	"accent_color" text DEFAULT '#4c9096',
	"link_color" text DEFAULT '#3b82f6',
	"link_hover_color" text DEFAULT '#2563eb',
	"primary_button_color" text DEFAULT '#4c9096',
	"primary_button_text_color" text DEFAULT '#ffffff',
	"secondary_button_color" text DEFAULT '#f3f4f6',
	"secondary_button_text_color" text DEFAULT '#1f2937',
	"page_background_color" text DEFAULT '#ffffff',
	"section_background_color" text DEFAULT '#f9fafb',
	"card_background_color" text DEFAULT '#ffffff',
	"font_family" text DEFAULT 'Inter, sans-serif',
	"heading_font_family" text DEFAULT 'Inter, sans-serif',
	"site_title" text DEFAULT 'OfficeXpress',
	"site_tagline" text DEFAULT 'Professional Transportation Services',
	"contact_phone" text,
	"contact_email" text,
	"contact_address" text,
	"facebook_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"instagram_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_route_id_carpool_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."carpool_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_time_slot_id_carpool_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."carpool_time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_boarding_point_id_carpool_pickup_points_id_fk" FOREIGN KEY ("boarding_point_id") REFERENCES "public"."carpool_pickup_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_bookings" ADD CONSTRAINT "carpool_bookings_drop_off_point_id_carpool_pickup_points_id_fk" FOREIGN KEY ("drop_off_point_id") REFERENCES "public"."carpool_pickup_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_pickup_points" ADD CONSTRAINT "carpool_pickup_points_route_id_carpool_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."carpool_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carpool_time_slots" ADD CONSTRAINT "carpool_time_slots_route_id_carpool_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."carpool_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_history_submission" ON "submission_status_history" USING btree ("submission_type","submission_id");--> statement-breakpoint
CREATE INDEX "idx_history_reference" ON "submission_status_history" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "idx_history_user" ON "submission_status_history" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_survey_reference" ON "surveys" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "idx_survey_token" ON "surveys" USING btree ("token");