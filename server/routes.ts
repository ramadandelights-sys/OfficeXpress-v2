import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  setupAuth,
  isAuthenticated,
  isSuperAdmin,
  isEmployeeOrAdmin,
  hasPermission,
  hashPassword,
  comparePassword,
  generateTemporaryPassword
} from "./auth";
import { randomBytes } from "crypto";
import { 
  validateCorporateBooking,
  validateRentalBooking,
  validateVendorRegistration,
  validateContactMessage 
} from "./validation";
import path from "path";
import fs from "fs";
import { 
  users,
  insertCorporateBookingSchema,
  insertRentalBookingSchema,
  insertVendorRegistrationSchema,
  insertContactMessageSchema,
  insertBlogPostSchema,
  insertPortfolioClientSchema,
  updateBlogPostSchema,
  updatePortfolioClientSchema,
  insertMarketingSettingsSchema,
  updateMarketingSettingsSchema,
  insertWebsiteSettingsSchema,
  updateWebsiteSettingsSchema,
  insertLegalPageSchema,
  updateLegalPageSchema,
  insertUserSchema,
  insertDriverSchema,
  updateDriverSchema,
  updateRentalBookingSchema,
  updateCorporateBookingSchema,
  insertCarpoolRouteSchema,
  updateCarpoolRouteSchema,
  insertCarpoolPickupPointSchema,
  insertCarpoolTimeSlotSchema,
  insertCarpoolBookingSchema,
  updateCarpoolBookingSchema,
  type UserPermissions
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { sendEmailNotification, sendEmployeeOnboardingEmail, sendBookingNotificationEmail, emailWrapper, sendCompletionEmailWithSurvey } from "./lib/resend";
import { getUncachableResendClient } from "./resend-client";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";

// Rate limiter for authentication endpoints to prevent brute-force attacks
// Environment-aware: strict in production (5), lenient in development (100)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Auto-adjusts based on environment
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP-based rate limiting (handles IPv4 and IPv6 properly)
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Generate unique 6-character alphanumeric reference ID
function generateReferenceId(): string {
  return nanoid(6).toUpperCase();
}

// Status validation schema for submission status updates
const statusUpdateSchema = z.object({
  status: z.enum([
    "Fake Request",
    "Interested",
    "Not Interested",
    "Cancelled",
    "Rejected",
    "Completed"
  ])
});

// Helper function to handle completion email with NPS survey
async function handleCompletionEmail(
  submissionType: 'corporate' | 'rental' | 'vendor' | 'contact',
  submission: any,
  newStatus: string
) {
  // Only send completion email if:
  // 1. Status is "Completed"
  // 2. Completion email hasn't been sent yet
  if (newStatus === 'Completed' && !submission.completionEmailSentAt) {
    try {
      // Check if survey already exists for this submission (idempotency check)
      const existingSurvey = await storage.getSurveyByReferenceId(submission.referenceId);
      if (existingSurvey) {
        console.log(`Survey already exists for ${submission.referenceId}, skipping creation`);
        return;
      }
      
      // Generate unique survey token
      const surveyToken = randomBytes(32).toString('hex');
      
      // Calculate expiry date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Create survey record
      await storage.createSurvey({
        referenceId: submission.referenceId,
        submissionType,
        submissionId: submission.id,
        token: surveyToken,
        expiresAt
      });
      
      // Get customer name and email based on submission type
      let customerName = '';
      let email = '';
      
      if (submissionType === 'corporate') {
        customerName = submission.customerName;
        email = submission.email;
      } else if (submissionType === 'rental') {
        customerName = submission.customerName;
        email = submission.email;
      } else if (submissionType === 'vendor') {
        customerName = submission.fullName;
        email = submission.email;
      } else if (submissionType === 'contact') {
        customerName = submission.name;
        email = submission.email;
      }
      
      // Send completion email with survey link (only if email exists)
      if (email) {
        // Mark completion email as sent BEFORE attempting email (ensures consistency)
        // Even if email fails, we have the survey record and won't create duplicates
        if (submissionType === 'corporate') {
          await storage.updateCorporateBooking(submission.id, {
            completionEmailSentAt: new Date()
          });
        } else if (submissionType === 'rental') {
          await storage.updateRentalBooking(submission.id, {
            completionEmailSentAt: new Date()
          });
        } else if (submissionType === 'vendor') {
          await storage.updateVendorRegistration(submission.id, {
            completionEmailSentAt: new Date()
          });
        } else if (submissionType === 'contact') {
          await storage.updateContactMessage(submission.id, {
            completionEmailSentAt: new Date()
          });
        }
        
        // Send email (if this fails, survey still exists and can be resent manually)
        await sendCompletionEmailWithSurvey({
          email,
          customerName,
          referenceId: submission.referenceId,
          surveyToken,
          submissionType
        });
      }
    } catch (error) {
      console.error('Error handling completion email:', error);
      // Don't throw - we don't want to fail the status update if email/survey creation fails
    }
  }
}

// CSRF protection middleware - validates Origin header for state-changing requests
function csrfProtection(req: any, res: any, next: any) {
  // Only check POST, PUT, DELETE, PATCH requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF check for public booking endpoints (allow cross-origin bookings)
  const publicEndpoints = ['/api/corporate-bookings', '/api/rental-bookings', '/api/vendor-registrations', '/api/contact-messages'];
  if (publicEndpoints.some(endpoint => req.path === endpoint && req.method === 'POST')) {
    return next();
  }
  
  // Skip CSRF check for unauthenticated auth endpoints only
  const unauthenticatedAuthEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/request-password-reset', '/api/auth/reset-password'];
  if (unauthenticatedAuthEndpoints.some(endpoint => req.path === endpoint)) {
    return next();
  }
  
  const origin = req.get('origin') || req.get('referer');
  const host = req.get('host');
  
  if (!origin) {
    return res.status(403).json({ message: "CSRF validation failed: Missing origin header" });
  }
  
  // Extract hostname from origin/referer
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch (e) {
    return res.status(403).json({ message: "CSRF validation failed: Invalid origin" });
  }
  
  // Verify origin matches host
  if (originHost !== host) {
    return res.status(403).json({ message: "CSRF validation failed: Origin mismatch" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);
  
  // Apply CSRF protection to all routes
  app.use(csrfProtection);

  // Authentication routes
  app.post("/api/auth/login", authRateLimiter, async (req: any, res: any) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ message: "Phone and password are required" });
      }
      
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }
      
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Store user info in new session
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.permissions = user.permissions as UserPermissions | undefined;
        
        // Save session before responding
        req.session.save(async (saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Update last login
          await storage.updateUser(user.id, { lastLogin: new Date() } as any);
          
          res.json({ 
            id: user.id,
            phone: user.phone,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            temporaryPassword: user.temporaryPassword
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        temporaryPassword: user.temporaryPassword
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res: any) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        temporaryPassword: false
      } as any);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Request password reset - sends email with reset token
  app.post("/api/auth/request-password-reset", authRateLimiter, async (req: any, res: any) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If the email exists, a reset link will be sent" });
      }
      
      if (!user.email) {
        return res.json({ message: "If the email exists, a reset link will be sent" });
      }
      
      // Generate reset token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
      
      await storage.createPasswordResetToken({
        token,
        email: user.email,
        userId: user.id,
        expiresAt
      });
      
      // Send password reset email
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
        
        await client.emails.send({
          from: fromEmail,
          to: user.email,
          subject: 'Reset Your Password - OfficeXpress',
          html: emailWrapper(`
            <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
              Password Reset Request
            </h2>
            
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
              Dear ${user.name},
            </p>
            
            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="margin: 32px 0; text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background-color: #4c9096; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="margin: 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link into your browser:
            </p>
            
            <div style="margin: 16px 0; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all;">
              <code style="color: #374151; font-size: 13px;">${resetUrl}</code>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                ⚠️ This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
              </p>
            </div>
            
            <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
              Best regards,<br>
              <strong style="color: #374151;">OfficeXpress Team</strong>
            </p>
          `, false)
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
      
      res.json({ message: "If the email exists, a reset link will be sent" });
    } catch (error) {
      console.error("Request password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", authRateLimiter, async (req: any, res: any) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      if (resetToken.used) {
        return res.status(400).json({ message: "This reset token has already been used" });
      }
      
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "This reset token has expired" });
      }
      
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        temporaryPassword: false
      } as any);
      
      await storage.markPasswordResetTokenAsUsed(token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // One-time superadmin setup (only works if no users exist)
  app.post("/api/auth/setup-superadmin", authRateLimiter, async (req: any, res: any) => {
    try {
      const existingUsers = await storage.getUsersByRole('superadmin');
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Superadmin already exists" });
      }
      
      const { phone, email, name, password } = req.body;
      
      if (!phone || !name || !password) {
        return res.status(400).json({ message: "Phone, name, and password are required" });
      }
      
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: "User with this phone already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        phone,
        email: email || null,
        name,
        password: hashedPassword
      });
      
      // Update to superadmin role
      await storage.updateUser(user.id, { 
        role: 'superadmin',
        permissions: {} // Superadmin has all permissions by default
      } as any);
      
      res.json({ message: "Superadmin created successfully" });
    } catch (error) {
      console.error("Setup superadmin error:", error);
      res.status(500).json({ message: "Failed to create superadmin" });
    }
  });

  // Health check endpoint for debugging
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Onboarding endpoints (no authentication required)
  app.get("/api/onboarding/verify", async (req: any, res: any) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const onboardingToken = await storage.getOnboardingToken(token as string);
      
      if (!onboardingToken) {
        return res.status(404).json({ message: "Invalid onboarding token" });
      }
      
      if (onboardingToken.used) {
        return res.status(400).json({ message: "This onboarding link has already been used" });
      }
      
      if (new Date() > onboardingToken.expiresAt) {
        return res.status(400).json({ message: "This onboarding link has expired. Please contact your administrator." });
      }
      
      // Get user details to show on onboarding page
      const user = await storage.getUser(onboardingToken.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        valid: true,
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error("Verify onboarding token error:", error);
      res.status(500).json({ message: "Failed to verify onboarding token" });
    }
  });

  app.post("/api/onboarding/complete", async (req: any, res: any) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const onboardingToken = await storage.getOnboardingToken(token);
      
      if (!onboardingToken) {
        return res.status(404).json({ message: "Invalid onboarding token" });
      }
      
      if (onboardingToken.used) {
        return res.status(400).json({ message: "This onboarding link has already been used" });
      }
      
      if (new Date() > onboardingToken.expiresAt) {
        return res.status(400).json({ message: "This onboarding link has expired. Please contact your administrator." });
      }
      
      // Get user
      const user = await storage.getUser(onboardingToken.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update user's password and mark as no longer having temporary password
      await storage.updateUser(user.id, {
        password: hashedPassword,
        temporaryPassword: false
      });
      
      // Mark token as used
      await storage.markOnboardingTokenAsUsed(token);
      
      // Log the user in automatically by setting session
      req.session.userId = user.id.toString();
      req.session.role = user.role;
      req.session.permissions = user.permissions;
      
      res.json({
        success: true,
        message: "Account setup complete! Redirecting to admin panel...",
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions
        }
      });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Logo settings endpoint for frontend
  app.get("/api/logo", async (req, res) => {
    try {
      const settings = await storage.getMarketingSettings();
      const hasCustomLogo = !!(settings?.logoPath);
      
      // Generate cache busting version based on logo path or timestamp
      const version = hasCustomLogo 
        ? Buffer.from(settings.logoPath || '').toString('base64').slice(0, 8)
        : 'default';
      
      res.json({ 
        src: `/logo.jpg?v=${version}`,
        hasCustomLogo,
        version
      });
    } catch (error) {
      console.error('Logo settings error:', error);
      res.json({ 
        src: "/logo.jpg?v=default",
        hasCustomLogo: false,
        version: "default"
      });
    }
  });

  // Logo serving route - dynamically serves from database settings
  app.get("/logo.jpg", async (req, res) => {
    try {
      // Get the logo path from marketing settings
      const settings = await storage.getMarketingSettings();
      let logoPath = null;
      
      if (settings && settings.logoPath) {
        // Try to serve the database-stored logo
        logoPath = path.resolve(import.meta.dirname, "..", "attached_assets", path.basename(settings.logoPath));
      }
      
      // Fallback to default logo if no custom logo is set
      if (!logoPath || !fs.existsSync(logoPath)) {
        logoPath = path.resolve(import.meta.dirname, "..", "attached_assets", "logo_v3_1757541985694.png");
      }
      
      if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
      } else {
        res.status(404).send("Logo not found");
      }
    } catch (error) {
      console.error('Logo serving error:', error);
      // Fallback to default logo on error
      const defaultLogoPath = path.resolve(import.meta.dirname, "..", "attached_assets", "logo_v3_1757541985694.png");
      if (fs.existsSync(defaultLogoPath)) {
        res.sendFile(defaultLogoPath);
      } else {
        res.status(404).send("Logo not found");
      }
    }
  });

  // User management routes (superadmin only)
  app.get("/api/users", isSuperAdmin, async (req: any, res: any) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers.map(u => ({
        id: u.id,
        phone: u.phone,
        email: u.email,
        name: u.name,
        role: u.role,
        permissions: u.permissions,
        temporaryPassword: u.temporaryPassword,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
      })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isSuperAdmin, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        temporaryPassword: user.temporaryPassword,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", isSuperAdmin, async (req: any, res: any) => {
    try {
      const { phone, email, name, role, permissions } = req.body;
      
      // Validate required fields - email is now mandatory for employee accounts
      if (!phone || !name || !role || !email) {
        return res.status(400).json({ message: "Phone, name, email, and role are required" });
      }
      
      // Validate Bangladesh phone number format (must start with 01 and be 11 digits)
      const phoneRegex = /^01\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Phone number must be in Bangladesh format (01XXXXXXXXX - 11 digits starting with 01)" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }
      
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: "User with this phone already exists" });
      }
      
      // Create user with a random placeholder password (will be set during onboarding)
      const placeholderPassword = randomBytes(32).toString('hex');
      const hashedPassword = await hashPassword(placeholderPassword);
      
      const user = await storage.createUser({
        phone,
        email,
        name,
        password: hashedPassword
      });
      
      await storage.updateUser(user.id, {
        role,
        permissions: permissions || {},
        temporaryPassword: false  // No temporary password needed - using onboarding link
      } as any);
      
      // Generate secure onboarding token (64 characters)
      const onboardingToken = randomBytes(32).toString('hex');
      
      // Token expires in 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Store onboarding token in database
      await storage.createOnboardingToken({
        token: onboardingToken,
        userId: user.id,
        expiresAt
      });
      
      // Send email with onboarding link
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://officexpress.org' 
          : `${req.protocol}://${req.get('host')}`;
        
        const onboardingUrl = `${baseUrl}/onboarding?token=${onboardingToken}`;
        
        await sendEmployeeOnboardingEmail({ 
          email, 
          name, 
          phone,
          role,
          onboardingUrl,
          expiresIn: '24 hours'
        });
        
        console.log(`Employee account created and onboarding email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send employee onboarding email:", emailError);
        // Clean up the created user and token if email fails
        await storage.deleteUser(user.id);
        return res.status(500).json({ message: "Failed to send employee onboarding email. Please check the email address and try again." });
      }
      
      const updatedUser = await storage.getUser(user.id);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to retrieve created user" });
      }
      res.json({
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          permissions: updatedUser.permissions,
          temporaryPassword: updatedUser.temporaryPassword,
          createdAt: updatedUser.createdAt,
          lastLogin: updatedUser.lastLogin
        },
        emailSent: true,
        newAccount: true
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isSuperAdmin, async (req: any, res: any) => {
    try {
      const { phone, email, name, role, permissions } = req.body;
      
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updateData: any = {};
      if (phone) updateData.phone = phone;
      if (email !== undefined) updateData.email = email || null;
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (permissions !== undefined) updateData.permissions = permissions;
      
      await storage.updateUser(req.params.id, updateData);
      const updatedUser = await storage.getUser(req.params.id);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isSuperAdmin, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'superadmin') {
        return res.status(403).json({ message: "Cannot delete superadmin user" });
      }
      
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/employees", isSuperAdmin, async (req: any, res: any) => {
    try {
      const employees = await storage.getUsersByRole('employee');
      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Driver management routes
  app.get("/api/drivers", hasPermission('driverManagement', 'view'), async (req: any, res: any) => {
    try {
      const drivers = await storage.getDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Get drivers error:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.get("/api/drivers/active", hasPermission('driverAssignment'), async (req: any, res: any) => {
    try {
      const drivers = await storage.getActiveDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Get active drivers error:", error);
      res.status(500).json({ message: "Failed to fetch active drivers" });
    }
  });

  // Search driver by phone number (for driver assignment lookup)
  // Must be before /api/drivers/:id to avoid :id matching "search"
  app.get("/api/drivers/search", hasPermission('driverAssignment'), async (req: any, res: any) => {
    try {
      const phone = req.query.phone as string;
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const driver = await storage.getDriverByPhone(phone);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      res.json(driver);
    } catch (error) {
      console.error("Search driver by phone error:", error);
      res.status(500).json({ message: "Failed to search driver" });
    }
  });

  // Get driver suggestions by partial phone number (for autocomplete)
  // Must be before /api/drivers/:id to avoid :id matching "suggestions"
  app.get("/api/drivers/suggestions", hasPermission('driverAssignment'), async (req: any, res: any) => {
    try {
      const phone = req.query.phone as string;
      if (!phone || phone.length < 3) {
        return res.json([]);
      }
      
      const drivers = await storage.searchDriversByPhone(phone);
      res.json(drivers);
    } catch (error) {
      console.error("Get driver suggestions error:", error);
      res.status(500).json({ message: "Failed to get driver suggestions" });
    }
  });

  app.get("/api/drivers/:id", hasPermission('driverManagement', 'view'), async (req: any, res: any) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Get driver error:", error);
      res.status(500).json({ message: "Failed to fetch driver" });
    }
  });

  app.post("/api/drivers", hasPermission('driverManagement', 'edit'), async (req: any, res: any) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(driverData);
      res.json(driver);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid driver data", errors: error.errors });
      } else {
        console.error("Create driver error:", error);
        res.status(500).json({ message: "Failed to create driver" });
      }
    }
  });

  app.put("/api/drivers/:id", hasPermission('driverManagement', 'edit'), async (req: any, res: any) => {
    try {
      const driverData = updateDriverSchema.parse({ ...req.body, id: req.params.id });
      const driver = await storage.updateDriver(driverData);
      res.json(driver);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid driver data", errors: error.errors });
      } else {
        console.error("Update driver error:", error);
        res.status(500).json({ message: "Failed to update driver" });
      }
    }
  });

  app.delete("/api/drivers/:id", hasPermission('driverManagement', 'edit'), async (req: any, res: any) => {
    try {
      await storage.deleteDriver(req.params.id);
      res.json({ message: "Driver deleted successfully" });
    } catch (error) {
      console.error("Delete driver error:", error);
      res.status(500).json({ message: "Failed to delete driver" });
    }
  });

  // Create driver and assign to rental booking in one operation
  app.post("/api/rental-bookings/:id/create-and-assign-driver", hasPermission('driverAssignment'), async (req: any, res: any) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      
      // Check if driver with this phone already exists
      const existingDriver = await storage.getDriverByPhone(driverData.phone);
      if (existingDriver) {
        return res.status(400).json({ message: "Driver with this phone number already exists" });
      }
      
      // Get booking before assignment to check previous driver state
      const bookingBefore = await storage.getRentalBooking(req.params.id);
      if (!bookingBefore) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Create the driver
      const driver = await storage.createDriver(driverData);
      
      // Assign to the rental booking
      const booking = await storage.assignDriverToRental(req.params.id, driver.id);
      
      // Determine notification type based on whether driver is being replaced
      const notificationType = bookingBefore.driverId ? 'driver_changed' : 'driver_assigned';
      
      // Create notification in database
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'rental',
          type: notificationType,
          title: notificationType === 'driver_changed' ? 'Driver Updated' : 'Driver Assigned',
          message: notificationType === 'driver_changed' 
            ? `Your driver for booking #${booking.referenceId} has been updated to ${driver.name}.`
            : `${driver.name} has been assigned to your booking #${booking.referenceId}.`,
          isRead: false,
          emailSent: false
        });
      }
      
      // Send email notification to customer
      const emailType = notificationType === 'driver_changed' ? 'driverChanged' : 'driverAssigned';
      await sendBookingNotificationEmail(emailType, {
        email: booking.email,
        customerName: booking.customerName,
        referenceId: booking.referenceId,
        driverName: driver.name,
        driverPhone: driver.phone,
        licensePlate: driver.licensePlate,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehicleYear: driver.vehicleYear,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        startDate: booking.startDate,
        startTime: booking.startTime
      });
      
      // Mark notification email as sent
      if (booking.userId) {
        const notifications = await storage.getNotificationsByUser(booking.userId);
        const latestNotification = notifications.find(n => 
          n.bookingId === booking.id && n.type === notificationType && !n.emailSent
        );
        if (latestNotification) {
          await storage.markNotificationEmailSent(latestNotification.id);
        }
      }
      
      res.json({ driver, booking });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid driver data", errors: error.errors });
      } else {
        console.error("Create and assign driver error:", error);
        res.status(500).json({ message: "Failed to create and assign driver" });
      }
    }
  });

  app.put("/api/rental-bookings/:id/assign-driver", hasPermission('driverAssignment'), async (req: any, res: any) => {
    try {
      const { driverId } = req.body;
      
      if (!driverId) {
        return res.status(400).json({ message: "Driver ID is required" });
      }
      
      const driver = await storage.getDriver(driverId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      // Get booking before assignment to check previous driver state
      const bookingBefore = await storage.getRentalBooking(req.params.id);
      if (!bookingBefore) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const booking = await storage.assignDriverToRental(req.params.id, driverId);
      
      // Determine notification type based on whether driver is being replaced
      const notificationType = bookingBefore.driverId ? 'driver_changed' : 'driver_assigned';
      
      // Create notification in database
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'rental',
          type: notificationType,
          title: notificationType === 'driver_changed' ? 'Driver Updated' : 'Driver Assigned',
          message: notificationType === 'driver_changed' 
            ? `Your driver for booking #${booking.referenceId} has been updated to ${driver.name}.`
            : `${driver.name} has been assigned to your booking #${booking.referenceId}.`,
          isRead: false,
          emailSent: false
        });
      }
      
      // Send email notification to customer
      const emailType = notificationType === 'driver_changed' ? 'driverChanged' : 'driverAssigned';
      await sendBookingNotificationEmail(emailType, {
        email: booking.email,
        customerName: booking.customerName,
        referenceId: booking.referenceId,
        driverName: driver.name,
        driverPhone: driver.phone,
        licensePlate: driver.licensePlate,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehicleYear: driver.vehicleYear,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        startDate: booking.startDate,
        startTime: booking.startTime
      });
      
      // Mark notification email as sent
      if (booking.userId) {
        const notifications = await storage.getNotificationsByUser(booking.userId);
        const latestNotification = notifications.find(n => 
          n.bookingId === booking.id && n.type === notificationType && !n.emailSent
        );
        if (latestNotification) {
          await storage.markNotificationEmailSent(latestNotification.id);
        }
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Assign driver error:", error);
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  // Status update endpoints for all submission types
  
  // Update corporate booking status
  app.put("/api/corporate-bookings/:id/status", hasPermission('corporateBookings', 'edit'), async (req: any, res: any) => {
    try {
      const { status } = statusUpdateSchema.parse(req.body);
      const id = req.params.id;
      
      // Get current submission for reference ID
      const currentBooking = await storage.getCorporateBooking(id);
      if (!currentBooking) {
        return res.status(404).json({ message: "Corporate booking not found" });
      }
      
      // Atomically update status and create history entry
      const { submission } = await storage.updateSubmissionStatus(
        'corporate',
        id,
        currentBooking.referenceId,
        status,
        req.session.userId
      );
      
      // Handle completion email with NPS survey (await to ensure consistency)
      await handleCompletionEmail('corporate', submission, status);
      
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status value", errors: error.errors });
      } else {
        console.error("Update corporate booking status error:", error);
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  });

  // Update rental booking status
  app.put("/api/rental-bookings/:id/status", hasPermission('rentalBookings', 'edit'), async (req: any, res: any) => {
    try {
      const { status } = statusUpdateSchema.parse(req.body);
      const id = req.params.id;
      
      // Get current submission for reference ID
      const currentBooking = await storage.getRentalBooking(id);
      if (!currentBooking) {
        return res.status(404).json({ message: "Rental booking not found" });
      }
      
      // Atomically update status and create history entry
      const { submission } = await storage.updateSubmissionStatus(
        'rental',
        id,
        currentBooking.referenceId,
        status,
        req.session.userId
      );
      
      // Handle completion email with NPS survey (await to ensure consistency)
      await handleCompletionEmail('rental', submission, status);
      
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status value", errors: error.errors });
      } else {
        console.error("Update rental booking status error:", error);
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  });

  // Update vendor registration status
  app.put("/api/vendor-registrations/:id/status", hasPermission('vendorRegistrations', 'edit'), async (req: any, res: any) => {
    try {
      const { status } = statusUpdateSchema.parse(req.body);
      const id = req.params.id;
      
      // Get current submission for reference ID
      const currentVendor = await storage.getVendorRegistration(id);
      if (!currentVendor) {
        return res.status(404).json({ message: "Vendor registration not found" });
      }
      
      // Atomically update status and create history entry
      const { submission } = await storage.updateSubmissionStatus(
        'vendor',
        id,
        currentVendor.referenceId,
        status,
        req.session.userId
      );
      
      // Handle completion email with NPS survey (await to ensure consistency)
      await handleCompletionEmail('vendor', submission, status);
      
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status value", errors: error.errors });
      } else {
        console.error("Update vendor registration status error:", error);
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  });

  // Update contact message status
  app.put("/api/contact-messages/:id/status", hasPermission('contactMessages', 'edit'), async (req: any, res: any) => {
    try {
      const { status } = statusUpdateSchema.parse(req.body);
      const id = req.params.id;
      
      // Get current submission for reference ID
      const currentMessage = await storage.getContactMessage(id);
      if (!currentMessage) {
        return res.status(404).json({ message: "Contact message not found" });
      }
      
      // Atomically update status and create history entry
      const { submission } = await storage.updateSubmissionStatus(
        'contact',
        id,
        currentMessage.referenceId,
        status,
        req.session.userId
      );
      
      // Handle completion email with NPS survey (await to ensure consistency)
      await handleCompletionEmail('contact', submission, status);
      
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status value", errors: error.errors });
      } else {
        console.error("Update contact message status error:", error);
        res.status(500).json({ message: "Failed to update status" });
      }
    }
  });

  // Get status history by reference ID (admin-only)
  app.get("/api/status-history/:referenceId", isEmployeeOrAdmin, async (req: any, res: any) => {
    try {
      const { referenceId } = req.params;
      const history = await storage.getStatusHistoryByReferenceId(referenceId);
      res.json(history);
    } catch (error) {
      console.error("Get status history error:", error);
      res.status(500).json({ message: "Failed to fetch status history" });
    }
  });

  // Update rental booking
  app.put("/api/rental-bookings/:id", hasPermission('rentalBookings', 'edit'), async (req: any, res: any) => {
    try {
      const updateData = updateRentalBookingSchema.parse({ ...req.body, id: req.params.id });
      const { id, ...data } = updateData;
      
      if (!id) {
        return res.status(400).json({ message: "Booking ID is required" });
      }
      
      // Get booking before update
      const bookingBefore = await storage.getRentalBooking(id);
      if (!bookingBefore) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Update the booking
      const booking = await storage.updateRentalBooking(id, data);
      
      // Create notification in database
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'rental',
          type: 'booking_updated',
          title: 'Booking Updated',
          message: `Your booking #${booking.referenceId} has been updated.`,
          isRead: false,
          emailSent: false
        });
      }
      
      // Send email notification to customer
      const bookingUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://officexpress.org'}/dashboard`;
      
      await sendBookingNotificationEmail('bookingUpdated', {
        email: booking.email,
        customerName: booking.customerName,
        referenceId: booking.referenceId,
        bookingType: 'rental',
        bookingUrl: bookingUrl,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        startDate: booking.startDate,
        startTime: booking.startTime,
        endDate: booking.endDate,
        endTime: booking.endTime,
        vehicleType: booking.vehicleType,
        vehicleCapacity: booking.vehicleCapacity,
        oldFromLocation: bookingBefore.fromLocation,
        oldToLocation: bookingBefore.toLocation,
        oldStartDate: bookingBefore.startDate,
        oldStartTime: bookingBefore.startTime,
        oldEndDate: bookingBefore.endDate,
        oldEndTime: bookingBefore.endTime,
        oldVehicleType: bookingBefore.vehicleType,
        oldVehicleCapacity: bookingBefore.vehicleCapacity
      });
      
      // Mark notification email as sent
      if (booking.userId) {
        const notifications = await storage.getNotificationsByUser(booking.userId);
        const latestNotification = notifications.find(n => 
          n.bookingId === booking.id && n.type === 'booking_updated' && !n.emailSent
        );
        if (latestNotification) {
          await storage.markNotificationEmailSent(latestNotification.id);
        }
      }
      
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Update rental booking error:", error);
        res.status(500).json({ message: "Failed to update rental booking" });
      }
    }
  });

  // Cancel/Delete rental booking
  app.delete("/api/rental-bookings/:id", hasPermission('rentalBookings', 'edit'), async (req: any, res: any) => {
    try {
      const id = req.params.id;
      
      // Get booking before deletion
      const booking = await storage.getRentalBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Create notification in database before deletion
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'rental',
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking #${booking.referenceId} has been cancelled.`,
          isRead: false,
          emailSent: !booking.email // Mark as sent if no email to send
        });
      }
      
      // Send email notification to customer (only if email exists)
      if (booking.email) {
        try {
          await sendBookingNotificationEmail('bookingCancelled', {
            email: booking.email,
            customerName: booking.customerName,
            referenceId: booking.referenceId,
            bookingType: 'rental',
            fromLocation: booking.fromLocation,
            toLocation: booking.toLocation,
            startDate: booking.startDate,
            startTime: booking.startTime,
            endDate: booking.endDate,
            endTime: booking.endTime,
            vehicleType: booking.vehicleType,
            vehicleCapacity: booking.vehicleCapacity,
            reason: 'Your booking has been cancelled. Please contact us if you have any questions.'
          });
          
          // Mark notification email as sent
          if (booking.userId) {
            const notifications = await storage.getNotificationsByUser(booking.userId);
            const latestNotification = notifications.find(n => 
              n.bookingId === booking.id && n.type === 'booking_cancelled' && !n.emailSent
            );
            if (latestNotification) {
              await storage.markNotificationEmailSent(latestNotification.id);
            }
          }
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
          // Continue with deletion even if email fails
        }
      }
      
      // Update status to Cancelled instead of deleting
      await storage.updateRentalBooking(id, { 
        status: 'Cancelled',
        statusUpdatedAt: new Date()
      });
      
      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      console.error("Delete rental booking error:", error);
      res.status(500).json({ message: "Failed to cancel rental booking" });
    }
  });

  // Corporate booking routes
  app.post("/api/corporate-bookings", validateCorporateBooking, async (req: any, res: any) => {
    try {
      const bookingData = insertCorporateBookingSchema.parse(req.body);
      const referenceId = generateReferenceId();
      
      // Auto-create or link user account by phone
      let user = await storage.getUserByPhone(bookingData.phone);
      let tempPassword: string | null = null;
      
      if (!user) {
        // Create new customer account with temporary password
        tempPassword = generateTemporaryPassword();
        const hashedPassword = await hashPassword(tempPassword);
        
        user = await storage.createUser({
          phone: bookingData.phone,
          email: bookingData.email || null,
          name: bookingData.customerName,
          password: hashedPassword
        });
        
        await storage.updateUser(user.id, {
          role: 'customer',
          temporaryPassword: true
        } as any);
        
        // SECURITY: Do not log plaintext passwords
        console.log(`New customer account auto-created for phone: ${bookingData.phone}`);
      } else {
        // Link existing bookings for this phone number
        await storage.linkExistingBookingsToUser(user.id, bookingData.phone);
      }
      
      const booking = await storage.createCorporateBooking({ 
        ...bookingData, 
        referenceId,
        userId: user.id 
      } as any);
      
      // Send email notifications (admin + customer) with reference ID
      await sendEmailNotification('corporateBooking', { ...bookingData, referenceId });
      
      res.json({ 
        booking,
        newAccount: !!tempPassword
        // Note: Temporary password is logged server-side only for security
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Corporate booking error:", error);
        res.status(500).json({ message: "Failed to create corporate booking" });
      }
    }
  });

  // Customer endpoint - only returns own bookings
  app.get("/api/my/corporate-bookings", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const bookings = await storage.getCorporateBookingsByPhone(user.phone);
      res.json(bookings);
    } catch (error) {
      console.error("Get customer corporate bookings error:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Customer notifications endpoints
  app.get("/api/my/notifications", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/my/notifications/:id/read", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.userId;
      const notificationId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Verify notification belongs to user
      const notifications = await storage.getNotificationsByUser(userId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Admin endpoint - returns all bookings (protected)
  app.get("/api/corporate-bookings", isEmployeeOrAdmin, async (req, res) => {
    try {
      const bookings = await storage.getCorporateBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch corporate bookings" });
    }
  });

  // Update corporate booking
  app.put("/api/corporate-bookings/:id", hasPermission('corporateBookings', 'edit'), async (req: any, res: any) => {
    try {
      const updateData = updateCorporateBookingSchema.parse({ ...req.body, id: req.params.id });
      const { id, ...data } = updateData;
      
      if (!id) {
        return res.status(400).json({ message: "Booking ID is required" });
      }
      
      // Get booking before update
      const bookingBefore = await storage.getCorporateBooking(id);
      if (!bookingBefore) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Update the booking
      const booking = await storage.updateCorporateBooking(id, data);
      
      // Create notification in database
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'corporate',
          type: 'booking_updated',
          title: 'Booking Updated',
          message: `Your booking #${booking.referenceId} has been updated.`,
          isRead: false,
          emailSent: false
        });
      }
      
      // Send email notification to customer
      await sendBookingNotificationEmail('bookingUpdated', {
        email: booking.email,
        customerName: booking.customerName,
        referenceId: booking.referenceId,
        bookingType: 'corporate',
        companyName: booking.companyName,
        serviceType: booking.serviceType,
        changes: 'Please review the updated booking details above.'
      });
      
      // Mark notification email as sent
      if (booking.userId) {
        const notifications = await storage.getNotificationsByUser(booking.userId);
        const latestNotification = notifications.find(n => 
          n.bookingId === booking.id && n.type === 'booking_updated' && !n.emailSent
        );
        if (latestNotification) {
          await storage.markNotificationEmailSent(latestNotification.id);
        }
      }
      
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Update corporate booking error:", error);
        res.status(500).json({ message: "Failed to update corporate booking" });
      }
    }
  });

  // Cancel/Delete corporate booking
  app.delete("/api/corporate-bookings/:id", hasPermission('corporateBookings', 'edit'), async (req: any, res: any) => {
    try {
      const id = req.params.id;
      
      // Get booking before deletion
      const booking = await storage.getCorporateBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Create notification in database before deletion
      if (booking.userId) {
        await storage.createNotification({
          userId: booking.userId,
          bookingId: booking.id,
          bookingType: 'corporate',
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking #${booking.referenceId} has been cancelled.`,
          isRead: false,
          emailSent: !booking.email // Mark as sent if no email to send
        });
      }
      
      // Send email notification to customer (only if email exists)
      if (booking.email) {
        try {
          await sendBookingNotificationEmail('bookingCancelled', {
            email: booking.email,
            customerName: booking.customerName,
            referenceId: booking.referenceId,
            bookingType: 'corporate',
            companyName: booking.companyName,
            serviceType: booking.serviceType,
            reason: 'Your booking has been cancelled. Please contact us if you have any questions.'
          });
          
          // Mark notification email as sent
          if (booking.userId) {
            const notifications = await storage.getNotificationsByUser(booking.userId);
            const latestNotification = notifications.find(n => 
              n.bookingId === booking.id && n.type === 'booking_cancelled' && !n.emailSent
            );
            if (latestNotification) {
              await storage.markNotificationEmailSent(latestNotification.id);
            }
          }
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
          // Continue with deletion even if email fails
        }
      }
      
      // Update status to Cancelled instead of deleting
      await storage.updateCorporateBooking(id, { 
        status: 'Cancelled',
        statusUpdatedAt: new Date()
      });
      
      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      console.error("Delete corporate booking error:", error);
      res.status(500).json({ message: "Failed to cancel corporate booking" });
    }
  });

  // Rental booking routes
  app.post("/api/rental-bookings", validateRentalBooking, async (req: any, res: any) => {
    try {
      // Set default endTime to 11:59 PM if not provided (for multi-day rentals)
      if (!req.body.endTime) {
        req.body.endTime = "11:59 PM";
      }
      
      const bookingData = insertRentalBookingSchema.parse(req.body);
      const referenceId = generateReferenceId();
      
      // Auto-create or link user account by phone
      let user = await storage.getUserByPhone(bookingData.phone);
      let tempPassword: string | null = null;
      
      if (!user) {
        // Create new customer account with temporary password
        tempPassword = generateTemporaryPassword();
        const hashedPassword = await hashPassword(tempPassword);
        
        user = await storage.createUser({
          phone: bookingData.phone,
          email: bookingData.email || null,
          name: bookingData.customerName,
          password: hashedPassword
        });
        
        await storage.updateUser(user.id, {
          role: 'customer',
          temporaryPassword: true
        } as any);
        
        // SECURITY: Do not log plaintext passwords
        console.log(`New customer account auto-created for phone: ${bookingData.phone}`);
      } else {
        // Link existing bookings for this phone number
        await storage.linkExistingBookingsToUser(user.id, bookingData.phone);
      }
      
      const booking = await storage.createRentalBooking({ 
        ...bookingData, 
        referenceId,
        userId: user.id 
      } as any);
      
      // Send email notifications (admin + customer) with reference ID
      await sendEmailNotification('rentalBooking', { ...bookingData, referenceId });
      
      res.json({ 
        booking,
        newAccount: !!tempPassword
        // Note: Temporary password is logged server-side only for security
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Rental booking error:", error);
        res.status(500).json({ message: "Failed to create rental booking" });
      }
    }
  });

  // Customer endpoint - only returns own bookings
  app.get("/api/my/rental-bookings", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const bookings = await storage.getRentalBookingsByPhone(user.phone);
      res.json(bookings);
    } catch (error) {
      console.error("Get customer rental bookings error:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin endpoint - returns all bookings (protected)
  app.get("/api/rental-bookings", isEmployeeOrAdmin, async (req, res) => {
    try {
      const bookings = await storage.getRentalBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rental bookings" });
    }
  });

  // Carpool routes management routes
  // Get all carpool routes (public - for customers to see available routes)
  app.get("/api/carpool/routes", async (req, res) => {
    try {
      const routes = await storage.getActiveCarpoolRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch carpool routes" });
    }
  });

  // Get single carpool route (public)
  app.get("/api/carpool/routes/:id", async (req, res) => {
    try {
      const route = await storage.getCarpoolRoute(req.params.id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  // Get pickup points for a route (public)
  app.get("/api/carpool/routes/:id/pickup-points", async (req, res) => {
    try {
      const points = await storage.getCarpoolPickupPoints(req.params.id);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pickup points" });
    }
  });

  // Get time slots for a route (public)
  app.get("/api/carpool/routes/:id/time-slots", async (req, res) => {
    try {
      const slots = await storage.getActiveCarpoolTimeSlots(req.params.id);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  // Admin: Get all routes (including inactive)
  app.get("/api/admin/carpool/routes", hasPermission('carpoolRouteManagement', 'view'), async (req, res) => {
    try {
      const routes = await storage.getCarpoolRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  // Admin: Create carpool route
  app.post("/api/admin/carpool/routes", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const routeData = insertCarpoolRouteSchema.parse(req.body);
      const route = await storage.createCarpoolRoute(routeData);
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid route data", errors: error.errors });
      } else {
        console.error("Create route error:", error);
        res.status(500).json({ message: "Failed to create route" });
      }
    }
  });

  // Admin: Update carpool route
  app.put("/api/admin/carpool/routes/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const routeData = updateCarpoolRouteSchema.parse({ ...req.body, id: req.params.id });
      const route = await storage.updateCarpoolRoute(routeData);
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid route data", errors: error.errors });
      } else {
        console.error("Update route error:", error);
        res.status(500).json({ message: "Failed to update route" });
      }
    }
  });

  // Admin: Delete carpool route
  app.delete("/api/admin/carpool/routes/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      await storage.deleteCarpoolRoute(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete route error:", error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Admin: Get all pickup points for a route
  app.get("/api/admin/carpool/routes/:id/pickup-points", hasPermission('carpoolRouteManagement', 'view'), async (req, res) => {
    try {
      const points = await storage.getCarpoolPickupPoints(req.params.id);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pickup points" });
    }
  });

  // Admin: Create pickup point
  app.post("/api/admin/carpool/pickup-points", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const pointData = insertCarpoolPickupPointSchema.parse(req.body);
      
      // Get existing pickup points for this route
      const existingPoints = await storage.getCarpoolPickupPoints(pointData.routeId);
      
      // Check for duplicate name
      const duplicateName = existingPoints.find((p: CarpoolPickupPoint) => p.name.toLowerCase() === pointData.name.toLowerCase());
      if (duplicateName) {
        return res.status(400).json({ 
          message: `A pickup point with the name "${pointData.name}" already exists on this route` 
        });
      }
      
      // Check for duplicate sequence order
      const duplicateOrder = existingPoints.find((p: CarpoolPickupPoint) => p.sequenceOrder === pointData.sequenceOrder);
      if (duplicateOrder) {
        return res.status(400).json({ 
          message: `A pickup point with sequence order ${pointData.sequenceOrder} already exists on this route` 
        });
      }
      
      const point = await storage.createCarpoolPickupPoint(pointData);
      res.json(point);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid pickup point data", errors: error.errors });
      } else {
        console.error("Create pickup point error:", error);
        res.status(500).json({ message: "Failed to create pickup point" });
      }
    }
  });

  // Admin: Update pickup point
  app.put("/api/admin/carpool/pickup-points/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      // Get the existing pickup point
      const existingPoint = await storage.getCarpoolPickupPoint(req.params.id);
      if (!existingPoint) {
        return res.status(404).json({ message: "Pickup point not found" });
      }

      // If name or sequenceOrder is being updated, check for duplicates
      if (req.body.name || req.body.sequenceOrder) {
        const existingPoints = await storage.getCarpoolPickupPoints(existingPoint.routeId);
        
        // Check for duplicate name (excluding current point)
        if (req.body.name) {
          const duplicateName = existingPoints.find((p: CarpoolPickupPoint) => 
            p.id !== req.params.id && 
            p.name.toLowerCase() === req.body.name.toLowerCase()
          );
          if (duplicateName) {
            return res.status(400).json({ 
              message: `A pickup point with the name "${req.body.name}" already exists on this route` 
            });
          }
        }
        
        // Check for duplicate sequence order (excluding current point)
        if (req.body.sequenceOrder !== undefined) {
          const duplicateOrder = existingPoints.find((p: CarpoolPickupPoint) => 
            p.id !== req.params.id && 
            p.sequenceOrder === req.body.sequenceOrder
          );
          if (duplicateOrder) {
            return res.status(400).json({ 
              message: `A pickup point with sequence order ${req.body.sequenceOrder} already exists on this route` 
            });
          }
        }
      }

      const point = await storage.updateCarpoolPickupPoint(req.params.id, req.body);
      res.json(point);
    } catch (error) {
      console.error("Update pickup point error:", error);
      res.status(500).json({ message: "Failed to update pickup point" });
    }
  });

  // Admin: Delete pickup point
  app.delete("/api/admin/carpool/pickup-points/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      await storage.deleteCarpoolPickupPoint(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pickup point error:", error);
      res.status(500).json({ message: "Failed to delete pickup point" });
    }
  });

  // Admin: Get all time slots for a route
  app.get("/api/admin/carpool/routes/:id/time-slots", hasPermission('carpoolRouteManagement', 'view'), async (req, res) => {
    try {
      const slots = await storage.getCarpoolTimeSlots(req.params.id);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  // Admin: Create time slot
  app.post("/api/admin/carpool/time-slots", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const slotData = insertCarpoolTimeSlotSchema.parse(req.body);
      const slot = await storage.createCarpoolTimeSlot(slotData);
      res.json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid time slot data", errors: error.errors });
      } else {
        console.error("Create time slot error:", error);
        res.status(500).json({ message: "Failed to create time slot" });
      }
    }
  });

  // Admin: Update time slot
  app.put("/api/admin/carpool/time-slots/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const slot = await storage.updateCarpoolTimeSlot(req.params.id, req.body);
      res.json(slot);
    } catch (error) {
      console.error("Update time slot error:", error);
      res.status(500).json({ message: "Failed to update time slot" });
    }
  });

  // Admin: Delete time slot
  app.delete("/api/admin/carpool/time-slots/:id", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      await storage.deleteCarpoolTimeSlot(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete time slot error:", error);
      res.status(500).json({ message: "Failed to delete time slot" });
    }
  });

  // Carpool booking routes
  // Create carpool booking (public)
  app.post("/api/carpool/bookings", async (req, res) => {
    try {
      const bookingData = insertCarpoolBookingSchema.parse(req.body);
      const booking = await storage.createCarpoolBooking(bookingData);
      
      // TODO: Send booking confirmation email
      
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Create carpool booking error:", error);
        res.status(500).json({ message: "Failed to create booking" });
      }
    }
  });

  // Customer: Get own carpool bookings
  app.get("/api/my/carpool-bookings", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const bookings = await storage.getCarpoolBookingsByPhone(user.phone);
      res.json(bookings);
    } catch (error) {
      console.error("Get customer carpool bookings error:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin: Get all carpool bookings
  app.get("/api/admin/carpool/bookings", hasPermission('carpoolBookings', 'view'), async (req, res) => {
    try {
      const bookings = await storage.getCarpoolBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin: Get bookings for specific route and date
  app.get("/api/admin/carpool/bookings/by-route", hasPermission('carpoolBookings', 'view'), async (req, res) => {
    try {
      const { routeId, timeSlotId, travelDate } = req.query;
      if (!routeId || !timeSlotId || !travelDate) {
        return res.status(400).json({ message: "routeId, timeSlotId, and travelDate are required" });
      }
      const bookings = await storage.getCarpoolBookingsByRouteAndDate(
        routeId as string,
        timeSlotId as string,
        travelDate as string
      );
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin: Assign driver to carpool booking
  app.put("/api/admin/carpool/bookings/:id/assign-driver", hasPermission('driverAssignment'), async (req, res) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ message: "Driver ID is required" });
      }
      const booking = await storage.assignDriverToCarpool(req.params.id, driverId);
      res.json(booking);
    } catch (error) {
      console.error("Assign driver error:", error);
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  // Admin: Update carpool booking status
  app.put("/api/admin/carpool/bookings/:id/status", hasPermission('carpoolBookings', 'edit'), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const booking = await storage.updateCarpoolBookingStatus(req.params.id, status);
      res.json(booking);
    } catch (error) {
      console.error("Update booking status error:", error);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // Admin: Update carpool booking
  app.put("/api/admin/carpool/bookings/:id", hasPermission('carpoolBookings', 'edit'), async (req, res) => {
    try {
      const bookingData = updateCarpoolBookingSchema.parse({ ...req.body, id: req.params.id });
      const booking = await storage.updateCarpoolBooking(bookingData);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      } else {
        console.error("Update booking error:", error);
        res.status(500).json({ message: "Failed to update booking" });
      }
    }
  });

  // Vendor registration routes
  app.post("/api/vendor-registrations", validateVendorRegistration, async (req: any, res: any) => {
    try {
      const vendorData = insertVendorRegistrationSchema.parse(req.body);
      const referenceId = generateReferenceId();
      const vendor = await storage.createVendorRegistration({ ...vendorData, referenceId } as any);
      
      // Send email notifications (admin + customer) with reference ID
      await sendEmailNotification('vendorRegistration', { ...vendorData, referenceId });
      
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create vendor registration" });
      }
    }
  });

  // Admin only - contains PII
  app.get("/api/vendor-registrations", isEmployeeOrAdmin, async (req, res) => {
    try {
      const vendors = await storage.getVendorRegistrations();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor registrations" });
    }
  });

  // Contact message routes
  app.post("/api/contact-messages", validateContactMessage, async (req: any, res: any) => {
    try {
      const messageData = insertContactMessageSchema.parse(req.body);
      const referenceId = generateReferenceId();
      const message = await storage.createContactMessage({ ...messageData, referenceId } as any);
      
      // Send email notifications (admin + customer) with reference ID
      await sendEmailNotification('contactMessage', { ...messageData, referenceId });
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send contact message" });
      }
    }
  });

  // Admin only - contains PII
  app.get("/api/contact-messages", isEmployeeOrAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

  // Blog post routes
  // Protected - only employees with blogPosts permission can create
  app.post("/api/blog-posts", hasPermission('blogPosts', 'edit'), async (req, res) => {
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

  app.get("/api/blog-posts/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
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
  // Protected - only employees with portfolioClients permission can create
  app.post("/api/portfolio-clients", hasPermission('portfolioClients', 'edit'), async (req, res) => {
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

  app.get("/api/portfolio-clients", hasPermission('portfolioClients', 'view'), async (req, res) => {
    try {
      const clients = await storage.getPortfolioClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio clients" });
    }
  });

  // Admin routes
  app.get("/api/admin/blog-posts", hasPermission('blogPosts', 'view'), async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all blog posts" });
    }
  });

  app.post("/api/admin/blog-posts", hasPermission('blogPosts', 'edit'), async (req, res) => {
    try {
      console.log("Received blog post data, processing images...");
      
      // Import image processor
      const { ImageProcessor } = await import("./imageProcessor");
      
      // Process featured image if provided
      let processedFeaturedImage = req.body.featuredImage;
      if (processedFeaturedImage && processedFeaturedImage.startsWith('data:image/')) {
        console.log("Processing featured image...");
        try {
          processedFeaturedImage = await ImageProcessor.processBase64Image(processedFeaturedImage);
          console.log("Featured image processed successfully");
        } catch (imageError) {
          console.error("Failed to process featured image:", imageError);
          return res.status(400).json({ message: "Failed to process featured image" });
        }
      }

      // Process images in content
      let processedContent = req.body.content || '';
      if (processedContent) {
        console.log("Processing content images...");
        // Find all base64 images in content
        const base64ImageRegex = /data:image\/[^;]+;base64,[^"'\s]+/g;
        const images = processedContent.match(base64ImageRegex);
        
        if (images && images.length > 0) {
          console.log(`Found ${images.length} images in content to process`);
          for (const image of images) {
            try {
              const processedImage = await ImageProcessor.processBase64Image(image);
              processedContent = processedContent.replace(image, processedImage);
            } catch (imageError) {
              console.error("Failed to process content image:", imageError);
              // Continue with other images, don't fail the entire post
            }
          }
          console.log("Content images processed successfully");
        }
      }
      
      // Transform the data before validation
      const transformedData = {
        ...req.body,
        featuredImage: processedFeaturedImage,
        content: processedContent,
        // Convert scheduledFor string to timestamp if provided
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
        // Ensure tags is an array
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        // Set publishedAt if published is true
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

      console.log("Creating blog post with processed images...");
      const post = await storage.createBlogPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Blog post creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blog post", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.get("/api/admin/corporate-bookings", hasPermission('corporateBookings', 'view'), async (req, res) => {
    try {
      const bookings = await storage.getCorporateBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch corporate bookings" });
    }
  });

  app.get("/api/admin/rental-bookings", hasPermission('rentalBookings', 'view'), async (req, res) => {
    try {
      const bookings = await storage.getRentalBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rental bookings" });
    }
  });

  app.get("/api/admin/vendor-registrations", hasPermission('vendorRegistrations', 'view'), async (req, res) => {
    try {
      const vendors = await storage.getVendorRegistrations();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor registrations" });
    }
  });

  app.get("/api/admin/contact-messages", hasPermission('contactMessages', 'view'), async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact messages" });
    }
  });

  app.put("/api/admin/blog-posts/:id", hasPermission('blogPosts', 'edit'), async (req, res) => {
    try {
      console.log("Updating blog post:", req.params.id, JSON.stringify(req.body, null, 2));
      const postData = updateBlogPostSchema.parse({ ...req.body, id: req.params.id });
      const post = await storage.updateBlogPost(postData);
      console.log("Blog post updated successfully:", post.id);
      res.json(post);
    } catch (error) {
      console.error("Blog post update error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update blog post", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.delete("/api/admin/blog-posts/:id", hasPermission('blogPosts', 'edit'), async (req, res) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Image upload endpoint - Admin only with robust validation
  app.post("/api/upload", async (req, res) => {
    try {
      // Enhanced authentication check
      const adminAuth = req.headers['x-admin-auth'];
      const userAgent = req.headers['user-agent'];
      const referer = req.headers['referer'];
      
      console.log('Upload request headers:', {
        adminAuth,
        userAgent: userAgent ? 'present' : 'missing',
        referer
      });
      
      // Basic security checks - reject if missing expected headers
      if (!adminAuth || !userAgent) {
        console.log('Missing required headers');
        return res.status(401).json({ error: "Unauthorized: Admin access required - missing headers" });
      }
      
      // Check if request comes from admin area (more flexible referer check)
      if (referer && !referer.includes('admin') && !referer.includes('localhost')) {
        console.log('Invalid referer:', referer);
        return res.status(401).json({ error: "Unauthorized: Admin access required - invalid referer" });
      }

      const { image } = req.body;
      
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Parse data URL and validate MIME type
      const dataUrlMatch = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!dataUrlMatch) {
        return res.status(400).json({ error: "Invalid image format. Only PNG, JPEG, and WebP allowed" });
      }

      const [, mimeType, base64Data] = dataUrlMatch;
      
      // Validate base64
      if (!base64Data) {
        return res.status(400).json({ error: "Invalid base64 format" });
      }

      // Check file size (base64 is ~1.37x larger than actual file)
      const sizeEstimate = (base64Data.length * 0.75) / (1024 * 1024); // MB
      if (sizeEstimate > 5) {
        return res.status(400).json({ error: "File too large (max 5MB)" });
      }

      // Decode and validate buffer
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        return res.status(400).json({ error: "Invalid base64 encoding" });
      }

      // Validate image dimensions and re-encode for security
      const sharp = await import('sharp');
      const metadata = await sharp.default(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      if (metadata.width > 2048 || metadata.height > 2048) {
        return res.status(400).json({ error: "Image too large (max 2048x2048)" });
      }

      console.log("Processing uploaded image...");
      
      // Re-encode image to PNG for security and consistency
      const processedBuffer = await sharp.default(buffer)
        .png({ quality: 90 })
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      // Generate content hash for secure filename and versioning
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(processedBuffer).digest('hex');
      const filename = `logo_${hash.slice(0, 16)}.png`;
      const filepath = path.resolve(import.meta.dirname, "..", "attached_assets", filename);

      // Write the processed image
      fs.writeFileSync(filepath, processedBuffer);
      
      console.log("Image processed successfully:", filename);
      
      // Return the filename for database storage
      res.json({ 
        url: filename,
        version: hash.slice(0, 8),
        size: processedBuffer.length,
        dimensions: { width: metadata.width, height: metadata.height }
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.post("/api/admin/portfolio-clients", hasPermission('portfolioClients', 'edit'), async (req, res) => {
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

  app.put("/api/admin/portfolio-clients/:id", hasPermission('portfolioClients', 'edit'), async (req, res) => {
    try {
      const clientData = updatePortfolioClientSchema.parse({ ...req.body, id: req.params.id });
      const client = await storage.updatePortfolioClient(clientData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid client data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update portfolio client" });
      }
    }
  });

  app.delete("/api/admin/portfolio-clients/:id", hasPermission('portfolioClients', 'edit'), async (req, res) => {
    try {
      await storage.deletePortfolioClient(req.params.id);
      res.json({ message: "Portfolio client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete portfolio client" });
    }
  });

  // Bangladesh locations API routes
  app.get("/api/bangladesh-locations", async (req, res) => {
    try {
      const locations = await storage.getBangladeshLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Bangladesh locations" });
    }
  });

  // Export locations as JSON for static file generation
  app.get("/api/export-bangladesh-locations-json", async (req, res) => {
    try {
      const locations = await storage.getBangladeshLocations();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="bangladesh-locations.json"');
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to export Bangladesh locations" });
    }
  });

  app.post("/api/admin/import-bangladesh-locations", isSuperAdmin, async (req, res) => {
    try {
      await storage.importComprehensiveBangladeshLocations();
      res.json({ message: "Bangladesh locations imported successfully" });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import Bangladesh locations" });
    }
  });

  app.get("/api/search-bangladesh-locations", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }
      
      // Detect if input contains Bengali characters
      const containsBengali = /[\u0980-\u09FF]/.test(q.trim());
      
      const results = await storage.searchBangladeshLocations(q.trim());
      
      // Transform results to show appropriate language field
      const transformedResults = results.map(location => ({
        ...location,
        displayName: containsBengali 
          ? (location.fullLocationBn || location.fullLocationEn)
          : location.fullLocationEn
      }));
      
      res.json(transformedResults);
    } catch (error) {
      res.status(500).json({ message: "Failed to search Bangladesh locations" });
    }
  });

  // Facebook Conversions API endpoint
  app.post("/api/facebook-conversion", async (req, res) => {
    try {
      const { pixelId, event, customData, userData, timestamp, actionSource, eventSourceUrl } = req.body;
      
      // Get access token from database settings instead of environment variables
      const marketingSettings = await storage.getMarketingSettings();
      const accessToken = marketingSettings?.facebookAccessToken;
      
      if (!accessToken) {
        return res.status(500).json({ error: "Facebook access token not configured in marketing settings" });
      }
      
      if (!marketingSettings?.facebookEnabled) {
        return res.status(400).json({ error: "Facebook tracking is disabled" });
      }

      const conversionData = {
        data: [{
          event_name: event,
          event_time: timestamp,
          action_source: actionSource,
          event_source_url: eventSourceUrl,
          custom_data: customData,
          user_data: userData,
        }],
        access_token: accessToken,
      };

      const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Facebook Conversions API error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Facebook Conversions API error:', error);
      res.status(500).json({ error: "Failed to send conversion data" });
    }
  });

  // Marketing Settings API endpoints
  app.get("/api/admin/marketing-settings", hasPermission('marketingSettings', 'view'), async (req, res) => {
    try {
      const settings = await storage.getMarketingSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch marketing settings:', error);
      res.status(500).json({ message: "Failed to fetch marketing settings" });
    }
  });

  app.post("/api/admin/marketing-settings", hasPermission('marketingSettings', 'edit'), async (req, res) => {
    try {
      const settingsData = insertMarketingSettingsSchema.parse(req.body);
      
      // Check if marketing settings already exist (upsert pattern)
      const existingSettings = await storage.getMarketingSettings();
      
      let settings;
      if (existingSettings) {
        // Update existing settings
        settings = await storage.updateMarketingSettings({ 
          id: existingSettings.id, 
          ...settingsData 
        });
      } else {
        // Create new settings
        settings = await storage.createMarketingSettings(settingsData);
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Marketing settings validation error:', error.errors);
        res.status(400).json({ message: "Invalid marketing settings data", errors: error.errors });
      } else {
        console.error('Failed to save marketing settings:', error);
        res.status(500).json({ message: "Failed to save marketing settings" });
      }
    }
  });

  app.put("/api/admin/marketing-settings/:id", hasPermission('marketingSettings', 'edit'), async (req, res) => {
    try {
      const settingsData = updateMarketingSettingsSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const settings = await storage.updateMarketingSettings(settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Marketing settings not found" });
      }
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid marketing settings data", errors: error.errors });
      } else {
        console.error('Failed to update marketing settings:', error);
        res.status(500).json({ message: "Failed to update marketing settings" });
      }
    }
  });

  app.delete("/api/admin/marketing-settings/:id", hasPermission('marketingSettings', 'edit'), async (req, res) => {
    try {
      const deleted = await storage.deleteMarketingSettings(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Marketing settings not found" });
      }
      res.json({ message: "Marketing settings deleted successfully" });
    } catch (error) {
      console.error('Failed to delete marketing settings:', error);
      res.status(500).json({ message: "Failed to delete marketing settings" });
    }
  });

  // Website Settings API endpoints
  // Public endpoint for website settings (read-only)
  app.get("/api/website-settings", async (req, res) => {
    try {
      const settings = await storage.getWebsiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch website settings:', error);
      res.status(500).json({ message: "Failed to fetch website settings" });
    }
  });

  app.get("/api/admin/website-settings", hasPermission('websiteSettings', 'view'), async (req, res) => {
    try {
      const settings = await storage.getWebsiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch website settings:', error);
      res.status(500).json({ message: "Failed to fetch website settings" });
    }
  });

  app.post("/api/admin/website-settings", hasPermission('websiteSettings', 'edit'), async (req, res) => {
    try {
      const settingsData = insertWebsiteSettingsSchema.parse(req.body);
      const settings = await storage.createWebsiteSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid website settings data", errors: error.errors });
      } else {
        console.error('Failed to create website settings:', error);
        res.status(500).json({ message: "Failed to create website settings" });
      }
    }
  });

  app.put("/api/admin/website-settings/:id", hasPermission('websiteSettings', 'edit'), async (req, res) => {
    try {
      const settingsData = updateWebsiteSettingsSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const settings = await storage.updateWebsiteSettings(settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Website settings not found" });
      }
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid website settings data", errors: error.errors });
      } else {
        console.error('Failed to update website settings:', error);
        res.status(500).json({ message: "Failed to update website settings" });
      }
    }
  });

  app.delete("/api/admin/website-settings/:id", hasPermission('websiteSettings', 'edit'), async (req, res) => {
    try {
      const deleted = await storage.deleteWebsiteSettings(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Website settings not found" });
      }
      res.json({ message: "Website settings deleted successfully" });
    } catch (error) {
      console.error('Failed to delete website settings:', error);
      res.status(500).json({ message: "Failed to delete website settings" });
    }
  });

  // Legal Pages API endpoints
  app.get("/api/admin/legal-pages", hasPermission('legalPages', 'view'), async (req, res) => {
    try {
      const pages = await storage.getLegalPages();
      res.json(pages);
    } catch (error) {
      console.error('Failed to fetch legal pages:', error);
      res.status(500).json({ message: "Failed to fetch legal pages" });
    }
  });

  app.get("/api/admin/legal-pages/:id", hasPermission('legalPages', 'view'), async (req, res) => {
    try {
      const page = await storage.getLegalPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error('Failed to fetch legal page:', error);
      res.status(500).json({ message: "Failed to fetch legal page" });
    }
  });

  app.get("/api/legal-pages/:type", async (req, res) => {
    try {
      if (req.params.type !== 'terms' && req.params.type !== 'privacy') {
        return res.status(400).json({ message: "Invalid legal page type" });
      }
      const page = await storage.getLegalPageByType(req.params.type);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error('Failed to fetch legal page:', error);
      res.status(500).json({ message: "Failed to fetch legal page" });
    }
  });

  app.post("/api/admin/legal-pages", hasPermission('legalPages', 'edit'), async (req, res) => {
    try {
      const pageData = insertLegalPageSchema.parse(req.body);
      const page = await storage.createLegalPage(pageData);
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid legal page data", errors: error.errors });
      } else {
        console.error('Failed to create legal page:', error);
        res.status(500).json({ message: "Failed to create legal page" });
      }
    }
  });

  app.put("/api/admin/legal-pages/:id", hasPermission('legalPages', 'edit'), async (req, res) => {
    try {
      const pageData = updateLegalPageSchema.parse({
        id: req.params.id,
        ...req.body
      });
      const page = await storage.updateLegalPage(pageData);
      if (!page) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid legal page data", errors: error.errors });
      } else {
        console.error('Failed to update legal page:', error);
        res.status(500).json({ message: "Failed to update legal page" });
      }
    }
  });

  app.delete("/api/admin/legal-pages/:id", hasPermission('legalPages', 'edit'), async (req, res) => {
    try {
      const deleted = await storage.deleteLegalPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Legal page not found" });
      }
      res.json({ message: "Legal page deleted successfully" });
    } catch (error) {
      console.error('Failed to delete legal page:', error);
      res.status(500).json({ message: "Failed to delete legal page" });
    }
  });

  // Survey API endpoints (public)
  // Validate survey token - returns survey details if valid
  app.get("/api/survey/validate/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const survey = await storage.getSurveyByToken(token);

      if (!survey) {
        return res.status(404).json({ message: "Survey not found or invalid token" });
      }

      // Check if survey has expired
      if (new Date() > new Date(survey.expiresAt)) {
        return res.status(410).json({ message: "This survey link has expired" });
      }

      // Check if survey has already been submitted
      if (survey.submittedAt) {
        return res.status(409).json({ message: "This survey has already been completed" });
      }

      // Return survey details (without sensitive data)
      res.json({
        referenceId: survey.referenceId,
        submissionType: survey.submissionType,
        token: survey.token,
        expiresAt: survey.expiresAt
      });
    } catch (error) {
      console.error('Survey validation error:', error);
      res.status(500).json({ message: "Failed to validate survey" });
    }
  });

  // Submit survey response
  app.post("/api/survey/submit", async (req, res) => {
    try {
      const { token, npsScore, feedback } = z.object({
        token: z.string(),
        npsScore: z.number().int().min(0).max(10),
        feedback: z.string().optional()
      }).parse(req.body);

      // Update survey with response
      const updatedSurvey = await storage.updateSurveyResponse(token, npsScore, feedback);
      
      res.json({
        success: true,
        message: "Thank you for your feedback!",
        npsScore: updatedSurvey.npsScore
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid survey data", errors: error.errors });
      }
      
      if (error instanceof Error) {
        // Handle storage errors (expired, already submitted, not found)
        if (error.message === 'Survey not found') {
          return res.status(404).json({ message: "Survey not found" });
        }
        if (error.message === 'Survey has expired') {
          return res.status(410).json({ message: "This survey has expired and can no longer be submitted" });
        }
        if (error.message === 'Survey has already been submitted') {
          return res.status(409).json({ message: "This survey has already been completed" });
        }
      }

      console.error('Survey submission error:', error);
      res.status(500).json({ message: "Failed to submit survey response" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
