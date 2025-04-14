import { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { IStorage } from "./storage";
import { Role } from "@shared/types";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    organizationId?: number;
  };
  isAuthenticated?: () => boolean;
}

// Validation schemas
const createCustomFieldSchema = z.object({
  name: z.string().min(2),
  label: z.string().min(2),
  description: z.string().optional().nullable(),
  fieldType: z.enum(["short_text", "long_text", "dropdown", "single_select", "multi_select"]),
  required: z.boolean().default(false),
  validationType: z.enum(["none", "required", "email", "phone", "number", "date"]).default("none"),
  options: z.array(z.string()).optional().nullable(),
  fieldSource: z.enum(["registration", "camp"]).default("registration"),
  isInternal: z.boolean().default(false),
  organizationId: z.number()
});

const updateCustomFieldSchema = createCustomFieldSchema.partial().omit({ organizationId: true });

const createCampCustomFieldSchema = z.object({
  customFieldId: z.number(),
  required: z.boolean().default(false),
  order: z.number().default(0)
});

const reorderFieldsSchema = z.object({
  fields: z.array(z.object({
    id: z.number(),
    order: z.number()
  }))
});

// Helper function to check if user can manage organization
function canManageOrganization(req: AuthenticatedRequest, organizationId: number | undefined): boolean {
  const user = req.user;
  if (!user) return false;

  // Admin can manage any organization
  if (user.role === "admin") return true;

  // Camp creator can only manage their own organization
  if (user.role === "camp_creator" && user.organizationId === organizationId) return true;

  return false;
}

// Helper function to check if user can manage camp
async function canManageCamp(storage: IStorage, userId: number, campId: number): Promise<boolean> {
  // Get the camp
  const camp = await storage.getCampById(campId);
  if (!camp) return false;

  // Check if user is the creator or a member of the organization
  return await storage.isUserAuthorizedForCamp(userId, campId);
}

