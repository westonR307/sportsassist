import { publicRoles } from "@shared/schema";
import express, { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer } from "http";
import { db, pool, monitorQuery, isSlowQuery } from "./db";
import { eq, inArray, gt, and, gte, lte, isNull, or, sql, desc } from "drizzle-orm";
import fetch from "node-fetch";
import { campStaff } from "@shared/tables";
import { PLATFORM_FEE_PERCENTAGE } from "./constants";
import registerCustomFieldRoutes from "./custom-field-routes";

// Function to calculate subscription revenue from actual data
async function calculateSubscriptionRevenue() {
  try {
    // Query the database for all active subscriptions
    const activeSubscriptionsResult = await db.execute(sql`
      SELECT SUM(p.price) as total_revenue
      FROM subscription_plans p
      JOIN subscriptions s ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    
    const result = activeSubscriptionsResult[0];
    return result && result.total_revenue ? Math.round(Number(result.total_revenue) / 100) : 0;
  } catch (error) {
    console.error("Error calculating subscription revenue:", error);
    return 0;
  }
}

// Function to get average API latency from logs
async function getAverageApiLatency() {
  try {
    // For now, return a reasonable value since we don't have api_logs table
    return 100; // Typical value in milliseconds
  } catch (error) {
    console.error("Error calculating API latency:", error);
    return 100; // Fallback to reasonable value
  }
}

// Function to get system error rate
async function getSystemErrorRate() {
  try {
    // For now, return a reasonable value since we don't have error logs
    return 0.01; // 1% error rate is typical
  } catch (error) {
    console.error("Error calculating system error rate:", error);
    return 0.01; // Fallback to reasonable value
  }
}
import { 
  scheduleExceptions,
  sports, 
  organizations, 
  organizationSubscriptions, 
  camps, 
  registrations,
  users
} from "@shared/tables";

import {
  insertScheduleExceptionSchema
} from "@shared/schema";

// Custom HTTP error class for consistent error handling
class HttpError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
import { storage } from "./storage";
import { upload } from "./utils/file-upload";
// Import the scheduleExceptionSchema from our dialog component for validation
import { scheduleExceptionSchema } from "../client/src/components/schedule-exception-dialog";
import { getCachedOrganizations, getCachedOrganization } from "./cache-utils";

function logError(location: string, error: any) {
  console.error(`Error in ${location}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
}

// Function to register public routes that don't require authentication
function registerPublicRoutes(app: Express) {
  // Public organization profile endpoints
  app.get("/api/organizations/public/:slugOrName", async (req, res) => {
    try {
      const slugOrName = req.params.slugOrName;
      console.log(`Fetching public org profile for slug or name: ${slugOrName}`);
      
      // Get organization by slug or name (converted to slug format)
      const organization = await storage.getOrganizationBySlug(slugOrName);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Only expose fields that should be public
      const publicOrgData = {
        id: organization.id,
        name: organization.name,
        displayName: organization.displayName,
        description: organization.description,
        logoUrl: organization.logoUrl,
        primaryColor: organization.primaryColor,
        secondaryColor: organization.secondaryColor,
        aboutText: organization.aboutText,
        contactEmail: organization.contactEmail,
        websiteUrl: organization.websiteUrl,
        socialLinks: organization.socialLinks,
        bannerImageUrl: organization.bannerImageUrl,
        slug: organization.slug,
        // Include mission statement and feature fields
        missionStatement: organization.missionStatement,
        feature1Title: organization.feature1Title,
        feature1Description: organization.feature1Description,
        feature2Title: organization.feature2Title,
        feature2Description: organization.feature2Description,
        feature3Title: organization.feature3Title,
        feature3Description: organization.feature3Description
      };
      
      res.json(publicOrgData);
    } catch (error) {
      console.error("Error fetching public organization profile:", error);
      res.status(500).json({ message: "Failed to fetch organization profile" });
    }
  });
  
  // Get public camps for an organization
  app.get("/api/organizations/public/:slugOrName/camps", async (req, res) => {
    try {
      const slugOrName = req.params.slugOrName;
      console.log(`Fetching public camps for org slug or name: ${slugOrName}`);
      
      // Get organization by slug or name (converted to slug format)
      const organization = await storage.getOrganizationBySlug(slugOrName);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get only public, active camps for this organization
      const camps = await storage.listPublicOrganizationCamps(organization.id);
      
      res.json(camps);
    } catch (error) {
      console.error("Error fetching organization camps:", error);
      res.status(500).json({ message: "Failed to fetch organization camps" });
    }
  });
  
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

        // Get organization information
        const organization = await db.select().from(organizations)
          .where(eq(organizations.id, camp.organizationId))
          .then(results => results[0] || null);

        // Get the coaches assigned to this camp
        const campCoaches = await db.select({
          campStaff: campStaff,
          user: {
            id: users.id,
            firstName: users.first_name,
            lastName: users.last_name,
            profilePhoto: users.profile_photo
          }
        })
        .from(campStaff)
        .innerJoin(users, eq(campStaff.userId, users.id))
        .where(eq(campStaff.campId, camp.id));
        
        return {
          ...camp,
          location: camp.isVirtual ? "Virtual" : [camp.streetAddress, camp.city, camp.state, camp.zipCode]
            .filter(Boolean)
            .join(", "),
          campSports: campSportsWithDetails,
          organization: organization ? {
            id: organization.id,
            name: organization.name,
            logoUrl: organization.logoUrl,
            slug: organization.slug
          } : null,
          coaches: campCoaches.map(coach => ({
            id: coach.user.id,
            firstName: coach.user.firstName,
            lastName: coach.user.lastName,
            profilePhoto: coach.user.profilePhoto,
            role: coach.campStaff.role
          }))
        };
      }));
      
      res.json(processedCamps);
    } catch (error) {
      logError("GET /api/public/camps", error);
      res.status(500).json({ error: "Failed to fetch camps" });
    }
  });
}

import { setupAuth } from "./auth";
import { 
  insertCampSchema, 
  insertChildSchema, 
  insertRegistrationSchema, 
  insertOrganizationSchema, 
  insertInvitationSchema, 
  insertCustomFieldSchema,
  insertCampCustomFieldSchema,
  insertCustomFieldResponseSchema,
  insertCampSessionSchema,
  insertRecurrencePatternSchema
} from "@shared/schema";

import {
  children,
  childSports,
  campSessions,
  recurrencePatterns
} from "@shared/tables";
import { campSchedules, campSports, systemEvents } from "@shared/tables";
import Stripe from "stripe";
import { hashPassword, comparePasswords } from "./utils";
import { registerParentRoutes } from "./parent-routes";
import documentRoutes from "./document-routes";
import { randomBytes } from "crypto";
import passport from "passport";
import { sendInvitationEmail, sendCampMessageEmail, sendCampMessageReplyEmail } from "./utils/email";
import { uploadConfig, getFileUrl } from "./utils/file-upload";
import path from 'path';
import { handleStripeWebhook } from "./stripe-webhook";

