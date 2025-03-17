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
import { insertCampSchema, insertChildSchema, insertRegistrationSchema, insertOrganizationSchema, insertInvitationSchema, sports, children, childSports } from "@shared/schema";
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
      organizationName: req.body.organizationName
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

      try {
        // Create the camp with schedules
        const camp = await storage.createCamp({
          name: parsed.data.name.trim(),
          description: parsed.data.description.trim(),
          streetAddress: parsed.data.streetAddress.trim(),
          city: parsed.data.city.trim(),
          state: parsed.data.state.trim().toUpperCase(),
          zipCode: parsed.data.zipCode.trim(),
          additionalLocationDetails: parsed.data.additionalLocationDetails?.trim() ?? null,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          registrationStartDate: parsed.data.registrationStartDate,
          registrationEndDate: parsed.data.registrationEndDate,
          price: Number(parsed.data.price),
          capacity: Number(parsed.data.capacity),
          organizationId: req.user.organizationId,
          type: parsed.data.type,
          visibility: parsed.data.visibility,
          waitlistEnabled: parsed.data.waitlistEnabled ?? true,
          minAge: Number(parsed.data.minAge),
          maxAge: Number(parsed.data.maxAge),
          repeatType: parsed.data.repeatType ?? "none",
          repeatCount: Number(parsed.data.repeatCount ?? 0),
          schedules: parsed.data.schedules.map(schedule => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime.padStart(5, '0'),
            endTime: schedule.endTime.padStart(5, '0')
          }))
        });

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
        stack: error.stack
      });
      res.status(500).json({
        message: "An unexpected error occurred",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/camps", async (req, res) => {
    try {
      console.log("Fetching camps list");
      const camps = await storage.listCamps();
      console.log(`Retrieved ${camps.length} camps`);
      res.json(camps);
    } catch (error) {
      console.error("Error fetching camps:", error);
      res.status(500).json({ message: "Failed to fetch camps" });
    }
  });

  // Add route to get camp schedules
  app.get("/api/camps/:id/schedules", async (req, res) => {
    try {
      const schedules = await storage.getCampSchedules(parseInt(req.params.id));
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching camp schedules:", error);
      res.status(500).json({ message: "Failed to fetch camp schedules" });
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

  app.get("/api/camps/:id", async (req, res) => {
    try {
      const camp = await storage.getCamp(parseInt(req.params.id));
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      res.json(camp);
    } catch (error) {
      console.error("Error fetching camp:", error);
      res.status(500).json({ message: "Failed to fetch camp" });
    }
  });

  app.get("/api/camps/:id/registrations", async (req, res) => {
    try {
      const registrations = await storage.getRegistrationsByCamp(parseInt(req.params.id));
      res.json(registrations);
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