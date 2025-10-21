import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

// Setup express-session with PostgreSQL store
export function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'lax', // CSRF protection
    },
  });
}

// Setup authentication middleware
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is superadmin
export const isSuperAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'superadmin') {
    return res.status(403).json({ message: "Forbidden: Superadmin access required" });
  }
  next();
};

// Middleware to check if user has employee permissions or higher
export const isEmployeeOrAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId || (req.session.role !== 'employee' && req.session.role !== 'superadmin')) {
    return res.status(403).json({ message: "Forbidden: Employee access required" });
  }
  next();
};

// Middleware to check specific permission
export function hasPermission(permission: string): RequestHandler {
  return async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.session.role === 'superadmin') {
      return next();
    }
    
    if (req.session.role === 'employee' && req.session.permissions?.[permission]) {
      return next();
    }
    
    return res.status(403).json({ message: `Forbidden: ${permission} permission required` });
  };
}

// Utility: Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Utility: Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Utility: Generate temporary password
export function generateTemporaryPassword(): string {
  return nanoid(12);
}

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
    permissions?: Record<string, boolean>;
  }
}