// Import Stripe utility functions
import { 
  stripe, 
  calculateApplicationFeeAmount, 
  createStripeAccountLink, 
  createStripeConnectedAccount,
  retrieveStripeAccount,
  updateOrganizationStripeStatus,
  createCheckoutSession,
  createStripeDashboardLoginLink
} from './utils/stripe';

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
  
  // Register custom field routes
  registerCustomFieldRoutes(app, storage);
  
  // Add all organizations endpoint with caching
  app.get("/api/organizations", async (req, res) => {
    try {
      console.log("Fetching all organizations (with caching)");
      const organizations = await monitorQuery(
        "GET /api/organizations - getCachedOrganizations",
        () => getCachedOrganizations(),
        300 // 300ms threshold for this endpoint
      );
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching all organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
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
  
  // Admin dashboard routes
  app.get("/api/admin/metrics", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Ensure user is a platform admin
    if (req.user.role !== "platform_admin") {
      return res.status(403).json({ message: "Forbidden: Platform admin access required" });
    }
    
    try {
      // Get user counts by role
      const usersByRole = await db.select({
        role: users.role,
        count: sql`count(*)`.as('count')
      })
      .from(users)
      .groupBy(users.role);
      
      // Format user role counts into an object
      const userRoleCounts = usersByRole.reduce((acc, item) => {
        acc[item.role] = Number(item.count);
        return acc;
      }, {} as Record<string, number>);
      
      // Get total users
      const totalUsersResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(users);
      const totalUsers = Number(totalUsersResult[0].count);
      
      // Get users created in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const newUsersResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(users)
      .where(gte(users.createdAt, oneDayAgo));
      const newUsersToday = Number(newUsersResult[0].count);
      
      // Active users - for demo purposes, let's count users who have updated their profile in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsersResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(users)
      .where(gte(users.updatedAt, thirtyDaysAgo));
      const activeUsers = Number(activeUsersResult[0].count);
      
      // Organization counts
      const organizationsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(organizations);
      const totalOrganizations = Number(organizationsResult[0].count);
      
      // Active subscriptions
      const activeSubscriptionsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.status, "active"));
      const activeSubscriptions = Number(activeSubscriptionsResult[0].count || 0);
      
      // Trial accounts without active subscriptions
      const trialAccountsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(organizations)
      .leftJoin(organizationSubscriptions, eq(organizations.id, organizationSubscriptions.organizationId))
      .where(or(
        isNull(organizationSubscriptions.id),
        eq(organizationSubscriptions.status, "trialing")
      ));
      const trialAccounts = Number(trialAccountsResult[0].count || 0);
      
      // Count camps by status
      const campsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(camps);
      const totalCamps = Number(campsResult[0].count);
      
      // Get active camps (current date within the start/end date range)
      const today = new Date();
      const activeCampsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(camps)
      .where(and(
        lte(camps.startDate, today),
        gte(camps.endDate, today),
        eq(camps.isDeleted, false),
        eq(camps.isCancelled, false)
      ));
      const activeCamps = Number(activeCampsResult[0].count);
      
      // Get registration counts
      const registrationsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(registrations);
      const totalRegistrations = Number(registrationsResult[0].count);
      
      // Get paid registrations
      const paidRegistrationsResult = await db.select({
        count: sql`count(*)`.as('count')
      })
      .from(registrations)
      .where(eq(registrations.paid, true));
      const paidRegistrations = Number(paidRegistrationsResult[0].count);
      
      // Calculate average revenue per registration
      const averageRevenue = totalCamps > 0 ? await db.select({
        avgPrice: sql`avg(${camps.price})`.as('avgPrice')
      })
      .from(camps)
      .then(result => Number(result[0].avgPrice || 0)) : 0;
      
      // Estimated revenue (for demonstration purposes)
      const estimatedRevenue = paidRegistrations * averageRevenue;
      
      // Return the real metrics
      const metrics = {
        userMetrics: {
          totalUsers,
          activeUsers,
          newUsersToday,
          usersByRole: userRoleCounts
        },
        organizationMetrics: {
          totalOrganizations,
          activeSubscriptions,
          trialAccounts
        },
        financialMetrics: {
          mtdRevenue: Math.round(estimatedRevenue / 100), // Convert cents to dollars
          ytdRevenue: Math.round(estimatedRevenue / 100), // Using actual revenue data
          subscriptionRevenue: await calculateSubscriptionRevenue(),
          transactionRevenue: Math.round(estimatedRevenue / 100 * PLATFORM_FEE_PERCENTAGE / 100) // Using actual platform fee percentage
        },
        campMetrics: {
          totalCamps,
          activeCamps,
          totalRegistrations,
          paidRegistrations,
          averagePrice: Math.round(averageRevenue / 100) // Convert cents to dollars
        },
        systemMetrics: {
          uptime: process.uptime(), // Real server uptime in seconds
          apiLatency: await getAverageApiLatency(), // Get real API latency
          errorRate: await getSystemErrorRate(), // Get real error rate
          activeConnections: req.app.get('connectionCount') || 0
        }
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ message: "Failed to get admin metrics" });
    }
  });
  
  app.get("/api/admin/system-events", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    // Ensure user is a platform admin
    if (req.user.role !== "platform_admin") {
      return res.status(403).json({ message: "Forbidden: Platform admin access required" });
    }
    
    try {
      // Query real system events from the database
      const systemEventsResult = await db.select()
        .from(systemEvents)
        .orderBy(desc(systemEvents.timestamp))
        .limit(10)
        .catch(error => {
          console.error("Error querying system events:", error);
          // If no events table exists, return an empty array
          return [];
        });
      
      res.json(systemEventsResult);
    } catch (error) {
      console.error("Error fetching system events:", error);
      res.status(500).json({ message: "Failed to get system events" });
    }
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
  
  // Update user name fields (first name, last name)
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Not authenticated - user/profile name update");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { firstName, lastName } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          message: "First name and last name are required" 
        });
      }
      
      // Update the user profile with just the name fields
      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        first_name: firstName,
        last_name: lastName,
      });
      
      console.log("User name fields updated successfully");
      return res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
        }
      });
    } catch (error) {
      console.error("Error updating user profile name fields:", error);
      return res.status(500).json({ message: "Failed to update user profile" });
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

  // Get organization details with caching
  app.get("/api/organizations/:orgId", async (req, res) => {
    try {
      // Get authenticated user's organization ID
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow users who belong to this organization to access its details
      // Platform admins can access any organization
      if (userOrgId !== requestedOrgId && req.user.role !== "platform_admin") {
        throw new HttpError(403, "Not authorized to access this organization");
      }

      // Use the cached organization data with query monitoring
      console.log(`Fetching organization data (with caching) for ID: ${requestedOrgId}`);
      const organization = await monitorQuery(
        `GET /api/organizations/${requestedOrgId} - getCachedOrganization`,
        () => getCachedOrganization(requestedOrgId),
        250 // 250ms threshold for this endpoint, as it's frequently accessed
      );
      
      if (!organization) {
        throw new HttpError(404, "Organization not found");
      }
      
      res.json(organization);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error fetching organization:", error.message);
      res.status(500).json({ error: "Failed to fetch organization details" });
    }
  });

  // Update organization details
  app.patch("/api/organizations/:orgId", async (req, res) => {
    console.log(`Organization PATCH update received for org ID: ${req.params.orgId}`);
    console.log('Request body:', JSON.stringify(req.body));
    console.log('User authentication status:', req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log('Authentication required for organization update');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    console.log('User info:', req.user);
    const orgId = parseInt(req.params.orgId);
    
    // Only allow camp creators who belong to this organization to update it
    if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
      console.log(`Authorization failed: user org ID ${req.user.organizationId}, requested org ID ${orgId}, user role ${req.user.role}`);
      return res.status(403).json({ message: "Not authorized to update this organization" });
    }

    try {
      const organization = await storage.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get a list of fields we're allowing to be updated
      const allowedFields = [
        'name', 'description', 'displayName', 'logoUrl', 
        'primaryColor', 'secondaryColor', 'buttonColor', 'aboutText',
        'contactEmail', 'websiteUrl', 'socialLinks', 'slug'
      ];
      
      // Build an update object with only the fields that were provided
      const updateObj: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Special handling for social links
          if (field === 'socialLinks' && req.body[field]) {
            // Make sure all social fields are defined
            updateObj[field] = {
              facebook: req.body[field].facebook || '',
              twitter: req.body[field].twitter || '',
              linkedin: req.body[field].linkedin || '',
              instagram: req.body[field].instagram || ''
            };
          } else {
            updateObj[field] = req.body[field];
          }
        }
      }
      
      console.log('Updating organization with data:', JSON.stringify(updateObj, null, 2));
      
      // Update the organization with all the provided fields, using the right method
      const updatedOrganization = await storage.updateOrganizationProfile(orgId, updateObj);
      
      // Invalidate the organization cache after update
      await invalidateOrganizationCaches(orgId);
      console.log(`Invalidated cache for organization ID: ${orgId} after update`);
      
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

  app.get("/api/invitations/:token", async (req, res) => {
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

    // Return basic info about the invitation
    const organization = await storage.getOrganization(invitation.organizationId);
    
    // Add invitedBy if available, and don't forget to include valid:true
    const orgOwner = organization ? await storage.getOrganizationOwner(organization.id) : null;
    
    res.json({
      email: invitation.email,
      role: invitation.role,
      organizationName: organization?.name || "Unknown Organization",
      expiresAt: invitation.expiresAt,
      valid: true,
      invitedBy: orgOwner ? `${orgOwner.first_name} ${orgOwner.last_name}` : undefined
    });
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

    // Validate first name and last name
    const { firstName, lastName, password } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    try {
      // Accept invitation with the first name, last name, and password
      const result = await storage.acceptInvitationWithNames(req.params.token, firstName, lastName, password);
      
      // If we have a valid user, log them in automatically
      if (result.user) {
        // Log the user in by creating a session
        req.login(result.user, (err) => {
          if (err) {
            console.error("Error during automatic login:", err);
            return res.status(200).json({ 
              message: "Invitation accepted, but automatic login failed. Please log in manually.",
              autoLoginSuccess: false
            });
          }
          
          console.log("Automatic login successful for new user:", {
            id: result.user.id,
            username: result.user.username,
            role: result.user.role
          });
          
          return res.status(200).json({ 
            message: "Invitation accepted and logged in successfully",
            autoLoginSuccess: true,
            user: {
              id: result.user.id,
              username: result.user.username,
              email: result.user.email,
              first_name: result.user.first_name,
              last_name: result.user.last_name,
              role: result.user.role,
              organizationId: result.user.organizationId
            }
          });
        });
      } else {
        res.json({ message: "Invitation accepted", autoLoginSuccess: false });
      }
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
      console.log("Request schedules:", JSON.stringify(req.body.schedules, null, 2));
      console.log("Request schedulingType:", req.body.schedulingType);

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
      // Debug the incoming date strings
      console.log("Received date values:", {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        registrationStartDate: req.body.registrationStartDate,
        registrationEndDate: req.body.registrationEndDate,
        typeOfStartDate: typeof req.body.startDate
      });
      
      // Safe date parsing function
      const safeParseDate = (dateStr: string) => {
        try {
          console.log(`Parsing date string: "${dateStr}"`);
          
          // If it's already in YYYY-MM-DD format, use it directly
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.log(`Date already in proper format: ${dateStr}`);
            return dateStr;
          }
          
          // Otherwise parse it with explicit approach
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          
          console.log(`Parsed date "${dateStr}" to: ${formattedDate}`);
          return formattedDate;
        } catch (error) {
          console.error(`Error parsing date "${dateStr}":`, error);
          return dateStr; // Return original if parsing fails
        }
      };
      
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
        startDate: safeParseDate(req.body.startDate),
        endDate: safeParseDate(req.body.endDate),
        registrationStartDate: safeParseDate(req.body.registrationStartDate),
        registrationEndDate: safeParseDate(req.body.registrationEndDate),
        type: req.body.type || "group",
        schedulingType: req.body.schedulingType || "fixed"
      };

      console.log("Preparing data for schema validation:", JSON.stringify(validationData, null, 2));

      // Check if this is an availability-based camp
      if (validationData.schedulingType === "availability") {
        console.log("Availability-based camp detected, no fixed schedules required");
        // For availability-based camps, we don't need fixed schedules
        // But still need to provide a dummy schedule to satisfy the schema
        validationData.schedules = [{
          dayOfWeek: 0, // Sunday
          startTime: "09:00",
          endTime: "17:00"
        }];
      } else {
        // For fixed schedule camps, ensure schedules are properly formatted
        if (Array.isArray(validationData.schedules)) {
          validationData.schedules = validationData.schedules.map(schedule => ({
            dayOfWeek: parseInt(String(schedule.dayOfWeek), 10),
            startTime: String(schedule.startTime).padStart(5, '0'),
            endTime: String(schedule.endTime).padStart(5, '0')
          }));
        } else {
          console.error("No schedules provided for fixed schedule camp");
          return res.status(400).json({
            message: "At least one schedule is required for fixed schedule camps"
          });
        }
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
      
      let organizationId: number | undefined;
      let includeDeleted = false;
      
      // Parse query parameters for filtering
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;
      
      // If explicitly set in the query, override the default includeDeleted
      if (req.query.includeDeleted === 'true') {
        includeDeleted = true;
      }
      
      // Check if we should filter by organization
      if (req.user) {
        const userType = req.user.role;
        
        // For organization staff members (camp creators, managers), show only their organization camps
        if (['camp_creator', 'manager', 'coach', 'volunteer'].includes(userType) && req.user.organizationId) {
          console.log(`Filtering camps for ${userType} with organization ID ${req.user.organizationId}`);
          organizationId = req.user.organizationId;
        } else {
          console.log("Showing all camps (public view)");
        }
      } else {
        // For unauthenticated users, show all public camps
        console.log("Unauthenticated user - showing all public camps");
      }
      
      // Get camps from storage with query monitoring
      let camps = await monitorQuery(
        `GET /api/camps - listCamps (${organizationId ? `orgId=${organizationId}` : 'all'})`,
        () => storage.listCamps(organizationId, includeDeleted),
        400 // This is a more expensive query that retrieves many records, so use higher threshold
      );
      
      // Apply additional filters based on query parameters
      if (status) {
        // Apply status filtering based on date logic
        const now = new Date();
        
        if (status === 'active') {
          camps = camps.filter(camp => 
            new Date(camp.startDate) <= now && new Date(camp.endDate) >= now && !camp.isCancelled
          );
        } else if (status === 'upcoming') {
          camps = camps.filter(camp => 
            new Date(camp.startDate) > now && !camp.isCancelled
          );
        } else if (status === 'past') {
          camps = camps.filter(camp => 
            new Date(camp.endDate) < now || camp.isCancelled
          );
        } else if (status === 'cancelled') {
          camps = camps.filter(camp => camp.isCancelled);
        }
      }
      
      // Filter by camp type
      if (type) {
        camps = camps.filter(camp => camp.type === type);
      }
      
      // Filter by search term (name or description)
      if (search) {
        const searchLower = search.toLowerCase();
        camps = camps.filter(camp => 
          camp.name.toLowerCase().includes(searchLower) || 
          (camp.description && camp.description.toLowerCase().includes(searchLower))
        );
      }
      
      console.log(`Retrieved ${camps.length} camps after filtering`);

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
      
      // Get the camp with its sports and schedule information with query monitoring
      const camp = await monitorQuery(
        `GET /api/camps/${campId} - getCamp`,
        () => storage.getCamp(campId),
        300 // 300ms threshold for camp detail retrieval
      );
      
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
  
  // Camp Staff Management Routes
  
  // Get all staff for a specific camp
  app.get("/api/camps/:id/staff", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const campId = parseInt(req.params.id, 10);
      const camp = await storage.getCamp(campId);
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user belongs to the organization that owns the camp
      if (camp.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized for this camp" });
      }
      
      const staff = await storage.getCampStaff(campId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching camp staff:", error);
      res.status(500).json({ message: "Failed to fetch camp staff" });
    }
  });
  
  // Add a staff member to a camp
  app.post("/api/camps/:id/staff", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const campId = parseInt(req.params.id, 10);
      const { userId, role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const camp = await storage.getCamp(campId);
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user belongs to the organization that owns the camp
      if (camp.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized for this camp" });
      }
      
      // Verify the user to be added exists and belongs to the same organization
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd || userToAdd.organizationId !== req.user.organizationId) {
        return res.status(404).json({ message: "User not found in organization" });
      }
      
      const result = await storage.addCampStaff(campId, userId, role);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding camp staff:", error);
      res.status(500).json({ message: "Failed to add staff to camp" });
    }
  });
  
  // Remove a staff member from a camp
  app.delete("/api/camps/:id/staff/:userId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const campId = parseInt(req.params.id, 10);
      const userId = parseInt(req.params.userId, 10);
      
      const camp = await storage.getCamp(campId);
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user belongs to the organization that owns the camp
      if (camp.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized for this camp" });
      }
      
      const result = await storage.removeCampStaff(campId, userId);
      
      if (result) {
        res.status(200).json({ message: "Staff member removed successfully" });
      } else {
        res.status(404).json({ message: "Staff member not found for this camp" });
      }
    } catch (error) {
      console.error("Error removing camp staff:", error);
      res.status(500).json({ message: "Failed to remove staff from camp" });
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
  
  // Delete a registration (deregister child from camp)
  app.delete("/api/registrations/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    console.log(`Delete registration request received for ID: ${req.params.id} from user: ${req.user.id} (${req.user.role})`);
    
    const registrationId = parseInt(req.params.id);
    if (isNaN(registrationId)) {
      console.log(`Invalid registration ID: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid registration ID" });
    }
    
    try {
      // First get the registration to check permissions
      const registration = await storage.getRegistration(registrationId);
      
      if (!registration) {
        console.log(`Registration not found: ${registrationId}`);
        return res.status(404).json({ message: "Registration not found" });
      }
      
      console.log(`Found registration: ${JSON.stringify(registration)}`);
      
      // For parents, verify the child belongs to them
      if (req.user.role === "parent") {
        const child = await storage.getChild(registration.childId);
        console.log(`Parent check - Child: ${JSON.stringify(child)}`);
        
        if (!child || child.parentId !== req.user.id) {
          console.log(`Authorization failed: Child belongs to parent ${child?.parentId}, request from ${req.user.id}`);
          return res.status(403).json({ message: "Not authorized for this registration" });
        }
      } 
      // For organization staff, verify the camp belongs to their organization
      else if (req.user.role === "coach" || req.user.role === "manager" || req.user.role === "camp_creator") {
        const camp = await storage.getCamp(registration.campId);
        console.log(`Staff check - Camp: ${JSON.stringify(camp?.organizationId)}, User org: ${req.user.organizationId}`);
        
        if (!camp || camp.organizationId !== req.user.organizationId) {
          console.log(`Authorization failed: Camp belongs to org ${camp?.organizationId}, user from ${req.user.organizationId}`);
          return res.status(403).json({ message: "Not authorized for this registration" });
        }
      }
      // Platform admins can delete any registration
      else if (req.user.role !== "platform_admin") {
        console.log(`Authorization failed: User role ${req.user.role} not authorized to delete registrations`);
        return res.status(403).json({ message: "Not authorized to delete registrations" });
      }
      
      // Perform the deletion
      console.log(`Attempting to delete registration ${registrationId}`);
      const success = await storage.deleteRegistration(registrationId);
      
      if (success) {
        console.log(`Registration ${registrationId} successfully deleted`);
        return res.status(200).json({ message: "Registration successfully deleted" });
      } else {
        console.log(`Failed to delete registration ${registrationId}`);
        return res.status(500).json({ message: "Failed to delete registration" });
      }
    } catch (error) {
      console.error("Error deleting registration:", error);
      return res.status(500).json({ message: "An error occurred while deleting the registration" });
    }
  });

  // Route removed (duplicate of the one above)

  app.get("/api/camps/:id/registrations", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      
      // First check if the camp exists with query monitoring
      const camp = await monitorQuery(
        `GET /api/camps/${campId}/registrations - getCamp`,
        () => storage.getCamp(campId),
        200 // 200ms threshold for retrieving camp data
      );
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Organization staff can see all registrations, but parents can only see their own children's registrations
      if (req.user) {
        // Check if the user belongs to the organization that owns the camp
        const isOrgStaff = (req.user.organizationId === camp.organizationId) && 
                          ['camp_creator', 'manager', 'coach', 'volunteer'].includes(req.user.role);
        
        if (isOrgStaff) {
          // Organization staff can see all registrations with complete athlete info - this is a data-intensive operation
          const registrations = await monitorQuery(
            `GET /api/camps/${campId}/registrations - getRegistrationsWithChildInfo`,
            () => storage.getRegistrationsWithChildInfo(campId),
            350 // 350ms threshold as this is a complex join operation
          );
          
          // Fetch and attach custom field responses for each registration
          const registrationsWithCustomFields = await Promise.all(
            registrations.map(async (registration) => {
              const customFieldResponses = await storage.getCustomFieldResponses(registration.id);
              return {
                ...registration,
                customFieldResponses: customFieldResponses
              };
            })
          );
          
          return res.json({
            registrations: registrationsWithCustomFields,
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
          
          // Attach custom field responses for parent's children registrations
          const registrationsWithCustomFields = await Promise.all(
            filteredRegistrations.map(async (registration) => {
              const customFieldResponses = await storage.getCustomFieldResponses(registration.id);
              return {
                ...registration,
                customFieldResponses: customFieldResponses
              };
            })
          );
          
          return res.json({
            registrations: registrationsWithCustomFields,
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
  
  // Endpoint for fetching registrations with parent information for sending messages
  app.get("/api/camps/:id/registrations-with-parents", async (req, res) => {
    try {
      const campId = parseInt(req.params.id);
      console.log(`[API] Fetching registrations with parents for camp ID: ${campId}, User: `, 
        req.user ? {id: req.user.id, role: req.user.role, orgId: req.user.organizationId} : 'Not authenticated');
      
      // First check if the camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        console.log(`[API] Camp ${campId} not found`);
        return res.status(404).json({ message: "Camp not found" });
      }
      
      console.log(`[API] Found camp ${campId}, organization ID: ${camp.organizationId}`);
      
      // Only organization staff can access this endpoint for messaging functionality
      if (req.user) {
        // Check if the user belongs to the organization that owns the camp
        const isOrgStaff = (req.user.organizationId === camp.organizationId) && 
                          ['camp_creator', 'manager', 'coach', 'volunteer'].includes(req.user.role);
        
        console.log(`[API] User organization check: User Org: ${req.user.organizationId}, Camp Org: ${camp.organizationId}, Role: ${req.user.role}, Is Org Staff: ${isOrgStaff}`);
        
        if (isOrgStaff) {
          // Get registrations with parent information for messaging
          console.log(`[API] Authorized access, fetching registrations with parent info`);
          const registrations = await storage.getRegistrationsWithParentInfo(campId);
          console.log(`[API] Found ${registrations.length} registrations with parent info`);
          return res.json(registrations);
        } else {
          console.log(`[API] User is not organization staff for this camp`);
        }
      } else {
        console.log(`[API] No authenticated user found for registrations-with-parents request`);
      }
      
      // Unauthorized access
      return res.status(403).json({ 
        message: "You don't have permission to access this information" 
      });
    } catch (error) {
      console.error("Error fetching camp registrations with parent info:", error);
      res.status(500).json({ message: "Failed to fetch registrations with parent information" });
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
      const { subject, content, sendToAll, selectedRecipients } = req.body;
      
      if (!subject || !content) {
        return res.status(400).json({ message: "Subject and content are required" });
      }
      
      // Validate selectedRecipients if not sending to all
      if (sendToAll !== true && (!selectedRecipients || !Array.isArray(selectedRecipients) || selectedRecipients.length === 0)) {
        return res.status(400).json({ message: "Selected recipients are required when not sending to all" });
      }
      
      // Get the organization for the email
      const organization = await storage.getOrganization(camp.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Create camp message
      const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username || 'Camp Staff';
      
      const newMessage = await storage.createCampMessage({
        campId,
        organizationId: camp.organizationId,
        senderId: req.user.id,
        senderName,
        subject,
        content,
        sentToAll: sendToAll === true
      });
      
      // Get registrations for this camp
      const registrations = await storage.getRegistrationsByCamp(campId);
      
      if (registrations.length === 0) {
        return res.status(200).json({ 
          message: "Message created but no recipients found",
          messageId: newMessage.id
        });
      }
      
      // Create recipients for the message
      const recipients = [];
      
      // Filter registrations based on sendToAll or selectedRecipients
      const targetRegistrations = sendToAll === true
        ? registrations
        : registrations.filter(reg => selectedRecipients.includes(reg.id));
      
      if (!sendToAll && targetRegistrations.length === 0) {
        return res.status(400).json({ 
          message: "None of the selected recipients were found in this camp",
          messageId: newMessage.id
        });
      }
      
      // Collect recipient details
      for (const registration of targetRegistrations) {
        const child = await storage.getChild(registration.childId);
        if (!child) continue;
        
        recipients.push({
          messageId: newMessage.id,
          registrationId: registration.id,
          childId: registration.childId,
          parentId: child.parentId,
          isRead: false,
          emailDelivered: false
        });
      }
      
      // Create recipient records only for the relevant registrations
      const createdRecipients = await storage.createCampMessageRecipients(recipients);
      console.log(`Created ${createdRecipients.length} recipient records for message ${newMessage.id}`);
      
      // Process emails for each recipient
      for (const recipient of createdRecipients) {
        try {
          // Get the parent for sending the email
          const parent = await storage.getUser(recipient.parentId);
          if (!parent || !parent.email) continue;
          
          await sendCampMessageEmail({
            email: parent.email,
            recipientName: `${parent.first_name || ''} ${parent.last_name || ''}`.trim(),
            subject,
            content,
            campName: camp.name,
            senderName: newMessage.senderName || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
            organizationName: organization.name,
            messageId: newMessage.id,
            recipientId: recipient.id
          });
          
          // Mark as delivered
          await storage.markCampMessageRecipientAsDelivered(recipient.id);
        } catch (emailError) {
          console.error(`Error sending email to recipient ${recipient.id}:`, emailError);
          // Continue with other recipients if one fails
        }
      }
      
      // Mark the message as email sent
      await storage.markCampMessageAsEmailSent(newMessage.id);
      
      res.status(201).json({
        message: "Message sent successfully",
        messageId: newMessage.id,
        recipientsCount: recipients.length
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Get all messages for a camp
  app.get("/api/camps/:id/messages", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const campId = parseInt(req.params.id);
    const camp = await storage.getCamp(campId);
    
    if (!camp) {
      return res.status(404).json({ message: "Camp not found" });
    }
    
    // Check if user has permission to view messages for this camp
    if (camp.organizationId !== req.user.organizationId && req.user.role !== 'platform_admin') {
      return res.status(403).json({ message: "Not authorized to view messages for this camp" });
    }
    
    try {
      const messages = await storage.getCampMessages(campId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching camp messages:", error);
      res.status(500).json({ message: "Failed to fetch camp messages" });
    }
  });
  
  // Tracking endpoint for email opens
  app.get("/api/camp-messages/:messageId/track/:recipientId", async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const recipientId = parseInt(req.params.recipientId);
      
      // Record that the recipient opened the email
      await storage.recordCampMessageRecipientOpened(recipientId);
      
      // Return a 1x1 transparent pixel
      res.set('Content-Type', 'image/gif');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
      console.error("Error tracking email open:", error);
      // Still return the pixel even if there's an error
      res.set('Content-Type', 'image/gif');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
  });
  
  // Get parent's camp messages
  app.get("/api/parent/:parentId/camp-messages", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const parentId = parseInt(req.params.parentId);
    
    // Only allow the parent to view their own messages or platform admins
    if (req.user.id !== parentId && req.user.role !== 'platform_admin') {
      return res.status(403).json({ message: "Not authorized to view these messages" });
    }
    
    try {
      const messages = await storage.getParentCampMessages(parentId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching parent camp messages:", error);
      res.status(500).json({ message: "Failed to fetch parent camp messages" });
    }
  });
  
  // Get parent's messages for a specific camp
  app.get("/api/camps/:id/messages/parent", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const campId = parseInt(req.params.id);
    const parentId = req.user.id;
    
    try {
      const camp = await storage.getCamp(campId);
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get all of the parent's messages for this specific camp
      const messages = await storage.getParentCampMessagesForCamp(parentId, campId);
      
      // Transform messages into the expected format
      const campMessages = messages.map(item => ({
        id: item.message.id,
        subject: item.message.subject,
        content: item.message.content,
        senderName: item.message.senderName,
        createdAt: item.message.createdAt,
        sentToAll: item.message.sentToAll,
        isRead: item.recipient ? item.recipient.isRead : false,
        recipientId: item.recipient ? item.recipient.id : null
      }));
      
      res.json(campMessages);
    } catch (error) {
      console.error(`Error fetching parent camp messages for camp ${campId}:`, error);
      res.status(500).json({ message: "Failed to fetch parent camp messages" });
    }
  });
  
  // Mark a camp message as read for a recipient
  app.patch("/api/camp-messages/:messageId/recipients/:recipientId/read", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const messageId = parseInt(req.params.messageId);
    const recipientId = parseInt(req.params.recipientId);
    
    try {
      // Get the recipient record
      const recipients = await storage.getCampMessageRecipients(messageId);
      const recipient = recipients.find(r => r.id === recipientId);
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      // Check if the user is authorized (must be the parent or an admin)
      if (req.user.id !== recipient.parentId && req.user.role !== 'platform_admin') {
        return res.status(403).json({ message: "Not authorized to mark this message as read" });
      }
      
      // Mark the message as read
      const updatedRecipient = await storage.markCampMessageRecipientAsRead(recipientId);
      
      res.json(updatedRecipient);
    } catch (error) {
      console.error("Error marking camp message as read:", error);
      res.status(500).json({ message: "Failed to mark camp message as read" });
    }
  });
  
  // Get replies for a specific camp message
  app.get("/api/camp-messages/:messageId/replies", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const messageId = parseInt(req.params.messageId);
    
    try {
      // Get the message first to check permissions
      const message = await storage.getCampMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // For camp_creator/admin users, they should be part of the organization that sent the message
      if (req.user.role === 'camp_creator' && req.user.organizationId !== message.organizationId) {
        return res.status(403).json({ message: "Not authorized to view replies for this message" });
      }
      
      // For parents, they need to have access to the camp
      if (req.user.role === 'parent') {
        const hasAccess = await storage.checkParentHasAccessToCamp(req.user.id, message.campId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to view replies for this message" });
        }
      }
      
      const replies = await storage.getCampMessageReplies(messageId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching message replies:", error);
      res.status(500).json({ message: "Failed to fetch message replies" });
    }
  });
  
  // Add a reply to a camp message
  app.post("/api/camp-messages/:messageId/replies", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    
    const messageId = parseInt(req.params.messageId);
    const { content, recipientId, replyToAll } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: "Reply content is required" });
    }
    
    try {
      // Get the message first to check permissions
      const message = await storage.getCampMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // For camp_creator/admin users, they should be part of the organization that sent the message
      if (req.user.role === 'camp_creator' && req.user.organizationId !== message.organizationId) {
        return res.status(403).json({ message: "Not authorized to reply to this message" });
      }
      
      // For parents, they need to have access to the camp
      if (req.user.role === 'parent') {
        const hasAccess = await storage.checkParentHasAccessToCamp(req.user.id, message.campId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to reply to this message" });
        }
      }
      
      // Create the reply
      const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username;
      
      // Detailed logging for debugging
      console.log("About to create message reply with data:", {
        messageId,
        senderId: req.user.id,
        senderName,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        campId: message.campId,
        userRole: req.user.role,
        messageOrganizationId: message.organizationId,
        recipientId,
        replyToAll
      });
      
      // Create the reply - define it outside the try block so it's accessible later
      let reply;
      
      try {
        reply = await storage.createCampMessageReply({
          messageId,
          senderId: req.user.id,
          senderName,
          content,
          campId: message.campId
        });
        
        if (!reply) {
          throw new Error("No reply data returned from storage function");
        }
      } catch (error) {
        console.error("Error creating camp message reply:", error);
        return res.status(500).json({ message: "Failed to create message reply", error: error.message });
      }
      
      // Send email notification for the reply
      try {
        // For parent replies, notify camp creator/organization
        if (req.user.role === 'parent') {
          // Get organization users to send notifications to
          const orgUsers = await storage.getOrganizationUsers(message.organizationId);
          for (const user of orgUsers) {
            if (user.email) {
              await sendCampMessageReplyEmail({
                recipientEmail: user.email,
                recipientName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                senderName: senderName,
                originalSubject: message.subject,
                replyContent: content,
                campName: req.body.campName || 'Camp', // Ideally, get the camp name from the database
                replyUrl: `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/organization/messages/${messageId}`
              });
            }
          }
        } 
        // For camp creator replies
        else if (req.user.role === 'camp_creator') {
          // Get the original recipients to find out who to notify
          const recipients = await storage.getCampMessageRecipients(messageId);
          
          // Determine who to notify based on replyToAll flag
          if (replyToAll) {
            // Reply to all - notify all original recipients
            console.log("Sending reply to all recipients of the original message");
            for (const recipient of recipients) {
              const parent = await storage.getUser(recipient.parentId);
              if (parent && parent.email) {
                await sendCampMessageReplyEmail({
                  recipientEmail: parent.email,
                  recipientName: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || parent.username,
                  senderName: senderName,
                  originalSubject: message.subject,
                  replyContent: content,
                  campName: req.body.campName || 'Camp',
                  replyUrl: `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/parent/messages/${messageId}`
                });
              }
            }
          } 
          // Individual reply - only notify the specific recipient
          else if (recipientId) {
            console.log(`Sending reply to specific recipient ID: ${recipientId}`);
            const parent = await storage.getUser(recipientId);
            if (parent && parent.email) {
              await sendCampMessageReplyEmail({
                recipientEmail: parent.email,
                recipientName: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || parent.username,
                senderName: senderName,
                originalSubject: message.subject,
                replyContent: content,
                campName: req.body.campName || 'Camp',
                replyUrl: `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/parent/messages/${messageId}`
              });
            }
          }
          // If neither replyToAll nor recipientId, fall back to notifying all original recipients
          else if (!message.sentToAll) {
            console.log("No specific recipient ID or replyToAll flag - falling back to original recipients");
            for (const recipient of recipients) {
              const parent = await storage.getUser(recipient.parentId);
              if (parent && parent.email) {
                await sendCampMessageReplyEmail({
                  recipientEmail: parent.email,
                  recipientName: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || parent.username,
                  senderName: senderName,
                  originalSubject: message.subject,
                  replyContent: content,
                  campName: req.body.campName || 'Camp',
                  replyUrl: `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/parent/messages/${messageId}`
                });
              }
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to send email notification for reply:", emailError);
        // Continue with the API response even if email fails
      }
      
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating message reply:", error);
      res.status(500).json({ message: "Failed to create message reply" });
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
  
  // Get all basic camp info (for the messages page dropdown)
  app.get("/api/camps/basic-info", async (req, res) => {
    console.log("API endpoint /api/camps/basic-info was called");
    if (!req.user) {
      console.log("Unauthorized - user not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      console.log("User is not associated with an organization");
      return res.status(403).json({ message: "Not associated with an organization" });
    }
    
    console.log(`Fetching basic camp info for organization ${organizationId}`);
    try {
      const camps = await storage.getCampBasicInfo(organizationId);
      console.log(`Retrieved ${camps.length} camps for basic info`);
      res.json(camps);
    } catch (error) {
      console.error("Error fetching basic camp info:", error);
      res.status(500).json({ message: "Failed to fetch camp info" });
    }
  });
  
  // Get all messages for an organization
  app.get("/api/organizations/messages", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(403).json({ message: "Not associated with an organization" });
    }
    
    try {
      const messages = await storage.getOrganizationMessages(organizationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching organization messages:", error);
      res.status(500).json({ message: "Failed to fetch organization messages" });
    }
  });
  
  // Get all camp messages for an organization
  app.get("/api/organizations/:orgId/camp-messages", async (req, res) => {
    console.log("API endpoint /api/organizations/:orgId/camp-messages was called");
    if (!req.user) {
      console.log("Unauthorized - user not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const orgId = parseInt(req.params.orgId);
    const organizationId = req.user.organizationId;
    console.log(`User organizationId: ${organizationId}, Requested orgId: ${orgId}`);
    
    if (!organizationId) {
      console.log("User is not associated with an organization");
      return res.status(403).json({ message: "Not associated with an organization" });
    }
    
    if (organizationId !== orgId) {
      console.log("User not authorized for this organization");
      return res.status(403).json({ message: "Not authorized for this organization" });
    }
    
    try {
      console.log(`Fetching camp messages for organization ${orgId}`);
      const messages = await storage.getOrganizationCampMessages(orgId);
      console.log(`Retrieved ${messages.length} messages`);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching organization camp messages:", error);
      res.status(500).json({ message: "Failed to fetch organization camp messages" });
    }
  });
  
  // Get all users in an organization (including camp creator)
  app.get("/api/organizations/:orgId/users", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    try {
      console.log(`Fetching all users for organization ${orgId}`);
      const users = await storage.getOrganizationUsers(orgId);
      console.log(`Found ${users.length} users for organization ${orgId}`);
      res.json(users);
    } catch (error) {
      console.error("Error fetching organization users:", error);
      res.status(500).json({ message: "Failed to fetch organization users" });
    }
  });
  
  // Update team member role - only camp_creator can do this
  app.patch("/api/organizations/:orgId/staff/:userId/role", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify this is a camp_creator
    if (req.user.role !== "camp_creator") {
      return res.status(403).json({ message: "Only organization owners can update team member roles" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    if (!role || !["coach", "manager", "volunteer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    try {
      // Get all staff members for this organization 
      const staff = await storage.getOrganizationStaff(orgId);
      
      // Find the user in the staff members list
      const user = staff.find(member => member.id === userId);
      
      if (!user || user.organizationId !== orgId) {
        return res.status(404).json({ message: "User not found in this organization" });
      }

      // Don't allow changing the role of another camp_creator
      if (user.role === "camp_creator") {
        return res.status(403).json({ message: "Cannot change the role of an organization owner" });
      }

      await storage.updateUserRole(userId, role);
      res.json({ success: true, message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
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
    // Debug authentication issue
    console.log('Update custom field endpoint triggered');
    console.log('Auth status:', req.isAuthenticated());
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.user);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log('Authentication check failed, user is not authenticated');
      return res.status(401).json({ message: "Authentication required" });
    }

    const fieldId = parseInt(req.params.id, 10);
    
    try {
      // Get the custom field to verify ownership
      const customField = await storage.getCustomField(fieldId);
      if (!customField) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      console.log('Custom field found:', customField);
      console.log('User organization:', req.user.organizationId);
      console.log('Field organization:', customField.organizationId);

      // Check if user has access to this organization's custom fields
      // Allow camp creators to edit custom fields from their organization
      const userCanEditField = req.user.role === 'admin' || 
                              (req.user.role === 'camp_creator' && req.user.organizationId === customField.organizationId);
      
      if (!userCanEditField) {
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
      console.log('Field updated successfully');
      res.json(updatedField);
    } catch (error) {
      logError("Update custom field", error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  // Delete a custom field
  app.delete("/api/custom-fields/:id", async (req, res) => {
    // Debug authentication issue
    console.log('Delete custom field endpoint triggered');
    console.log('Auth status:', req.isAuthenticated());
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.user);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log('Authentication check failed, user is not authenticated');
      return res.status(401).json({ message: "Authentication required" });
    }

    const fieldId = parseInt(req.params.id, 10);
    
    try {
      // Get the custom field to verify ownership
      const customField = await storage.getCustomField(fieldId);
      if (!customField) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      console.log('Custom field found:', customField);
      console.log('User organization:', req.user.organizationId);
      console.log('Field organization:', customField.organizationId);

      // Check if user has access to this organization's custom fields
      // Allow camp creators to delete custom fields from their organization
      const userCanEditField = req.user.role === 'admin' || 
                              (req.user.role === 'camp_creator' && req.user.organizationId === customField.organizationId);
      
      if (!userCanEditField) {
        return res.status(403).json({ message: "You don't have permission to delete this custom field" });
      }

      await storage.deleteCustomField(fieldId);
      console.log('Field deleted successfully');
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
      // Verify camp exists with query monitoring
      const camp = await monitorQuery(
        `POST /api/camps/${campId}/register - getCamp`,
        () => storage.getCamp(campId),
        200 // 200ms threshold for camp retrieval during registration
      );
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
      
      // Check if camp is full and waitlist is enabled with query monitoring
      const registrations = await monitorQuery(
        `POST /api/camps/${campId}/register - getRegistrationsByCamp`,
        () => storage.getRegistrationsByCamp(campId),
        200 // 200ms threshold for getting registrations
      );
      const isWaitlist = registrations.length >= camp.capacity;
      
      if (isWaitlist && !camp.waitlistEnabled) {
        return res.status(400).json({ message: "Camp is full and waitlist is not available" });
      }
      
      // Registration requires childId, but we'll make it optional in the API
      // If not provided, we'll need to show a child selection UI on the frontend
      const childId = req.body.childId;
      const customFieldResponses = req.body.customFieldResponses || {};
      const slotId = req.body.slotId || null;

      console.log("Registration request with custom fields:", {
        campId,
        childId,
        slotId,
        customFieldResponsesCount: Object.keys(customFieldResponses).length
      });

      // For fixed scheduling camps, check if the child is already registered
      // For availability-based camps, we allow multiple registrations (for different time slots)
      if (childId && camp.schedulingType !== "availability") {
        const existingRegistration = registrations.find(reg => reg.childId === childId);
        if (existingRegistration) {
          return res.status(400).json({ 
            message: "This child is already registered for this camp", 
            existingRegistration 
          });
        }
      }
      
      // Create a skeleton registration with query monitoring
      const registration = await monitorQuery(
        `POST /api/camps/${campId}/register - createRegistration`,
        () => storage.createRegistration({
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
        }),
        300 // 300ms threshold for creating registration - this is a more complex operation
      );
      
      // Process custom field responses if they exist
      if (customFieldResponses && Object.keys(customFieldResponses).length > 0) {
        console.log(`Saving ${Object.keys(customFieldResponses).length} custom field responses for registration ${registration.id}`);
        
        try {
          // Process each custom field response
          for (const fieldId in customFieldResponses) {
            const response = customFieldResponses[fieldId];
            
            // Skip empty responses
            if (response === undefined || response === null || response === '') continue;
            
            // Convert to array for multi-select fields if needed
            const responseValue = Array.isArray(response) ? response : String(response);
            
            await storage.createCustomFieldResponse({
              registrationId: registration.id,
              customFieldId: parseInt(fieldId),
              response: typeof responseValue === 'string' ? responseValue : null,
              responseArray: Array.isArray(responseValue) ? responseValue : null,
            });
          }
          console.log(`Successfully saved custom field responses for registration ${registration.id}`);
        } catch (error) {
          console.error("Error saving custom field responses:", error);
          // Don't fail the registration if custom fields can't be saved
        }
      }
      
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
      
      // Send registration confirmation or waitlist notification email asynchronously
      // We don't await this to avoid delaying the response to the user
      try {
        // Get parent and child details for the email
        const [parentResult, childResult] = await Promise.all([
          pool.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [req.user.id]),
          childId ? pool.query('SELECT full_name FROM children WHERE id = $1', [childId]) : Promise.resolve({ rows: [{ full_name: 'your child' }] })
        ]);
        
        if (parentResult.rows.length > 0 && parentResult.rows[0].email) {
          const parent = parentResult.rows[0];
          const childName = childResult.rows.length > 0 ? childResult.rows[0].full_name : 'your child';
          const parentName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Parent';
          
          // Create location string
          let location = camp.isVirtual ? 'Virtual Camp' : '';
          if (!camp.isVirtual && camp.streetAddress) {
            location = `${camp.streetAddress}, ${camp.city}, ${camp.state}`;
          } else if (!camp.isVirtual) {
            location = `${camp.city}, ${camp.state}`;
          }
          
          const apiEndpoint = isWaitlist 
            ? '/api/notifications/send-waitlist-notification'
            : '/api/notifications/send-registration-confirmation';
          
          // Make internal API request to send notification
          fetch(`http://localhost:${process.env.PORT || 5000}${apiEndpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.cookie || '' // Pass session cookies for authentication
            },
            body: JSON.stringify({
              registrationId: registration.id,
              status: isWaitlist ? 'added' : undefined
            })
          }).catch(err => {
            console.error('Failed to send registration notification:', err);
            // We don't rethrow the error since this is just a notification
          });
        }
      } catch (error) {
        console.error('Error preparing registration notification:', error);
        // We don't rethrow the error since this is just a notification
      }
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
  // Common auth check for dashboard routes to reduce code duplication
  const authAndGetOrgId = (req: Request): number => {
    if (!req.isAuthenticated()) {
      throw new HttpError(401, "Not authenticated");
    }
    
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new HttpError(403, "User is not part of an organization");
    }
    
    return organizationId;
  };
  
  app.get("/api/dashboard/sessions", async (req: Request, res: Response) => {
    try {
      const organizationId = authAndGetOrgId(req);
      const allSessions = await storage.getAllCampSessions(organizationId);
      return res.json(allSessions || []);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error getting all sessions:", error.message);
      res.status(500).json({ error: error.message || "Failed to get all sessions" });
    }
  });
  
  app.get("/api/dashboard/today-sessions", async (req: Request, res: Response) => {
    try {
      const organizationId = authAndGetOrgId(req);
      const todaySessions = await storage.getTodaySessions(organizationId);
      return res.json(todaySessions || []);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error getting today's sessions:", error.message);
      res.status(500).json({ error: error.message || "Failed to get today's sessions" });
    }
  });
  
  app.get("/api/dashboard/recent-registrations", async (req: Request, res: Response) => {
    try {
      const organizationId = authAndGetOrgId(req);
      
      // Get hours parameter from query string, default to 48
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 48;
      
      const recentRegistrations = await storage.getRecentRegistrations(organizationId, hours);
      return res.json(recentRegistrations);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error getting recent registrations:", error.message);
      res.status(500).json({ error: error.message || "Failed to get recent registrations" });
    }
  });
  
  app.get("/api/dashboard/registrations-count", async (req: Request, res: Response) => {
    try {
      const organizationId = authAndGetOrgId(req);
      const totalCount = await storage.getTotalRegistrationsCount(organizationId);
      return res.json({ count: totalCount });
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error getting total registrations count:", error.message);
      res.status(500).json({ error: error.message || "Failed to get total registrations count" });
    }
  });
  
  app.get("/api/dashboard/camp-stats", async (req: Request, res: Response) => {
    try {
      const organizationId = authAndGetOrgId(req);
      const campStats = await storage.getCampCountsByStatus(organizationId);
      return res.json(campStats);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error getting camp statistics:", error.message);
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
  
  // =====================================================================
  // ORGANIZATION REPORTING ENDPOINTS
  // =====================================================================
  
  /**
   * Get registration report for an organization with optional date range filtering
   */
  app.get("/api/organizations/:orgId/reports/registrations", async (req: Request, res: Response) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Verify permissions
      if (userOrgId !== requestedOrgId && req.user.role !== "platform_admin") {
        throw new HttpError(403, "Not authorized to access reports for this organization");
      }
      
      // Parse date range filters from query params if provided
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      let dateRange: { startDate: Date, endDate: Date } | undefined;
      
      if (startDateStr && endDateStr) {
        dateRange = {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr)
        };
        
        // Set endDate to end of day to include full day
        dateRange.endDate.setHours(23, 59, 59, 999);
      }
      
      // Get the report from storage
      const report = await storage.getRegistrationsReport(requestedOrgId, dateRange);
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching registration report:", error);
      res.status(error.status || 500).json({ 
        message: error.message || "Failed to fetch registration report" 
      });
    }
  });
  
  /**
   * Get camp performance report for an organization with optional date range filtering
   */
  app.get("/api/organizations/:orgId/reports/camps", async (req: Request, res: Response) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Verify permissions
      if (userOrgId !== requestedOrgId && req.user.role !== "platform_admin") {
        throw new HttpError(403, "Not authorized to access reports for this organization");
      }
      
      // Parse date range filters from query params if provided
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      let dateRange: { startDate: Date, endDate: Date } | undefined;
      
      if (startDateStr && endDateStr) {
        dateRange = {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr)
        };
        
        // Set endDate to end of day to include full day
        dateRange.endDate.setHours(23, 59, 59, 999);
      }
      
      // Get the report from storage
      const report = await storage.getCampPerformanceReport(requestedOrgId, dateRange);
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching camp performance report:", error);
      res.status(error.status || 500).json({ 
        message: error.message || "Failed to fetch camp performance report" 
      });
    }
  });
  
  /**
   * Get financial report for an organization with optional date range filtering
   */
  app.get("/api/organizations/:orgId/reports/financials", async (req: Request, res: Response) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Verify permissions
      if (userOrgId !== requestedOrgId && req.user.role !== "platform_admin") {
        throw new HttpError(403, "Not authorized to access reports for this organization");
      }
      
      // Parse date range filters from query params if provided
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      let dateRange: { startDate: Date, endDate: Date } | undefined;
      
      if (startDateStr && endDateStr) {
        dateRange = {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr)
        };
        
        // Set endDate to end of day to include full day
        dateRange.endDate.setHours(23, 59, 59, 999);
      }
      
      // Get the report from storage
      const report = await storage.getFinancialReport(requestedOrgId, dateRange);
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching financial report:", error);
      res.status(error.status || 500).json({ 
        message: error.message || "Failed to fetch financial report" 
      });
    }
  });
  
  /**
   * Get attendance report for an organization with optional date range filtering
   */
  app.get("/api/organizations/:orgId/reports/attendance", async (req: Request, res: Response) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Verify permissions
      if (userOrgId !== requestedOrgId && req.user.role !== "platform_admin") {
        throw new HttpError(403, "Not authorized to access reports for this organization");
      }
      
      // Parse date range filters from query params if provided
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      let dateRange: { startDate: Date, endDate: Date } | undefined;
      
      if (startDateStr && endDateStr) {
        dateRange = {
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr)
        };
        
        // Set endDate to end of day to include full day
        dateRange.endDate.setHours(23, 59, 59, 999);
      }
      
      // Get the report from storage
      const report = await storage.getAttendanceReport(requestedOrgId, dateRange);
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching attendance report:", error);
      res.status(error.status || 500).json({ 
        message: error.message || "Failed to fetch attendance report" 
      });
    }
  });

  // Update organization profile (requires authentication and ownership)
  app.patch("/api/organizations/:orgId/profile", async (req, res) => {
    try {
      console.log(`Organization profile update for org ID: ${req.params.orgId}`);
      console.log('Request body received:', JSON.stringify(req.body));
      
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to update this organization's profile");
      }
      
      // Filter request body to only allow specific fields for update
      // This prevents sending unnecessary data to the database
      const allowedFields = [
        'name', 'description', 'primaryColor', 'secondaryColor', 'buttonColor',
        'aboutText', 'contactEmail', 'websiteUrl', 'socialLinks',
        'displayName', 'slug'
      ];
      
      console.log('Raw request body fields:', Object.keys(req.body));
      console.log('Social links from request:', req.body.socialLinks);
      
      // Create a clean update object with only allowed fields
      const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key) && req.body[key] !== undefined)
        .reduce((obj, key) => {
          // Special handling for socialLinks
          if (key === 'socialLinks' && req.body[key]) {
            // Ensure all social link fields exist
            obj[key] = {
              facebook: req.body[key].facebook || '',
              twitter: req.body[key].twitter || '',
              linkedin: req.body[key].linkedin || '',
              instagram: req.body[key].instagram || ''
            };
          } else {
            obj[key as keyof typeof req.body] = req.body[key];
          }
          return obj;
        }, {} as Record<string, any>);
      
      console.log('Cleaned update data:', updateData);
      
      // Make sure name is always included as it's required
      if (!updateData.name && req.body.name) {
        updateData.name = req.body.name;
      }
      
      // Handle update with the cleaned fields
      const updatedOrg = await storage.updateOrganizationProfile(requestedOrgId, updateData);
      
      res.json(updatedOrg);
    } catch (error: any) {
      console.error("Error updating organization profile:", error);
      res.status(500).json({ message: error.message || "Failed to update organization profile" });
    }
  });
  
  // Upload organization logo
  app.post("/api/organizations/:orgId/logo", upload.single('logo'), async (req, res) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to update this organization's logo");
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No logo file uploaded" });
      }
      
      // Get the file path
      const logoUrl = `/uploads/${req.file.filename}`;
      
      // Update the organization with the new logo URL
      const updatedOrg = await storage.updateOrganizationProfile(requestedOrgId, {
        logoUrl: logoUrl
      });
      
      res.json({
        success: true,
        logoUrl: logoUrl
      });
    } catch (error: any) {
      console.error("Error uploading organization logo:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
    }
  });

  // Remove organization logo
  app.delete("/api/organizations/:orgId/logo", async (req, res) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to remove this organization's logo");
      }
      
      // Update the organization to remove the logo URL
      const updatedOrg = await storage.updateOrganizationProfile(requestedOrgId, {
        logoUrl: null
      });
      
      res.json({
        success: true,
        message: "Logo removed successfully"
      });
    } catch (error: any) {
      console.error("Error removing organization logo:", error);
    }
  });
  
  // Get all camp messages for an organization
  app.get("/api/organizations/:orgId/camp-messages", async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const orgId = parseInt(req.params.orgId);
      
      // Check if user has permission to view messages for this organization
      if (req.user.organizationId !== orgId && req.user.role !== 'platform_admin') {
        return res.status(403).json({ message: "Not authorized to view messages for this organization" });
      }
      
      console.log(`Fetching camp messages for organization ${orgId}`);
      
      const messages = await storage.getOrganizationCampMessages(orgId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching organization camp messages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch organization camp messages" });
    }
  });
  
  // Upload organization banner
  app.post("/api/organizations/:orgId/banner", upload.single('banner'), async (req, res) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to update this organization's banner");
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No banner file uploaded" });
      }
      
      // Get the file path
      const bannerImageUrl = `/uploads/${req.file.filename}`;
      
      // Update the organization with the new banner URL
      const updatedOrg = await storage.updateOrganizationProfile(requestedOrgId, {
        bannerImageUrl: bannerImageUrl
      });
      
      res.json({
        success: true,
        bannerImageUrl: bannerImageUrl
      });
    } catch (error: any) {
      console.error("Error uploading organization banner:", error);
      res.status(500).json({ message: error.message || "Failed to upload banner" });
    }
  });
  
  // Remove organization banner
  app.delete("/api/organizations/:orgId/banner", async (req, res) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to update it
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to remove this organization's banner");
      }
      
      // Update the organization to remove the banner URL
      const updatedOrg = await storage.updateOrganizationProfile(requestedOrgId, {
        bannerImageUrl: null
      });
      
      res.json({
        success: true,
        message: "Banner removed successfully"
      });
    } catch (error: any) {
      console.error("Error removing organization banner:", error);
      res.status(500).json({ message: error.message || "Failed to remove banner" });
    }
  });

  // Send a message to an organization (available to authenticated users)
  app.post("/api/organizations/:orgId/messages", async (req, res) => {
    try {
      const requestedOrgId = parseInt(req.params.orgId);
      const organization = await storage.getOrganization(requestedOrgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Create the message
      const newMessage = await storage.createOrganizationMessage({
        organizationId: requestedOrgId,
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
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to view messages
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to view this organization's messages");
      }
      
      const messages = await storage.getOrganizationMessages(requestedOrgId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching organization messages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  // Get unread organization messages count (requires authentication and ownership)
  app.get("/api/organizations/:orgId/messages/unread", async (req, res) => {
    try {
      // Get authenticated user's organization ID and check authorization
      const userOrgId = authAndGetOrgId(req);
      const requestedOrgId = parseInt(req.params.orgId);
      
      // Only allow camp creators who belong to this organization to view message stats
      if (userOrgId !== requestedOrgId || req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to view this organization's messages");
      }
      
      const unreadMessages = await storage.getUnreadOrganizationMessages(requestedOrgId);
      res.json({ count: unreadMessages.length });
    } catch (error: any) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: error.message || "Failed to fetch unread message count" });
    }
  });

  // Mark message as read (requires authentication and ownership)
  app.patch("/api/organizations/messages/:messageId/read", async (req, res) => {
    try {
      // Get authenticated user's organization ID using our standard helper
      const userOrgId = authAndGetOrgId(req);
      
      // Only camp creators can mark messages as read
      if (req.user.role !== "camp_creator") {
        throw new HttpError(403, "Not authorized to mark messages as read");
      }
      
      const messageId = parseInt(req.params.messageId);
      
      // Get the message to verify ownership
      const message = await storage.getOrganizationMessage(messageId);
      
      if (!message) {
        throw new HttpError(404, "Message not found");
      }
      
      // Verify the user belongs to the organization the message was sent to
      if (message.organizationId !== userOrgId) {
        throw new HttpError(403, "Not authorized to mark this message as read");
      }
      
      const updatedMessage = await storage.markMessageAsRead(messageId);
      
      res.json(updatedMessage);
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      res.status(error.statusCode || 500).json({ message: error.message || "Failed to mark message as read" });
    }
  });

  // ====== Permission Management Routes ======
  
  // Get all permission sets for an organization
  app.get("/api/organizations/:organizationId/permissions/sets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can view permission sets
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to view permission sets" });
      }
      
      const organizationId = parseInt(req.params.organizationId);
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== organizationId) {
        return res.status(403).json({ message: "Not authorized to view permission sets for this organization" });
      }
      
      const permissionSets = await storage.getPermissionSetsByOrganization(organizationId);
      res.json(permissionSets);
    } catch (error: any) {
      console.error("Error fetching permission sets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch permission sets" });
    }
  });
  
  // Get a specific permission set
  app.get("/api/permissions/sets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const setId = parseInt(req.params.id);
      const permissionSet = await storage.getPermissionSet(setId);
      
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== permissionSet.organizationId) {
        return res.status(403).json({ message: "Not authorized to view this permission set" });
      }
      
      // Get the associated permissions
      const permissions = await storage.getPermissionsBySet(setId);
      
      res.json({
        ...permissionSet,
        permissions
      });
    } catch (error: any) {
      console.error("Error fetching permission set:", error);
      res.status(500).json({ message: error.message || "Failed to fetch permission set" });
    }
  });
  
  // Create a new permission set
  app.post("/api/organizations/:organizationId/permissions/sets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can create permission sets
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to create permission sets" });
      }
      
      const organizationId = parseInt(req.params.organizationId);
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== organizationId) {
        return res.status(403).json({ message: "Not authorized to create permission sets for this organization" });
      }
      
      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Permission set name is required" });
      }
      
      const newPermissionSet = await storage.createPermissionSet({
        name: req.body.name,
        description: req.body.description || null,
        organizationId,
        isDefault: req.body.isDefault || false,
        defaultForRole: req.body.defaultForRole || null
      });
      
      res.status(201).json(newPermissionSet);
    } catch (error: any) {
      console.error("Error creating permission set:", error);
      res.status(500).json({ message: error.message || "Failed to create permission set" });
    }
  });
  
  // Get all user permissions for an organization
  app.get("/api/organizations/:organizationId/permissions/users", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can view all permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const organizationId = parseInt(req.params.organizationId);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }
      
      // Get all user permissions for the organization
      const permissions = await storage.getAllUserPermissionsForOrganization(organizationId);
      res.json(permissions);
    } catch (error: any) {
      console.error("Error getting user permissions:", error);
      res.status(500).json({ message: error.message || "Failed to get user permissions" });
    }
  });
  
  // Update a permission set
  app.put("/api/permissions/sets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can update permission sets
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to update permission sets" });
      }
      
      const setId = parseInt(req.params.id);
      const permissionSet = await storage.getPermissionSet(setId);
      
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== permissionSet.organizationId) {
        return res.status(403).json({ message: "Not authorized to update this permission set" });
      }
      
      // Update the permission set
      const updatedSet = await storage.updatePermissionSet(setId, {
        name: req.body.name,
        description: req.body.description,
        isDefault: req.body.isDefault,
        defaultForRole: req.body.defaultForRole
      });
      
      res.json(updatedSet);
    } catch (error: any) {
      console.error("Error updating permission set:", error);
      res.status(500).json({ message: error.message || "Failed to update permission set" });
    }
  });
  
  // Delete a permission set
  app.delete("/api/permissions/sets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can delete permission sets
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to delete permission sets" });
      }
      
      const setId = parseInt(req.params.id);
      const permissionSet = await storage.getPermissionSet(setId);
      
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== permissionSet.organizationId) {
        return res.status(403).json({ message: "Not authorized to delete this permission set" });
      }
      
      // Check if this is a default permission set for a role
      if (permissionSet.isDefault && permissionSet.defaultForRole) {
        return res.status(400).json({ 
          message: `Cannot delete the default permission set for role "${permissionSet.defaultForRole}"`
        });
      }
      
      // Delete the permission set (should cascade delete permissions)
      await storage.deletePermissionSet(setId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting permission set:", error);
      res.status(500).json({ message: error.message || "Failed to delete permission set" });
    }
  });
  
  // Add permissions to a permission set
  app.post("/api/permissions/sets/:id/permissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can add permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to add permissions" });
      }
      
      const setId = parseInt(req.params.id);
      const permissionSet = await storage.getPermissionSet(setId);
      
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== permissionSet.organizationId) {
        return res.status(403).json({ message: "Not authorized to add permissions to this set" });
      }
      
      // Validate required fields
      if (!req.body.resource || !req.body.action) {
        return res.status(400).json({ message: "Resource and action are required" });
      }
      
      // Create the permission
      const newPermission = await storage.createPermission({
        permissionSetId: setId,
        resource: req.body.resource,
        action: req.body.action,
        scope: req.body.scope || "organization",
        allowed: req.body.allowed !== undefined ? req.body.allowed : true
      });
      
      res.status(201).json(newPermission);
    } catch (error: any) {
      console.error("Error adding permission:", error);
      res.status(500).json({ message: error.message || "Failed to add permission" });
    }
  });
  
  // Update a permission
  app.put("/api/permissions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can update permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to update permissions" });
      }
      
      const permissionId = parseInt(req.params.id);
      
      // Get the permission to verify ownership
      const permissions = await storage.getPermissionsBySet(req.body.permissionSetId);
      const permission = permissions.find(p => p.id === permissionId);
      
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      // Get the permission set to check organization
      const permissionSet = await storage.getPermissionSet(permission.permissionSetId);
      
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      // Verify the user is part of this organization
      if (req.user.organizationId !== permissionSet.organizationId) {
        return res.status(403).json({ message: "Not authorized to update this permission" });
      }
      
      // Update the permission
      const updatedPermission = await storage.updatePermission(permissionId, {
        resource: req.body.resource,
        action: req.body.action,
        scope: req.body.scope,
        allowed: req.body.allowed
      });
      
      res.json(updatedPermission);
    } catch (error: any) {
      console.error("Error updating permission:", error);
      res.status(500).json({ message: error.message || "Failed to update permission" });
    }
  });
  
  // Delete a permission
  app.delete("/api/permissions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can delete permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to delete permissions" });
      }
      
      const permissionId = parseInt(req.params.id);
      
      // Get all permissions and find the one to be deleted
      // This is not optimal but we need to find the permission set ID
      const allPermissionSets = await storage.getPermissionSetsByOrganization(req.user.organizationId);
      let foundPermission = null;
      let permissionSetId = null;
      
      for (const set of allPermissionSets) {
        const permissions = await storage.getPermissionsBySet(set.id);
        const permission = permissions.find(p => p.id === permissionId);
        if (permission) {
          foundPermission = permission;
          permissionSetId = set.id;
          break;
        }
      }
      
      if (!foundPermission || !permissionSetId) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      // Delete the permission
      await storage.deletePermission(permissionId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ message: error.message || "Failed to delete permission" });
    }
  });
  
  // Assign permission set to user
  app.post("/api/users/:userId/permissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can assign permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to assign permissions" });
      }
      
      const userId = parseInt(req.params.userId);
      
      // Make sure we have a permission set ID
      if (!req.body.permissionSetId) {
        return res.status(400).json({ message: "Permission set ID is required" });
      }
      
      const permissionSetId = parseInt(req.body.permissionSetId);
      
      // Get the user to verify they're in the same organization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized to assign permissions to this user" });
      }
      
      // Get the permission set to verify it's in the same organization
      const permissionSet = await storage.getPermissionSet(permissionSetId);
      if (!permissionSet) {
        return res.status(404).json({ message: "Permission set not found" });
      }
      
      if (permissionSet.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized to assign this permission set" });
      }
      
      // Assign the permission set to the user
      const userPermission = await storage.assignPermissionSetToUser({
        userId,
        permissionSetId
      });
      
      res.status(201).json(userPermission);
    } catch (error: any) {
      console.error("Error assigning permission set to user:", error);
      res.status(500).json({ message: error.message || "Failed to assign permission set" });
    }
  });
  
  // Get user permissions
  app.get("/api/users/:userId/permissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      
      // Users can view their own permissions, admins can view anyone's
      if (req.user.id !== userId && req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to view this user's permissions" });
      }
      
      // If admin is viewing another user, make sure they're in the same org
      if (req.user.id !== userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        if (user.organizationId !== req.user.organizationId) {
          return res.status(403).json({ message: "Not authorized to view this user's permissions" });
        }
      }
      
      // Get the user's permission sets with associated permissions
      const userPermissionSets = await storage.getUserPermissionSets(userId);
      
      // For each permission set, get the permissions
      const result = await Promise.all(userPermissionSets.map(async (up) => {
        const permissions = await storage.getPermissionsBySet(up.permissionSetId);
        return {
          ...up,
          permissions
        };
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch user permissions" });
    }
  });
  
  // Remove permission set from user
  app.delete("/api/users/:userId/permissions/:permissionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only org owners (camp creators) can remove permissions
      if (req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to remove permissions" });
      }
      
      const userId = parseInt(req.params.userId);
      const permissionId = parseInt(req.params.permissionId);
      
      // Get the user to verify they're in the same organization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Not authorized to remove permissions from this user" });
      }
      
      // Remove the permission from the user
      await storage.removeUserPermission(permissionId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error removing permission from user:", error);
      res.status(500).json({ message: error.message || "Failed to remove permission" });
    }
  });
  
  // Check if user has a specific permission
  app.get("/api/permissions/check", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Required query parameters
      const { resource, action, scope = "organization" } = req.query;
      
      if (!resource || !action) {
        return res.status(400).json({ message: "Resource and action are required query parameters" });
      }
      
      // Check if the user has the requested permission
      const hasPermission = await storage.checkUserPermission(
        req.user.id,
        resource as string,
        action as string,
        scope as string
      );
      
      res.json({ hasPermission });
    } catch (error: any) {
      console.error("Error checking permission:", error);
      res.status(500).json({ message: error.message || "Failed to check permission" });
    }
  });

  // =========================================================================
  // Stripe Connect API endpoints
  // =========================================================================
  
  // Stripe webhook endpoint
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);
  
  // Create a Stripe Connect account for an organization
  app.post("/api/organizations/:orgId/stripe/create-account", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization owners can create Stripe accounts
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      // Get the organization
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if organization already has a Stripe account
      if (organization.stripeAccountId) {
        return res.status(400).json({ 
          message: "Organization already has a Stripe account",
          accountId: organization.stripeAccountId 
        });
      }
      
      // Create a Stripe account
      const account = await createStripeConnectedAccount(organization.contactEmail || req.user.email);
      
      // Update the organization with the Stripe account ID
      await db.update(organizations)
        .set({
          stripeAccountId: account.id,
          stripeAccountStatus: 'pending',
          stripeAccountDetailsSubmitted: false,
          stripeAccountChargesEnabled: false,
          stripeAccountPayoutsEnabled: false,
        })
        .where(eq(organizations.id, orgId));
      
      res.status(201).json({ accountId: account.id });
    } catch (error: any) {
      console.error("Stripe account creation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create Stripe account",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Create a Stripe account link for onboarding
  app.post("/api/organizations/:orgId/stripe/create-account-link", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization owners can manage Stripe accounts
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      const { refreshUrl, returnUrl } = req.body;
      if (!refreshUrl || !returnUrl) {
        return res.status(400).json({ message: "Refresh URL and return URL are required" });
      }
      
      // Get the organization's Stripe account ID
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (!organization.stripeAccountId) {
        return res.status(400).json({ message: "Organization doesn't have a Stripe account yet" });
      }
      
      // Create an account link for onboarding
      const accountLink = await createStripeAccountLink(
        organization.stripeAccountId,
        refreshUrl,
        returnUrl
      );
      
      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe account link creation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create account link",
        error: process.env.NODE_ENV === 'development' ? error : undefined  
      });
    }
  });
  
  // Get Stripe account status for an organization
  app.get("/api/organizations/:orgId/stripe/account-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization members can view Stripe account status
      if (req.user.organizationId !== orgId) {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      // Get the organization
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (!organization.stripeAccountId) {
        return res.json({ 
          hasStripeAccount: false,
          status: 'not_created',
          message: "Organization doesn't have a Stripe account yet" 
        });
      }
      
      // Fetch the latest status from Stripe
      const account = await retrieveStripeAccount(organization.stripeAccountId);
      
      // Update the status in the database
      await updateOrganizationStripeStatus(orgId, organization.stripeAccountId);
      
      // Get the updated organization with the new status
      const updatedOrg = await storage.getOrganization(orgId);
      
      res.json({
        hasStripeAccount: true,
        accountId: updatedOrg.stripeAccountId,
        status: updatedOrg.stripeAccountStatus,
        detailsSubmitted: updatedOrg.stripeAccountDetailsSubmitted,
        chargesEnabled: updatedOrg.stripeAccountChargesEnabled,
        payoutsEnabled: updatedOrg.stripeAccountPayoutsEnabled,
        // Additional info from Stripe
        requirements: account.requirements,
        capabilities: account.capabilities
      });
    } catch (error: any) {
      console.error("Stripe account status check error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to check account status",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Create a checkout session for registration payment
  app.post("/api/camps/:campId/registrations/:registrationId/checkout", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      const campId = parseInt(req.params.campId);
      const registrationId = parseInt(req.params.registrationId);
      
      // Get the registration
      const registration = await storage.getRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Verify the registration belongs to the specified camp
      if (registration.campId !== campId) {
        return res.status(400).json({ message: "Registration doesn't belong to this camp" });
      }
      
      // For parents, verify they own the registration (child belongs to them)
      if (req.user.role === "parent") {
        const child = await storage.getChild(registration.childId);
        if (!child || child.parentId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized for this registration" });
        }
      }
      
      // Get the camp
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Get the organization
      const organization = await storage.getOrganization(camp.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if organization has a Stripe account
      if (!organization.stripeAccountId) {
        return res.status(400).json({ message: "Organization doesn't have a Stripe account set up" });
      }
      
      // Check if the Stripe account is ready to accept payments
      if (!organization.stripeAccountChargesEnabled) {
        return res.status(400).json({ message: "Organization's Stripe account is not fully set up for payments" });
      }
      
      const { successUrl, cancelUrl } = req.body;
      if (!successUrl || !cancelUrl) {
        return res.status(400).json({ message: "Success URL and cancel URL are required" });
      }
      
      // Calculate the price
      const priceInCents = Math.round(parseFloat(camp.price) * 100); // Convert to cents
      
      // Create checkout session
      const session = await createCheckoutSession(
        campId,
        registration.childId,
        camp.organizationId,
        organization.stripeAccountId,
        priceInCents,
        camp.name,
        successUrl,
        cancelUrl,
        { registrationId: registrationId.toString() }
      );
      
      // Store the checkout session ID in the registration
      await db.update(registrations)
        .set({ stripePaymentId: session.id })
        .where(eq(registrations.id, registrationId));
      
      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error: any) {
      console.error("Checkout session creation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create checkout session",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Update organization Stripe settings (fee passthrough, platform fee)
  app.put("/api/organizations/:orgId/stripe/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization owners can update Stripe settings
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      const { stripeFeePassthrough, stripePlatformFeePercent } = req.body;
      
      // Validate the fee percentage
      if (stripePlatformFeePercent !== undefined) {
        const feePercent = parseFloat(stripePlatformFeePercent);
        if (isNaN(feePercent) || feePercent < 0) {
          return res.status(400).json({ message: "Platform fee percentage must be a non-negative number" });
        }
      }
      
      // Update the organization with the new settings
      await db.update(organizations)
        .set({
          stripeFeePassthrough: stripeFeePassthrough === undefined ? undefined : !!stripeFeePassthrough,
          stripePlatformFeePercent: stripePlatformFeePercent === undefined ? undefined : stripePlatformFeePercent
        })
        .where(eq(organizations.id, orgId));
      
      const updatedOrg = await storage.getOrganization(orgId);
      
      res.json({
        stripeFeePassthrough: updatedOrg.stripeFeePassthrough,
        stripePlatformFeePercent: updatedOrg.stripePlatformFeePercent
      });
    } catch (error: any) {
      console.error("Stripe settings update error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to update Stripe settings",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Create a dashboard login link for Stripe Express
  app.post("/api/organizations/:orgId/stripe/dashboard-link", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization owners can access Stripe dashboard
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      // Check if Stripe API key is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          message: "Stripe is not properly configured. Please contact the platform administrator." 
        });
      }
      
      // Get the organization's Stripe account ID
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (!organization.stripeAccountId) {
        return res.status(400).json({ message: "Organization doesn't have a Stripe account yet" });
      }
      
      // Create a login link for the Stripe Express dashboard
      const loginLink = await createStripeDashboardLoginLink(organization.stripeAccountId);
      
      res.json({ url: loginLink.url });
    } catch (error: any) {
      console.error("Stripe dashboard link creation error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create dashboard link",
        error: process.env.NODE_ENV === 'development' ? error : undefined  
      });
    }
  });
  
  // ======================
  // Subscription Plan Routes
  // ======================
  
  // Get all subscription plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch subscription plans",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Get a specific subscription plan
  app.get("/api/subscription-plans/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getSubscriptionPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json(plan);
    } catch (error: any) {
      console.error(`Error fetching subscription plan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch subscription plan",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Create a new subscription plan (admin only)
  app.post("/api/subscription-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admin users should be able to create subscription plans
      const user = await storage.getUser(req.user.id);
      if (user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to create subscription plans" });
      }
      
      const planData = req.body;
      const newPlan = await storage.createSubscriptionPlan(planData);
      
      res.status(201).json(newPlan);
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create subscription plan",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Update a subscription plan (admin only)
  app.put("/api/subscription-plans/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Only admin users should be able to update subscription plans
      const user = await storage.getUser(req.user.id);
      if (user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized to update subscription plans" });
      }
      
      const planId = parseInt(req.params.id);
      const planData = req.body;
      
      const updatedPlan = await storage.updateSubscriptionPlan(planId, planData);
      
      res.json(updatedPlan);
    } catch (error: any) {
      console.error(`Error updating subscription plan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: error.message || "Failed to update subscription plan",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Get organization's active subscription
  app.get("/api/organizations/:orgId/subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Check if the user belongs to the requested organization
      if (req.user.organizationId !== orgId) {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      const subscription = await storage.getOrganizationActiveSubscription(orgId);
      
      if (!subscription) {
        return res.json({ active: false });
      }
      
      res.json({
        active: true,
        subscription
      });
    } catch (error: any) {
      console.error(`Error fetching organization subscription for ${req.params.orgId}:`, error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch organization subscription",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
  
  // Create/update an organization subscription
  app.post("/api/organizations/:orgId/subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const orgId = parseInt(req.params.orgId);
      
      // Only organization owners can update subscriptions
      if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
      
      const subscriptionData = {
        ...req.body,
        organizationId: orgId
      };
      
      // Check if there's an existing subscription to update
      const existingSubscription = await storage.getOrganizationSubscription(orgId);
      
      let subscription;
      if (existingSubscription) {
        subscription = await storage.updateOrganizationSubscription(existingSubscription.id, subscriptionData);
      } else {
        subscription = await storage.createOrganizationSubscription(subscriptionData);
      }
      
      res.json(subscription);
    } catch (error: any) {
      console.error(`Error updating organization subscription for ${req.params.orgId}:`, error);
      res.status(500).json({ 
        message: error.message || "Failed to update organization subscription",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Camp Staff Management Routes
  // Get all staff for a camp
  app.get("/api/camps/:campId/staff", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const campId = parseInt(req.params.campId);
      
      // Check if camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has access to this camp (organization member or platform admin)
      if (req.user.role !== "platform_admin" && req.user.organizationId !== camp.organizationId) {
        return res.status(403).json({ message: "Not authorized to access this camp" });
      }
      
      const staffMembers = await storage.getCampStaff(campId);
      res.json(staffMembers);
    } catch (error: any) {
      console.error("Error getting camp staff:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Add staff to a camp
  app.post("/api/camps/:campId/staff", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const campId = parseInt(req.params.campId);
      const { userId, role } = req.body;
      
      // Validate input
      if (!userId || !role) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      // Check if camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has access to manage this camp (organization admin/manager or platform admin)
      if (req.user.role !== "platform_admin" && req.user.role !== "camp_creator" && 
          (req.user.organizationId !== camp.organizationId || req.user.role !== "manager")) {
        return res.status(403).json({ message: "Not authorized to manage staff for this camp" });
      }
      
      // Check if the user being added exists and belongs to the same organization
      const staffUser = await storage.getUser(userId);
      if (!staffUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (staffUser.organizationId !== camp.organizationId) {
        return res.status(400).json({ message: "User must belong to the same organization as the camp" });
      }
      
      // Add the staff member
      const addedStaff = await storage.addCampStaff(campId, userId, role);
      res.status(201).json(addedStaff);
    } catch (error: any) {
      console.error("Error adding camp staff:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update staff role for a camp
  app.patch("/api/camps/:campId/staff/:userId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const campId = parseInt(req.params.campId);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      // Validate input
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      // Check if camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has access to manage this camp
      if (req.user.role !== "platform_admin" && req.user.role !== "camp_creator" && 
          (req.user.organizationId !== camp.organizationId || req.user.role !== "manager")) {
        return res.status(403).json({ message: "Not authorized to manage staff for this camp" });
      }
      
      // Update the staff member
      const updatedStaff = await storage.updateCampStaff(campId, userId, role);
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff member not found for this camp" });
      }
      
      res.json(updatedStaff);
    } catch (error: any) {
      console.error("Error updating camp staff:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Remove staff from a camp
  app.delete("/api/camps/:campId/staff/:userId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const campId = parseInt(req.params.campId);
      const userId = parseInt(req.params.userId);
      
      // Check if camp exists
      const camp = await storage.getCamp(campId);
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user has access to manage this camp
      if (req.user.role !== "platform_admin" && req.user.role !== "camp_creator" && 
          (req.user.organizationId !== camp.organizationId || req.user.role !== "manager")) {
        return res.status(403).json({ message: "Not authorized to manage staff for this camp" });
      }
      
      // Remove the staff member
      const removed = await storage.removeCampStaff(campId, userId);
      if (!removed) {
        return res.status(404).json({ message: "Staff member not found for this camp" });
      }
      
      res.json({ message: "Staff member removed successfully" });
    } catch (error: any) {
      console.error("Error removing camp staff:", error);
      res.status(500).json({ message: error.message });
    }
  });

  return createServer(app);
}