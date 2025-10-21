# OfficeXpress Transportation Services Platform

## Overview

OfficeXpress is a comprehensive transportation services platform for businesses and individuals in Bangladesh. It offers corporate employee transportation, vehicle rental services, vendor registration, and portfolio management. The platform features a modern web interface with booking forms, client portfolio display, blog functionality, and contact management, aiming to streamline transportation logistics and expand market reach.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **Routing**: Wouter for client-side navigation.
- **UI Components**: Shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom design tokens.
- **State Management**: TanStack Query for server state.
- **Forms**: React Hook Form with Zod validation.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript.
- **API Design**: RESTful API with dedicated endpoints.
- **Error Handling**: Centralized middleware for structured error responses.

### Database Layer
- **ORM**: Drizzle ORM with type-safe schema definitions.
- **Database**: PostgreSQL with Neon serverless hosting.
- **Connection**: Connection pooling using `@neondatabase/serverless`.
- **Schema Management**: Drizzle Kit for migrations.

### Data Models
Core entities include Users, Corporate Bookings, Rental Bookings, Vendor Registrations, Contact Messages, Blog Posts, Portfolio Clients, and Drivers.

### Authentication & Security
- **Authentication**: Phone-based with three roles (Customer, Employee, Superadmin) and role-based access control.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Security Features**: bcrypt hashing, CSRF protection, rate limiting, HttpOnly/Secure/SameSite cookies.
- **Input Validation**: Zod schemas and server-side validation.
- **Granular Permissions**: 12 permission types controlling access to different admin panel sections.
- **Reference ID Tracking**: Unique 6-character alphanumeric IDs for all form submissions.

### UI/UX Decisions
- Dynamic form pre-selection based on URL query parameters for rental services.
- Clean calendar UX for rental bookings with single or range selection.
- End time field logic fixed for multi-day rental bookings.
- Professional labels and office address field added to corporate forms.

### System Design Choices
- **Multi-User Authentication**: Phone-based authentication with Customer, Employee, and Superadmin roles.
- **Automatic Account Creation**: Customer accounts created from bookings without requiring separate login.
- **Admin Panel**: Comprehensive admin panel with three main management sections:
  - **Employee Management** (Superadmin-only): Full CRUD for user accounts with role selection, 12 granular permission checkboxes, and temporary password generation
  - **Driver Management**: Full CRUD for drivers with vehicle details (name, phone, license plate, make/model/year), active/inactive toggle
  - **Driver Assignment**: Assign active drivers to rental bookings with permission-based access control
- **Granular Permissions System**: 12 permission types (blogPosts, portfolioClients, corporateBookings, rentalBookings, vendorRegistrations, contactMessages, marketingSettings, websiteSettings, legalPages, drivers, driverAssignment, employeeManagement) controlling access to different admin sections
- **Temporary Password System**: Auto-generated 12-character temporary passwords for new employee accounts, displayed once to superadmin at creation time
- **Email Notifications**: Resend integration for transactional emails to both admin and customers with professional templates.
- **Reference ID Tracking**: Unique IDs generated for all form submissions, integrated into database, emails, and admin panel.
- **Security Enhancements**: Rate limiting, Helmet security headers, input validation, sanitization, CSRF protection, and permission-based API middleware
- **Analytics Integration**: Comprehensive event tracking with Google Analytics 4 (GA4) and Facebook Pixel, including value-based tracking and server-side conversion API.
- **Deployment**: Environment-aware API base URL system, SSL certificate management, and production environment variables.
- **ReCAPTCHA**: Optional spam protection for forms, configurable per environment.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **@neondatabase/serverless**: For efficient database connections.

### UI & Styling
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Shadcn/ui**: Pre-built component library.
- **Google Fonts**: For typography.

### Third-party Libraries
- **React Hook Form**: Form state management.
- **TanStack Query**: Server state management.
- **Date-fns**: Date manipulation.
- **Embla Carousel**: Responsive carousel.
- **Wouter**: Client-side routing.
- **Class Variance Authority**: CSS class variant management.
- **nanoid**: For unique ID generation.
- **DOMPurify**: For content sanitization.

### External Integrations
- **Resend**: Transactional email service.
- **Facebook Pixel**: For conversion tracking and analytics (client-side and Conversions API).
- **Google Analytics 4 (GA4)**: For website analytics and event tracking.
- **Google reCAPTCHA**: Optional spam protection.