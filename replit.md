# OfficeXpress Transportation Services Platform

## Overview

OfficeXpress is a comprehensive transportation services platform built for businesses and individuals in Bangladesh. The application provides corporate employee transportation, vehicle rental services, vendor registration, and portfolio management. It features a modern web interface with booking forms, client portfolio display, blog functionality, and contact management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates

### Service Type Auto-Selection for Rental Form (Latest)
- **Query Parameter Routing**: Airport Transfers and City Tours links navigate to `/rental?service=airport` and `/rental?service=tourism`
- **Reactive Pre-selection**: Service type field automatically updates based on URL query parameter
- **Dynamic Updates**: Service type changes when navigating between different service links
- **Default Fallback**: Resets to "Business Transportation" when no query parameter present
- **SPA Navigation Support**: Works for both initial page load and in-page navigation via polling mechanism

### Rental Form Calendar Selection Fix
- **Date Pre-selection Removed**: Eliminated auto-selection of today's date on page load
- **Clean Calendar UX**: Calendar now opens with no dates highlighted for first-time users
- **Single-Click Selection**: Users can select a single date with one click (sets both start and end)
- **Two-Click Range Selection**: Users can select a date range by clicking start and end dates
- **No Forced Ranges**: Users no longer forced into unwanted ranges starting from today

### Rental Form Multi-Day Booking Fix
- **End Time Field Logic**: Fixed validation error when customers select multiple days
- **Frontend**: End time field hidden for multi-day rentals, only shown for single-day bookings
- **Backend Default**: Automatically sets end time to 11:59 PM for multi-day rentals
- **Validation Update**: Backend validation now properly handles optional end time using falsy values check
- **Database Integrity**: Ensures all rental bookings have valid end time values (user-selected or default)

### Facebook Pixel Integration Complete
- **Hardcoded Implementation**: Facebook Pixel now directly embedded in HTML head for maximum reliability
- **Content Security Policy**: Updated CSP to allow Facebook domains and scripts
- **Proper HTML5 Structure**: Pixel script in head, noscript fallback in body section
- **Standard Events**: Using Facebook Standard Events (Contact, Lead, CompleteRegistration) for Events Manager visibility
- **Value-Based Tracking**: Conversion values assigned based on contract type and vehicle tier for optimization
- **Conversions API**: Server-side tracking implemented for improved accuracy and iOS 14.5+ compatibility

### Security Enhancements
- **Rate Limiting**: All form endpoints protected with 15 requests per 15-minute window
- **Helmet Security**: HTTP security headers implemented (HSTS, XSS protection, etc.)
- **Input Validation**: Server-side validation middleware for all form submissions  
- **Sanitization**: Client and server-side content sanitization with DOMPurify
- **CSRF Protection**: Form validation tokens and secure request handling

### Facebook Pixel Standard Events
- **Contact Event**: Contact form submissions → Contact standard event
- **Lead Event**: Corporate and rental bookings → Lead standard event with value tracking
  - Corporate: $100 (monthly contracts), $50 (other contracts)
  - Rental: $20-$75 based on vehicle tier (economy to ultra-luxury)
- **CompleteRegistration Event**: Vendor registrations → CompleteRegistration standard event
- **Conversions API**: Server-side conversion tracking for improved accuracy
- **User Data Hashing**: SHA-256 hashing for email, phone, and name (Facebook requirement)
- **Environment Configuration**: VITE_FACEBOOK_PIXEL_ID and FACEBOOK_ACCESS_TOKEN support

### Deployment & Production Configuration (Latest)
- **API Base URL System**: Environment-aware API configuration for production deployment
- **Location Search Fix**: Fixed location autocomplete to work properly on deployed site
- **SSL Certificate Management**: Automatic SSL/TLS certificate provisioning by Replit for custom domains
- **Production Environment Variables**: VITE_API_URL support for custom API endpoints

### Form Enhancements
- **Professional Labels**: Updated corporate form with "Primary Contact Person" and "Company Email Address"
- **Office Address Field**: Added office address to corporate booking schema
- **reCAPTCHA Integration**: Optional spam protection for all forms

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with page-based navigation
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **API Design**: RESTful API with dedicated endpoints for each service type
- **Request Handling**: Express middleware for JSON parsing, CORS, and request logging
- **Error Handling**: Centralized error handling middleware with structured error responses
- **Development Setup**: Vite integration for hot module replacement in development

### Database Layer
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Database**: PostgreSQL with Neon serverless database hosting
- **Connection**: Connection pooling using @neondatabase/serverless
- **Schema Management**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for schema migrations and database management

### Data Models
The application manages several core entities:
- **Users**: Authentication and user management
- **Corporate Bookings**: Business transportation requests with company details
- **Rental Bookings**: Individual vehicle rental requests with pickup dates and duration
- **Vendor Registrations**: Service provider registrations with vehicle types and experience
- **Contact Messages**: Customer inquiries and communication
- **Blog Posts**: Content management for company updates and insights
- **Portfolio Clients**: Client showcase with logos, images, and testimonials

### Authentication & Security
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Input Validation**: Zod schemas for runtime type checking and validation
- **CORS**: Configured for cross-origin requests in development environment

### File Structure
- **Monorepo Setup**: Shared schema and types between client and server
- **Client**: React application in `/client` directory with component-based architecture
- **Server**: Express API in `/server` directory with modular route handlers
- **Shared**: Common TypeScript definitions and Drizzle schemas in `/shared`

### Build & Deployment
- **Development**: Concurrent client and server development with hot reloading
- **Production Build**: Vite builds client assets, esbuild bundles server code
- **Asset Management**: Static file serving with Vite in development, Express in production
- **Environment Configuration**: Environment-based configuration for database connections

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Connection Pooling**: @neondatabase/serverless for efficient database connections

### UI & Styling
- **Radix UI**: Comprehensive set of accessible UI primitives for components
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Shadcn/ui**: Pre-built component library with consistent design patterns
- **Google Fonts**: External font loading for Roboto and other typefaces

### Development Tools
- **TypeScript**: Type safety across the entire application stack
- **ESLint/Prettier**: Code formatting and linting (implied by project structure)
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

### Third-party Libraries
- **React Hook Form**: Form state management and validation
- **TanStack Query**: Server state management and caching
- **Date-fns**: Date manipulation and formatting utilities
- **Embla Carousel**: Responsive carousel component for image galleries
- **Wouter**: Lightweight client-side routing solution
- **Class Variance Authority**: Utility for managing CSS class variants

### Replit Integration
- **Vite Plugin**: Runtime error modal and cartographer for development
- **Development Banner**: Replit-specific development environment integration