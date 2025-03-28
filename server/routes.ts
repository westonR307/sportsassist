import { publicRoles } from "@shared/schema";
function logError(location: string, error: any) {
  console.error(`Error in ${location}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
}

import type { Express } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCampSchema, insertChildSchema, insertRegistrationSchema, insertOrganizationSchema, insertInvitationSchema, insertScheduleExceptionSchema, sports, children, childSports } from "@shared/schema";
import Stripe from "stripe";
import { hashPassword } from "./utils";
import { randomBytes } from "crypto";
import { db } from "./db";
import passport from "passport";
import { sendInvitationEmail } from "./utils/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export async function registerRoutes(app: Express) {
  // Add cache control middleware
  app.use((req, res, next) => {
    // Force no caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Add health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  setupAuth(app);

  app.post("/api/register", async (req, res, next) => {
    console.log("Registration attempt with data:", {
      username: req.body.username,
      role: req.body.role,
      email: req.body.email,
      organizationName: req.body.organizationName,
      password: req.body.password ? "Present" : "Missing"
    });

    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      console.log("Registration failed - username already exists:", req.body.username);
      return res.status(400).send("Username already exists");
    }

    try {
      let user;
      if (req.body.role === "camp_creator" && req.body.organizationName) {
        // Create organization first for camp creators
        const orgData = {
          name: req.body.organizationName,
          description: req.body.organizationDescription || "",
        };
        const parsedOrg = insertOrganizationSchema.safeParse(orgData);
        if (!parsedOrg.success) {
          console.log("Registration failed - invalid organization data:", parsedOrg.error);
          return res.status(400).json({ message: "Invalid organization data" });
        }

        const organization = await storage.createOrganization(parsedOrg.data);
        console.log("Created organization:", organization.id);

        // Create user with organization
        user = await storage.createUser({
          ...req.body,
          password: await hashPassword(req.body.password),
          organizationId: organization.id,
        });
      } else {
        // Create regular user
        user = await storage.createUser({
          ...req.body,
          password: await hashPassword(req.body.password),
        });
      }

      console.log("User created successfully:", {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId
      });

      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return next(err);
        }
        console.log("User logged in after registration:", user.id);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Invitation routes
  app.post("/api/organizations/:orgId/invitations", async (req, res) => {
    if (!req.user || req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Only organization owners can send invitations" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    try {
      const parsedData = {
        ...req.body,
        organizationId: orgId,
        expiresAt: new Date(req.body.expiresAt),
      };

      const parsed = insertInvitationSchema.safeParse(parsedData);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid invitation data",
          errors: parsed.error.flatten()
        });
      }

      // Get organization name for the email
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Generate invitation token
      const token = randomBytes(32).toString("hex");

      // Create invitation in database
      const invitation = await storage.createInvitation({
        ...parsed.data,
        token,
      });

      // Send invitation email
      try {
        await sendInvitationEmail({
          email: parsed.data.email,
          role: parsed.data.role,
          organizationName: organization.name,
          token: token,
        });

        console.log(`Invitation email sent successfully to ${parsed.data.email}`);
        res.status(201).json(invitation);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Still return success since the invitation was created
        res.status(201).json({
          ...invitation,
          warning: "Invitation created but email sending failed. During development, you can only send test emails to wrosenau@outlook.com. To send to other addresses, please verify a domain at resend.com/domains."
        });
      }
    } catch (error) {
      console.error("Invitation creation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get("/api/organizations/:orgId/invitations", async (req, res) => {
    if (!req.user || req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Only organization owners can view invitations" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    const invitations = await storage.listOrganizationInvitations(orgId);
    res.json(invitations);
  });

  app.post("/api/invitations/:token/accept", async (req, res) => {
    const invitation = await storage.getInvitation(req.params.token);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.accepted) {
      return res.status(400).json({ message: "Invitation already accepted" });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: "Invitation expired" });
    }

    try {
      await storage.acceptInvitation(req.params.token);
      res.json({ message: "Invitation accepted" });
    } catch (error) {
      console.error("Invitation acceptance error:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Children routes
  app.get("/api/sports", async (req, res) => {
    try {
      const sportsList = await db.select().from(sports);
      res.json(sportsList);
    } catch (error) {
      logError("/api/sports GET", error);
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  app.post("/api/children", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can add children" });
    }

    const parsed = insertChildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid data",
        errors: parsed.error.flatten()
      });
    }

    try {
      // Start a transaction to insert child and their sports interests
      const child = await db.transaction(async (trx) => {
        // First create the child
        const [newChild] = await trx.insert(children).values({
          fullName: parsed.data.fullName,
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          gender: parsed.data.gender,
          profilePhoto: parsed.data.profilePhoto,
          parentId: req.user!.id,
          emergencyContact: parsed.data.emergencyContact,
          emergencyPhone: parsed.data.emergencyPhone,
          emergencyRelation: parsed.data.emergencyRelation,
          allergies: parsed.data.allergies || [],
          medicalConditions: parsed.data.medicalConditions || [],
          medications: parsed.data.medications || [],
          specialNeeds: parsed.data.specialNeeds,
          preferredContact: parsed.data.preferredContact,
          communicationOptIn: parsed.data.communicationOptIn
        }).returning();

        // If sports interests are provided, create the child_sports records
        if (parsed.data.sportsInterests?.length) {
          await trx.insert(childSports).values(
            parsed.data.sportsInterests.map(sport => ({
              childId: newChild.id,
              sportId: sport.sportId,
              skillLevel: sport.skillLevel,
              preferredPositions: sport.preferredPositions || [],
              currentTeam: sport.currentTeam
            }))
          );
        }

        return newChild;
      });

      res.status(201).json(child);
    } catch (error) {
      logError("/api/children POST", error);
      res.status(500).json({ message: "Failed to create child" });
    }
  });

  // Camp routes
  app.post("/api/camps", async (req, res) => {
    try {
      console.log("========= Camp Creation Debug Start =========");
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));

      // Check authentication
      if (!req.user) {
        console.error("Authentication failed - no user found");
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("Authenticated user:", {
        id: req.user.id,
        role: req.user.role,
        organizationId: req.user.organizationId
      });

      // Check authorization
      if (!["camp_creator", "manager"].includes(req.user.role)) {
        console.error("Authorization failed - invalid role:", req.user.role);
        return res.status(403).json({ message: "Unauthorized role for camp creation" });
      }

      // Check if user has organization
      if (!req.user.organizationId) {
        console.error("Organization check failed - no organization ID for user:", req.user.id);
        return res.status(400).json({ message: "User has no organization" });
      }

      // Prepare data for validation
      const validationData = {
        ...req.body,
        organizationId: parseInt(String(req.user.organizationId), 10),
        price: parseInt(String(req.body.price), 10),
        capacity: parseInt(String(req.body.capacity), 10),
        minAge: parseInt(String(req.body.minAge), 10),
        maxAge: parseInt(String(req.body.maxAge), 10),
        repeatCount: parseInt(String(req.body.repeatCount || '0'), 10),
        waitlistEnabled: req.body.waitlistEnabled !== false,
        visibility: req.body.visibility || "public",
        repeatType: req.body.repeatType || "none",
        startDate: new Date(req.body.startDate).toISOString(),
        endDate: new Date(req.body.endDate).toISOString(),
        registrationStartDate: new Date(req.body.registrationStartDate).toISOString(),
        registrationEndDate: new Date(req.body.registrationEndDate).toISOString(),
        type: req.body.type || "group"
      };

      console.log("Preparing data for schema validation:", JSON.stringify(validationData, null, 2));

      // Ensure schedules are properly formatted
      if (Array.isArray(validationData.schedules)) {
        validationData.schedules = validationData.schedules.map(schedule => ({
          dayOfWeek: parseInt(String(schedule.dayOfWeek), 10),
          startTime: String(schedule.startTime).padStart(5, '0'),
          endTime: String(schedule.endTime).padStart(5, '0')
        }));
      } else {
        console.error("No schedules provided");
        return res.status(400).json({
          message: "At least one schedule is required for the camp"
        });
      }

      const parsed = insertCampSchema.safeParse(validationData);

      if (!parsed.success) {
        const validationErrors = parsed.error.flatten();
        console.error("Schema validation failed:", JSON.stringify(validationErrors, null, 2));
        return res.status(400).json({
          message: "Invalid camp data",
          errors: validationErrors
        });
      }

      console.log("Schema validation passed. Validated data:", parsed.data);

      // Validate sport data
      if (!req.body.sportId || !req.body.skillLevel) {
        return res.status(400).json({
          message: "Sport ID and skill level are required"
        });
      }

      try {
        // Add sport data to the validated data
        const campData = {
          ...parsed.data,
          sportId: parseInt(String(req.body.sportId), 10),
          skillLevel: req.body.skillLevel,
          schedules: parsed.data.schedules.map(schedule => ({
            dayOfWeek: parseInt(String(schedule.dayOfWeek), 10),
            startTime: String(schedule.startTime).padStart(5, '0'),
            endTime: String(schedule.endTime).padStart(5, '0')
          }))
        };

        console.log("Attempting to create camp with data:", JSON.stringify(campData, null, 2));
        const camp = await storage.createCamp(campData);
        console.log("Camp created successfully:", camp);
        console.log("========= Camp Creation Debug End =========");
        res.status(201).json(camp);
      } catch (storageError: any) {
        console.error("Database error creating camp:", storageError);
        console.error("Error details:", {
          message: storageError.message,
          code: storageError.code,
          detail: storageError.detail,
          stack: storageError.stack
        });
        res.status(500).json({
          message: "Database error creating camp",
          error: storageError instanceof Error ? storageError.message : String(storageError)
        });
      }
    } catch (error: any) {
      console.error("Unexpected error in camp creation:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint
      });
      res.status(500).json({
        message: "An unexpected error occurred",
        error: error instanceof Error ? error.message : String(error),
        details: error.detail || error.code || null
      });
    }
  });

  app.get("/api/camps", async (req, res) => {
    try {
      console.log("Fetching camps list");
      
      let camps;
      // Check if we should filter by organization
      if (req.user) {
        const userType = req.user.role;
        
        // For organization staff members (camp creators, managers), show only their organization camps
        if (['camp_creator', 'manager', 'coach', 'volunteer'].includes(userType) && req.user.organizationId) {
          console.log(`Filtering camps for ${userType} with organization ID ${req.user.organizationId}`);
          camps = await storage.listCamps(req.user.organizationId);
        } else {
          // For parents/athletes/public, show all public camps
          console.log("Showing all camps (public view)");
          camps = await storage.listCamps();
        }
      } else {
        // For unauthenticated users, show all public camps
        console.log("Unauthenticated user - showing all public camps");
        camps = await storage.listCamps();
      }
      
      console.log(`Retrieved ${camps.length} camps`);

      // Force fresh response with multiple cache control headers
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'ETag': Date.now().toString() // Force new ETag each time
      });

      res.json(camps);
    } catch (error) {
      console.error("Error fetching camps:", {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to fetch camps",
        error: error.message
      });
    }
  });
  
  // Route to get a camp by ID (detailed version with better error handling and authorization)
  app.get("/api/camps/:id", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID format" });
      }
      
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user is authorized to perform management operations for the camp
      let canManage = false;
      if (req.user) {
        // Only users from the same organization can manage the camp
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      // Add management permissions to the response
      res.json({
        ...camp,
        // Include permissions for the frontend to know what actions to show
        permissions: {
          canManage: canManage
        }
      });
    } catch (error) {
      console.error("Error fetching camp by ID:", {
        id: req.params.id,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to fetch camp",
        error: error.message
      });
    }
  });
  
  // Route to update a camp by ID
  app.patch("/api/camps/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "You must be logged in to update a camp" });
      }
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID format" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to update this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to update this camp" 
        });
      }
      
      // Validate the update data
      // We use a subset of insertCampSchema for updates
      const campUpdateResult = await storage.updateCamp(campId, req.body);
      
      res.json({
        ...campUpdateResult,
        permissions: {
          canManage: true
        }
      });
    } catch (error) {
      console.error("Error updating camp:", {
        id: req.params.id,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to update camp",
        error: error.message
      });
    }
  });

  // Add route to get camp schedules
  app.get("/api/camps/:id/schedules", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      const schedules = await storage.getCampSchedules(campId);
      
      // Add additional data for authorized users (e.g., admin functions)
      const camp = await storage.getCamp(campId);
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user && camp) {
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      res.json({
        schedules,
        permissions: {
          canManage
        }
      });
    } catch (error) {
      console.error("Error fetching camp schedules:", error);
      res.status(500).json({ message: "Failed to fetch camp schedules" });
    }
  });
  
  // Get schedule exceptions for a specific camp
  app.get("/api/camps/:id/schedule-exceptions", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get all schedule exceptions for this camp
      const exceptions = await storage.getCampScheduleExceptions(campId);
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user) {
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      res.json({
        exceptions,
        permissions: {
          canManage
        }
      });
    } catch (error) {
      console.error("Error fetching schedule exceptions:", error);
      res.status(500).json({ message: "Failed to fetch schedule exceptions" });
    }
  });
  
  // Create a new schedule exception
  app.post("/api/camps/:id/schedule-exceptions", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const campId = parseInt(req.params.id);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if the user has permission to manage this camp
      const canManage = req.user.organizationId === camp.organizationId;
      if (!canManage) {
        return res.status(403).json({ message: "You don't have permission to manage this camp" });
      }
      
      // Validate and create the exception
      const parsed = insertScheduleExceptionSchema.safeParse({
        ...req.body,
        campId
      });
      
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      const exception = await storage.createScheduleException(parsed.data);
      
      res.status(201).json(exception);
    } catch (error) {
      console.error("Error creating schedule exception:", error);
      res.status(500).json({ message: "Failed to create schedule exception" });
    }
  });

  // Registration routes
  app.post("/api/registrations", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertRegistrationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    // Verify child belongs to parent
    if (req.user.role === "parent") {
      const child = await storage.getChild(parsed.data.childId);
      if (!child || child.parentId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this child" });
      }
    }

    const registration = await storage.createRegistration({
      ...parsed.data,
      paid: false,
      waitlisted: false
    });
    res.status(201).json(registration);
  });

  // Route removed (duplicate of the one above)

  app.get("/api/camps/:id/registrations", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      
      // First check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Organization staff can see all registrations, but parents can only see their own children's registrations
      if (req.user) {
        // Check if the user belongs to the organization that owns the camp
        const isOrgStaff = (req.user.organizationId === camp.organizationId) && 
                          ['camp_creator', 'manager', 'coach', 'volunteer'].includes(req.user.role);
        
        if (isOrgStaff) {
          // Organization staff can see all registrations
          const registrations = await storage.getRegistrationsByCamp(campId);
          return res.json({
            registrations,
            permissions: { canManage: true }
          });
        } else if (req.user.role === 'parent') {
          // Parents can only see their own children's registrations
          const registrations = await storage.getRegistrationsByCamp(campId);
          const children = await storage.getChildrenByParent(req.user.id);
          const childIds = children.map(child => child.id);
          
          // Filter registrations to only include user's children
          const filteredRegistrations = registrations.filter(reg => 
            childIds.includes(reg.childId)
          );
          
          return res.json({
            registrations: filteredRegistrations,
            permissions: { canManage: false }
          });
        }
      }
      
      // For non-authenticated users or users with other roles,
      // return only basic info or nothing depending on your requirements
      return res.status(403).json({ 
        message: "You don't have permission to view these registrations" 
      });
    } catch (error) {
      console.error("Error fetching camp registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post("/api/camps/:id/messages", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const campId = parseInt(req.params.id);
    const camp = await storage.getCamp(campId);

    if (!camp) {
      return res.status(404).json({ message: "Camp not found" });
    }

    // Check if user has permission to send messages for this camp
    if (camp.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: "Not authorized for this camp" });
    }

    try {
      // Here we'll add actual message sending logic later
      // For now just return success
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/organizations/:orgId/staff", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    try {
      const staff = await storage.getOrganizationStaff(orgId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch organization staff" });
    }
  });
  app.post("/api/login", passport.authenticate("local"), async (req, res, next) => {
    try {
      console.log("Login successful - User:", {
        id: req.user?.id,
        username: req.user?.username,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      });

      res.json(req.user);
    } catch (error) {
      console.error("Login error:", error);
      return next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout attempt - Current user:", req.user?.username);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return next(err);
          }
          console.log("Logout successful - Session destroyed");
          res.clearCookie('connect.sid');
          res.sendStatus(200);
        });
      } else {
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      }
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Current user request received");
    console.log("Session ID:", req.sessionID);
    console.log("Is Authenticated:", req.isAuthenticated());

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

  return createServer(app);
}