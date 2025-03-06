import { publicRoles } from "@shared/schema";
function logError(location: string, error: any) {
  console.error(`Error in ${location}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCampSchema, insertChildSchema, insertRegistrationSchema, insertOrganizationSchema, insertInvitationSchema, sports, children, childSports } from "@shared/schema";
import Stripe from "stripe";
import { hashPassword } from "./utils";
import { randomBytes } from "crypto";
import { db } from "./db";
import passport from "passport";
import { sendInvitationEmail } from "./utils/email"; // Added import

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Server {
  // Add health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  setupAuth(app);

  // Update the registration route to handle organization creation
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
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
          return res.status(400).json({ message: "Invalid organization data" });
        }

        const organization = await storage.createOrganization(parsedOrg.data);

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

      req.login(user, (err) => {
        if (err) return next(err);
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
              currentTeam: sport.currentTeam,
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

  app.get("/api/children", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can view children" });
    }

    try {
      const childrenList = await storage.getChildrenByParent(req.user.id);
      res.json(childrenList);
    } catch (error) {
      logError("/api/children GET", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  // Add this route to get organization staff
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

  // Camp routes
  app.post("/api/camps", async (req, res) => {
    try {
      console.log("Received camp creation request:", req.body);

      // Check authentication
      if (!req.user) {
        console.error("No authenticated user found");
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      if (!["admin", "manager", "camp_creator"].includes(req.user.role)) {
        console.error("Unauthorized role:", req.user.role);
        return res.status(403).json({ message: "Unauthorized role for camp creation" });
      }

      // Check if user has organization
      if (!req.user.organizationId) {
        console.error("User has no organization ID:", req.user);
        return res.status(400).json({ message: "User has no organization" });
      }

      // Validate input data
      console.log("Validating camp data with schema...");
      const parsed = insertCampSchema.safeParse(req.body);

      if (!parsed.success) {
        const validationErrors = parsed.error.flatten();
        console.error("Validation error details:", validationErrors);
        return res.status(400).json({
          message: "Invalid camp data",
          errors: validationErrors
        });
      }

      console.log("Validated camp data:", parsed.data);

      // Ensure all required fields are present
      const campData = {
        name: parsed.data.name,
        description: parsed.data.description,
        streetAddress: parsed.data.streetAddress,
        city: parsed.data.city,
        state: parsed.data.state,
        zipCode: parsed.data.zipCode,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        registrationStartDate: new Date(parsed.data.registrationStartDate),
        registrationEndDate: new Date(parsed.data.registrationEndDate),
        price: parsed.data.price ?? 0,
        capacity: parsed.data.capacity,
        minAge: parsed.data.minAge ?? 5,
        maxAge: parsed.data.maxAge ?? 18,
        organizationId: req.user.organizationId,
        waitlistEnabled: parsed.data.waitlistEnabled ?? true,
        type: parsed.data.type ?? "group",
        visibility: parsed.data.visibility ?? "public",
        repeatType: parsed.data.repeatType ?? "none",
        repeatCount: parsed.data.repeatCount ?? 0,
        sport: parsed.data.sport,
        skillLevel: parsed.data.skillLevel,
        additionalLocationDetails: parsed.data.additionalLocationDetails ?? null
      };

      console.log("Processed camp data for database:", campData);

      try {
        const camp = await storage.createCamp(campData);
        console.log("Camp created successfully:", camp);
        res.status(201).json(camp);
      } catch (storageError) {
        console.error("Database error creating camp:", storageError);
        res.status(500).json({ 
          message: "Database error creating camp", 
          error: storageError.message 
        });
      }
    } catch (error) {
      console.error("Unexpected error creating camp:", error);
      res.status(500).json({ 
        message: "An unexpected error occurred", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/camps", async (req, res) => {
    const camps = await storage.listCamps();
    res.json(camps);
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

    const registration = await storage.createRegistration(parsed.data);
    res.status(201).json(registration);
  });

  // Update the login route to handle role migration
  app.post("/api/login", passport.authenticate("local"), async (req, res, next) => {
    try {
      console.log("Login attempt successful - User data:", {
        id: req.user?.id,
        username: req.user?.username,
        role: req.user?.role,
        organizationId: req.user?.organizationId
      });

      // Even if user has admin role, we'll let them through now since we've migrated the role
      res.json(req.user);
    } catch (error) {
      console.error("Login error:", error);
      return next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout attempt - Current user:", req.user?.username);
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return next(err);
      }
      console.log("Logout successful - Session destroyed");
      res.clearCookie('connect.sid');
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Get user request - Auth status:", req.isAuthenticated());
    if (!req.isAuthenticated()) return res.sendStatus(401);
    console.log("Current user data:", {
      id: req.user?.id,
      username: req.user?.username,
      role: req.user?.role
    });
    res.json(req.user);
  });

  // Add these routes inside the registerRoutes function, before the httpServer creation
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


  const httpServer = createServer(app);
  return httpServer;
}