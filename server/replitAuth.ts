import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

// Environment validation with fallbacks for development
const REPL_ID = process.env.REPL_ID || "default-repl";
const REPLIT_DOMAINS = process.env.REPLIT_DOMAINS || "localhost:5000";
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || "development-secret-key";
const NODE_ENV = process.env.NODE_ENV || "development";
const AUTH_MODE = process.env.AUTH_MODE || (process.env.REPL_ID ? "replit" : "basic");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

// Create memory store for sessions in development
const MemoryStoreFactory = MemoryStore(session);

// Warn if in production without proper config
if (NODE_ENV === "production" && (!process.env.REPL_ID || !process.env.SESSION_SECRET)) {
  console.warn("Warning: Production environment without proper auth configuration");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store for development, PostgreSQL for production
  let sessionStore;
  if (DATABASE_URL && NODE_ENV === "production") {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: DATABASE_URL,
      createTableIfMissing: true, // Allow table creation in production
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    // Use memory store for development
    sessionStore = new MemoryStoreFactory({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  return session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === "production", // Only secure cookies in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Basic authentication routes for non-Replit environments
  if (AUTH_MODE === "basic") {
    // Basic login route
    app.post("/api/auth/basic/login", async (req, res) => {
      try {
        const { email, firstName, lastName } = req.body;
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        // Create or update user
        const userId = email;
        await storage.upsertUser({
          id: userId,
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          profileImageUrl: null,
          isAdmin: ADMIN_EMAILS.includes(email)
        });

        // Set session
        (req.session as any).user = {
          id: userId,
          email,
          firstName,
          lastName,
          isAdmin: ADMIN_EMAILS.includes(email),
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 1 week
        };

        res.json({ success: true, user: { email, firstName, lastName } });
      } catch (error) {
        console.error("Basic login error:", error);
        res.status(500).json({ message: "Login failed" });
      }
    });

    // Basic logout route
    app.post("/api/auth/basic/logout", (req, res) => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });

    // Redirect /api/login to basic login in basic mode
    app.get("/api/login", (req, res) => {
      res.redirect("/?login=basic");
    });

    // Add logout alias for compatibility
    app.get("/api/logout", (req, res) => {
      req.session.destroy(() => {
        res.redirect("/");
      });
    });

    return; // Skip Replit Auth setup in basic mode
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Basic auth mode
  if (AUTH_MODE === "basic") {
    const sessionUser = (req.session as any).user;
    if (!sessionUser || !sessionUser.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= sessionUser.expires_at) {
      return next();
    }

    return res.status(401).json({ message: "Session expired" });
  }

  // Replit auth mode
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Admin middleware - checks if user is admin
export const isAdmin: RequestHandler = async (req, res, next) => {
  // Basic auth mode
  if (AUTH_MODE === "basic") {
    const sessionUser = (req.session as any).user;
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!sessionUser.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    return next();
  }

  // Replit auth mode
  const user = req.user as any;
  
  if (!req.isAuthenticated() || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const userData = await storage.getUser(user.claims.sub);
    if (!userData || !userData.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    return next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};