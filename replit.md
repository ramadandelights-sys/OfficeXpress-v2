# OfficeXpress Transportation Services Platform

## Overview

OfficeXpress is a comprehensive transportation services platform for businesses and individuals in Bangladesh. It offers corporate employee transportation, vehicle rental services, vendor registration, and portfolio management. The platform features a modern web interface with booking forms, client portfolio display, blog functionality, and contact management, aiming to streamline transportation logistics and expand market reach.

## Recent Changes

### Multi-Language Support (October 2025)
- **Four Languages**: Complete internationalization (i18n) support for English, Chinese (中文), Japanese (日本語), and Bangla (বাংলা)
- **Language Selector**: Globe icon in header with dropdown menu showing language options with flags (🇺🇸 🇨🇳 🇯🇵 🇧🇩)
- **Persistent Preference**: Language selection automatically saved in browser localStorage for seamless experience
- **Auto-Detection**: Automatically detects browser language on first visit, with locale normalization (e.g., en-US → en)
- **Translation Coverage**: Navigation menu, authentication buttons, common UI elements (search, submit, cancel, etc.), toast messages
- **Implementation**: Built with react-i18next and i18next-browser-languagedetector libraries
- **Mobile-Friendly**: Responsive design shows flag emoji on mobile, full language name on desktop
- **Adding Translations**: To add new translated strings, update all 4 locale files (en.json, zh.json, ja.json, bn.json) in client/src/locales/ with matching keys, then use `t('key.name')` in components

### Environment-Aware Rate Limiting (October 2025)
- **Automatic Environment Detection**: Rate limiters now automatically adjust based on `NODE_ENV` for seamless testing and production security
- **Development Mode**: Generous limits for testing - 100 login attempts, 50 form submissions, 100 admin requests per 15 minutes
- **Production Mode**: Strict limits for security - 5 login attempts, 5 form submissions, 10 admin requests per 15 minutes
- **Zero Configuration**: No manual toggling required - automatically uses correct limits based on environment
- **Benefit**: Eliminates "429 Too many requests" errors during manual testing while maintaining robust protection in production

### Phone-Based Driver Assignment Workflow (October 2025)
- **Streamlined UX**: Replaced dropdown Select with "Assign Driver" button that opens a dedicated dialog for driver assignment
- **Phone-Based Lookup**: Enter phone number to search for existing drivers; auto-populates driver details if found
- **Dynamic Autocomplete Suggestions**: As users type phone numbers (minimum 3 characters), matching drivers appear in a dropdown with name, phone, license plate, and vehicle info for quick selection
- **On-the-Fly Driver Creation**: If phone not found, seamlessly transition to create driver form and assign in one operation
- **Two Workflows**:
  1. **Existing Driver**: Phone found → Show driver details (green card) → Assign to booking
  2. **New Driver**: Phone not found → Show create form (blue card) → Create driver & assign to booking
- **Backend APIs**: 
  - `GET /api/drivers/search?phone=xxx` - Search driver by exact phone match
  - `GET /api/drivers/suggestions?phone=xxx` - Get autocomplete suggestions for partial phone numbers
  - `POST /api/rental-bookings/:id/create-and-assign-driver` - Create driver and assign in one operation
- **Mobile-Friendly**: Dialog-based approach works better on all screen sizes than inline dropdowns

### Permission System Bug Fixes (October 2025)
- **Session Serialization Fix**: Fixed critical bug where session was casting permissions to `Record<string, boolean>` instead of preserving granular `UserPermissions` structure. Sessions now correctly persist three-level permissions end-to-end.
- **Driver Assignment Visibility Fix**: Fixed bug where driver assignment controls weren't appearing for employees with `driverAssignment` permission enabled. Changed from direct permission check to using centralized `hasPermission` helper for consistency (line 890 in admin.tsx).
- **Important Note**: After permission changes, employees must log out and log back in for the new permissions to take effect due to session caching.

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
- **Granular Permissions System**: Three-level permission control (View/Edit/Download CSV) across 12 admin sections:
  - **Permission Structure**: Each permission (except driverAssignment) has three levels:
    - `view`: Can see and read data in the section
    - `edit`: Can create, update, and delete data in the section  
    - `downloadCsv`: Can export data to CSV files (only for data-heavy sections)
  - **12 Permission Types**: blogPosts, portfolioClients, corporateBookings, rentalBookings, vendorRegistrations, contactMessages, marketingSettings, websiteSettings, legalPages, driverManagement, driverAssignment (boolean), employeeManagement
  - **Modern Permission UI**: Table-based permission matrix with toggle switches for intuitive permission management
- **Permission Enforcement**: Four-layer security approach:
  1. **Database Layer**: Permissions stored as JSON objects with {view, edit, downloadCsv} structure
  2. **API Layer**: `hasPermission(permission, action)` middleware checks specific actions (view for GET, edit for POST/PUT/DELETE, downloadCsv for exports)
  3. **Query Layer**: `enabled` flags check `.view` permission before data-fetching queries
  4. **UI Layer**: Conditional rendering checks `.view` for sections, `.edit` for create/edit/delete buttons, `.downloadCsv` for export buttons
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
  - **Employee Management** (Superadmin-only): Full CRUD for user accounts with role selection, granular permission matrix UI, and secure onboarding via email
  - **Driver Management**: Full CRUD for drivers with vehicle details (name, phone, license plate, make/model/year), active/inactive toggle
  - **Driver Assignment**: Assign active drivers to rental bookings with permission-based access control
- **Granular Permissions System**: Three-level permission control (View/Edit/Download CSV) across 12 admin sections (blogPosts, portfolioClients, corporateBookings, rentalBookings, vendorRegistrations, contactMessages, marketingSettings, websiteSettings, legalPages, driverManagement, driverAssignment, employeeManagement) with complete frontend and backend enforcement
- **Secure Onboarding System**: One-time 24-hour onboarding links sent via email for new employee accounts, replacing temporary passwords for enhanced security
- **Email Notifications**: Resend integration for transactional emails to both admin and customers with professional templates.
- **Reference ID Tracking**: Unique IDs generated for all form submissions, integrated into database, emails, and admin panel.
- **Security Enhancements**: Environment-aware rate limiting (strict in production, lenient in development for testing), Helmet security headers, input validation, sanitization, CSRF protection, and permission-based API middleware
  - **Rate Limiting**: Automatically adjusts based on NODE_ENV - Authentication: 5 attempts (prod) / 100 attempts (dev), Forms: 5 submissions (prod) / 50 submissions (dev), Admin: 10 requests (prod) / 100 requests (dev)
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
- **i18next**: Internationalization framework for multi-language support.
- **react-i18next**: React bindings for i18next.
- **i18next-browser-languagedetector**: Automatic browser language detection.

### External Integrations
- **Resend**: Transactional email service.
- **Facebook Pixel**: For conversion tracking and analytics (client-side and Conversions API).
- **Google Analytics 4 (GA4)**: For website analytics and event tracking.
- **Google reCAPTCHA**: Optional spam protection.