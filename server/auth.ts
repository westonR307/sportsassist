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
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      }, 
      async (email, password, done) => {
        try {
          console.log(`Login attempt for email: ${email}`);
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log(`No user found with email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Enhanced password validation with better error handling
          try {
            if (!user.passwordHash) {
              console.log(`User ${email} has no password hash`);
              return done(null, false, { message: "Invalid email or password" });
            }
            
            // Check if the passwordHash has the expected format (hash.salt)
            if (!user.passwordHash.includes('.')) {
              console.log(`User ${email} has incorrectly formatted password hash`);
              return done(null, false, { message: "Invalid account configuration" });
            }
            
            const isValid = await comparePasswords(password, user.passwordHash);
            console.log(`Password validation result for ${email}: ${isValid}`);

            if (!isValid) {
              return done(null, false, { message: "Invalid email or password" });
            }
            
            console.log(`Successful login for user: ${email}`);
            return done(null, user);
          } catch (passwordError) {
            console.error(`Password validation error for ${email}:`, passwordError);
            return done(null, false, { message: "Authentication error" });
          }
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    ),
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
      
      console.log(`Successfully deserialized full user:`, user);
      console.log(`Successfully deserialized user:`, {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      });
      
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request received for:", req.body.email);
    
    // Validate that email is provided
    if (!req.body.email || typeof req.body.email !== 'string') {
      console.log("Login failed: Email is required and must be a string");
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Validate that password is provided
    if (!req.body.password || typeof req.body.password !== 'string') {
      console.log("Login failed: Password is required and must be a string");
      return res.status(400).json({ message: "Password is required" });
    }
    
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
        console.log(`User ${user.email} logged in successfully`);
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

    console.log("Full user object:", req.user);
    console.log("Returning user data:", {
      id: req.user?.id,
      username: req.user?.username,
      first_name: req.user?.first_name,
      last_name: req.user?.last_name,
      role: req.user?.role,
      organizationId: req.user?.organizationId
    });
    res.json(req.user);
  });
  
  app.post("/api/register", async (req, res, next) => {
    console.log("Registration request received for email:", req.body.email);
    
    try {
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log(`Email already exists: ${req.body.email}`);
        return res.status(400).json({ message: "Email already exists" });
      }

      // Get user data from request
      const { email, password, role, organizationName, organizationDescription, ...otherFields } = req.body;
      
      // Check if the role is valid
      if (role && !["camp_creator", "parent", "athlete"].includes(role)) {
        console.log(`Invalid role requested: ${role}`);
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Create the user
      const hashedPassword = await hashPassword(password);
      
      // Generate a timestamp-based username
      const timestamp = Date.now();
      const username = `user${timestamp}`;
      console.log(`Generated username: ${username}`);
      
      // Handle organization creation for camp creators
      let organizationId: number | undefined = undefined;
      if (role === "camp_creator" && organizationName) {
        try {
          console.log(`Creating organization: ${organizationName}`);
          const organization = await storage.createOrganization({
            name: organizationName,
            description: organizationDescription || '',
          });
          console.log("Organization created successfully:", organization);
          organizationId = organization.id;
        } catch (orgError: any) {
          console.error("Error creating organization:", orgError);
          return res.status(500).json({ 
            message: `Failed to create organization: ${orgError.message}` 
          });
        }
      }
      
      // Create user data
      const userData = {
        username,
        email,
        password: hashedPassword,
        passwordHash: hashedPassword, // For backward compatibility
        role: role || "parent",
        ...otherFields,
        ...(organizationId ? { organizationId } : {})
      };
      
      console.log("Creating user with data:", {
        ...userData,
        password: "[REDACTED]",
        passwordHash: "[REDACTED]"
      });

      // Create the user
      const user = await storage.createUser(userData);
      console.log("User created successfully:", {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        console.log(`User ${user.email} registered and logged in successfully`);
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint
      });
      
      // Special case for unique constraint violations (email or username)
      if (error.code === '23505') {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      
      res.status(500).json({ message: "Registration failed. Please try again later." });
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
      
      // Update the session user data if passport exists
      if (req.session && req.session.passport) {
        req.session.passport.user = updatedUser.id;
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile: " + error.message });
    }
  });
}