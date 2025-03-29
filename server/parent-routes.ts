import { Router, Request, Response, NextFunction, Express } from "express";
import { insertChildSchema } from "@shared/schema";
import { storage } from "./storage";
import { Gender, ContactMethod } from "@shared/types";

// Helper function to check if user is authenticated and is a parent
function ensureParent(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== "parent") {
    return res.status(403).json({ message: "Access denied. You must be a parent to access this resource." });
  }
  
  next();
}

export function registerParentRoutes(app: Express) {
  const router = Router();
  
  // Middleware to ensure user is a parent for all routes in this group
  router.use("/", ensureParent);
  
  // Get all children for the authenticated parent
  router.get("/children", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const children = await storage.getChildrenByParent(req.user.id);
      res.json(children);
    } catch (error: any) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });
  
  // Add a new child
  router.post("/children", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const parsedData = insertChildSchema.safeParse({
        ...req.body,
        parentId: req.user.id,
      });
      
      if (!parsedData.success) {
        return res.status(400).json({ message: "Invalid child data", errors: parsedData.error.format() });
      }
      
      // Format dates properly and add parent ID
      const data = {
        ...parsedData.data,
        dateOfBirth: new Date(parsedData.data.dateOfBirth),
        parentId: req.user.id,
        // Ensure gender is a valid Gender type
        gender: parsedData.data.gender as Gender,
        // Ensure preferredContact is a valid ContactMethod type
        preferredContact: parsedData.data.preferredContact as ContactMethod,
      };
      
      const child = await storage.createChild(data);
      res.status(201).json(child);
    } catch (error: any) {
      console.error("Error creating child:", error);
      res.status(500).json({ message: "Failed to create child" });
    }
  });
  
  // Get a specific child by ID (with permission check)
  router.get("/children/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const childId = parseInt(req.params.id);
      const child = await storage.getChild(childId);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // Ensure the child belongs to the authenticated parent
      if (child.parentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(child);
    } catch (error: any) {
      console.error("Error fetching child:", error);
      res.status(500).json({ message: "Failed to fetch child" });
    }
  });
  
  // Update a child's information
  router.put("/children/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const childId = parseInt(req.params.id);
      const child = await storage.getChild(childId);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // Ensure the child belongs to the authenticated parent
      if (child.parentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate the update data
      const parsedData = insertChildSchema.partial().safeParse({
        ...req.body,
        parentId: req.user.id,
      });
      
      if (!parsedData.success) {
        return res.status(400).json({ message: "Invalid child data", errors: parsedData.error.format() });
      }
      
      // Format dates if provided and handle type conversions
      const data = {
        ...parsedData.data,
        dateOfBirth: parsedData.data.dateOfBirth ? new Date(parsedData.data.dateOfBirth) : undefined,
        // Type cast for gender if it exists
        ...(parsedData.data.gender && { gender: parsedData.data.gender as Gender }),
        // Type cast for preferredContact if it exists
        ...(parsedData.data.preferredContact && { preferredContact: parsedData.data.preferredContact as ContactMethod }),
      };
      
      const updatedChild = await storage.updateChild(childId, data);
      res.json(updatedChild);
    } catch (error: any) {
      console.error("Error updating child:", error);
      res.status(500).json({ message: "Failed to update child" });
    }
  });
  
  // Mount the parent routes with the /api/parent prefix
  app.use('/api/parent', router);
}