import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { startCarpoolNotificationService } from "./carpool-notifications";
import { startTripGeneratorService } from "./trip-generator";
import { startSubscriptionRenewalService } from "./subscription-renewal";
import { startRefundProcessorService } from "./refund-processor";

const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://connect.facebook.net", 
        "https://www.googletagmanager.com", 
        "https://www.google.com", 
        "https://www.gstatic.com",
        "https://www.google-analytics.com",
        "https://ssl.google-analytics.com",
        "https://replit.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "https://www.facebook.com",
        "https://www.google-analytics.com",
        "https://ssl.google-analytics.com"
      ],
      connectSrc: [
        "'self'", 
        "https://www.facebook.com", 
        "https://graph.facebook.com",
        "https://connect.facebook.net",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://www.google-analytics.com",
        "https://ssl.google-analytics.com",
        "https://analytics.google.com"
      ],
      frameSrc: [
        "'self'", 
        "https://www.google.com", 
        "https://www.gstatic.com",
        "https://www.facebook.com"
      ],
      formAction: ["'self'", "https://www.facebook.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for form submissions
// Environment-aware: strict in production (5), lenient in development (50)
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Auto-adjusts based on environment
  message: {
    error: "Too many form submissions from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for admin operations
// Environment-aware: moderate in production (100), lenient in development (500)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Auto-adjusts based on environment
  message: {
    error: "Too many admin requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to specific routes
app.use('/api/corporate-bookings', formLimiter);
app.use('/api/rental-bookings', formLimiter);
app.use('/api/vendor-registrations', formLimiter);
app.use('/api/contact-messages', formLimiter);
app.use('/api/admin', adminLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // API 404 handler - catches unmatched API routes before Vite
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // If no route handled this request, return 404 JSON
    if (!res.headersSent) {
      res.status(404).json({ 
        message: `API endpoint not found: ${req.method} ${req.path}` 
      });
    } else {
      next();
    }
  });

  // Global error handler for API routes - ensures JSON responses
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Only handle API routes, let Vite handle others
    if (!req.path.startsWith('/api')) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        path: req.path,
        method: req.method,
        status,
        message,
        stack: err.stack
      });
    }

    // Always return JSON for API routes - do not rethrow
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start carpool notification service for insufficient bookings
    startCarpoolNotificationService(storage);
    
    // Start automated trip generation service
    log('[Startup] Starting automated trip generation service...');
    startTripGeneratorService(storage);
    
    // Start automated subscription renewal service
    log('[Startup] Starting subscription renewal service...');
    startSubscriptionRenewalService(storage);
    
    // Start automated refund processor service
    log('[Startup] Starting refund processor service...');
    startRefundProcessorService(storage);
    
    log('[Startup] All automated services started successfully');
  });
})();
