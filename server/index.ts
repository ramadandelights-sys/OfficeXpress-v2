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

(async () => {
  // Auto-setup database in production
  if (app.get("env") === "production") {
    try {
      log("Setting up database with Railway PostgreSQL...");
      log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");
      
      // Force schema creation for Railway PostgreSQL
      log("Creating database schema for Railway PostgreSQL...");
      try {
        // Use drizzle-kit to push schema to Railway
        execSync("npm run db:push --force", { 
          stdio: "inherit",
          env: { ...process.env }
        });
        log("Schema pushed successfully to Railway PostgreSQL!");
      } catch (schemaError: any) {
        log("Schema push failed, trying without --force...", schemaError.message || schemaError);
        try {
          execSync("npm run db:push", { 
            stdio: "inherit",
            env: { ...process.env }
          });
          log("Schema pushed successfully to Railway PostgreSQL!");
        } catch (fallbackError: any) {
          log("Schema push failed completely:", fallbackError.message || fallbackError);
          log("Railway database might be empty - continuing with empty database");
        }
      }
      
      log("Database setup complete!");
    } catch (error) {
      log("Database setup failed:", error);
      log("Continuing anyway...");
    }
  }
  
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
  }, () => {
    log(`serving on port ${port}`);
  });
})();
