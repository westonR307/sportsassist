import { Router, Request, Response, NextFunction, Express } from "express";
import { insertChildSchema } from "@shared/schema";
import { storage } from "./storage";
import { Gender, ContactMethod } from "@shared/types";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { children, registrations, camps } from "@shared/tables";

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
      
      console.log(`Getting children for parent ID: ${req.user.id}`);
      const children = await storage.getChildrenByParent(req.user.id);
      console.log(`Found ${children.length} children for parent ID: ${req.user.id}`);
      
      if (children.length > 0) {
        console.log(`Sample child: Parent ID: ${children[0].parentId}, Child ID: ${children[0].id}, Name: ${children[0].fullName}`);
      }
      
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
  
  // Get all registrations for the parent's children
  router.get("/registrations", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log(`Getting registrations for parent ID: ${req.user.id}`);
      
      // First get all of this parent's children
      const children = await storage.getChildrenByParent(req.user.id);
      
      console.log(`Found ${children.length} children for parent ID: ${req.user.id}`);
      
      if (children.length === 0) {
        // If there are no children, return an empty list
        return res.json([]);
      }
      
      // Create an array to hold all of our results
      const result = [];
      
      // Get the IDs of this parent's children to use in the database query
      const childIds = children.map(child => child.id);
      console.log(`Child IDs for parent ${req.user.id}: ${childIds.join(', ')}`);
      
      // If no child IDs, return empty array
      if (childIds.length === 0) {
        return res.json([]);
      }
      
      // Use an "in" clause to get all registrations for all of this parent's children in one query
      const childRegistrations = await db
        .select()
        .from(registrations)
        .where(
          // Only get registrations for children that belong to this parent
          registrations.childId.in(childIds)
        );
      
      console.log(`Found ${childRegistrations.length} registrations for children of parent ${req.user.id}`);
      
      // For each registration, get the camp and format the response
      for (const registration of childRegistrations) {
        // Find the child this registration belongs to
        const child = children.find(c => c.id === registration.childId);
        
        if (!child) {
          console.warn(`Could not find child with ID ${registration.childId} for registration ${registration.id}`);
          continue;
        }
        
        // Get the camp details
        const camp = await storage.getCamp(registration.campId);
        
        if (camp) {
          // Add this registration with camp and child details to the results
          result.push({
            ...registration,
            camp,
            child: {
              id: child.id,
              fullName: child.fullName,
              profilePhoto: child.profilePhoto
            }
          });
        }
      }
      
      console.log(`Found ${result.length} total registrations for parent's children`);
      return res.json(result);
    } catch (error: any) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Mount the parent routes with the /api/parent prefix
  app.use('/api/parent', router);
}