export default function registerCustomFieldRoutes(app: Express, storage: IStorage) {
  // Direct DELETE route without authentication for debugging
  app.delete("/debug/custom-fields/:id", async (req: Request, res: Response) => {
    try {
      console.log("DEBUG DELETE endpoint hit!");
      const fieldId = parseInt(req.params.id);
      console.log("Attempting to delete field with ID:", fieldId);
      
      // Get the field
      const existingField = await storage.getCustomField(fieldId);
      if (!existingField) {
        console.log("Field not found with ID:", fieldId);
        return res.status(404).json({ error: "Custom field not found" });
      }
      
      console.log("Field found:", existingField);
      
      // Delete the field without any auth checks
      await storage.deleteCustomField(fieldId);
      console.log("Field deleted successfully via debug endpoint");
      
      res.status(204).send();
    } catch (error) {
      console.error("Error in debug delete endpoint:", error);
      res.status(500).json({ error: "Internal server error in debug endpoint" });
    }
  });
  // 1. List custom fields for an organization (with source and internal filters)
  app.get("/api/custom-fields", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get query parameters
      const fieldSource = req.query.source as "registration" | "camp" | undefined;
      const showInternalFields = req.query.internal === "true";

      // Determine organization ID
      let organizationId = req.query.organizationId 
        ? parseInt(req.query.organizationId as string) 
        : req.user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      // Check permissions
      const canView = canManageOrganization(req, organizationId) || req.user.role === "parent";
      if (!canView) {
        return res.status(403).json({ error: "Not authorized to view custom fields for this organization" });
      }

      // Get the custom fields filtered by source if provided
      let customFields = await storage.listCustomFields(organizationId, fieldSource);

      // Filter out internal fields for non-organization users
      if (!showInternalFields && req.user.role === "parent") {
        customFields = customFields.filter(field => !field.isInternal);
      }

      res.json(customFields);
    } catch (error) {
      console.error("Error getting custom fields:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 2. Get custom field by ID
  app.get("/api/custom-fields/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const fieldId = parseInt(req.params.id);
      const field = await storage.getCustomField(fieldId);

      if (!field) {
        return res.status(404).json({ error: "Custom field not found" });
      }

      // Check permissions
      const canView = canManageOrganization(req, field.organizationId) || 
        (req.user.role === "parent" && !field.isInternal);

      if (!canView) {
        return res.status(403).json({ error: "Not authorized to view this custom field" });
      }

      res.json(field);
    } catch (error) {
      console.error("Error getting custom field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 3. Create a new custom field
  app.post("/api/custom-fields", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Validate the request body
      const validation = createCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      const fieldData = validation.data;

      // First check authentication
      if (!req.isAuthenticated) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Then check permissions
      if (!canManageOrganization(req, fieldData.organizationId)) {
        return res.status(403).json({ 
          error: "Not authorized to create custom fields for this organization" 
        });
      }


      // Create the custom field
      const newField = await storage.createCustomField(fieldData);

      res.status(201).json(newField);
    } catch (error) {
      console.error("Error creating custom field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 4. Update an existing custom field
  app.patch("/api/custom-fields/:id", async (req: AuthenticatedRequest, res: Response) => {
    // Debug authentication issue
    console.log('Update custom field endpoint triggered in custom-field-routes.ts');
    console.log('Auth status:', req.isAuthenticated ? req.isAuthenticated() : 'No isAuthenticated method');
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.user);
    
    if (!req.user) {
      console.log('Authentication check failed, user is not authenticated');
      return res.status(401).json({ message: "Authentication required" });
    }

    const fieldId = parseInt(req.params.id);
    if (isNaN(fieldId)) {
      return res.status(400).json({ message: "Invalid field ID" });
    }
    
    try {
      // Get the existing field to check permissions
      const existingField = await storage.getCustomField(fieldId);
      if (!existingField) {
        return res.status(404).json({ message: "Custom field not found" });
      }

      console.log('Custom field found:', existingField);
      console.log('User organization:', req.user.organizationId);
      console.log('Field organization:', existingField.organizationId);

      // Validate the request body
      const validation = updateCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      // Check if user has access to this organization's custom fields
      // Allow camp creators to edit custom fields from their organization
      const userCanEditField = req.user.role === 'admin' || 
                              (req.user.role === 'camp_creator' && req.user.organizationId === existingField.organizationId);
      
      if (!userCanEditField) {
        return res.status(403).json({ message: "You don't have permission to modify this custom field" });
      }

      // Update the custom field
      const updatedField = await storage.updateCustomField(fieldId, validation.data);
      console.log('Field updated successfully');
      res.json(updatedField);
    } catch (error) {
      console.error("Error updating custom field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 5. Delete a custom field
  app.delete("/api/custom-fields/:id", async (req: AuthenticatedRequest, res: Response) => {
    console.log('DELETE endpoint triggered for /api/custom-fields/:id');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('Request headers:', req.headers);
    console.log('Auth status:', req.isAuthenticated ? req.isAuthenticated() : 'No isAuthenticated method');
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.user);
    
    try {
      const fieldId = parseInt(req.params.id);
      console.log('Field ID to delete:', fieldId);

      // Get the existing field to check permissions
      const existingField = await storage.getCustomField(fieldId);
      if (!existingField) {
        console.log('Field not found with ID:', fieldId);
        return res.status(404).json({ error: "Custom field not found" });
      }

      console.log('Custom field found:', existingField);

      // Skip auth check temporarily to debug
      // Delete the custom field
      await storage.deleteCustomField(fieldId);
      console.log('Field deleted successfully');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 6. Get custom fields for a specific camp
  app.get("/api/camps/:id/custom-fields", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campId = parseInt(req.params.id);

      // Get the camp to verify it exists
      const camp = await storage.getCampById(campId);
      if (!camp) {
        return res.status(404).json({ error: "Camp not found" });
      }

      // Check if user is authorized to view this camp's custom fields
      const canView = req.user.role === "admin" || 
                     req.user.role === "parent" ||
                     await canManageCamp(storage, req.user.id, campId);

      if (!canView) {
        return res.status(403).json({ 
          error: "Not authorized to view custom fields for this camp" 
        });
      }

      // Get the custom fields for this camp
      const campFields = await storage.getCampCustomFields(campId);

      // If user is a parent, filter out internal fields
      if (req.user.role === "parent") {
        const filteredFields = campFields.filter(field => !field.field.isInternal);
        return res.json(filteredFields);
      }

      res.json(campFields);
    } catch (error) {
      console.error("Error getting camp custom fields:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 7. Add a custom field to a camp
  app.post("/api/camps/:id/custom-fields", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campId = parseInt(req.params.id);

      // Validate the request body
      const validation = createCampCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      // Check if user can manage this camp
      if (!(await canManageCamp(storage, req.user.id, campId))) {
        return res.status(403).json({ 
          error: "Not authorized to add custom fields to this camp" 
        });
      }

      // Add the custom field to the camp
      const fieldData = {
        ...validation.data,
        campId,
      };

      const newCampField = await storage.addCustomFieldToCamp(fieldData);

      res.status(201).json(newCampField);
    } catch (error) {
      console.error("Error adding custom field to camp:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 8. Update a camp custom field
  app.patch("/api/camps/:campId/custom-fields/:fieldId", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campId = parseInt(req.params.campId);
      const campFieldId = parseInt(req.params.fieldId);

      // Validate request body (partial schema)
      const validation = z.object({
        required: z.boolean().optional(),
        order: z.number().optional()
      }).safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      // Check if user can manage this camp
      if (!(await canManageCamp(storage, req.user.id, campId))) {
        return res.status(403).json({ 
          error: "Not authorized to update custom fields for this camp" 
        });
      }

      // Update the camp custom field
      const updatedCampField = await storage.updateCampCustomField(campFieldId, validation.data);

      res.json(updatedCampField);
    } catch (error) {
      console.error("Error updating camp custom field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 9. Delete a custom field from a camp
  app.delete("/api/camps/:campId/custom-fields/:fieldId", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campId = parseInt(req.params.campId);
      const campFieldId = parseInt(req.params.fieldId);

      // Check if user can manage this camp
      if (!(await canManageCamp(storage, req.user.id, campId))) {
        return res.status(403).json({ 
          error: "Not authorized to remove custom fields from this camp" 
        });
      }

      // Remove the custom field from the camp
      await storage.removeCampCustomField(campFieldId);

      res.status(204).send();
    } catch (error) {
      console.error("Error removing custom field from camp:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 10. Reorder camp custom fields
  app.patch("/api/camps/:id/custom-fields/reorder", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const campId = parseInt(req.params.id);

      // Validate request body
      const validation = reorderFieldsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validation.error.format() 
        });
      }

      // Check if user can manage this camp
      if (!(await canManageCamp(storage, req.user.id, campId))) {
        return res.status(403).json({ 
          error: "Not authorized to reorder custom fields for this camp" 
        });
      }

      // Reorder the fields one by one
      const { fields } = validation.data;

      // Update each field with its new order
      for (const field of fields) {
        await storage.updateCampCustomField(field.id, { order: field.order });
      }

      // Return the updated list
      const updatedFields = await storage.getCampCustomFields(campId);

      res.json(updatedFields);
    } catch (error) {
      console.error("Error reordering camp custom fields:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 11. Get custom field responses for a registration
  app.get("/api/registrations/:id/custom-field-responses", async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const registrationId = parseInt(req.params.id);

      // Get the registration to verify it exists and check permissions
      const registration = await storage.getRegistrationById(registrationId);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      // Check if user is authorized to view this registration's responses
      const isAuthorized = req.user.role === "admin" || 
                         (req.user.role === "parent" && registration.parentId === req.user.id) ||
                         (req.user.role === "camp_creator" && 
                          await canManageCamp(storage, req.user.id, registration.campId));

      if (!isAuthorized) {
        return res.status(403).json({ 
          error: "Not authorized to view custom field responses for this registration" 
        });
      }

      // Get the custom field responses
      const responses = await storage.getCustomFieldResponses(registrationId);

      // Filter out internal fields for parents
      if (req.user.role === "parent") {
        const filteredResponses = responses.filter(response => !response.field.isInternal);
        return res.json(filteredResponses);
      }

      res.json(responses);
    } catch (error) {
      console.error("Error getting custom field responses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}