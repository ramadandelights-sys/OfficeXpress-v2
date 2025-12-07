# OfficeXpress Transportation Services Platform

## Overview

OfficeXpress is a comprehensive transportation services platform for businesses and individuals in Bangladesh. It provides corporate employee transportation, vehicle rental services, vendor registration, and portfolio management. The platform aims to streamline transportation logistics, expand market reach, and offers a modern web interface with booking forms, client portfolio display, blog functionality, and contact management. Recent enhancements include a subscription-based office commute system with a wallet, automated services, holiday integration, complaint management, multi-language support, and a phone-based driver assignment workflow.

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
- **Internationalization**: `react-i18next` for English, Chinese, Japanese, and Bangla, with auto-detection and persistent preferences.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript.
- **API Design**: RESTful API with dedicated endpoints.
- **Error Handling**: Centralized middleware for structured error responses.

### Database Layer
- **ORM**: Drizzle ORM with type-safe schema definitions.
- **Database**: PostgreSQL with Neon serverless hosting.
- **Connection**: Connection pooling using `@neondatabase/serverless`.
- **Schema Management**: Drizzle Kit for migrations.
- **Core Models**: Users, Corporate Bookings, Rental Bookings, Vendor Registrations, Contact Messages, Blog Posts, Portfolio Clients, Drivers, Carpool Routes, Carpool Bookings, Subscriptions, Wallets, and Complaints.

### Authentication & Security
- **Authentication**: Phone-based with three roles (Customer, Employee, Superadmin) and role-based access control.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Security Features**: bcrypt hashing, CSRF protection, environment-aware rate limiting, HttpOnly/Secure/SameSite cookies, Helmet security headers.
- **Input Validation**: Zod schemas and server-side validation.
- **Granular Permissions System**: Three-level permission control (View/Edit/Download CSV) across 12 admin sections (e.g., blogPosts, rentalBookings, employeeManagement), enforced at UI, query, API, and database layers.
- **Secure Onboarding**: One-time 24-hour email links for new employee accounts.

### UI/UX Decisions
- Dynamic form pre-selection based on URL query parameters.
- Clean calendar UX for rental bookings with single or range selection.
- Phone-based driver assignment workflow with autocomplete and on-the-fly driver creation.
- Multi-language selector with flags and persistent preference.
- Modern permission UI with table-based matrix and toggle switches.
- User-facing pages for Wallet, Carpool subscription, My Subscriptions, and Complaints.

### System Design Choices
- **Multi-User Authentication**: Customer, Employee, Superadmin roles with automatic customer account creation from bookings.
- **Admin Panel**: Comprehensive panel for employee, driver, and driver assignment management with granular permissions.
- **Email Notifications**: Resend integration for transactional emails with professional templates.
- **Reference ID Tracking**: Unique 6-character alphanumeric IDs for all form submissions.
- **Subscription-based Carpool System**: Pure subscription model with monthly route subscriptions, a user wallet system with balance tracking, and automated services for trip generation, subscription renewal, and refunds.
- **Complaint Management**: Users can file complaints with categories and severity, managed by admin.
- **Bangladesh Holidays Integration**: Static holiday data for 2024-2026, manageable by admin as blackout dates.

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
- **i18next**, **react-i18next**, **i18next-browser-languagedetector**: For internationalization.

### External Integrations
- **Resend**: Transactional email service.
- **Facebook Pixel**: For conversion tracking and analytics (client-side and Conversions API).
- **Google Analytics 4 (GA4)**: For website analytics and event tracking.
- **Google reCAPTCHA**: Optional spam protection for forms.