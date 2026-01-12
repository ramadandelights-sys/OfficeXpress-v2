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
  insertCarpoolBlackoutDateSchema,
  type UserPermissions,
  type CarpoolPickupPoint
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { sendEmailNotification, sendEmployeeOnboardingEmail, sendBookingNotificationEmail, emailWrapper, sendCompletionEmailWithSurvey, sendCarpoolBookingConfirmation, sendCarpoolDriverAssignmentEmail, sendCarpoolTripDriverAssignedEmail } from "./lib/resend";
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
      
      // Check if user is banned
      if ((user as any).isBanned === true) {
        return res.status(403).json({ 
          message: "Your account has been suspended. Please contact support for assistance.",
          isBanned: true,
          banReason: (user as any).banReason
        });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed: Session regeneration error" });
        }
        
        // Store user info in new session
        req.session.userId = user.id;
        req.session.role = user.role;
        
        // Ensure permissions is an object
        let perms = user.permissions || {};
        if (typeof perms === 'string') {
          try {
            perms = JSON.parse(perms);
          } catch (e) {
            console.error("Failed to parse user permissions:", e);
            perms = {};
          }
        }
        req.session.permissions = perms;
        
        // Save session before responding
        req.session.save(async (saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Login failed: Session save error" });
          }
          
      // Update last login
          try {
            await storage.updateUser(user.id, { lastLogin: new Date() } as any);
          } catch (updateErr) {
            console.error("Failed to update last login:", updateErr);
            // Don't fail login just because last login update failed
          }
          
          const responseData = { 
            id: user.id,
            phone: user.phone,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: (user.permissions || {}),
            temporaryPassword: user.temporaryPassword
          };
          
          console.log("Login success for user:", user.phone);
          res.json(responseData);
        });
      });
    } catch (error: any) {
      console.error("CRITICAL: Login error detail:", error);
      res.status(500).json({ 
        message: "Login failed", 
        error: error.message,
        stack: error.stack
      });
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

  // Customer registration endpoint
  app.post("/api/auth/register", authRateLimiter, async (req: any, res: any) => {
    try {
      const { phone, email, name, password } = req.body;
      
      // Validate required fields
      if (!phone || !email || !name || !password) {
        return res.status(400).json({ message: "Phone, email, name, and password are required" });
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
      
      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this phone number already exists. Please sign in instead." });
      }
      
      // Check if email is already in use
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }
      
      // Create new customer account
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        phone,
        email,
        name,
        password: hashedPassword
      });
      
      // Set role to customer
      await storage.updateUser(user.id, {
        role: 'customer',
        temporaryPassword: false
      } as any);
      
      // Auto-login the user
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        
        req.session.userId = user.id;
        req.session.role = 'customer';
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Registration successful but login failed" });
          }
          
          res.json({
            message: "Registration successful",
            user: {
              id: user.id,
              phone: user.phone,
              email: user.email,
              name: user.name,
              role: 'customer',
              temporaryPassword: false
            }
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
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

  // Customer profile update endpoint
  app.put("/api/my/profile", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { officeLocation, homeLocation } = req.body;
      
      // Validate input
      if (officeLocation !== undefined && typeof officeLocation !== 'string') {
        return res.status(400).json({ message: "Office location must be a string" });
      }
      if (homeLocation !== undefined && typeof homeLocation !== 'string') {
        return res.status(400).json({ message: "Home location must be a string" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        officeLocation: officeLocation || null,
        homeLocation: homeLocation || null,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
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
  // Supports optional ?date=YYYY-MM-DD parameter to filter by weekday and blackout dates
  app.get("/api/carpool/routes", async (req, res) => {
    try {
      let routes = await storage.getActiveCarpoolRoutes();
      
      // If a date is provided, filter routes by weekday and blackout dates
      const dateParam = req.query.date as string | undefined;
      if (dateParam) {
        const selectedDate = new Date(dateParam);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Filter routes that operate on the selected day of week
        routes = routes.filter(route => {
          const weekdays = route.weekdays as number[] || [1, 2, 3, 4, 5]; // Default to weekdays
          return weekdays.includes(dayOfWeek);
        });
        
        // Check if the selected date falls within any active blackout period
        const blackoutDates = await storage.getActiveCarpoolBlackoutDates();
        const isBlackedOut = blackoutDates.some(blackout => {
          const start = new Date(blackout.startDate);
          const end = new Date(blackout.endDate);
          return selectedDate >= start && selectedDate <= end;
        });
        
        // If date is blacked out, return empty array
        if (isBlackedOut) {
          return res.json([]);
        }
      }
      
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

  // Get pickup points for a route (public) - supports pointType filter
  app.get("/api/carpool/routes/:id/pickup-points", async (req, res) => {
    try {
      const pointType = req.query.pointType as string | undefined;
      const points = await storage.getCarpoolPickupPoints(req.params.id, pointType);
      // Filter to only show visible points to customers (public API)
      const visiblePoints = points.filter(p => p.isVisible !== false);
      res.json(visiblePoints);
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

  // Get booking counts for time slots (public)
  // Returns the number of existing bookings for each time slot on a specific date
  app.get("/api/carpool/routes/:id/booking-counts", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const slots = await storage.getActiveCarpoolTimeSlots(req.params.id);
      const bookingCounts: Record<string, number> = {};
      
      // Get booking counts for each time slot
      for (const slot of slots) {
        const bookings = await storage.getCarpoolBookingsByRouteAndDate(
          req.params.id,
          slot.id,
          date as string
        );
        // Count only confirmed and pending bookings (not cancelled or insufficient)
        const activeBookings = bookings.filter(b => 
          b.status === 'pending' || b.status === 'confirmed'
        );
        bookingCounts[slot.id] = activeBookings.length;
      }
      
      res.json(bookingCounts);
    } catch (error) {
      console.error("Get booking counts error:", error);
      res.status(500).json({ message: "Failed to fetch booking counts" });
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
      console.log("[Route Update] Received body:", JSON.stringify(req.body));
      const routeData = updateCarpoolRouteSchema.parse({ ...req.body, id: req.params.id });
      console.log("[Route Update] Parsed data:", JSON.stringify(routeData));
      const route = await storage.updateCarpoolRoute(routeData);
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[Route Update] Validation error:", JSON.stringify(error.errors));
        res.status(400).json({ message: "Invalid route data", errors: error.errors });
      } else {
        console.error("[Route Update] Server error:", error);
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

  // Admin: Get all pickup points for a route (with optional pointType filter)
  app.get("/api/admin/carpool/routes/:id/pickup-points", hasPermission('carpoolRouteManagement', 'view'), async (req, res) => {
    try {
      const pointType = req.query.pointType as string | undefined;
      const points = await storage.getCarpoolPickupPoints(req.params.id, pointType);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pickup points" });
    }
  });

  // Admin: Create pickup point
  app.post("/api/admin/carpool/pickup-points", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const pointData = insertCarpoolPickupPointSchema.parse(req.body);
      
      // Get existing points of the same type for this route
      const pointType = pointData.pointType || "pickup";
      const existingPoints = await storage.getCarpoolPickupPoints(pointData.routeId, pointType);
      
      // Check for duplicate name within the same point type
      const duplicateName = existingPoints.find((p: CarpoolPickupPoint) => p.name.toLowerCase() === pointData.name.toLowerCase());
      if (duplicateName) {
        const typeName = pointType === "dropoff" ? "drop-off point" : "pickup point";
        return res.status(400).json({ 
          message: `A ${typeName} with the name "${pointData.name}" already exists on this route` 
        });
      }
      
      // Check for duplicate sequence order within the same point type
      const duplicateOrder = existingPoints.find((p: CarpoolPickupPoint) => p.sequenceOrder === pointData.sequenceOrder);
      if (duplicateOrder) {
        const typeName = pointType === "dropoff" ? "drop-off point" : "pickup point";
        return res.status(400).json({ 
          message: `A ${typeName} with sequence order ${pointData.sequenceOrder} already exists on this route` 
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

  // Admin: Reorder pickup points (bulk update sequence order)
  // NOTE: This route MUST be before the :id route to avoid matching "reorder" as an ID
  app.put("/api/admin/carpool/pickup-points/reorder", hasPermission('carpoolRouteManagement', 'edit'), async (req, res) => {
    try {
      const { routeId, pointType, orderedIds } = req.body;
      
      // Validate required fields
      if (!routeId || !pointType || !Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "routeId, pointType, and orderedIds array are required" });
      }
      
      console.log(`[Reorder] Route: ${routeId}, Type: ${pointType}, IDs:`, orderedIds);
      
      // Get all existing points for this route and type
      const existingPoints = await storage.getCarpoolPickupPoints(routeId, pointType);
      const existingIds = new Set(existingPoints.map(p => p.id));
      
      // Filter to only valid IDs and assign sequential order (1, 2, 3, ...)
      const validOrderedIds = orderedIds.filter((id: string) => existingIds.has(id));
      
      if (validOrderedIds.length === 0) {
        return res.status(400).json({ message: "No valid points to reorder" });
      }
      
      // Update each point with its new sequential order
      const updates = await Promise.all(
        validOrderedIds.map((id: string, index: number) => 
          storage.updateCarpoolPickupPoint(id, { sequenceOrder: index + 1 })
        )
      );
      
      console.log(`[Reorder] Successfully updated ${updates.length} points with sequential orders`);
      res.json({ success: true, updated: updates.length });
    } catch (error) {
      console.error("Reorder pickup points error:", error);
      res.status(500).json({ message: "Failed to reorder pickup points" });
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
      // Check for dependent bookings before deleting
      const dependentBookings = await storage.getCarpoolBookingsByPickupPoint(req.params.id);
      if (dependentBookings.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete this point. It is referenced by ${dependentBookings.length} booking(s). Please reassign or delete those bookings first.` 
        });
      }
      
      // Check for dependent subscriptions
      const dependentSubscriptions = await storage.getSubscriptionsByPickupPoint(req.params.id);
      if (dependentSubscriptions.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete this point. It is referenced by ${dependentSubscriptions.length} subscription(s). Please reassign or cancel those subscriptions first.` 
        });
      }
      
      await storage.deleteCarpoolPickupPoint(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pickup point error:", error);
      res.status(500).json({ message: "Failed to delete pickup point" });
    }
  });

  // Admin: Batch geocode pickup points without coordinates
  app.post("/api/admin/carpool/pickup-points/geocode-all", isSuperAdmin, async (req, res) => {
    try {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      // Get all pickup points without coordinates
      const allRoutes = await storage.getCarpoolRoutes();
      let totalUpdated = 0;
      let totalFailed = 0;
      const results: { name: string; status: string; coords?: { lat: number; lng: number } }[] = [];

      for (const route of allRoutes) {
        const pickupPoints = await storage.getCarpoolPickupPoints(route.id, 'pickup');
        const dropoffPoints = await storage.getCarpoolPickupPoints(route.id, 'dropoff');
        const allPoints = [...pickupPoints, ...dropoffPoints];

        for (const point of allPoints) {
          // Skip points that already have coordinates
          if (point.latitude && point.longitude) {
            continue;
          }

          try {
            // Add Bangladesh context to improve geocoding accuracy
            const searchQuery = `${point.name}, Dhaka, Bangladesh`;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&region=bd`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = data.results[0].geometry.location;
              await storage.updateCarpoolPickupPoint(point.id, {
                latitude: String(location.lat),
                longitude: String(location.lng)
              });
              totalUpdated++;
              results.push({ name: point.name, status: 'success', coords: location });
            } else {
              totalFailed++;
              results.push({ name: point.name, status: `geocode_failed: ${data.status}` });
            }

            // Rate limit: wait 100ms between requests
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            totalFailed++;
            results.push({ name: point.name, status: 'error' });
          }
        }

        // Also geocode route start/end if missing
        if (route.fromLocation && (!route.fromLatitude || !route.fromLongitude)) {
          try {
            const searchQuery = `${route.fromLocation}, Dhaka, Bangladesh`;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&region=bd`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = data.results[0].geometry.location;
              await storage.updateCarpoolRoute({
                id: route.id,
                fromLatitude: String(location.lat),
                fromLongitude: String(location.lng)
              });
              totalUpdated++;
              results.push({ name: `Route start: ${route.fromLocation}`, status: 'success', coords: location });
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            totalFailed++;
          }
        }

        if (route.toLocation && (!route.toLatitude || !route.toLongitude)) {
          try {
            const searchQuery = `${route.toLocation}, Dhaka, Bangladesh`;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&region=bd`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = data.results[0].geometry.location;
              await storage.updateCarpoolRoute({
                id: route.id,
                toLatitude: String(location.lat),
                toLongitude: String(location.lng)
              });
              totalUpdated++;
              results.push({ name: `Route end: ${route.toLocation}`, status: 'success', coords: location });
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            totalFailed++;
          }
        }
      }

      console.log(`[Geocode] Batch geocoding completed: ${totalUpdated} updated, ${totalFailed} failed`);
      res.json({ 
        success: true, 
        updated: totalUpdated, 
        failed: totalFailed,
        details: results 
      });
    } catch (error) {
      console.error("Batch geocode error:", error);
      res.status(500).json({ message: "Failed to batch geocode pickup points" });
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
      // Check for dependent bookings before deleting
      const dependentBookings = await storage.getCarpoolBookingsByTimeSlot(req.params.id);
      if (dependentBookings.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete this time slot. It is referenced by ${dependentBookings.length} booking(s). Please reassign or delete those bookings first.` 
        });
      }
      
      // Check for dependent subscriptions
      const dependentSubscriptions = await storage.getSubscriptionsByTimeSlot(req.params.id);
      if (dependentSubscriptions.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete this time slot. It is referenced by ${dependentSubscriptions.length} subscription(s). Please reassign or cancel those subscriptions first.` 
        });
      }
      
      // Check for dependent AI trips
      const dependentTrips = await storage.getTripsByTimeSlot(req.params.id);
      if (dependentTrips.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete this time slot. It is referenced by ${dependentTrips.length} trip(s). Please delete those trips first.` 
        });
      }
      
      await storage.deleteCarpoolTimeSlot(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete time slot error:", error);
      res.status(500).json({ message: "Failed to delete time slot" });
    }
  });

  // Carpool booking routes
  // Get booking details from shareable link token (public)
  app.get("/api/carpool/bookings/shared/:token", async (req, res) => {
    try {
      const booking = await storage.getCarpoolBookingByShareToken(req.params.token);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found or share link expired" });
      }
      
      // Fetch related data for pre-populating the booking form
      const route = await storage.getCarpoolRoute(booking.routeId);
      const timeSlot = await storage.getCarpoolTimeSlot(booking.timeSlotId);
      
      res.json({
        routeId: booking.routeId,
        timeSlotId: booking.timeSlotId,
        travelDate: booking.travelDate,
        route,
        timeSlot
      });
    } catch (error) {
      console.error("Get shared booking error:", error);
      res.status(500).json({ message: "Failed to fetch booking details" });
    }
  });

  // Create carpool booking (public)
  app.post("/api/carpool/bookings", async (req, res) => {
    try {
      const bookingData = insertCarpoolBookingSchema.parse(req.body);
      
      // Check for existing active booking for the same phone/email on the same day
      const existingBookings = await storage.getCarpoolBookingsByPhone(bookingData.phone);
      const isDuplicate = existingBookings.some(b => 
        b.travelDate === bookingData.travelDate && 
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
      );

      if (isDuplicate) {
        return res.status(400).json({ 
          message: "You already have an active booking for this date. Please manage your existing booking or contact support if you need to make changes." 
        });
      }

      const booking = await storage.createCarpoolBooking(bookingData);
      
      // Fetch related data for the email
      const route = await storage.getCarpoolRoute(booking.routeId);
      const timeSlot = await storage.getCarpoolTimeSlot(booking.timeSlotId);
      const pickupPoint = await storage.getCarpoolPickupPoint(booking.boardingPointId);
      const dropOffPoint = await storage.getCarpoolPickupPoint(booking.dropOffPointId);
      
      if (route && timeSlot && pickupPoint && dropOffPoint) {
        // Construct shareable link
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://officexpress.org'
          : `http://localhost:5000`;
        const shareLink = `${baseUrl}/carpool?share=${booking.shareToken}`;
        
        // Format travel date
        const travelDateFormatted = new Date(booking.travelDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Send confirmation email
        await sendCarpoolBookingConfirmation({
          referenceId: booking.referenceId,
          customerName: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          routeName: route.name,
          fromLocation: route.fromLocation,
          toLocation: route.toLocation,
          travelDate: travelDateFormatted,
          departureTime: timeSlot.departureTime,
          pickupPoint: pickupPoint.name,
          dropOffPoint: dropOffPoint.name,
          shareLink
        });
      }
      
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

  // Admin: Get all carpool bookings (legacy - individual bookings)
  app.get("/api/admin/carpool/bookings", isAuthenticated, isEmployeeOrAdmin, hasPermission('carpoolBookings', 'view'), async (req, res) => {
    try {
      const bookings = await storage.getCarpoolBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin: Get all trip bookings with enriched data (from subscriptions + individual bookings)
  app.get("/api/admin/trip-bookings", isAuthenticated, isEmployeeOrAdmin, hasPermission('carpoolBookings', 'view'), async (req, res) => {
    try {
      const tripBookings = await storage.getAllTripBookingsForAdmin();
      res.json(tripBookings);
    } catch (error) {
      console.error("Get trip bookings error:", error);
      res.status(500).json({ message: "Failed to fetch trip bookings" });
    }
  });

  // Admin: Update trip booking status
  app.put("/api/admin/trip-bookings/:id/status", isAuthenticated, isEmployeeOrAdmin, hasPermission('carpoolBookings', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['expected', 'picked_up', 'completed', 'no_show', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateTripBooking(id, { status });
      res.json(updated);
    } catch (error) {
      console.error("Update trip booking status error:", error);
      res.status(500).json({ message: "Failed to update booking status" });
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

  // Get booked dates for a user by phone (public)
  app.get("/api/carpool/bookings/by-phone/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const bookings = await storage.getCarpoolBookingsByPhone(phone);
      // Only return active/pending travel dates
      const bookedDates = bookings
        .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
        .map(b => b.travelDate);
      res.json(bookedDates);
    } catch (error) {
      console.error("Get booked dates error:", error);
      res.status(500).json({ message: "Failed to fetch booked dates" });
    }
  });

  // Get subscribed weekdays for logged-in user (for preventing duplicate subscriptions)
  app.get("/api/subscriptions/weekdays", isAuthenticated, async (req, res) => {
    try {
      const subscriptions = await storage.getActiveSubscriptionsByUser(req.session.userId!);
      // Return a map of routeId to deduplicated subscribed weekdays
      const subscribedWeekdays: Record<string, string[]> = {};
      const now = new Date();
      for (const sub of subscriptions) {
        // Only include subscriptions that haven't ended yet
        if (sub.endDate && new Date(sub.endDate) < now) continue;
        
        if (!subscribedWeekdays[sub.routeId]) {
          subscribedWeekdays[sub.routeId] = [];
        }
        if (sub.weekdays && Array.isArray(sub.weekdays)) {
          for (const day of sub.weekdays) {
            if (!subscribedWeekdays[sub.routeId].includes(day)) {
              subscribedWeekdays[sub.routeId].push(day);
            }
          }
        }
      }
      res.json(subscribedWeekdays);
    } catch (error) {
      console.error("Get subscribed weekdays error:", error);
      res.status(500).json({ message: "Failed to fetch subscribed weekdays" });
    }
  });

  // Get user's subscription schedule with departure times (for time conflict detection)
  app.get("/api/subscriptions/schedule", isAuthenticated, async (req, res) => {
    try {
      const subscriptions = await storage.getActiveSubscriptionsByUser(req.session.userId!);
      const now = new Date();
      
      // Build schedule: weekday -> list of {routeId, routeName, departureTime}
      const schedule: Record<string, Array<{routeId: string, routeName: string, departureTime: string, timeSlotId: string}>> = {};
      
      for (const sub of subscriptions) {
        // Skip expired subscriptions
        if (sub.endDate && new Date(sub.endDate) < now) continue;
        if (!sub.weekdays || !Array.isArray(sub.weekdays)) continue;
        
        // Get route and time slot details
        const route = await storage.getCarpoolRoute(sub.routeId);
        const timeSlot = await storage.getCarpoolTimeSlot(sub.timeSlotId);
        if (!route || !timeSlot) continue;
        
        for (const weekday of sub.weekdays) {
          if (!schedule[weekday]) {
            schedule[weekday] = [];
          }
          // Check if this exact entry already exists (avoid duplicates)
          const exists = schedule[weekday].some(
            entry => entry.routeId === sub.routeId && entry.departureTime === timeSlot.departureTime
          );
          if (!exists) {
            schedule[weekday].push({
              routeId: sub.routeId,
              routeName: route.name,
              departureTime: timeSlot.departureTime,
              timeSlotId: sub.timeSlotId
            });
          }
        }
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Get subscription schedule error:", error);
      res.status(500).json({ message: "Failed to fetch subscription schedule" });
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
      
      // Send email notification to customer
      try {
        const driver = await storage.getDriver(driverId);
        const route = await storage.getCarpoolRoute(booking.routeId);
        const timeSlot = await storage.getCarpoolTimeSlot(booking.timeSlotId);
        const pickupPoint = await storage.getCarpoolPickupPoint(booking.boardingPointId);
        const dropOffPoint = await storage.getCarpoolPickupPoint(booking.dropOffPointId);
        
        if (booking.email && driver && route && timeSlot && pickupPoint && dropOffPoint) {
          await sendCarpoolDriverAssignmentEmail({
            email: booking.email,
            customerName: booking.customerName,
            referenceId: booking.referenceId,
            driverName: driver.name,
            driverPhone: driver.phone,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleYear: driver.vehicleYear,
            licensePlate: driver.licensePlate,
            vehicleCapacity: driver.vehicleCapacity,
            routeName: route.name,
            fromLocation: route.fromLocation,
            toLocation: route.toLocation,
            travelDate: booking.travelDate,
            departureTime: timeSlot.departureTime,
            pickupPoint: pickupPoint.name,
            dropOffPoint: dropOffPoint.name
          });
        }
      } catch (emailError) {
        console.error("Error sending driver assignment email:", emailError);
        // Don't fail the assignment if email fails
      }
      
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

  // Admin: Delete carpool booking (superadmin only)
  app.delete("/api/admin/carpool/bookings/:id", isSuperAdmin, async (req, res) => {
    try {
      await storage.deleteCarpoolBooking(req.params.id);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Delete booking error:", error);
      res.status(500).json({ message: "Failed to delete booking" });
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

  // Carpool blackout date routes (for holidays and service closures)
  // Admin: Get all blackout dates
  app.get("/api/admin/carpool/blackout-dates", hasPermission('carpoolBlackoutDates', 'view'), async (req, res) => {
    try {
      const blackoutDates = await storage.getCarpoolBlackoutDates();
      res.json(blackoutDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blackout dates" });
    }
  });

  // Public: Get active blackout dates (for checking availability)
  app.get("/api/carpool/blackout-dates/active", async (req, res) => {
    try {
      const blackoutDates = await storage.getActiveCarpoolBlackoutDates();
      res.json(blackoutDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active blackout dates" });
    }
  });

  // Admin: Create blackout date
  app.post("/api/admin/carpool/blackout-dates", hasPermission('carpoolBlackoutDates', 'edit'), async (req, res) => {
    try {
      const blackoutDateData = insertCarpoolBlackoutDateSchema.parse(req.body);
      const blackoutDate = await storage.createCarpoolBlackoutDate(blackoutDateData);
      res.json(blackoutDate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid blackout date data", errors: error.errors });
      } else {
        console.error("Create blackout date error:", error);
        res.status(500).json({ message: "Failed to create blackout date" });
      }
    }
  });

  // Admin: Update blackout date
  app.put("/api/admin/carpool/blackout-dates/:id", hasPermission('carpoolBlackoutDates', 'edit'), async (req, res) => {
    try {
      const blackoutDate = await storage.updateCarpoolBlackoutDate(req.params.id, req.body);
      res.json(blackoutDate);
    } catch (error) {
      console.error("Update blackout date error:", error);
      res.status(500).json({ message: "Failed to update blackout date" });
    }
  });

  // Admin: Delete blackout date
  app.delete("/api/admin/carpool/blackout-dates/:id", hasPermission('carpoolBlackoutDates', 'edit'), async (req, res) => {
    try {
      await storage.deleteCarpoolBlackoutDate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete blackout date error:", error);
      res.status(500).json({ message: "Failed to delete blackout date" });
    }
  });

  // Driver Assignment API endpoints (for supply team)
  // Get rental bookings pending driver assignment
  app.get("/api/admin/driver-assignment/rental", hasPermission('driverAssignment'), async (req, res) => {
    try {
      // Check if user has PII view permission
      const canViewPII = req.session.role === 'superadmin' || 
        (req.session.permissions?.driverAssignmentViewPII === true);
      
      const bookings = await storage.getRentalBookings();
      // Filter to only pending/confirmed bookings that need driver assignment
      const pendingAssignments = bookings
        .filter(b => !b.driverId && (b.status === 'pending' || b.status === 'confirmed'))
        .map(b => ({
          id: b.id,
          referenceId: b.referenceId,
          customerName: canViewPII ? b.customerName : null,
          customerPhone: canViewPII ? b.phone : null,
          pickupDate: b.startDate || b.pickupDate,
          pickupTime: b.startTime,
          dropoffDate: b.endDate,
          dropoffTime: b.endTime,
          pickupLocation: b.fromLocation,
          dropoffLocation: b.toLocation,
          vehicleType: b.vehicleType,
          driverId: b.driverId,
          driverName: null,
          status: b.status,
          createdAt: b.createdAt
        }));
      res.json(pendingAssignments);
    } catch (error) {
      console.error("Get rental driver assignments error:", error);
      res.status(500).json({ message: "Failed to fetch rental assignments" });
    }
  });

  // Get carpool trips pending driver assignment
  app.get("/api/admin/driver-assignment/carpool", hasPermission('driverAssignment'), async (req, res) => {
    try {
      // Get trips from the last week to next week
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 14);
      
      // Get all trips in the date range
      const allTrips = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const trips = await storage.getVehicleTripsWithDetails(dateStr);
        allTrips.push(...trips);
      }
      
      // Filter to pending assignment only
      const pendingTrips = allTrips
        .filter(t => t.status === 'pending_assignment')
        .map(t => ({
          id: t.id,
          tripReferenceId: t.tripReferenceId,
          routeName: t.routeName,
          fromLocation: t.fromLocation,
          toLocation: t.toLocation,
          tripDate: t.tripDate,
          departureTime: t.departureTimeSlot,
          vehicleCapacity: t.vehicleCapacity,
          recommendedVehicleType: t.recommendedVehicleType,
          passengerCount: t.passengerCount,
          driverId: t.driverId,
          driverName: t.driverName,
          status: t.status
        }));
      
      res.json(pendingTrips);
    } catch (error) {
      console.error("Get carpool driver assignments error:", error);
      res.status(500).json({ message: "Failed to fetch carpool assignments" });
    }
  });

  // AI Trip Management API endpoints
  // Admin: Get AI-generated trips for a specific date
  app.get("/api/admin/carpool/ai-trips", hasPermission('carpoolBookings', 'view'), async (req, res) => {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD format)" });
      }
      const trips = await storage.getVehicleTripsWithDetails(date);
      res.json(trips);
    } catch (error) {
      console.error("Get AI trips error:", error);
      res.status(500).json({ message: "Failed to fetch AI trips" });
    }
  });

  // Admin: Manually trigger AI trip generation for a specific date
  app.post("/api/admin/carpool/ai-trips/generate", hasPermission('driverAssignment'), async (req, res) => {
    try {
      const { date } = req.body;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD format)" });
      }
      
      // Import and create AI trip generator instance
      const { AITripGeneratorService } = await import('./ai-trip-generator');
      const generator = new AITripGeneratorService(storage);
      const result = await generator.generateTripsForDate(new Date(date));
      
      res.json({
        success: true,
        message: `Generated ${result.tripsCreated} trips for ${date}`,
        ...result
      });
    } catch (error) {
      console.error("Manual AI trip generation error:", error);
      res.status(500).json({ message: "Failed to generate AI trips" });
    }
  });

  // Admin: Update trip (assign driver, update status)
  app.patch("/api/admin/carpool/ai-trips/:id", hasPermission('driverAssignment'), async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId, status } = req.body;
      
      // Get the trip before update to check previous driver state
      const tripBefore = await storage.getVehicleTrip(id);
      if (!tripBefore) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const updateData: Record<string, any> = {};
      if (driverId !== undefined) updateData.driverId = driverId;
      if (status !== undefined) updateData.status = status;
      
      const trip = await storage.updateVehicleTrip(id, updateData);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // If driver was assigned or changed, notify all passengers
      if (driverId && driverId !== tripBefore.driverId) {
        try {
          const driver = await storage.getDriver(driverId);
          const route = await storage.getCarpoolRouteById(trip.routeId);
          const timeSlot = await storage.getCarpoolTimeSlotById(trip.timeSlotId);
          
          // Get all passengers in this trip
          const tripBookings = await storage.getTripBookingsByVehicleTrip(id);
          
          for (const booking of tripBookings) {
            const user = await storage.getUserById(booking.userId);
            const pickupPoint = await storage.getCarpoolPickupPointById(booking.boardingPointId);
            const dropOffPoint = await storage.getCarpoolPickupPointById(booking.dropOffPointId);
            
            if (user) {
              const notificationType = tripBefore.driverId ? 'driver_changed' : 'driver_assigned';
              
              // Create in-app notification
              await storage.createNotification({
                userId: user.id,
                type: notificationType,
                title: notificationType === 'driver_changed' ? 'Driver Updated' : 'Driver Assigned to Your Trip',
                message: notificationType === 'driver_changed' 
                  ? `Your driver for the trip on ${trip.tripDate} has been changed to ${driver?.name}`
                  : `A driver (${driver?.name}) has been assigned to your trip on ${trip.tripDate}`,
                metadata: {
                  tripId: trip.id,
                  tripReferenceId: trip.tripReferenceId,
                  tripDate: trip.tripDate,
                  driverName: driver?.name,
                  driverPhone: driver?.phone,
                } as Record<string, any>,
              });
              
              // Send email if user has email
              if (user.email && driver && route && timeSlot && pickupPoint && dropOffPoint) {
                await sendCarpoolTripDriverAssignedEmail({
                  email: user.email,
                  customerName: user.name,
                  tripReferenceId: trip.tripReferenceId,
                  tripDate: trip.tripDate,
                  routeName: route.name,
                  departureTime: timeSlot.departureTime,
                  pickupPoint: pickupPoint.name,
                  dropOffPoint: dropOffPoint.name,
                  driverName: driver.name,
                  driverPhone: driver.phone,
                  vehicleInfo: `${driver.vehicleMake} ${driver.vehicleModel}`,
                  licensePlate: driver.licensePlate,
                });
              }
            }
          }
          
          console.log(`[Routes] Sent driver assignment notifications to ${tripBookings.length} passengers for trip ${trip.tripReferenceId}`);
        } catch (notifyError) {
          console.error('[Routes] Failed to send driver assignment notifications:', notifyError);
          // Don't fail the entire operation if notifications fail
        }
      }
      
      res.json(trip);
    } catch (error) {
      console.error("Update AI trip error:", error);
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  // Admin: Merge two trips together
  app.post("/api/admin/carpool/ai-trips/:id/merge", hasPermission('driverAssignment'), async (req, res) => {
    try {
      const { id: targetTripId } = req.params;
      const { sourceTripId } = req.body;
      
      if (!sourceTripId) {
        return res.status(400).json({ message: "sourceTripId is required" });
      }
      
      const mergedTrip = await storage.mergeVehicleTrips(targetTripId, sourceTripId);
      res.json({
        success: true,
        message: "Trips merged successfully",
        trip: mergedTrip
      });
    } catch (error: any) {
      console.error("Merge trips error:", error);
      res.status(500).json({ message: error.message || "Failed to merge trips" });
    }
  });

  // Admin: Cancel a trip
  app.post("/api/admin/carpool/ai-trips/:id/cancel", hasPermission('driverAssignment'), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const trip = await storage.updateVehicleTrip(id, { 
        status: 'cancelled'
      });
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.json({
        success: true,
        message: "Trip cancelled successfully",
        trip
      });
    } catch (error) {
      console.error("Cancel trip error:", error);
      res.status(500).json({ message: "Failed to cancel trip" });
    }
  });

  // Holiday API endpoints for blackout date suggestions
  // Admin: Get upcoming holidays for next 12 months
  app.get("/api/admin/holidays/upcoming", hasPermission('carpoolBlackoutDates', 'view'), async (req, res) => {
    try {
      const { holidayService } = await import('./holiday-service');
      const months = parseInt(req.query.months as string) || 12;
      const holidays = holidayService.getUpcomingHolidays(months);
      res.json(holidays);
    } catch (error) {
      console.error("Get upcoming holidays error:", error);
      res.status(500).json({ message: "Failed to fetch upcoming holidays" });
    }
  });

  // Admin: Get holiday suggestions with blackout status
  app.get("/api/admin/holidays/suggestions", hasPermission('carpoolBlackoutDates', 'view'), async (req, res) => {
    try {
      const { holidayService } = await import('./holiday-service');
      const existingBlackouts = await storage.getCarpoolBlackoutDates();
      const formattedBlackouts = existingBlackouts.map(b => ({
        startDate: b.startDate,
        endDate: b.endDate,
        name: b.name
      }));
      const suggestions = await holidayService.getHolidaySuggestions(formattedBlackouts);
      res.json(suggestions);
    } catch (error) {
      console.error("Get holiday suggestions error:", error);
      res.status(500).json({ message: "Failed to fetch holiday suggestions" });
    }
  });

  // Admin: Get holidays for specific year
  app.get("/api/admin/holidays/:year", hasPermission('carpoolBlackoutDates', 'view'), async (req, res) => {
    try {
      const { holidayService } = await import('./holiday-service');
      const year = parseInt(req.params.year);
      if (isNaN(year) || year < 2024 || year > 2030) {
        return res.status(400).json({ message: "Invalid year. Supported years: 2024-2030" });
      }
      const holidays = holidayService.getHolidaysForYear(year);
      res.json(holidays);
    } catch (error) {
      console.error("Get holidays for year error:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  // Admin: Bulk add holidays as blackout dates
  app.post("/api/admin/holidays/sync", hasPermission('carpoolBlackoutDates', 'edit'), async (req, res) => {
    try {
      const { holidays } = req.body;
      if (!Array.isArray(holidays) || holidays.length === 0) {
        return res.status(400).json({ message: "Please provide an array of holidays to sync" });
      }

      const { holidayService } = await import('./holiday-service');
      const createdBlackouts = [];

      for (const holiday of holidays) {
        const blackoutData = holidayService.prepareBlackoutDatesForHoliday(holiday);
        for (const data of blackoutData) {
          const blackout = await storage.createCarpoolBlackoutDate({
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            isActive: true,
          });
          createdBlackouts.push(blackout);
        }
      }

      res.json({ 
        success: true, 
        message: `Successfully added ${createdBlackouts.length} blackout date(s)`,
        blackouts: createdBlackouts 
      });
    } catch (error) {
      console.error("Sync holidays error:", error);
      res.status(500).json({ message: "Failed to sync holidays as blackout dates" });
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
  
  // =====================================
  // Wallet & Subscription API Routes
  // =====================================
  
  // Get user wallet (creates one if doesn't exist)
  app.get("/api/wallet", isAuthenticated, async (req, res) => {
    try {
      let wallet = await storage.getUserWallet(req.session.userId!);
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await storage.createUserWallet({
          userId: req.session.userId!,
          balance: "0",
        });
      }
      
      res.json(wallet);
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });
  
  // Get wallet transactions
  app.get("/api/wallet/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getWalletTransactionsByUser(req.session.userId!);
      res.json(transactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Mock wallet top-up (for testing)
  app.post("/api/wallet/topup", isAuthenticated, async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Get or create wallet
      let wallet = await storage.getUserWallet(req.session.userId!);
      if (!wallet) {
        wallet = await storage.createUserWallet({
          userId: req.session.userId!,
          balance: "0",
        });
      }
      
      // Add funds to wallet
      const updatedWallet = await storage.updateWalletBalance(wallet.id, amount);
      
      res.json({ 
        wallet: updatedWallet,
        message: `Successfully added ৳${amount} to your wallet` 
      });
    } catch (error) {
      console.error('Wallet top-up error:', error);
      res.status(500).json({ message: "Failed to top up wallet" });
    }
  });
  
  // Calculate subscription cost (public - no auth required for price preview)
  app.post("/api/subscriptions/calculate-cost", async (req, res) => {
    try {
      const { routeId, weekdays, startDate } = req.body;
      
      if (!routeId || !weekdays || !Array.isArray(weekdays)) {
        return res.status(400).json({ message: "Route ID and weekdays are required" });
      }
      
      const route = await storage.getCarpoolRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Use provided startDate or default to today
      const { startOfDay, endOfMonth, eachDayOfInterval, getDay } = await import('date-fns');
      const fromDate = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
      const monthEnd = endOfMonth(fromDate);
      
      // Map weekday names to day numbers (0=Sunday, 1=Monday, etc.)
      const weekdayNameToNumber: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      const selectedDayNumbers = weekdays.map((w: string) => weekdayNameToNumber[w.toLowerCase()]).filter((n: number | undefined) => n !== undefined);
      
      // Get all days from startDate to end of month
      const allDaysInRange = eachDayOfInterval({ start: fromDate, end: monthEnd });
      
      // Filter to only matching weekdays
      const matchingWeekdays = allDaysInRange.filter(date => selectedDayNumbers.includes(getDay(date)));
      
      // Fetch active blackout dates
      const blackoutDates = await storage.getActiveCarpoolBlackoutDates();
      
      // Filter out blackout dates
      const serviceableDays = matchingWeekdays.filter(date => {
        const dateTime = date.getTime();
        return !blackoutDates.some(blackout => {
          const blackoutStart = new Date(blackout.startDate).setHours(0, 0, 0, 0);
          const blackoutEnd = new Date(blackout.endDate).setHours(23, 59, 59, 999);
          return dateTime >= blackoutStart && dateTime <= blackoutEnd;
        });
      });
      
      const pricePerSeat = parseFloat(route.pricePerSeat);
      const monthlyCost = serviceableDays.length * pricePerSeat;
      
      res.json({
        pricePerSeat,
        selectedWeekdays: weekdays,
        daysPerWeek: weekdays.length,
        serviceableDays: serviceableDays.length,
        totalDaysInMonth: matchingWeekdays.length,
        blackoutDaysExcluded: matchingWeekdays.length - serviceableDays.length,
        monthlyCost,
        monthEndDate: monthEnd.toISOString(),
        currency: "BDT"
      });
    } catch (error) {
      console.error('Calculate cost error:', error);
      res.status(500).json({ message: "Failed to calculate subscription cost" });
    }
  });
  
  // Purchase subscription
  app.post("/api/subscriptions/purchase", isAuthenticated, async (req, res) => {
    try {
      const { 
        routeId, 
        timeSlotId, 
        pickupPointId,
        dropOffPointId,
        weekdays,
        startDate,
        paymentMethod = 'online' // 'online' (wallet) or 'cash' (pay to driver)
      } = req.body;
      
      // Validate required fields
      if (!routeId || !timeSlotId || !pickupPointId || !dropOffPointId || !weekdays || !startDate) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Validate payment method
      if (!['online', 'cash'].includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      // Check for overlapping weekdays with existing active subscriptions on the same route
      const existingSubscriptions = await storage.getActiveSubscriptionsByUser(req.session.userId!);
      const now = new Date();
      const overlappingSubscription = existingSubscriptions.find(sub => {
        // Skip expired subscriptions
        if (sub.endDate && new Date(sub.endDate) < now) return false;
        if (sub.routeId !== routeId) return false; // Only check same route
        const subWeekdays = sub.weekdays || [];
        return weekdays.some((day: string) => subWeekdays.includes(day));
      });
      
      if (overlappingSubscription) {
        const overlappingDays = weekdays.filter((day: string) => 
          (overlappingSubscription.weekdays || []).includes(day)
        );
        return res.status(400).json({ 
          message: `You already have an active subscription for ${overlappingDays.join(', ')} on this route. Please cancel your existing subscription first or select different days.`
        });
      }
      
      // Get route and time slot details
      const route = await storage.getCarpoolRoute(routeId);
      const timeSlot = await storage.getCarpoolTimeSlot(timeSlotId);
      
      if (!route || !timeSlot) {
        return res.status(404).json({ message: "Route or time slot not found" });
      }
      
      // Calculate monthly cost
      const weeksPerMonth = 4.33;
      const daysPerWeek = weekdays.length;
      const totalDays = Math.round(daysPerWeek * weeksPerMonth);
      const pricePerSeat = parseFloat(route.pricePerSeat);
      const monthlyCost = totalDays * pricePerSeat;
      
      // Calculate end date (1 month from start)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      
      // Calculate billing cycle days (actual days between start and end)
      const billingCycleDays = Math.ceil(
        (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // For now, no discounts are applied - baseAmount equals monthlyCost
      // In the future, coupon code logic can be added here
      const baseAmount = monthlyCost;
      const discountAmount = 0;
      const netAmountPaid = monthlyCost - discountAmount;
      const couponCode = null;
      
      let subscription;
      
      // For online payment, use atomic subscription+wallet transaction
      if (paymentMethod === 'online') {
        // Get or create wallet
        let wallet = await storage.getUserWallet(req.session.userId!);
        if (!wallet) {
          wallet = await storage.createUserWallet({
            userId: req.session.userId!,
            balance: "0",
          });
        }
        
        // Check wallet balance
        const currentBalance = parseFloat(wallet.balance);
        if (currentBalance < netAmountPaid) {
          return res.status(400).json({ 
            message: "Insufficient wallet balance",
            required: netAmountPaid,
            current: currentBalance
          });
        }
        
        // Use atomic method that creates subscription AND debits wallet together
        // This ensures the subscriptionId is included in the wallet transaction metadata
        const result = await storage.purchaseSubscriptionWithWallet(wallet.id, {
          userId: req.session.userId!,
          routeId,
          timeSlotId,
          boardingPointId: pickupPointId,
          dropOffPointId,
          weekdays,
          startDate: startDateObj,
          endDate: endDateObj,
          pricePerTrip: pricePerSeat.toString(),
          totalMonthlyPrice: monthlyCost.toString(),
          baseAmount: baseAmount.toString(),
          discountAmount: discountAmount.toString(),
          netAmountPaid: netAmountPaid.toString(),
          billingCycleDays,
          couponCode,
          status: 'active',
          paymentMethod
        }, netAmountPaid);
        
        subscription = result.subscription;
      } else {
        // For cash payments, just create subscription (no wallet transaction)
        // Cash payments don't have netAmountPaid since they pay driver directly
        subscription = await storage.createSubscription({
          userId: req.session.userId!,
          routeId,
          timeSlotId,
          boardingPointId: pickupPointId,
          dropOffPointId,
          weekdays,
          startDate: startDateObj,
          endDate: endDateObj,
          pricePerTrip: pricePerSeat.toString(),
          totalMonthlyPrice: monthlyCost.toString(),
          baseAmount: baseAmount.toString(),
          discountAmount: discountAmount.toString(),
          billingCycleDays,
          status: 'active',
          paymentMethod
        });
      }
      
      // Create invoice - mark as paid for online payments
      const billingMonth = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}`;
      let invoice = await storage.createSubscriptionInvoice({
        subscriptionId: subscription.id,
        userId: req.session.userId!,
        billingMonth,
        amountDue: baseAmount.toString(),
        dueDate: startDateObj
      });
      
      // For online payments, mark the invoice as paid with the net amount
      if (paymentMethod === 'online') {
        invoice = await storage.updateInvoice(invoice.id, {
          status: 'paid',
          amountPaid: netAmountPaid.toString(),
          paidAt: new Date()
        });
      }
      
      res.json({
        subscription,
        invoice,
        paymentMethod,
        monthlyFee: monthlyCost,
        message: paymentMethod === 'cash' 
          ? "Subscription created successfully! Please pay the driver directly for each trip."
          : "Subscription purchased successfully"
      });
    } catch (error: any) {
      console.error('Subscription purchase error:', error);
      if (error.message?.includes('Insufficient funds')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to purchase subscription" });
    }
  });
  
  // Get user subscriptions
  app.get("/api/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptionsByUser(req.session.userId!);
      res.json(subscriptions);
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });
  
  // Get active subscriptions
  app.get("/api/subscriptions/active", isAuthenticated, async (req, res) => {
    try {
      const subscriptions = await storage.getActiveSubscriptionsByUser(req.session.userId!);
      res.json(subscriptions);
    } catch (error) {
      console.error('Get active subscriptions error:', error);
      res.status(500).json({ message: "Failed to fetch active subscriptions" });
    }
  });
  
  // Cancel subscription (modified to create a ticket)
  app.post("/api/subscriptions/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      if (subscription.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Instead of cancelling, create a complaint/ticket
      await storage.createComplaint({
        userId: req.session.userId!,
        category: "Subscription Cancellation",
        title: `Cancellation Request: ${subscription.id}`,
        description: `User requested cancellation for subscription ${subscription.id}.`,
        severity: "medium",
      });
      
      res.json({
        message: "Cancellation request submitted for admin review. An admin will contact you shortly."
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ message: "Failed to submit cancellation request" });
    }
  });
  
  // Get user invoices
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByUser(req.session.userId!);
      res.json(invoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  
  // Complaint Management Endpoints
  
  // Get user's recent trip bookings (last 30 days)
  app.get("/api/my/trip-bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const daysBack = req.query.days ? parseInt(req.query.days as string) : 30;
      
      // Get trip bookings with related info
      const bookings = await storage.getUserTripBookings(userId, daysBack);
      
      // Fetch related data for each booking
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          const vehicleTrip = await storage.getVehicleTrip(booking.vehicleTripId);
          if (!vehicleTrip) return null;
          
          const route = await storage.getCarpoolRoute(vehicleTrip.routeId);
          const timeSlot = await storage.getCarpoolTimeSlot(vehicleTrip.timeSlotId);
          const boardingPoint = await storage.getCarpoolPickupPoint(booking.boardingPointId);
          const dropOffPoint = await storage.getCarpoolPickupPoint(booking.dropOffPointId);
          const driver = vehicleTrip.driverId ? await storage.getDriver(vehicleTrip.driverId) : null;
          
          return {
            ...booking,
            tripDate: vehicleTrip.tripDate,
            routeName: route?.name || 'Unknown Route',
            fromLocation: route?.fromLocation || '',
            toLocation: route?.toLocation || '',
            timeSlot: timeSlot?.departureTime || '',
            boardingPoint: boardingPoint?.name || '',
            dropOffPoint: dropOffPoint?.name || '',
            driverName: driver?.name || 'Not Assigned',
            driverPhone: driver?.phone || '',
          };
        })
      );
      
      res.json(bookingsWithDetails.filter(b => b !== null));
    } catch (error) {
      console.error("Error fetching user trip bookings:", error);
      res.status(500).json({ message: "Failed to fetch trip bookings" });
    }
  });
  
  // File a new complaint
  app.post("/api/complaints", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { tripBookingId, category, severity, title, description } = req.body;
      
      // Validate input
      if (!category || !severity || !title || !description) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      if (description.length < 20) {
        return res.status(400).json({ message: "Description must be at least 20 characters long" });
      }
      
      // Validate trip booking belongs to user if provided
      if (tripBookingId) {
        const booking = await storage.getTripBooking(tripBookingId);
        if (!booking || booking.userId !== userId) {
          return res.status(403).json({ message: "Invalid trip booking" });
        }
      }
      
      const complaint = await storage.createComplaint({
        userId,
        tripBookingId: tripBookingId || null,
        category,
        severity,
        title,
        description,
      });
      
      res.json(complaint);
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(500).json({ message: "Failed to create complaint" });
    }
  });
  
  // Get user's complaints
  app.get("/api/my/complaints", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const complaints = await storage.getComplaintsByUser(userId);
      
      // Fetch trip details for each complaint
      const complaintsWithDetails = await Promise.all(
        complaints.map(async (complaint) => {
          if (!complaint.tripBookingId) {
            return { ...complaint, tripDetails: null };
          }
          
          const booking = await storage.getTripBooking(complaint.tripBookingId);
          if (!booking) {
            return { ...complaint, tripDetails: null };
          }
          
          const vehicleTrip = await storage.getVehicleTrip(booking.vehicleTripId);
          if (!vehicleTrip) {
            return { ...complaint, tripDetails: null };
          }
          
          const route = await storage.getCarpoolRoute(vehicleTrip.routeId);
          const timeSlot = await storage.getCarpoolTimeSlot(vehicleTrip.timeSlotId);
          
          return {
            ...complaint,
            tripDetails: {
              tripDate: vehicleTrip.tripDate,
              routeName: route?.name || 'Unknown Route',
              fromLocation: route?.fromLocation || '',
              toLocation: route?.toLocation || '',
              timeSlot: timeSlot?.departureTime || '',
            }
          };
        })
      );
      
      res.json(complaintsWithDetails);
    } catch (error) {
      console.error("Error fetching user complaints:", error);
      res.status(500).json({ message: "Failed to fetch complaints" });
    }
  });
  
  // Admin: Get all complaints with filters
  app.get("/api/admin/complaints", isEmployeeOrAdmin, hasPermission('complaintManagement', 'view'), async (req, res) => {
    try {
      const { status, severity, dateFrom, dateTo } = req.query;
      
      const filters = {
        status: status as string | undefined,
        severity: severity as string | undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };
      
      const complaints = await storage.getAllComplaints(filters);
      
      // Fetch additional details for each complaint
      const complaintsWithDetails = await Promise.all(
        complaints.map(async (complaint) => {
          const user = await storage.getUser(complaint.userId);
          let tripDetails = null;
          
          if (complaint.tripBookingId) {
            const booking = await storage.getTripBooking(complaint.tripBookingId);
            if (booking) {
              const vehicleTrip = await storage.getVehicleTrip(booking.vehicleTripId);
              if (vehicleTrip) {
                const route = await storage.getCarpoolRoute(vehicleTrip.routeId);
                const timeSlot = await storage.getCarpoolTimeSlot(vehicleTrip.timeSlotId);
                const driver = vehicleTrip.driverId ? await storage.getDriver(vehicleTrip.driverId) : null;
                
                tripDetails = {
                  tripDate: vehicleTrip.tripDate,
                  routeName: route?.name || 'Unknown Route',
                  fromLocation: route?.fromLocation || '',
                  toLocation: route?.toLocation || '',
                  timeSlot: timeSlot?.departureTime || '',
                  driverName: driver?.name || 'Not Assigned',
                };
              }
            }
          }
          
          const resolvedBy = complaint.resolvedByUserId ? await storage.getUser(complaint.resolvedByUserId) : null;
          
          return {
            ...complaint,
            userName: user?.name || 'Unknown User',
            userPhone: user?.phone || 'Unknown',
            userEmail: user?.email || '',
            tripDetails,
            resolvedByName: resolvedBy?.name || null,
          };
        })
      );
      
      res.json(complaintsWithDetails);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ message: "Failed to fetch complaints" });
    }
  });
  
  // Admin: Get single complaint details
  app.get("/api/admin/complaints/:id", isEmployeeOrAdmin, hasPermission('complaintManagement', 'view'), async (req, res) => {
    try {
      const { id } = req.params;
      const complaint = await storage.getComplaint(id);
      
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      
      const user = await storage.getUser(complaint.userId);
      let tripDetails = null;
      
      if (complaint.tripBookingId) {
        const booking = await storage.getTripBooking(complaint.tripBookingId);
        if (booking) {
          const vehicleTrip = await storage.getVehicleTrip(booking.vehicleTripId);
          if (vehicleTrip) {
            const route = await storage.getCarpoolRoute(vehicleTrip.routeId);
            const timeSlot = await storage.getCarpoolTimeSlot(vehicleTrip.timeSlotId);
            const boardingPoint = await storage.getCarpoolPickupPoint(booking.boardingPointId);
            const dropOffPoint = await storage.getCarpoolPickupPoint(booking.dropOffPointId);
            const driver = vehicleTrip.driverId ? await storage.getDriver(vehicleTrip.driverId) : null;
            
            tripDetails = {
              tripDate: vehicleTrip.tripDate,
              routeName: route?.name || 'Unknown Route',
              fromLocation: route?.fromLocation || '',
              toLocation: route?.toLocation || '',
              timeSlot: timeSlot?.departureTime || '',
              boardingPoint: boardingPoint?.name || '',
              dropOffPoint: dropOffPoint?.name || '',
              driverName: driver?.name || 'Not Assigned',
              driverPhone: driver?.phone || '',
            };
          }
        }
      }
      
      const resolvedBy = complaint.resolvedByUserId ? await storage.getUser(complaint.resolvedByUserId) : null;
      
      res.json({
        ...complaint,
        userName: user?.name || 'Unknown User',
        userPhone: user?.phone || 'Unknown',
        userEmail: user?.email || '',
        tripDetails,
        resolvedByName: resolvedBy?.name || null,
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(500).json({ message: "Failed to fetch complaint details" });
    }
  });
  
  // Admin: Update complaint status/resolution
  app.put("/api/admin/complaints/:id", isEmployeeOrAdmin, hasPermission('complaintManagement', 'edit'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;
      const resolvedByUserId = req.session.userId;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // If resolving/closing, resolution note is required
      if ((status === 'resolved' || status === 'closed') && !resolution) {
        return res.status(400).json({ message: "Resolution notes are required when resolving or closing a complaint" });
      }
      
      const updated = await storage.updateComplaintStatus(
        id,
        status,
        resolution || null,
        (status === 'resolved' || status === 'closed') ? resolvedByUserId : null
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(500).json({ message: "Failed to update complaint" });
    }
  });
  
  // Admin: Get complaint statistics
  app.get("/api/admin/complaints/stats", isEmployeeOrAdmin, hasPermission('complaintManagement', 'view'), async (req, res) => {
    try {
      const stats = await storage.getComplaintStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching complaint stats:", error);
      res.status(500).json({ message: "Failed to fetch complaint statistics" });
    }
  });
  
  // Admin subscription management endpoints
  app.get("/api/admin/subscriptions", 
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const { status } = req.query;
        let subscriptions;
        
        if (status && status !== 'all') {
          subscriptions = await storage.getSubscriptionsByStatus(status as string);
        } else {
          subscriptions = await storage.getAllSubscriptionsWithDetails();
        }
        
        res.json(subscriptions);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({ message: "Failed to fetch subscriptions" });
      }
    }
  );
  
  // NOTE: /stats must come BEFORE /:id to avoid Express matching "stats" as an ID
  app.get("/api/admin/subscriptions/stats", 
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const stats = await storage.getSubscriptionStats();
        res.json(stats);
      } catch (error) {
        console.error("Error fetching subscription stats:", error);
        res.status(500).json({ message: "Failed to fetch subscription statistics" });
      }
    }
  );
  
  app.get("/api/admin/subscriptions/:id", 
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const subscription = await storage.getSubscriptionWithDetails(req.params.id);
        if (!subscription) {
          return res.status(404).json({ message: "Subscription not found" });
        }
        res.json(subscription);
      } catch (error) {
        console.error("Error fetching subscription details:", error);
        res.status(500).json({ message: "Failed to fetch subscription details" });
      }
    }
  );
  
  app.get("/api/admin/subscriptions/:id/invoices", 
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const invoices = await storage.getInvoicesBySubscription(req.params.id);
        res.json(invoices);
      } catch (error) {
        console.error("Error fetching subscription invoices:", error);
        res.status(500).json({ message: "Failed to fetch subscription invoices" });
      }
    }
  );
  
  app.post("/api/admin/subscriptions/:id/cancel",
    isEmployeeOrAdmin,
    hasPermission('subscriptionCancellation'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
          return res.status(400).json({ message: "Cancellation reason is required" });
        }
        
        const adminId = req.session.userId;
        const result = await storage.adminCancelSubscription(id, adminId, reason.trim());
        
        res.json({
          success: true,
          subscription: result.subscription,
          refundAmount: result.refundAmount
        });
      } catch (error: any) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: error.message || "Failed to cancel subscription" });
      }
    }
  );
  
  // Admin update subscription dates (superadmin only)
  app.patch("/api/admin/subscriptions/:id/dates",
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start date and end date are required" });
        }
        
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        
        if (start >= end) {
          return res.status(400).json({ message: "Start date must be before end date" });
        }
        
        // Update subscription
        const updatedSubscription = await storage.updateSubscription(id, {
          startDate: start,
          endDate: end
        });
        
        if (!updatedSubscription) {
          return res.status(404).json({ message: "Subscription not found" });
        }
        
        res.json({
          success: true,
          subscription: updatedSubscription
        });
      } catch (error: any) {
        console.error("Error updating subscription dates:", error);
        res.status(500).json({ message: error.message || "Failed to update subscription dates" });
      }
    }
  );
  
  // Admin wallet management endpoints
  app.get("/api/admin/wallets", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const wallets = await storage.getAllWallets();
        res.json(wallets);
      } catch (error) {
        console.error("Error fetching wallets:", error);
        res.status(500).json({ message: "Failed to fetch wallets" });
      }
    }
  );
  
  app.get("/api/admin/wallets/stats", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const wallets = await storage.getAllWallets();
        const totalWallets = wallets.length;
        const totalSystemBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
        const totalCredits = wallets.reduce((sum, w) => sum + Number(w.totalCredits || 0), 0);
        const totalDebits = wallets.reduce((sum, w) => sum + Number(w.totalDebits || 0), 0);
        const walletsWithPositiveBalance = wallets.filter(w => Number(w.balance || 0) > 0).length;
        const walletsWithZeroBalance = wallets.filter(w => Number(w.balance || 0) === 0).length;
        
        // Count recent transactions (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentTransactions = wallets.reduce((sum, w) => {
          const lastTxDate = w.lastTransactionDate ? new Date(w.lastTransactionDate) : null;
          return sum + (lastTxDate && lastTxDate >= sevenDaysAgo ? 1 : 0);
        }, 0);
        
        res.json({
          totalWallets,
          totalSystemBalance,
          totalCredits,
          totalDebits,
          averageBalance: totalWallets > 0 ? totalSystemBalance / totalWallets : 0,
          walletsWithPositiveBalance,
          walletsWithZeroBalance,
          recentTransactions
        });
      } catch (error) {
        console.error("Error fetching wallet stats:", error);
        res.status(500).json({ message: "Failed to fetch wallet statistics" });
      }
    }
  );
  
  app.get("/api/admin/wallets/:walletId/transactions", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const { walletId } = req.params;
        const transactions = await storage.getWalletTransactionsWithDetails(walletId);
        res.json(transactions);
      } catch (error) {
        console.error("Error fetching wallet transactions:", error);
        res.status(500).json({ message: "Failed to fetch wallet transactions" });
      }
    }
  );
  
  app.post("/api/admin/wallets/:walletId/adjust", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { walletId } = req.params;
        const { amount, type, reason, description, adminUserId } = req.body;
        
        // Validate input
        if (!amount || amount <= 0) {
          return res.status(400).json({ message: "Amount must be positive" });
        }
        if (!['credit', 'debit'].includes(type)) {
          return res.status(400).json({ message: "Type must be 'credit' or 'debit'" });
        }
        if (!reason || reason.trim().length === 0) {
          return res.status(400).json({ message: "Reason is required for admin adjustments" });
        }
        
        const performedByUserId = adminUserId || req.session.userId;
        
        const transaction = await storage.adminAdjustWalletBalance(
          walletId,
          amount,
          type as 'credit' | 'debit',
          description ? `${reason}: ${description}` : reason,
          performedByUserId
        );
        
        res.json({ 
          message: `Wallet ${type}ed successfully`,
          transaction 
        });
      } catch (error: any) {
        console.error("Error adjusting wallet balance:", error);
        if (error.message?.includes('negative balance')) {
          res.status(400).json({ message: error.message });
        } else if (error.message?.includes('not found')) {
          res.status(404).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Failed to adjust wallet balance" });
        }
      }
    }
  );
  
  // Wallet reset endpoint - zero out balance
  app.post("/api/admin/wallets/:walletId/reset", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { walletId } = req.params;
        const { reason } = req.body;
        
        if (!reason || reason.trim().length === 0) {
          return res.status(400).json({ message: "Reason is required for wallet reset" });
        }
        
        const adminId = req.session.userId;
        const result = await storage.resetWalletBalance(walletId, adminId, reason);
        
        res.json({ 
          message: `Wallet reset successfully. Previous balance: ৳${result.previousBalance.toFixed(2)}`,
          previousBalance: result.previousBalance,
          wallet: result.wallet
        });
      } catch (error: any) {
        console.error("Error resetting wallet:", error);
        if (error.message?.includes('not found')) {
          res.status(404).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Failed to reset wallet" });
        }
      }
    }
  );
  
  // Wallet audit endpoint - check for discrepancies
  app.get("/api/admin/wallets/:walletId/audit", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const { walletId } = req.params;
        const audit = await storage.auditWallet(walletId);
        
        res.json({
          walletId: audit.wallet.id,
          userId: audit.wallet.userId,
          storedBalance: audit.storedBalance,
          calculatedBalance: audit.calculatedBalance,
          discrepancy: audit.discrepancy,
          hasDiscrepancy: Math.abs(audit.discrepancy) > 0.01,
          transactionCount: audit.transactions.length,
          transactions: audit.transactions
        });
      } catch (error: any) {
        console.error("Error auditing wallet:", error);
        if (error.message?.includes('not found')) {
          res.status(404).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Failed to audit wallet" });
        }
      }
    }
  );
  
  // Audit all wallets for discrepancies
  app.get("/api/admin/wallets/audit-all", 
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const wallets = await storage.getAllWallets();
        const auditResults = [];
        
        for (const wallet of wallets) {
          const audit = await storage.auditWallet(wallet.id);
          if (Math.abs(audit.discrepancy) > 0.01) {
            auditResults.push({
              walletId: wallet.id,
              userId: wallet.userId,
              userName: wallet.user?.name || 'Unknown',
              storedBalance: audit.storedBalance,
              calculatedBalance: audit.calculatedBalance,
              discrepancy: audit.discrepancy
            });
          }
        }
        
        res.json({
          totalWallets: wallets.length,
          walletsWithDiscrepancies: auditResults.length,
          discrepancies: auditResults
        });
      } catch (error: any) {
        console.error("Error auditing all wallets:", error);
        res.status(500).json({ message: "Failed to audit wallets" });
      }
    }
  );
  
  // Admin Refund Management Endpoints
  
  // Get pending refunds
  app.get("/api/admin/refunds/pending",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const pendingRefunds = await storage.getPendingRefunds();
        res.json(pendingRefunds);
      } catch (error) {
        console.error("Error fetching pending refunds:", error);
        res.status(500).json({ message: "Failed to fetch pending refunds" });
      }
    }
  );
  
  // Get refund history with type filtering and subscription details
  app.get("/api/admin/refunds/history",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const { userId, startDate, endDate, limit, refundType } = req.query;
        
        const filters: any = {};
        if (userId) filters.userId = userId as string;
        if (startDate) filters.startDate = new Date(startDate as string);
        if (endDate) filters.endDate = new Date(endDate as string);
        if (limit) filters.limit = parseInt(limit as string);
        if (refundType && ['all', 'trip_cancellation', 'subscription_cancellation', 'missed_service', 'manual'].includes(refundType)) {
          filters.refundType = refundType as string;
        }
        
        const history = await storage.getRefundHistory(filters);
        res.json(history);
      } catch (error) {
        console.error("Error fetching refund history:", error);
        res.status(500).json({ message: "Failed to fetch refund history" });
      }
    }
  );
  
  // Get refund statistics
  app.get("/api/admin/refunds/stats",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const stats = await storage.getRefundStats();
        res.json(stats);
      } catch (error) {
        console.error("Error fetching refund stats:", error);
        res.status(500).json({ message: "Failed to fetch refund statistics" });
      }
    }
  );
  
  // Manually trigger refund processing
  app.post("/api/admin/refunds/process",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        // Import the refund processor dynamically
        const { getRefundProcessor } = await import('./refund-processor');
        const refundProcessor = getRefundProcessor();
        
        if (!refundProcessor) {
          return res.status(503).json({ message: "Refund processor service not running" });
        }
        
        const result = await refundProcessor.processPendingRefunds();
        
        res.json({
          message: "Refund processing completed",
          processed: result.processed,
          failed: result.failed,
          totalAmount: result.totalAmount
        });
      } catch (error) {
        console.error("Error processing refunds:", error);
        res.status(500).json({ message: "Failed to process refunds" });
      }
    }
  );
  
  app.post("/api/admin/refunds",
    isEmployeeOrAdmin,
    hasPermission('walletRefunds'),
    async (req: any, res: any) => {
      try {
        const { userId, amount, reason } = req.body;
        
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({ message: "User ID is required" });
        }
        
        if (!amount || typeof amount !== 'number' || amount <= 0) {
          return res.status(400).json({ message: "Amount must be a positive number" });
        }
        
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
          return res.status(400).json({ message: "Refund reason is required" });
        }
        
        const adminId = req.session.userId;
        const transaction = await storage.issueManualRefund(userId, amount, reason.trim(), adminId);
        
        res.json({
          success: true,
          transaction
        });
      } catch (error: any) {
        console.error("Error issuing manual refund:", error);
        res.status(500).json({ message: error.message || "Failed to issue manual refund" });
      }
    }
  );
  
  app.post("/api/admin/payment-linkage-backfill",
    isEmployeeOrAdmin,
    hasPermission('walletRefunds', 'edit'),
    async (req: any, res: any) => {
      try {
        const { dryRun = true } = req.body;
        
        if (typeof dryRun !== 'boolean') {
          return res.status(400).json({ message: "dryRun must be a boolean" });
        }
        
        console.log(`Starting payment linkage backfill (dryRun: ${dryRun})...`);
        const results = await storage.backfillPaymentLinkage(dryRun);
        
        console.log(`Backfill complete: processed=${results.processed}, linked=${results.linked}, skipped=${results.skipped}`);
        
        res.json({
          success: true,
          dryRun,
          results
        });
      } catch (error: any) {
        console.error("Error running payment linkage backfill:", error);
        res.status(500).json({ message: error.message || "Failed to run payment linkage backfill" });
      }
    }
  );

  // Get pending cash settlements (service days where cash subscribers didn't have trips generated)
  app.get("/api/admin/cash-settlements/pending",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'view'),
    async (req: any, res: any) => {
      try {
        const settlements = await storage.getPendingCashSettlements();
        res.json(settlements);
      } catch (error) {
        console.error("Error fetching pending cash settlements:", error);
        res.status(500).json({ message: "Failed to fetch pending cash settlements" });
      }
    }
  );

  // Acknowledge a cash settlement (mark as reviewed by admin)
  app.post("/api/admin/cash-settlements/:id/acknowledge",
    isEmployeeOrAdmin,
    hasPermission('walletManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const adminId = req.session.userId;
        
        if (!id) {
          return res.status(400).json({ message: "Service day ID is required" });
        }
        
        const updatedRecord = await storage.acknowledgeCashSettlement(id, adminId);
        
        res.json({
          success: true,
          record: updatedRecord
        });
      } catch (error: any) {
        console.error("Error acknowledging cash settlement:", error);
        res.status(500).json({ message: error.message || "Failed to acknowledge cash settlement" });
      }
    }
  );

  app.post("/api/admin/users/:id/ban",
    isEmployeeOrAdmin,
    hasPermission('userBanManagement'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
          return res.status(400).json({ message: "Ban reason is required" });
        }
        
        const adminId = req.session.userId;
        const user = await storage.banUser(id, adminId, reason.trim());
        
        res.json({
          success: true,
          user
        });
      } catch (error: any) {
        console.error("Error banning user:", error);
        res.status(500).json({ message: error.message || "Failed to ban user" });
      }
    }
  );
  
  app.post("/api/admin/users/:id/unban",
    isEmployeeOrAdmin,
    hasPermission('userBanManagement'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const user = await storage.unbanUser(id);
        
        res.json({
          success: true,
          user
        });
      } catch (error: any) {
        console.error("Error unbanning user:", error);
        res.status(500).json({ message: error.message || "Failed to unban user" });
      }
    }
  );
  
  // Cancel a trip and trigger refunds
  app.post("/api/admin/trips/:id/cancel",
    isEmployeeOrAdmin,
    hasPermission('carpoolRouteManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { reason = "Trip cancelled by admin" } = req.body;
        
        // Import the refund processor dynamically
        const { getRefundProcessor } = await import('./refund-processor');
        const refundProcessor = getRefundProcessor();
        
        if (!refundProcessor) {
          return res.status(503).json({ message: "Refund processor service not running" });
        }
        
        const result = await refundProcessor.cancelTripAndRefund(id, reason);
        
        res.json({
          message: `Trip cancelled and refunds processed`,
          affectedBookings: result.affectedBookings,
          totalRefunded: result.totalRefunded
        });
      } catch (error) {
        console.error("Error cancelling trip:", error);
        res.status(500).json({ message: "Failed to cancel trip and process refunds" });
      }
    }
  );

  // Admin endpoints for automated trip generation and subscription renewal
  
  // Manual trigger for trip generation
  app.post("/api/admin/trips/generate-today",
    isEmployeeOrAdmin,
    hasPermission('carpoolRouteManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { dryRun = false, date } = req.body;
        
        // Import the service dynamically to avoid circular dependencies
        const { getTripGeneratorService } = await import('./trip-generator');
        const tripGenerator = getTripGeneratorService(storage);
        
        let result;
        if (date) {
          // Generate for specific date
          const targetDate = new Date(date);
          result = await tripGenerator.generateTripsForDate(targetDate, dryRun);
        } else {
          // Generate for today
          result = await tripGenerator.generateTripsForToday(dryRun);
        }
        
        res.json({
          message: dryRun ? 
            `[DRY RUN] Trip generation simulation completed` : 
            `Trip generation completed`,
          result
        });
      } catch (error: any) {
        console.error("Error generating trips:", error);
        res.status(500).json({ 
          message: "Failed to generate trips",
          error: error.message 
        });
      }
    }
  );
  
  // Manual trigger for subscription renewal processing
  app.post("/api/admin/subscriptions/process-renewals",
    isEmployeeOrAdmin,
    hasPermission('subscriptionManagement', 'edit'),
    async (req: any, res: any) => {
      try {
        const { dryRun = false, date } = req.body;
        
        // Import the service dynamically to avoid circular dependencies
        const { getSubscriptionRenewalService } = await import('./subscription-renewal');
        const renewalService = getSubscriptionRenewalService(storage);
        
        let result;
        if (date) {
          // Process for specific date
          const targetDate = new Date(date);
          result = await renewalService.processRenewalsForDate(targetDate, dryRun);
        } else {
          // Process for today
          result = await renewalService.processRenewals(dryRun);
        }
        
        res.json({
          message: dryRun ? 
            `[DRY RUN] Subscription renewal simulation completed` : 
            `Subscription renewal processing completed`,
          result
        });
      } catch (error: any) {
        console.error("Error processing subscription renewals:", error);
        res.status(500).json({ 
          message: "Failed to process subscription renewals",
          error: error.message 
        });
      }
    }
  );
  
  // Get service status endpoint
  app.get("/api/admin/automation/status",
    isEmployeeOrAdmin,
    async (req: any, res: any) => {
      try {
        res.json({
          tripGeneration: {
            enabled: process.env.TRIP_GENERATION_ENABLED !== 'false',
            schedule: process.env.TRIP_GENERATION_SCHEDULE || '0 0 * * *',
            timezone: 'Asia/Dhaka'
          },
          subscriptionRenewal: {
            enabled: process.env.SUBSCRIPTION_RENEWAL_ENABLED !== 'false',
            schedule: process.env.SUBSCRIPTION_RENEWAL_SCHEDULE || '0 1 * * *',
            timezone: 'Asia/Dhaka'
          }
        });
      } catch (error: any) {
        console.error("Error getting automation status:", error);
        res.status(500).json({ message: "Failed to get automation status" });
      }
    }
  );


  const httpServer = createServer(app);
  return httpServer;
}
