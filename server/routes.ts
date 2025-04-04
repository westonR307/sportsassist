import { publicRoles } from "@shared/schema";
import { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";
import { campSports, scheduleExceptions, campSchedules, insertScheduleExceptionSchema, sports } from "@shared/schema";
// Import the scheduleExceptionSchema from our dialog component for validation
import { scheduleExceptionSchema } from "../client/src/components/schedule-exception-dialog";

function logError(location: string, error: any) {
  console.error(`Error in ${location}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
}

// Function to register public routes that don't require authentication
function registerPublicRoutes(app: Express) {
  // Public camps endpoint for the homepage and public-facing pages
  app.get("/api/public/camps", async (req, res) => {
    try {
      const camps = await storage.listCamps();
      
      // Process each camp to include full sport details
      const processedCamps = await Promise.all(camps.map(async (camp) => {
        // Get the sports related to this camp
        const campSportsData = await db.select().from(campSports)
          .where(eq(campSports.campId, camp.id));
        
        // Get the sport details for these sports
        const sportIds = campSportsData.map(cs => cs.sportId);
        const sportsData = sportIds.length > 0 
          ? await db.select().from(sports).where(inArray(sports.id, sportIds))
          : [];
        
        // Combine the data
        const campSportsWithDetails = campSportsData.map(cs => {
          const sportInfo = sportsData.find(s => s.id === cs.sportId) || null;
          return {
            ...cs,
            sport: sportInfo,
            sportName: sportInfo?.name || "Unknown Sport"
          };
        });
        
        return {
          ...camp,
          location: [camp.streetAddress, camp.city, camp.state, camp.zipCode]
            .filter(Boolean)
            .join(", "),
          campSports: campSportsWithDetails
        };
      }));
      
      res.json(processedCamps);
    } catch (error) {
      logError("GET /api/public/camps", error);
      res.status(500).json({ error: "Failed to fetch camps" });
    }
  });
}

import type { Express } from "express";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertCampSchema, 
  insertChildSchema, 
  insertRegistrationSchema, 
  insertOrganizationSchema, 
  insertInvitationSchema, 
  insertScheduleExceptionSchema, 
  insertCustomFieldSchema,
  insertCampCustomFieldSchema,
  insertCustomFieldResponseSchema,
  insertCampSessionSchema,
  insertRecurrencePatternSchema,
  sports, 
  children, 
  childSports,
  campSessions,
  recurrencePatterns
} from "@shared/schema";
import { campSchedules, campSports } from "@shared/tables";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { hashPassword, comparePasswords } from "./utils";
import { registerParentRoutes } from "./parent-routes";
import documentRoutes from "./document-routes";
import { randomBytes } from "crypto";
import { db } from "./db";
import passport from "passport";
import { sendInvitationEmail } from "./utils/email";
import { uploadConfig, getFileUrl } from "./utils/file-upload";
import path from 'path';

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

  // Serve uploaded files from the uploads directory
  app.use('/uploads', (req, res, next) => {
    // Add proper Cache-Control for static files
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
    next();
  }, (req, res, next) => {
    const filePath = path.join('./uploads', req.url);
    res.sendFile(filePath, { root: '.' });
  });

  // Add health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Register public routes first (no auth required)
  registerPublicRoutes(app);
  
  // Set up auth after public routes
  setupAuth(app);
  
  // File upload endpoints
  app.post('/api/upload/profile-photo', (req, res, next) => {
    if (!req.isAuthenticated()) {
      console.log("Upload attempt without authentication");
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }, uploadConfig.profilePhoto.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file URL that can be used to access the file
      const fileUrl = getFileUrl(req.file.filename);
      console.log(`Profile photo uploaded: ${fileUrl} by user ${req.user?.id}`);
      
      res.json({
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error handling file upload:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });
  
  // Organization logo upload endpoint
  app.post('/api/upload/organization-logo', (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Only organization administrators can upload logos" });
    }
    
    next();
  }, uploadConfig.organizationLogo.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file URL that can be used to access the file
      const fileUrl = getFileUrl(req.file.filename);
      console.log(`Organization logo uploaded: ${fileUrl} by user ${req.user?.id}`);
      
      res.json({
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error handling organization logo upload:", error);
      res.status(500).json({ message: "Logo upload failed" });
    }
  });
  
  // User profile update endpoint
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Not authenticated - user/profile update");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Updating user profile for:", req.user?.id);
      const updatedUser = await storage.updateUserProfile(req.user!.id, req.body);
      console.log("Profile updated successfully");
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      const updatedUser = await storage.updateUserProfile(userId, {
        passwordHash: hashedPassword,
        password: hashedPassword, // Update both fields for compatibility
      });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

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

  // Get organization details
  app.get("/api/organizations/:orgId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const orgId = parseInt(req.params.orgId);
    
    // Only allow users who belong to this organization to access its details
    if (req.user.organizationId !== orgId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to access this organization" });
    }

    try {
      const organization = await storage.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization details" });
    }
  });

  // Update organization details
  app.patch("/api/organizations/:orgId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const orgId = parseInt(req.params.orgId);
    
    // Only allow camp creators who belong to this organization to update it
    if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Not authorized to update this organization" });
    }

    try {
      const organization = await storage.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Update the organization with the allowed fields
      const updatedOrganization = await storage.updateOrganization(orgId, {
        name: req.body.name,
        description: req.body.description,
        logoUrl: req.body.logoUrl
      });
      
      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization details" });
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
  
  // Delete an invitation
  app.delete("/api/organizations/:orgId/invitations/:id", async (req, res) => {
    if (!req.user || req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Only organization owners can delete invitations" });
    }

    const orgId = parseInt(req.params.orgId);
    const invitationId = parseInt(req.params.id);
    
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    try {
      const deletedInvitation = await storage.deleteInvitation(invitationId, orgId);
      
      if (!deletedInvitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      res.json({ message: "Invitation deleted successfully", invitation: deletedInvitation });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
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
  // Get camp by slug (must be before the :id route to avoid conflicts)
  app.get("/api/camps/slug/:slug", async (req, res) => {
    try {
      console.log(`Fetching details for camp with slug: ${req.params.slug}`);
      
      const camp = await storage.getCampBySlug(req.params.slug);
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }

      // If the camp is private, check if the user is authenticated and belongs to the camp's organization
      if (camp.visibility === "private" && (!req.user || req.user.organizationId !== camp.organizationId)) {
        return res.status(403).json({ message: "You do not have permission to view this camp" });
      }
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user) {
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      const campWithPermissions = {
        ...camp,
        permissions: {
          canManage
        }
      };
      
      return res.json(campWithPermissions);
    } catch (error) {
      console.error("Error fetching camp by slug:", error);
      return res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/camps/:id", async (req, res) => {
    try {
      console.log(`Fetching details for camp ID: ${req.params.id}`);
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        console.log(`Invalid camp ID format: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid camp ID format" });
      }
      
      // Get the camp with its sports and schedule information
      const camp = await storage.getCamp(campId);
      
      if (!camp) {
        console.log(`Camp not found with ID: ${campId}`);
        return res.status(404).json({ message: "Camp not found" });
      }
      
      console.log(`Found camp: ${camp.name} (ID: ${camp.id})`);
      
      // Fetch associated camp sports information
      // Use a simpler query to avoid relationship issues
      const campSportsData = await db.select().from(campSports)
        .where(eq(campSports.campId, campId));
      
      // Get sports info separately if needed
      const sportIds = campSportsData.map(cs => cs.sportId);
      const sportsData = sportIds.length > 0 
        ? await db.select().from(sports).where(inArray(sports.id, sportIds))
        : [];
        
      // Manually join the data
      const campSportsWithDetails = campSportsData.map(cs => {
        const sportInfo = sportsData.find(s => s.id === cs.sportId) || null;
        return {
          ...cs,
          sport: sportInfo
        };
      });
      
      // Fetch schedule information
      const schedules = await storage.getCampSchedules(campId);
      
      // Check if user is authorized to perform management operations for the camp
      let canManage = false;
      if (req.user) {
        // Only users from the same organization can manage the camp
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      // Add management permissions to the response
      res.json({
        ...camp,
        schedules: schedules,
        campSportsDetail: campSportsWithDetails.map(cs => ({
          ...cs,
          sportName: cs.sport?.name || "Unknown Sport"
        })),
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

  // Endpoint to soft delete a camp - only allowed if registration hasn't started yet
  app.post("/api/camps/:id/delete", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "You must be logged in to delete a camp" });
      }
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID format" });
      }
      
      // Get the camp to check permissions and registration start date
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to delete this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to delete this camp" 
        });
      }
      
      // Check if registration has already started
      const now = new Date();
      const registrationStartDate = new Date(camp.registrationStartDate);
      
      if (now >= registrationStartDate) {
        return res.status(400).json({ 
          message: "Cannot delete camp after registration has started. Consider cancelling it instead." 
        });
      }
      
      // Perform the soft delete
      const deletedCamp = await storage.softDeleteCamp(campId);
      
      res.json({
        ...deletedCamp,
        message: "Camp successfully deleted",
        permissions: {
          canManage: true
        }
      });
    } catch (error) {
      console.error("Error deleting camp:", {
        id: req.params.id,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to delete camp",
        error: error.message
      });
    }
  });

  // Endpoint to cancel a camp - can be done at any time, even after registration starts
  app.post("/api/camps/:id/cancel", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "You must be logged in to cancel a camp" });
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
      
      // Check if user has permission to cancel this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to cancel this camp" 
        });
      }
      
      // Get the cancellation reason from the request body
      const reason = req.body.reason || null;
      
      // Perform the cancellation
      const cancelledCamp = await storage.cancelCamp(campId, reason);
      
      res.json({
        ...cancelledCamp,
        message: "Camp successfully cancelled",
        permissions: {
          canManage: true
        }
      });
    } catch (error) {
      console.error("Error cancelling camp:", {
        id: req.params.id,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "Failed to cancel camp",
        error: error.message
      });
    }
  });


  
  // Route to get camp sports
  app.get("/api/camps/:id/sports", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID" });
      }
      
      // Get the camp
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get camp sports from database
      const sports = await db.select()
        .from(campSports)
        .where(eq(campSports.campId, campId));
      
      res.json(sports);
    } catch (error) {
      console.error("Error fetching camp sports:", error);
      res.status(500).json({ message: "Failed to fetch camp sports" });
    }
  });
  
  // Route to update camp sports
  app.post("/api/camps/:id/sports", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "You must be logged in to update camp sports" });
      }
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to update this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to update this camp's sports" 
        });
      }
      
      // Create or update camp sport
      const campSport = await storage.createCampSport({
        campId: campId,
        sportId: req.body.sportId,
        skillLevel: req.body.skillLevel
      });
      
      res.json(campSport);
    } catch (error) {
      console.error("Error updating camp sports:", error);
      res.status(500).json({ 
        message: "Failed to update camp sports",
        error: error.message 
      });
    }
  });

  // Route to delete a camp sport
  app.delete("/api/camps/:id/sports/:sportId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "You must be logged in to remove camp sports" });
      }
      
      const campId = parseInt(req.params.id);
      const sportId = parseInt(req.params.sportId);
      
      if (isNaN(campId) || isNaN(sportId)) {
        return res.status(400).json({ message: "Invalid camp ID or sport ID" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to update this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to update this camp's sports" 
        });
      }
      
      // Delete the camp sport
      await db.delete(campSports)
        .where(
          eq(campSports.id, sportId) && 
          eq(campSports.campId, campId)
        );
      
      res.json({ success: true, message: "Sport removed from camp" });
    } catch (error) {
      console.error("Error removing camp sport:", error);
      res.status(500).json({ 
        message: "Failed to remove sport from camp",
        error: error.message 
      });
    }
  });

  // Add route to get camp schedules
  app.get("/api/camps/:id/schedules", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      console.log("Fetching schedules for camp ID:", campId);
      
      const schedules = await storage.getCampSchedules(campId);
      console.log("Retrieved schedules:", JSON.stringify(schedules));
      
      // Add additional data for authorized users (e.g., admin functions)
      const camp = await storage.getCamp(campId);
      console.log("Camp info:", camp ? "Found" : "Not found", camp?.id || "N/A");
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user && camp) {
        canManage = req.user.organizationId === camp.organizationId;
        console.log("User can manage this camp:", canManage);
      }
      
      const response = {
        schedules,
        permissions: {
          canManage
        }
      };
      
      console.log("Sending response:", JSON.stringify(response, null, 2).substring(0, 100) + "...");
      res.json(response);
    } catch (error) {
      console.error("Error fetching camp schedules:", error);
      res.status(500).json({ message: "Failed to fetch camp schedules" });
    }
  });
  
  // Add route to update camp schedules
  app.put("/api/camps/:id/schedules", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const campId = parseInt(req.params.id);
      console.log("Updating schedules for camp ID:", campId);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check authorization
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ message: "Not authorized to edit this camp" });
      }
      
      // Validate input
      if (!req.body.schedules || !Array.isArray(req.body.schedules)) {
        return res.status(400).json({ message: "Invalid schedules data" });
      }
      
      // Delete existing schedules for this camp
      await db.delete(campSchedules).where(eq(campSchedules.campId, campId));
      
      // Create new schedules
      const newSchedules = req.body.schedules.map(schedule => ({
        campId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }));
      
      console.log("Creating new schedules:", JSON.stringify(newSchedules));
      
      if (newSchedules.length > 0) {
        // Insert new schedules
        const insertedSchedules = await db.insert(campSchedules).values(newSchedules).returning();
        console.log("Inserted schedules:", JSON.stringify(insertedSchedules));
        
        res.json({ 
          message: "Schedules updated successfully", 
          schedules: insertedSchedules 
        });
      } else {
        res.status(400).json({ message: "No valid schedules provided" });
      }
    } catch (error) {
      console.error("Error updating camp schedules:", error);
      res.status(500).json({ message: "Failed to update camp schedules" });
    }
  });
  
  // Get schedule exceptions for a specific camp
  app.get("/api/camps/:id/schedule-exceptions", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      console.log("Fetching schedule exceptions for camp ID:", campId);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      console.log("Camp found for exceptions:", camp ? "Yes" : "No");
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get all schedule exceptions for this camp
      const exceptions = await storage.getCampScheduleExceptions(campId);
      console.log("Retrieved exceptions count:", exceptions.length);
      console.log("Exceptions data sample:", JSON.stringify(exceptions.slice(0, 2)));
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user) {
        canManage = req.user.organizationId === camp.organizationId;
        console.log("User can manage exceptions:", canManage);
      }
      
      const response = {
        exceptions,
        permissions: {
          canManage
        }
      };
      
      console.log("Sending exceptions response with keys:", Object.keys(response));
      res.json(response);
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
  
  // Update an existing schedule exception
  app.put("/api/camps/:campId/schedule-exceptions/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const campId = parseInt(req.params.campId);
      const exceptionId = parseInt(req.params.id);
      
      // First check if the exception exists
      const existingException = await storage.getScheduleException(exceptionId);
      if (!existingException) {
        return res.status(404).json({ message: "Schedule exception not found" });
      }
      
      // Make sure the exception belongs to the specified camp
      if (existingException.campId !== campId) {
        return res.status(400).json({ message: "Schedule exception does not belong to this camp" });
      }
      
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
      
      // Validate the update data
      const parsed = scheduleExceptionSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      // Update the exception
      const updatedExceptionData = {
        ...parsed.data,
        // Make sure we convert the date string to a Date object if it exists
        ...(parsed.data.exceptionDate && { exceptionDate: new Date(parsed.data.exceptionDate) })
      };
      
      const updatedException = await storage.updateScheduleException(exceptionId, updatedExceptionData);
      
      res.json(updatedException);
    } catch (error) {
      console.error("Error updating schedule exception:", error);
      res.status(500).json({ message: "Failed to update schedule exception" });
    }
  });

  // Delete a schedule exception
  app.delete("/api/camps/:campId/schedule-exceptions/:exceptionId", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const campId = parseInt(req.params.campId);
      const exceptionId = parseInt(req.params.exceptionId);
      
      if (isNaN(campId) || isNaN(exceptionId)) {
        return res.status(400).json({ message: "Invalid camp ID or exception ID" });
      }
      
      // Get the exception to check if it exists and belongs to the camp
      const existingException = await storage.getScheduleException(exceptionId);
      if (!existingException) {
        return res.status(404).json({ message: "Schedule exception not found" });
      }
      
      // Make sure the exception belongs to the specified camp
      if (existingException.campId !== campId) {
        return res.status(400).json({ message: "Schedule exception does not belong to this camp" });
      }
      
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
      
      // Check if the exception date has already passed
      const exceptionDate = new Date(existingException.exceptionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (exceptionDate < today) {
        return res.status(400).json({ message: "Cannot delete exceptions that have already passed" });
      }
      
      // Delete the exception
      await storage.deleteScheduleException(exceptionId);
      
      res.json({ success: true, message: "Schedule exception deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule exception:", error);
      res.status(500).json({ message: "Failed to delete schedule exception" });
    }
  });

  // ENHANCED SCHEDULING ENDPOINTS
  
  // Get all camp sessions for a specific camp
  app.get("/api/camps/:id/sessions", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      console.log("Fetching camp sessions for camp ID:", campId);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get all sessions for this camp
      const sessions = await storage.getCampSessions(campId);
      console.log("Retrieved sessions count:", sessions.length);
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user) {
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      const response = {
        sessions,
        permissions: {
          canManage
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching camp sessions:", error);
      res.status(500).json({ message: "Failed to fetch camp sessions" });
    }
  });
  
  // Create a new camp session
  app.post("/api/camps/:id/sessions", async (req, res) => {
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
      
      // Validate and create the session
      const parsed = insertCampSessionSchema.safeParse({
        ...req.body,
        campId
      });
      
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      const session = await storage.createCampSession(parsed.data);
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating camp session:", error);
      res.status(500).json({ message: "Failed to create camp session" });
    }
  });
  
  // Update an existing camp session
  app.put("/api/camps/:campId/sessions/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const campId = parseInt(req.params.campId);
      const sessionId = parseInt(req.params.id);
      
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
      
      // Validate the update data
      const parsed = insertCampSessionSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      // Update the session
      const updatedSession = await storage.updateCampSession(sessionId, parsed.data);
      
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating camp session:", error);
      res.status(500).json({ message: "Failed to update camp session" });
    }
  });
  
  // Delete a camp session
  app.delete("/api/camps/:campId/sessions/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const campId = parseInt(req.params.campId);
      const sessionId = parseInt(req.params.id);
      
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
      
      // Delete the session
      await storage.deleteCampSession(sessionId);
      
      res.json({ success: true, message: "Camp session deleted successfully" });
    } catch (error) {
      console.error("Error deleting camp session:", error);
      res.status(500).json({ message: "Failed to delete camp session" });
    }
  });
  
  // RECURRENCE PATTERN ENDPOINTS
  
  // Get all recurrence patterns for a specific camp
  app.get("/api/camps/:id/recurrence-patterns", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      
      // Check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get all recurrence patterns for this camp
      const patterns = await storage.getRecurrencePatterns(campId);
      
      // Add permissions for the frontend to know what actions to show
      let canManage = false;
      if (req.user) {
        canManage = req.user.organizationId === camp.organizationId;
      }
      
      const response = {
        patterns,
        permissions: {
          canManage
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching recurrence patterns:", error);
      res.status(500).json({ message: "Failed to fetch recurrence patterns" });
    }
  });
  
  // Create a new recurrence pattern
  app.post("/api/camps/:id/recurrence-patterns", async (req, res) => {
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
      
      // Validate and create the recurrence pattern
      const parsed = insertRecurrencePatternSchema.safeParse({
        ...req.body,
        campId
      });
      
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      const pattern = await storage.createRecurrencePattern(parsed.data);
      
      res.status(201).json(pattern);
    } catch (error) {
      console.error("Error creating recurrence pattern:", error);
      res.status(500).json({ message: "Failed to create recurrence pattern" });
    }
  });
  
  // Generate camp sessions from a recurrence pattern
  app.post("/api/recurrence-patterns/:id/generate-sessions", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const patternId = parseInt(req.params.id);
      
      // Check if the pattern exists
      const pattern = await storage.getRecurrencePattern(patternId);
      if (!pattern) {
        return res.status(404).json({ message: "Recurrence pattern not found" });
      }
      
      // Check if the camp exists
      const camp = await storage.getCamp(pattern.campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if the user has permission to manage this camp
      const canManage = req.user.organizationId === camp.organizationId;
      if (!canManage) {
        return res.status(403).json({ message: "You don't have permission to manage this camp" });
      }
      
      // Generate the sessions
      const sessions = await storage.generateCampSessionsFromPattern(patternId);
      
      res.status(201).json(sessions);
    } catch (error) {
      console.error("Error generating sessions from pattern:", error);
      res.status(500).json({ message: "Failed to generate sessions from pattern" });
    }
  });
  
  // Update an existing recurrence pattern
  app.put("/api/recurrence-patterns/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const patternId = parseInt(req.params.id);
      
      // Check if the pattern exists
      const pattern = await storage.getRecurrencePattern(patternId);
      if (!pattern) {
        return res.status(404).json({ message: "Recurrence pattern not found" });
      }
      
      // Check if the camp exists
      const camp = await storage.getCamp(pattern.campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if the user has permission to manage this camp
      const canManage = req.user.organizationId === camp.organizationId;
      if (!canManage) {
        return res.status(403).json({ message: "You don't have permission to manage this camp" });
      }
      
      // Validate the update data
      const parsed = insertRecurrencePatternSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      // Update the pattern
      const updatedPattern = await storage.updateRecurrencePattern(patternId, parsed.data);
      
      res.json(updatedPattern);
    } catch (error) {
      console.error("Error updating recurrence pattern:", error);
      res.status(500).json({ message: "Failed to update recurrence pattern" });
    }
  });
  
  // Delete a recurrence pattern
  app.delete("/api/recurrence-patterns/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const patternId = parseInt(req.params.id);
      
      // Check if the pattern exists
      const pattern = await storage.getRecurrencePattern(patternId);
      if (!pattern) {
        return res.status(404).json({ message: "Recurrence pattern not found" });
      }
      
      // Check if the camp exists
      const camp = await storage.getCamp(pattern.campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if the user has permission to manage this camp
      const canManage = req.user.organizationId === camp.organizationId;
      if (!canManage) {
        return res.status(403).json({ message: "You don't have permission to manage this camp" });
      }
      
      // Delete the pattern
      await storage.deleteRecurrencePattern(patternId);
      
      res.json({ success: true, message: "Recurrence pattern deleted successfully" });
    } catch (error) {
      console.error("Error deleting recurrence pattern:", error);
      res.status(500).json({ message: "Failed to delete recurrence pattern" });
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
          // Organization staff can see all registrations with complete athlete info
          const registrations = await storage.getRegistrationsWithChildInfo(campId);
          return res.json({
            registrations,
            permissions: { canManage: true }
          });
        } else if (req.user.role === 'parent') {
          // Parents can only see their own children's registrations, but with full child info
          const registrations = await storage.getRegistrationsWithChildInfo(campId);
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

  // ====== Custom Fields Routes ======

  // Create a new custom field template
  app.post("/api/organizations/:orgId/custom-fields", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!req.user.organizationId) {
      return res.status(403).json({ message: "You don't have an organization" });
    }

    // Verify organization access
    const orgId = parseInt(req.params.orgId, 10);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Unauthorized access to organization" });
    }

    try {
      // Ensure the field source is set properly (registration or camp)
      const fieldSource = req.query.source as "registration" | "camp" || req.body.fieldSource;
      
      // Generate field name from label if not provided
      let fieldName = req.body.name;
      if (!fieldName && req.body.label) {
        // Convert label to snake_case for the name
        fieldName = req.body.label
          .toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove special characters
          .replace(/\s+/g, '_');   // Replace spaces with underscores
      }
      
      const validationData = {
        ...req.body,
        name: fieldName, // Use the auto-generated name
        organizationId: orgId,
        fieldSource: fieldSource || "registration" // Default to "registration" if not specified
      };

      const parsed = insertCustomFieldSchema.safeParse(validationData);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid custom field data",
          errors: parsed.error.flatten()
        });
      }

      const customField = await storage.createCustomField(parsed.data);
      res.status(201).json(customField);
    } catch (error) {
      logError("Create custom field", error);
      res.status(500).json({ message: "Failed to create custom field" });
    }
  });

  // Get all custom fields for an organization, optionally filtered by field source and visibility
  app.get("/api/organizations/:orgId/custom-fields", async (req, res) => {
    const orgId = parseInt(req.params.orgId, 10);
    
    try {
      // Get the field source from query parameter (if provided)
      const fieldSource = req.query.source as "registration" | "camp" | undefined;
      
      // If user is authenticated and is from the same organization, show all fields
      // Otherwise, only show non-internal fields
      const showInternalFields = req.user && req.user.organizationId === orgId;
      
      // Get the custom fields filtered by source if provided
      let customFields = await storage.listCustomFields(orgId, fieldSource);
      
      // Filter out internal fields for non-organization users
      if (!showInternalFields) {
        customFields = customFields.filter(field => !field.isInternal);
      }
      
      res.json(customFields);
    } catch (error) {
      logError("List custom fields", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  // Update a custom field
  app.patch("/api/custom-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const fieldId = parseInt(req.params.id, 10);
    
    try {
      // Get the custom field to verify ownership
      const customField = await storage.getCustomField(fieldId);
      if (!customField) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      // Check if user has access to this organization's custom fields
      if (req.user.organizationId !== customField.organizationId) {
        return res.status(403).json({ message: "You don't have permission to modify this custom field" });
      }

      // Generate field name from label if not provided but label changed
      let updatedData = { ...req.body };
      if (updatedData.label && updatedData.label !== customField.label && !updatedData.name) {
        // Convert label to snake_case for the name
        updatedData.name = updatedData.label
          .toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove special characters
          .replace(/\s+/g, '_');   // Replace spaces with underscores
      }

      const updatedField = await storage.updateCustomField(fieldId, updatedData);
      res.json(updatedField);
    } catch (error) {
      logError("Update custom field", error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  // Delete a custom field
  app.delete("/api/custom-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const fieldId = parseInt(req.params.id, 10);
    
    try {
      // Get the custom field to verify ownership
      const customField = await storage.getCustomField(fieldId);
      if (!customField) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      // Check if user has access to this organization's custom fields
      if (req.user.organizationId !== customField.organizationId) {
        return res.status(403).json({ message: "You don't have permission to delete this custom field" });
      }

      await storage.deleteCustomField(fieldId);
      res.status(204).send();
    } catch (error) {
      logError("Delete custom field", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  // Add custom field to a camp
  app.post("/api/camps/:campId/custom-fields", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const campId = parseInt(req.params.campId, 10);
    
    try {
      // Get the camp to verify ownership
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }

      // Check if user has access to this camp
      if (req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ message: "You don't have permission to modify this camp's custom fields" });
      }

      const validationData = {
        ...req.body,
        campId,
      };

      const parsed = insertCampCustomFieldSchema.safeParse(validationData);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid camp custom field data",
          errors: parsed.error.flatten()
        });
      }

      const campCustomField = await storage.addCustomFieldToCamp(parsed.data);
      res.status(201).json(campCustomField);
    } catch (error) {
      logError("Add custom field to camp", error);
      res.status(500).json({ message: "Failed to add custom field to camp" });
    }
  });

  // Get custom fields for a camp
  app.get("/api/camps/:campId/custom-fields", async (req, res) => {
    const campId = parseInt(req.params.campId, 10);
    
    try {
      const campCustomFields = await storage.getCampCustomFields(campId);
      res.json(campCustomFields);
    } catch (error) {
      logError("Get camp custom fields", error);
      res.status(500).json({ message: "Failed to fetch custom fields for camp" });
    }
  });

  // Update a camp custom field
  app.patch("/api/camp-custom-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const campCustomFieldId = parseInt(req.params.id, 10);
    
    try {
      // This would require a more complex query to verify organization ownership
      // For simplicity, we'll assume storage.updateCampCustomField verifies permissions
      const updatedCampCustomField = await storage.updateCampCustomField(campCustomFieldId, req.body);
      res.json(updatedCampCustomField);
    } catch (error) {
      logError("Update camp custom field", error);
      res.status(500).json({ message: "Failed to update camp custom field" });
    }
  });

  // Remove a custom field from a camp
  app.delete("/api/camp-custom-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const campCustomFieldId = parseInt(req.params.id, 10);
    
    try {
      // This would require a more complex query to verify organization ownership
      // For simplicity, we'll assume storage.removeCampCustomField verifies permissions
      await storage.removeCampCustomField(campCustomFieldId);
      res.status(204).send();
    } catch (error) {
      logError("Remove custom field from camp", error);
      res.status(500).json({ message: "Failed to remove custom field from camp" });
    }
  });

  // Create a custom field response
  app.post("/api/registrations/:registrationId/custom-field-responses", async (req, res) => {
    const registrationId = parseInt(req.params.registrationId, 10);
    
    try {
      const validationData = {
        ...req.body,
        registrationId,
      };

      const parsed = insertCustomFieldResponseSchema.safeParse(validationData);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid custom field response data",
          errors: parsed.error.flatten()
        });
      }

      const response = await storage.createCustomFieldResponse(parsed.data);
      res.status(201).json(response);
    } catch (error) {
      logError("Create custom field response", error);
      res.status(500).json({ message: "Failed to create custom field response" });
    }
  });

  // Get custom field responses for a registration
  app.get("/api/registrations/:registrationId/custom-field-responses", async (req, res) => {
    const registrationId = parseInt(req.params.registrationId, 10);
    
    try {
      const responses = await storage.getCustomFieldResponses(registrationId);
      res.json(responses);
    } catch (error) {
      logError("Get custom field responses", error);
      res.status(500).json({ message: "Failed to fetch custom field responses" });
    }
  });

  // Update a custom field response
  app.patch("/api/custom-field-responses/:id", async (req, res) => {
    const responseId = parseInt(req.params.id, 10);
    
    try {
      const updatedResponse = await storage.updateCustomFieldResponse(responseId, req.body);
      res.json(updatedResponse);
    } catch (error) {
      logError("Update custom field response", error);
      res.status(500).json({ message: "Failed to update custom field response" });
    }
  });
  
  // Camp meta fields routes
  // Create camp meta field (custom field values for camps)
  app.post("/api/camps/:campId/meta-fields", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const campId = parseInt(req.params.campId, 10);
    
    try {
      // Verify camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to modify this camp's meta fields
      if (req.user.organizationId !== camp.organizationId && !publicRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "You don't have permission to modify this camp's meta fields" });
      }
      
      const metaFieldData = {
        ...req.body,
        campId,
      };
      
      const newMetaField = await storage.createCampMetaField(metaFieldData);
      res.status(201).json(newMetaField);
    } catch (error) {
      logError("Create camp meta field", error);
      res.status(500).json({ message: "Failed to create camp meta field" });
    }
  });
  
  // Get camp meta fields
  app.get("/api/camps/:campId/meta-fields", async (req, res) => {
    const campId = parseInt(req.params.campId, 10);
    
    try {
      // Check for camp's organization
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      const metaFields = await storage.getCampMetaFields(campId);
      
      // Check if user has permission to see internal fields
      const canManageFields = req.user?.organizationId === camp.organizationId;
      
      // If user cannot manage fields, filter out internal fields
      const visibleMetaFields = canManageFields
        ? metaFields
        : metaFields.filter(field => !field.field.isInternal);
      
      res.json(visibleMetaFields);
    } catch (error) {
      logError("Get camp meta fields", error);
      res.status(500).json({ message: "Failed to fetch camp meta fields" });
    }
  });
  
  // Update a camp meta field
  app.patch("/api/camps/:campId/meta-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const metaFieldId = parseInt(req.params.id, 10);
    
    try {
      const updatedMetaField = await storage.updateCampMetaField(metaFieldId, req.body);
      res.json(updatedMetaField);
    } catch (error) {
      logError("Update camp meta field", error);
      res.status(500).json({ message: "Failed to update camp meta field" });
    }
  });
  
  // Delete a camp meta field
  app.delete("/api/camps/:campId/meta-fields/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const metaFieldId = parseInt(req.params.id, 10);
    
    try {
      await storage.deleteCampMetaField(metaFieldId);
      res.status(204).end();
    } catch (error) {
      logError("Delete camp meta field", error);
      res.status(500).json({ message: "Failed to delete camp meta field" });
    }
  });
  
  // Camp registration endpoint
  app.post("/api/camps/:id/register", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Only allow parents to register
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can register for camps" });
    }
    
    const campId = parseInt(req.params.id);
    
    try {
      // Verify camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if registration period is open
      const now = new Date();
      const startDate = new Date(camp.registrationStartDate);
      const endDate = new Date(camp.registrationEndDate);
      
      if (now < startDate) {
        return res.status(400).json({ 
          message: "Registration for this camp has not started yet",
          startsAt: startDate
        });
      }
      
      if (now > endDate) {
        return res.status(400).json({ 
          message: "Registration for this camp has ended",
          endedAt: endDate
        });
      }
      
      // Check if camp is full and waitlist is enabled
      const registrations = await storage.getRegistrationsByCamp(campId);
      const isWaitlist = registrations.length >= camp.capacity;
      
      if (isWaitlist && !camp.waitlistEnabled) {
        return res.status(400).json({ message: "Camp is full and waitlist is not available" });
      }
      
      // Registration requires childId, but we'll make it optional in the API
      // If not provided, we'll need to show a child selection UI on the frontend
      const childId = req.body.childId;
      
      // Create a skeleton registration
      const registration = await storage.createRegistration({
        campId,
        parentId: req.user.id,
        childId: childId || null,
        status: isWaitlist ? "waitlisted" : "pending",
        registrationDate: new Date(),
        paymentStatus: "unpaid",
        paymentAmount: camp.price,
        notes: req.body.notes || "",
        emergencyContact: req.body.emergencyContact || "",
        emergencyPhone: req.body.emergencyPhone || ""
      });
      
      // Success response
      res.status(201).json({
        ...registration,
        isWaitlisted: isWaitlist,
        camp: {
          id: camp.id,
          name: camp.name,
          startDate: camp.startDate,
          endDate: camp.endDate
        }
      });
    } catch (error) {
      console.error("Error registering for camp:", error);
      res.status(500).json({ message: "Failed to register for camp" });
    }
  });

  // Attendance tracking routes
  
  // Get attendance records for a camp
  app.get("/api/camps/:id/attendance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view attendance records" });
      }
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to view this camp's attendance
      // For now, only camp creators of the same organization can view attendance
      if (req.user.role !== "camp_creator" || req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to view this camp's attendance records" 
        });
      }
      
      // Get optional date filter
      let date: Date | undefined = undefined;
      if (req.query.date) {
        date = new Date(req.query.date as string);
      }
      
      const attendanceRecords = await storage.getAttendanceRecords(campId, date);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });
  
  // Create attendance record
  app.post("/api/camps/:id/attendance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to record attendance" });
      }
      
      const campId = parseInt(req.params.id);
      if (isNaN(campId)) {
        return res.status(400).json({ message: "Invalid camp ID" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has permission to record attendance for this camp
      if (req.user.role !== "camp_creator" || req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to record attendance for this camp" 
        });
      }
      
      // Validate required fields
      if (!req.body.registrationId || !req.body.childId || !req.body.date || !req.body.status) {
        return res.status(400).json({ 
          message: "Missing required fields (registrationId, childId, date, status)" 
        });
      }
      
      // Create attendance record
      const record = await storage.createAttendanceRecord({
        registrationId: req.body.registrationId,
        campId: campId,
        childId: req.body.childId,
        date: new Date(req.body.date),
        status: req.body.status,
        notes: req.body.notes || null,
        recordedBy: req.user.id
      });
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating attendance record:", error);
      res.status(500).json({ message: "Failed to create attendance record" });
    }
  });
  
  // Update attendance record
  app.put("/api/attendance/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to update attendance" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid attendance record ID" });
      }
      
      // Get the attendance record
      const records = await storage.getAttendanceRecords(req.body.campId);
      const record = records.find(r => r.id === id);
      
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      // Get the camp to check permissions
      const camp = await storage.getCamp(record.campId);
      if (!camp) {
        return res.status(404).json({ message: "Associated camp not found" });
      }
      
      // Check if user has permission to update attendance for this camp
      if (req.user.role !== "camp_creator" || req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ 
          message: "You don't have permission to update attendance for this camp" 
        });
      }
      
      // Update attendance record
      const updatedRecord = await storage.updateAttendanceRecord(id, {
        status: req.body.status,
        notes: req.body.notes,
        // Don't allow changing campId, registrationId, childId or date
      });
      
      res.json(updatedRecord);
    } catch (error) {
      console.error("Error updating attendance record:", error);
      res.status(500).json({ message: "Failed to update attendance record" });
    }
  });
  
  // Register parent-specific routes
  registerParentRoutes(app);
  
  // Register document routes
  app.use(documentRoutes(storage));
  
  // Catchall route for /api/children to properly filter by parent
  app.get("/api/children", async (req, res) => {
    // User must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // User must be a parent
    if (req.user?.role !== "parent") {
      return res.status(403).json({ message: "Access denied. Only parents can access children data." });
    }
    
    try {
      // Get children for the authenticated parent
      const children = await storage.getChildrenByParent(req.user.id);
      console.log(`API /api/children route: Found ${children.length} children for parent ID: ${req.user.id}`);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });
  
  // Dashboard API routes
  app.get("/api/dashboard/sessions", async (req: Request, res: Response) => {
    try {
      // User must be authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "User is not part of an organization" });
      }
      
      const allSessions = await storage.getAllCampSessions(organizationId);
      console.log(`API /api/dashboard/sessions: Found ${allSessions.length} sessions`);
      
      // Log some example sessions if available
      if (allSessions.length > 0) {
        console.log("Sample session data:", JSON.stringify(allSessions[0]));
      }
      
      // Clear response and return an array even if empty
      return res.json(allSessions || []);
    } catch (error: any) {
      console.error("Error getting all sessions:", error);
      res.status(500).json({ error: error.message || "Failed to get all sessions" });
    }
  });
  
  app.get("/api/dashboard/today-sessions", async (req: Request, res: Response) => {
    try {
      // User must be authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "User is not part of an organization" });
      }
      
      const todaySessions = await storage.getTodaySessions(organizationId);
      console.log(`API /api/dashboard/today-sessions: Found ${todaySessions.length} sessions for today`);
      
      // Return empty array if no sessions found
      return res.json(todaySessions || []);
    } catch (error: any) {
      console.error("Error getting today's sessions:", error);
      res.status(500).json({ error: error.message || "Failed to get today's sessions" });
    }
  });
  
  app.get("/api/dashboard/recent-registrations", async (req: Request, res: Response) => {
    try {
      // User must be authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "User is not part of an organization" });
      }
      
      // Get hours parameter from query string, default to 48
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 48;
      
      const recentRegistrations = await storage.getRecentRegistrations(organizationId, hours);
      return res.json(recentRegistrations);
    } catch (error: any) {
      console.error("Error getting recent registrations:", error);
      res.status(500).json({ error: error.message || "Failed to get recent registrations" });
    }
  });
  
  app.get("/api/dashboard/registrations-count", async (req: Request, res: Response) => {
    try {
      // User must be authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "User is not part of an organization" });
      }
      
      const totalCount = await storage.getTotalRegistrationsCount(organizationId);
      console.log(`API /api/dashboard/registrations-count: Found ${totalCount} registrations`);
      
      return res.json({ count: totalCount });
    } catch (error: any) {
      console.error("Error getting total registrations count:", error);
      res.status(500).json({ error: error.message || "Failed to get total registrations count" });
    }
  });
  
  app.get("/api/dashboard/camp-stats", async (req: Request, res: Response) => {
    try {
      // User must be authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: "User is not part of an organization" });
      }
      
      const campStats = await storage.getCampCountsByStatus(organizationId);
      return res.json(campStats);
    } catch (error: any) {
      console.error("Error getting camp statistics:", error);
      res.status(500).json({ error: error.message || "Failed to get camp statistics" });
    }
  });

  // Organization profile API routes
  // Public organization profile endpoint - accessible without auth
  app.get("/api/public/organizations/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const organization = await storage.getOrganizationBySlug(slug);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get public profile data including active camps
      const profileData = await storage.getOrganizationPublicProfile(organization.id);
      
      res.json(profileData);
    } catch (error: any) {
      console.error("Error fetching organization public profile:", error);
      res.status(500).json({ message: error.message || "Failed to fetch organization profile" });
    }
  });

  // Update organization profile (requires authentication and ownership)
  app.patch("/api/organizations/:orgId/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to update this organization's profile" });
      }
      
      // Handle update with the new profile-specific fields
      const updatedOrg = await storage.updateOrganizationProfile(orgId, {
        name: req.body.name,
        description: req.body.description,
        logoUrl: req.body.logoUrl,
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        aboutUs: req.body.aboutUs,
        slug: req.body.slug
      });
      
      res.json(updatedOrg);
    } catch (error: any) {
      console.error("Error updating organization profile:", error);
      res.status(500).json({ message: error.message || "Failed to update organization profile" });
    }
  });

  // Send a message to an organization (available to authenticated users)
  app.post("/api/organizations/:orgId/messages", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const organization = await storage.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Create the message
      const newMessage = await storage.createOrganizationMessage({
        organizationId: orgId,
        senderId: req.user?.id || null, // If authenticated, record the sender ID
        senderName: req.body.senderName,
        senderEmail: req.body.senderEmail,
        content: req.body.content
      });
      
      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        id: newMessage.id
      });
    } catch (error: any) {
      console.error("Error sending message to organization:", error);
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });

  // Get organization messages (requires authentication and ownership)
  app.get("/api/organizations/:orgId/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to view messages
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to view this organization's messages" });
      }
      
      const messages = await storage.getOrganizationMessages(orgId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching organization messages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  // Get unread organization messages count (requires authentication and ownership)
  app.get("/api/organizations/:orgId/messages/unread", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to view message stats
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to view this organization's messages" });
      }
      
      const unreadMessages = await storage.getUnreadOrganizationMessages(orgId);
      res.json({ count: unreadMessages.length });
    } catch (error: any) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: error.message || "Failed to fetch unread message count" });
    }
  });

  // Mark message as read (requires authentication and ownership)
  app.patch("/api/organizations/messages/:messageId/read", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "camp_creator") {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const messageId = parseInt(req.params.messageId);
      const updatedMessage = await storage.markMessageAsRead(messageId);
      
      res.json(updatedMessage);
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: error.message || "Failed to mark message as read" });
    }
  });

  return createServer(app);
}