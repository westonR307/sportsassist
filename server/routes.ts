import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCampSchema, insertChildSchema, insertRegistrationSchema } from "@shared/schema";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Children routes
  app.post("/api/children", async (req, res) => {
    if (req.user?.role !== "parent") {
      return res.status(403).json({ message: "Only parents can add children" });
    }
    
    const parsed = insertChildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const child = await storage.createChild({ ...parsed.data, parentId: req.user.id });
    res.status(201).json(child);
  });

  // Camp routes
  app.post("/api/camps", async (req, res) => {
    if (!["admin", "manager"].includes(req.user?.role || "")) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const parsed = insertCampSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const camp = await storage.createCamp(parsed.data);
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
