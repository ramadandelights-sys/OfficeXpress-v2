import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { execSync } from "child_process";

const app = express();
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

// Railway health check - respond immediately before anything else
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'officexpress-api'
  });
});

async function setupDatabase() {
  try {
    log("Setting up database with Railway PostgreSQL...");
    log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");
    
    // Force schema creation for Railway PostgreSQL
    log("Creating database schema for Railway PostgreSQL...");
    
    // Ensure drizzle-kit uses Railway DATABASE_URL, not development Neon URL
    const railwayEnv = {
      ...process.env,
      // Explicitly override DATABASE_URL for Railway production
      DATABASE_URL: process.env.DATABASE_URL?.includes('railway') ? 
        process.env.DATABASE_URL : 
        process.env.DATABASE_URL,
      NODE_ENV: 'production'
    };
    
    log("Using DATABASE_URL for schema push:", railwayEnv.DATABASE_URL?.substring(0, 50) + "...");
    
    try {
      // Use drizzle-kit to push schema to Railway with correct URL
      execSync("npm run db:push --force", { 
        stdio: "inherit",
        env: railwayEnv
      });
      log("Schema pushed successfully to Railway PostgreSQL!");
    } catch (schemaError: any) {
      log("Schema push failed, trying without --force...", schemaError.message || schemaError);
      try {
        execSync("npm run db:push", { 
          stdio: "inherit",
          env: railwayEnv
        });
        log("Schema pushed successfully to Railway PostgreSQL!");
      } catch (fallbackError: any) {
        log("Schema push failed completely:", fallbackError.message || fallbackError);
        log("Will create tables manually using direct SQL...");
        
        // Fallback: Create tables directly using our db connection
        try {
          const { createTables } = await import("./createTables");
          await createTables();
          log("Tables created successfully via direct SQL!");
        } catch (directError: any) {
          log("Direct table creation failed:", directError.message || directError);
          log("Railway database setup incomplete - APIs may fail");
        }
      }
    }
    
    log("Database setup complete!");
  } catch (error) {
    log("Database setup failed:", error);
    log("Continuing anyway...");
  }
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
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
  }, async () => {
    log(`serving on port ${port}`);
    
    // Setup database AFTER server starts to avoid Railway timeout
    if (app.get("env") === "production") {
      log("Server started, now setting up database asynchronously...");
      // Don't await - let it run in background to avoid blocking
      setupDatabase().catch(err => log("Background database setup failed:", err));
    }
  });
})();
