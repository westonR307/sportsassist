import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCampSchema, insertChildSchema, insertRegistrationSchema, insertOrganizationSchema, insertInvitationSchema } from "@shared/schema";
import Stripe from "stripe";
import { hashPassword } from "./utils";
import { randomBytes } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Update the registration route to handle organization creation
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    try {
      let user;
      if (req.body.role === "admin" && req.body.organizationName) {
        // Create organization first
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
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can send invitations" });
    }

    const orgId = parseInt(req.params.orgId);
    if (req.user.organizationId !== orgId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }

    const parsed = insertInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid invitation data" });
    }

    try {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const invitation = await storage.createInvitation({
        ...parsed.data,
        organizationId: orgId,
        token,
        expiresAt,
      });

      // TODO: Send invitation email

      res.status(201).json(invitation);
    } catch (error) {
      console.error("Invitation creation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get("/api/organizations/:orgId/invitations", async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view invitations" });
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
  app.post("/api/children", async (req, res) => {
    console.log("Received request to create child:", req.body);

    if (!req.user) {
      console.log("Unauthorized - no user found");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "parent") {
      console.log("Forbidden - user is not a parent");
      return res.status(403).json({ message: "Only parents can add children" });
    }

    const parsed = insertChildSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("Validation error:", parsed.error);
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }

    try {
      const child = await storage.createChild({
        ...parsed.data,
        parentId: req.user.id
      });
      console.log("Child created successfully:", child);
      res.status(201).json(child);
    } catch (error) {
      console.error("Server error creating child:", error);
      res.status(500).json({ message: "Failed to create child" });
    }
  });

  app.get("/api/children", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Only parents can view children" });
    }

    const children = await storage.getChildrenByParent(req.user.id);
    res.json(children);
  });

  // Camp routes
  app.post("/api/camps", async (req, res) => {
    if (!["admin", "manager"].includes(req.user?.role || "")) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const parsed = insertCampSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const camp = await storage.createCamp({
      ...parsed.data,
      organizationId: req.user.organizationId!,
    });
    res.status(201).json(camp);
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

  const httpServer = createServer(app);
  return httpServer;
}