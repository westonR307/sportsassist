import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { comparePasswords, hashPassword } from "./utils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  // Enhanced session settings for development
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "local-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'sports-camp-sid',
    cookie: {
      secure: isProduction, // Only require HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
    },
    rolling: true // Extend session lifetime on activity
  };

  // Trust proxy in production
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Enhanced logging for authentication and session
  app.use((req, res, next) => {
    console.log('Auth Debug:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null,
      session: req.session
    });
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for user: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`No user found with username: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log(`Password validation result for ${username}: ${isValid}`);

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log(`Successful login for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user:`, {
      id: user.id,
      username: user.username,
      role: user.role
    });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`No user found for ID: ${id}`);
        return done(null, false);
      }
      console.log(`Successfully deserialized user:`, {
        id: user.id,
        username: user.username,
        role: user.role
      });
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request received for:", req.body.username);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        console.log(`User ${user.username} logged in successfully`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    console.log(`Logout request received for user: ${username}`);

    if (!req.isAuthenticated()) {
      console.log("Logout requested but no user was authenticated");
      return res.sendStatus(200);
    }

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return next(err);
        }
        res.clearCookie('sports-camp-sid');
        console.log(`User ${username} logged out successfully`);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Current user request received");
    console.log("Session ID:", req.sessionID);
    console.log("Is Authenticated:", req.isAuthenticated());
    console.log("Session:", req.session);

    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.sendStatus(401);
    }

    console.log("Returning user data:", {
      id: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      organizationId: req.user?.organizationId
    });
    res.json(req.user);
  });
  
  app.post("/api/register", async (req, res, next) => {
    console.log("Registration request received:", req.body.username);
    
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Username already exists: ${req.body.username}`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Get user data from request
      const { username, password, role, ...otherFields } = req.body;
      
      // Check if the role is valid
      if (role && !["camp_creator", "parent", "athlete"].includes(role)) {
        console.log(`Invalid role requested: ${role}`);
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Create the user
      const hashedPassword = await hashPassword(password);
      const userData = {
        username,
        password: hashedPassword,
        role: role || "parent",
        ...otherFields,
      };
      
      console.log(`Creating user with role: ${userData.role}`);
      const user = await storage.createUser(userData);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in new user:", err);
          return next(err);
        }
        
        console.log(`User ${user.username} registered and logged in successfully`);
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: `Registration failed: ${error.message}` });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user?.id;
      const profileData = req.body;
      
      // Basic validation
      if (!userId) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Don't allow changing sensitive fields through this endpoint
      delete profileData.password;
      delete profileData.passwordHash;
      delete profileData.role;
      delete profileData.organizationId;
      
      console.log(`Updating profile for user ${userId}:`, profileData);
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      // Update the session user data
      req.session.passport.user = updatedUser.id;
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile: " + error.message });
    }
  });
}