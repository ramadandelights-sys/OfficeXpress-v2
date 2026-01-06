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
- **Google Maps Integration**: Interactive location picker with autocomplete for route creation and pickup/drop-off point management. Route visualization with directions displayed in both admin panel and customer-facing views.

### System Design Choices
- **Multi-User Authentication**: Customer, Employee, Superadmin roles with automatic customer account creation from bookings.
- **Admin Panel**: Modern sidebar-based layout with organized pages across 5 categories:
  - **Dashboard**: Overview and quick stats
  - **Content**: Blog Posts, Portfolio Clients, Legal Pages
  - **Bookings**: Corporate, Rental, Vendor, Contact Messages
  - **Operations**: Carpool Routes, Carpool Bookings, Drivers, Blackout Dates
  - **Finance**: Wallet Management, Refunds, Subscriptions
  - **Settings**: Website, Marketing, Employees, Complaints
  - Mobile-friendly design with collapsible sidebar (hamburger menu on mobile)
  - Performance optimized with per-page data loading
  - Routes: /admin/* handled by AdminRouter (client/src/pages/admin/index.tsx)
- **Email Notifications**: Resend integration for transactional emails with professional templates.
- **Reference ID Tracking**: Unique 6-character alphanumeric IDs for all form submissions.
- **Subscription-based Carpool System**: Pure subscription model with monthly route subscriptions, a user wallet system with balance tracking, and automated services for trip generation, subscription renewal, and refunds.
- **AI-Powered Trip Generation**: GPT-based daily trip optimization with vehicle recommendations (sedan: 1-4, 7-seater: 5-7, 10-seater: 8-10, 14-seater: 11-14, 32-seater: 15+ passengers), unique trip reference IDs, and fallback rule-based grouping if AI fails. Runs daily at 6 PM via node-cron schedule. **Minimum 3 passengers required** - trips with fewer than 3 bookings are skipped (not created).
- **Flexible Payment Options**: Customers can choose between cash payment (pay driver directly per trip) or online payment (prepay from wallet balance) when booking subscriptions.
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
- **OpenAI**: GPT-4o-mini for AI-powered trip generation and optimization (requires OPENAI_API_KEY secret).
- **Facebook Pixel**: For conversion tracking and analytics (client-side and Conversions API).
- **Google Analytics 4 (GA4)**: For website analytics and event tracking.
- **Google reCAPTCHA**: Optional spam protection for forms.