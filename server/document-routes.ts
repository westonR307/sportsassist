import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { IStorage } from './storage';
import { insertDocumentSchema, insertDocumentFieldSchema, insertSignatureRequestSchema, insertSignatureSchema } from '../shared/schema';
import { z } from 'zod';

export default function documentRoutes(storage: IStorage) {
  const router = Router();

  // Document CRUD operations
  router.post('/api/documents', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Validate document data
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        authorId: req.user.id,
        organizationId: req.user.organizationId
      });
      
      // Create the document
      const document = await storage.createDocument(documentData);
      
      return res.status(201).json(document);
    } catch (error: any) {
      console.error('Error creating document:', error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.get('/api/documents/:id', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to this document
      if (document.organizationId !== req.user.organizationId && req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json(document);
    } catch (error: any) {
      console.error(`Error getting document ${req.params.id}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/documents', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (!req.user.organizationId) {
        return res.status(400).json({ error: 'No organization associated with user' });
      }
      
      // Get all documents for the organization
      const documents = await storage.getDocumentsByOrganization(req.user.organizationId);
      
      return res.json(documents);
    } catch (error: any) {
      console.error('Error getting documents:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/api/documents/:id', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to modify this document
      if (document.organizationId !== req.user.organizationId || req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Only allow updating certain fields
      const updateSchema = z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
        fileUrl: z.string().optional(),
      });
      
      const updateData = updateSchema.parse(req.body);
      
      // Update the document
      const updatedDocument = await storage.updateDocument(documentId, updateData);
      
      return res.json(updatedDocument);
    } catch (error: any) {
      console.error(`Error updating document ${req.params.id}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.delete('/api/documents/:id', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to delete this document
      if (document.organizationId !== req.user.organizationId || req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Delete the document
      await storage.deleteDocument(documentId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting document ${req.params.id}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Document Fields operations
  router.post('/api/documents/:documentId/fields', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.documentId);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to modify this document
      if (document.organizationId !== req.user.organizationId || req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Validate field data
      const validFieldTypes = ['signature', 'initial', 'date', 'text', 'checkbox', 'dynamic_field'];
      
      // Custom validation for field types including dynamic fields
      const fieldSchema = z.object({
        label: z.string(),
        fieldType: z.enum(['signature', 'initial', 'date', 'text', 'checkbox', 'dynamic_field']),
        required: z.boolean().optional().default(true),
        xPosition: z.number(),
        yPosition: z.number(),
        pageNumber: z.number().optional().default(1),
        width: z.number().optional().default(200),
        height: z.number().optional().default(50),
        order: z.number().optional().default(0),
        dataSource: z.enum([
          "athlete_name", "athlete_dob", "athlete_gender",
          "athlete_emergency_contact", "athlete_emergency_phone",
          "athlete_emergency_relation", "athlete_allergies",
          "athlete_medical_conditions", "athlete_medications", 
          "athlete_special_needs", "athlete_jersey_size", "athlete_shoe_size",
          "parent_name", "parent_email", "parent_phone",
          "camp_name", "camp_dates", "camp_location"
        ]).optional().nullable()
      }).refine(data => {
        // If fieldType is 'dynamic_field', dataSource is required
        if (data.fieldType === 'dynamic_field' && !data.dataSource) {
          return false;
        }
        return true;
      }, {
        message: "Data source is required for dynamic fields",
        path: ["dataSource"]
      });
      
      const fieldData = {
        ...fieldSchema.parse(req.body),
        documentId
      };
      
      // Create the field
      const field = await storage.createDocumentField(fieldData);
      
      return res.status(201).json(field);
    } catch (error: any) {
      console.error(`Error creating document field for document ${req.params.documentId}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.get('/api/documents/:documentId/fields', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.documentId);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to view this document
      if (document.organizationId !== req.user.organizationId && req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get all fields for the document
      const fields = await storage.getDocumentFields(documentId);
      
      return res.json(fields);
    } catch (error: any) {
      console.error(`Error getting document fields for document ${req.params.documentId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/api/documents/fields/:fieldId', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const fieldId = parseInt(req.params.fieldId);
      if (isNaN(fieldId)) {
        return res.status(400).json({ error: 'Invalid field ID' });
      }
      
      // Validate update data
      const updateSchema = z.object({
        label: z.string().optional(),
        fieldType: z.enum(['signature', 'initial', 'date', 'text', 'checkbox', 'dynamic_field']).optional(),
        required: z.boolean().optional(),
        xPosition: z.number().optional(),
        yPosition: z.number().optional(),
        pageNumber: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        zIndex: z.number().optional(),
        defaultValue: z.string().optional(),
        placeholder: z.string().optional(),
        dataSource: z.enum([
          "athlete_name", "athlete_dob", "athlete_gender",
          "athlete_emergency_contact", "athlete_emergency_phone",
          "athlete_emergency_relation", "athlete_allergies",
          "athlete_medical_conditions", "athlete_medications", 
          "athlete_special_needs", "athlete_jersey_size", "athlete_shoe_size",
          "parent_name", "parent_email", "parent_phone",
          "camp_name", "camp_dates", "camp_location"
        ]).optional(),
      });
      
      const updateData = updateSchema.parse(req.body);
      
      // Update the field
      const updatedField = await storage.updateDocumentField(fieldId, updateData);
      
      // Get the document to check permissions
      const document = await storage.getDocument(updatedField.documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to modify this document's fields
      if (document.organizationId !== req.user.organizationId || req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json(updatedField);
    } catch (error: any) {
      console.error(`Error updating document field ${req.params.fieldId}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.delete('/api/documents/fields/:fieldId', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const fieldId = parseInt(req.params.fieldId);
      if (isNaN(fieldId)) {
        return res.status(400).json({ error: 'Invalid field ID' });
      }
      
      // Delete the field
      await storage.deleteDocumentField(fieldId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting document field ${req.params.fieldId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Signature Requests operations
  router.post('/api/documents/:documentId/signature-requests', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.documentId);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to request signatures for this document
      if (document.organizationId !== req.user.organizationId || req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Validate signature request data
      const requestDataSchema = z.object({
        requestedForId: z.number().optional(),
        requestedForEmail: z.string().email().optional(),
        campId: z.number().optional(),
        registrationId: z.number().optional(),
        message: z.string().optional(),
        expiresAt: z.string().datetime().transform(str => new Date(str)).optional(),
      }).refine(data => data.requestedForId !== undefined || data.requestedForEmail !== undefined, {
        message: "Either requestedForId or requestedForEmail must be provided"
      });
      
      const requestData = requestDataSchema.parse(req.body);
      
      // Generate a unique token for the signature request
      const token = uuidv4();
      
      // Create the signature request
      const signatureRequest = await storage.createSignatureRequest({
        ...requestData,
        token,
        documentId,
        requestedBy: req.user.id,
        status: "pending",
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null
      });
      
      return res.status(201).json(signatureRequest);
    } catch (error: any) {
      console.error(`Error creating signature request for document ${req.params.documentId}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.get('/api/documents/:documentId/signature-requests', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.documentId);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to view this document's signature requests
      if (document.organizationId !== req.user.organizationId && req.user.role !== 'parent') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get all signature requests for the document
      const signatureRequests = await storage.getSignatureRequestsByDocument(documentId);
      
      return res.json(signatureRequests);
    } catch (error: any) {
      console.error(`Error getting signature requests for document ${req.params.documentId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/signature-requests/token/:token', async (req, res) => {
    try {
      const token = req.params.token;
      
      // Get the signature request
      const signatureRequest = await storage.getSignatureRequest(token);
      if (!signatureRequest) {
        return res.status(404).json({ error: 'Signature request not found' });
      }
      
      // Get the document
      const document = await storage.getDocument(signatureRequest.documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Get the document fields
      const fields = await storage.getDocumentFields(document.id);
      
      // Check if the request has expired
      if (signatureRequest.expiresAt && new Date() > new Date(signatureRequest.expiresAt)) {
        // Update the request to expired status if it's still pending
        if (signatureRequest.status === 'pending') {
          await storage.updateSignatureRequest(signatureRequest.id, { 
            status: 'expired',
            ipAddress: req.ip || null,
            userAgent: req.headers['user-agent'] || null
          });
        }
        return res.status(410).json({ error: 'This signature request has expired' });
      }
      
      // If the request is not pending, don't allow signing
      if (signatureRequest.status !== 'pending') {
        return res.status(400).json({ 
          error: `This document has already been ${signatureRequest.status}`,
          status: signatureRequest.status
        });
      }
      
      // Update the request to show it was viewed (only if it's the first view)
      await storage.createAuditTrailEntry({
        documentId: document.id,
        userId: signatureRequest.requestedForId,
        action: 'viewed',
        signatureRequestId: signatureRequest.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        timestamp: new Date()
      });
      
      // Check if we have any dynamic fields that need to be populated from the registration data
      const dynamicFields = fields.filter(field => field.fieldType === 'dynamic_field' && field.dataSource);
      let dynamicFieldData = {};
      
      // If we have dynamic fields and a registrationId in the request, fetch the related data
      if (dynamicFields.length > 0 && signatureRequest.registrationId) {
        try {
          // Get the registration data
          const registration = await storage.getRegistration(signatureRequest.registrationId);
          if (registration) {
            // Get child data for the registration
            const child = await storage.getChild(registration.childId);
            // Get camp data
            const camp = await storage.getCamp(registration.campId);
            
            // Get user data if requestedForId is present (for parent information)
            let parent = null;
            if (signatureRequest.requestedForId) {
              parent = await storage.getUser(signatureRequest.requestedForId);
            }
            
            // Prepare the dynamic field data
            dynamicFieldData = {
              // Athlete data
              athlete_name: child?.fullName || '',
              athlete_dob: child?.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '',
              athlete_gender: child?.gender || '',
              athlete_emergency_contact: child?.emergencyContact || '',
              athlete_emergency_phone: child?.emergencyPhone || '',
              athlete_emergency_relation: child?.emergencyRelation || '',
              athlete_allergies: child?.allergies ? child.allergies.join(', ') : '',
              athlete_medical_conditions: child?.medicalConditions ? child.medicalConditions.join(', ') : '',
              athlete_medications: child?.medications ? child.medications.join(', ') : '',
              athlete_special_needs: child?.specialNeeds || '',
              athlete_jersey_size: child?.jerseySize || '',
              athlete_shoe_size: child?.shoeSize || '',
              
              // Parent data
              parent_name: parent ? `${parent.first_name || ''} ${parent.last_name || ''}`.trim() : '',
              parent_email: parent?.email || '',
              parent_phone: parent?.phone_number || '',
              
              // Camp data
              camp_name: camp?.name || '',
              camp_dates: camp ? `${new Date(camp.startDate).toLocaleDateString()} - ${new Date(camp.endDate).toLocaleDateString()}` : '',
              camp_location: camp ? `${camp.streetAddress}, ${camp.city}, ${camp.state} ${camp.zipCode}` : ''
            };
          }
        } catch (error) {
          console.error("Error fetching dynamic field data:", error);
          // We'll continue even if we couldn't get all the dynamic data
        }
      }
      
      // Return the document, fields, request info, and dynamic field data
      return res.json({
        document,
        fields,
        signatureRequest,
        dynamicFieldData
      });
    } catch (error: any) {
      console.error(`Error processing signature request with token ${req.params.token}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/api/signature-requests/:requestId/sign', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }
      
      // Validate the signature data
      const signatureDataSchema = z.object({
        token: z.string(),
        fieldValues: z.record(z.string(), z.any()).optional(),
        signature: z.string()
      });
      
      const { token, fieldValues, signature } = signatureDataSchema.parse(req.body);
      
      // Get the signature request
      const signatureRequest = await storage.getSignatureRequest(token);
      if (!signatureRequest || signatureRequest.id !== requestId) {
        return res.status(404).json({ error: 'Signature request not found' });
      }
      
      // Check if the request is still valid
      if (signatureRequest.status !== 'pending') {
        return res.status(400).json({ 
          error: `This document has already been ${signatureRequest.status}`,
          status: signatureRequest.status
        });
      }
      
      // Check if the request has expired
      if (signatureRequest.expiresAt && new Date() > new Date(signatureRequest.expiresAt)) {
        await storage.updateSignatureRequest(signatureRequest.id, { 
          status: 'expired',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null
        });
        return res.status(410).json({ error: 'This signature request has expired' });
      }
      
      // Create a signature hash for verification
      const now = new Date();
      const signatureHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          signature,
          fieldValues,
          documentId: signatureRequest.documentId,
          signatureRequestId: signatureRequest.id,
          timestamp: now.toISOString(),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }))
        .digest('hex');
      
      // Create the signature record
      const signatureRecord = await storage.createSignature({
        signatureRequestId: signatureRequest.id,
        signatureData: signature,
        fieldValues: fieldValues || {},
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        signatureHash
      });
      
      return res.status(201).json(signatureRecord);
    } catch (error: any) {
      console.error(`Error signing request ${req.params.requestId}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.put('/api/signature-requests/:requestId/:action', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }
      
      // Validate action
      const action = req.params.action;
      if (!['decline', 'revoke'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      // Validate token
      const { token } = z.object({ token: z.string() }).parse(req.body);
      
      // Get the signature request
      const signatureRequest = await storage.getSignatureRequest(token);
      if (!signatureRequest || signatureRequest.id !== requestId) {
        return res.status(404).json({ error: 'Signature request not found' });
      }
      
      // Check permissions for revocation (only creator or admin)
      if (action === 'revoke') {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Get the document to check permissions
        const document = await storage.getDocument(signatureRequest.documentId);
        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }
        
        // Check if user has access to revoke this request
        if (document.organizationId !== req.user.organizationId && req.user.id !== signatureRequest.requestedBy) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Update the request status
      await storage.updateSignatureRequest(signatureRequest.id, { 
        status: action === 'revoke' ? 'revoked' : 'declined',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null
      });
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error(`Error processing ${req.params.action} for request ${req.params.requestId}:`, error);
      return res.status(400).json({ error: error.message });
    }
  });

  router.get('/api/documents/:documentId/audit-trail', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.documentId);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }
      
      // Get the document to check permissions
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to view this document's audit trail
      if (document.organizationId !== req.user.organizationId && req.user.role !== 'camp_creator') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get the audit trail
      const auditTrail = await storage.getAuditTrail(documentId);
      
      return res.json(auditTrail);
    } catch (error: any) {
      console.error(`Error getting audit trail for document ${req.params.documentId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/user/signature-requests', async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Get all signature requests for the user
      const signatureRequests = await storage.getSignatureRequestsByUser(req.user.id);
      
      // For each request, get the document title
      const requestsWithDocuments = await Promise.all(
        signatureRequests.map(async (request) => {
          const document = await storage.getDocument(request.documentId);
          return {
            ...request,
            documentTitle: document ? document.title : 'Unknown Document'
          };
        })
      );
      
      return res.json(requestsWithDocuments);
    } catch (error: any) {
      console.error(`Error getting user signature requests:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}