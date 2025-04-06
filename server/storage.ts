import crypto from 'crypto';
import {
  users,
  camps,
  organizations,
  invitations,
  children,
  childSports,
  campSports,
  registrations,
  campSchedules,
  scheduleExceptions,
  customFields,
  campCustomFields,
  customFieldResponses,
  campMetaFields,
  attendanceRecords,
  campSessions,
  recurrencePatterns,
  documents,
  subscriptionPlans,
  organizationSubscriptions,
  documentFields,
  signatureRequests,
  signatures,
  documentAuditTrail,
  campDocumentAgreements,
  organizationMessages,
  permissionSets,
  campStaff,
  permissions,
  userPermissions,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMessage,
  type InsertOrganizationMessage,
  type Invitation,
  type InsertInvitation,
  type Child,
  type CampSport,
  type Registration,
  type CampSchedule,
  type ScheduleException,
  type InsertScheduleException,
  type Camp,
  type CustomField,
  type InsertCustomField, 
  type CampCustomField,
  type InsertCampCustomField,
  type CustomFieldResponse,
  type InsertCustomFieldResponse,
  type CampMetaField,
  type InsertCampMetaField,
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type CampSession,
  type InsertCampSession,
  type RecurrencePattern,
  type InsertRecurrencePattern,
  type Document,
  type InsertDocument,
  type DocumentField,
  type InsertDocumentField,
  type SignatureRequest,
  type InsertSignatureRequest,
  type Signature,
  type InsertSignature,
  type DocumentAuditTrail,
  type InsertDocumentAuditTrail,
  type CampDocumentAgreement,
  type InsertCampDocumentAgreement,
  type PermissionSet,
  type InsertPermissionSet,
  type Permission,
  type InsertPermission,
  type UserPermission,
  type InsertUserPermission,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type OrganizationSubscription,
  type InsertOrganizationSubscription,
  insertCampSchema,
  sports
} from "@shared/schema";
import { type Role, type SportLevel, type StaffRole } from "@shared/types";
import { db } from "./db";
import { eq, sql, and, or, gte, lte, inArray, desc, gt, ne, isNull, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword } from "./utils";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { organizationId?: number }): Promise<User>;
  updateUserRole(userId: number, newRole: Role): Promise<User>;
  updateUserProfile(userId: number, profileData: Partial<Omit<User, "id" | "password" | "passwordHash" | "role" | "createdAt" | "updatedAt">>): Promise<User>;
  getOrganizationStaff(orgId: number): Promise<User[]>;
  getCampStaff(campId: number): Promise<Array<User & { staffRole: StaffRole }>>;
  addCampStaff(campId: number, userId: number, role: StaffRole): Promise<{ id: number }>;
  updateCampStaff(campId: number, userId: number, role: StaffRole): Promise<{ id: number } | null>;
  removeCampStaff(campId: number, userId: number): Promise<boolean>;
  createCamp(camp: Omit<Camp, "id"> & { schedules?: CampSchedule[] }): Promise<Camp>;
  updateCamp(id: number, campData: Partial<Omit<Camp, "id" | "organizationId">>): Promise<Camp>;
  listCamps(organizationId?: number): Promise<(Camp & { campSports?: any[], defaultStartTime?: string | null, defaultEndTime?: string | null })[]>;
  getCamp(id: number): Promise<Camp | undefined>;
  getCampBySlug(slug: string): Promise<Camp | undefined>;
  getRegistrationsByCamp(campId: number): Promise<Registration[]>;
  createRegistration(registration: Omit<Registration, "id">): Promise<Registration>;
  getRegistration(id: number): Promise<Registration | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  updateOrganization(id: number, orgData: Partial<Omit<Organization, "id" | "createdAt">>): Promise<Organization>;
  updateOrganizationProfile(id: number, profileData: Partial<Organization>): Promise<Organization>;
  getOrganizationUsers(orgId: number): Promise<User[]>;
  getOrganizationOwner(orgId: number): Promise<User | undefined>;
  listPublicOrganizationCamps(orgId: number): Promise<(Camp & { sportName?: string })[]>;
  createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string): Promise<Invitation>;
  listOrganizationInvitations(organizationId: number): Promise<Invitation[]>;
  getChildrenByParent(parentId: number): Promise<Child[]>;
  getChild(childId: number): Promise<Child | undefined>;
  createChild(childData: Omit<Child, "id">): Promise<Child>;
  updateChild(childId: number, childData: Partial<Omit<Child, "id">>): Promise<Child>;
  createCampSport(campSport: { campId: number; sportId: number; skillLevel: SportLevel; }): Promise<CampSport>;
  getCampSchedules(campId: number): Promise<CampSchedule[]>;
  getCampScheduleExceptions(campId: number): Promise<ScheduleException[]>;
  createScheduleException(exception: InsertScheduleException): Promise<ScheduleException>;
  updateScheduleException(id: number, exception: Partial<Omit<ScheduleException, "id">>): Promise<ScheduleException>;
  getScheduleException(id: number): Promise<ScheduleException | undefined>;
  deleteScheduleException(id: number): Promise<void>;
  getDefaultStartTimeForCamp(campId: number): Promise<string | null>;
  getDefaultEndTimeForCamp(campId: number): Promise<string | null>;
  
  // Enhanced Scheduling with Camp Sessions
  createCampSession(session: InsertCampSession): Promise<CampSession>;
  getCampSessions(campId: number): Promise<CampSession[]>;
  updateCampSession(id: number, sessionData: Partial<Omit<CampSession, "id" | "createdAt" | "updatedAt">>): Promise<CampSession>;
  deleteCampSession(id: number): Promise<void>;
  
  // Dashboard data methods
  getAllCampSessions(organizationId: number): Promise<(CampSession & { camp: Camp })[]>;
  getTodaySessions(organizationId: number): Promise<(CampSession & { camp: Camp })[]>;
  getRecentRegistrations(organizationId: number, hours?: number): Promise<Registration[]>;
  getTotalRegistrationsCount(organizationId: number): Promise<number>;
  getCampCountsByStatus(organizationId: number): Promise<{ status: string; count: number }[]>;
  
  // Recurrence Pattern methods
  createRecurrencePattern(pattern: InsertRecurrencePattern): Promise<RecurrencePattern>;
  getRecurrencePatterns(campId: number): Promise<RecurrencePattern[]>;
  getRecurrencePattern(id: number): Promise<RecurrencePattern | undefined>;
  updateRecurrencePattern(id: number, patternData: Partial<Omit<RecurrencePattern, "id" | "createdAt" | "updatedAt">>): Promise<RecurrencePattern>;
  deleteRecurrencePattern(id: number): Promise<void>;
  
  // Generate camp sessions from recurrence pattern
  generateCampSessionsFromPattern(patternId: number): Promise<CampSession[]>;
  
  // Custom fields methods
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  getCustomField(id: number): Promise<CustomField | undefined>;
  listCustomFields(organizationId: number, fieldSource?: "registration" | "camp"): Promise<CustomField[]>;
  updateCustomField(id: number, field: Partial<Omit<CustomField, "id" | "organizationId">>): Promise<CustomField>;
  deleteCustomField(id: number): Promise<void>;
  
  // Camp custom fields methods
  addCustomFieldToCamp(campField: InsertCampCustomField): Promise<CampCustomField>;
  getCampCustomFields(campId: number): Promise<(CampCustomField & { field: CustomField })[]>;
  updateCampCustomField(id: number, campField: Partial<Omit<CampCustomField, "id">>): Promise<CampCustomField>;
  removeCampCustomField(id: number): Promise<void>;
  
  // Custom field responses methods
  createCustomFieldResponse(response: InsertCustomFieldResponse): Promise<CustomFieldResponse>;
  getCustomFieldResponses(registrationId: number): Promise<(CustomFieldResponse & { field: CustomField })[]>;
  updateCustomFieldResponse(id: number, response: Partial<Omit<CustomFieldResponse, "id">>): Promise<CustomFieldResponse>;
  
  // Camp meta fields methods (custom field values for camps)
  createCampMetaField(field: InsertCampMetaField): Promise<CampMetaField>;
  getCampMetaFields(campId: number): Promise<(CampMetaField & { field: CustomField })[]>;
  updateCampMetaField(id: number, field: Partial<Omit<CampMetaField, "id">>): Promise<CampMetaField>;
  deleteCampMetaField(id: number): Promise<void>;
  
  // Camp soft delete and cancellation methods
  softDeleteCamp(campId: number): Promise<Camp>;
  cancelCamp(campId: number, reason?: string): Promise<Camp>;
  
  // Attendance tracking methods
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getAttendanceRecords(campId: number, date?: Date): Promise<AttendanceRecord[]>;
  getAttendanceByRegistration(registrationId: number): Promise<AttendanceRecord[]>;
  updateAttendanceRecord(id: number, data: Partial<Omit<AttendanceRecord, "id" | "recordedAt" | "updatedAt">>): Promise<AttendanceRecord>;
  
  // Enhanced registration methods
  getRegistrationsWithChildInfo(campId: number): Promise<(Registration & { child: Child })[]>;
  
  // Document management
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByOrganization(organizationId: number): Promise<Document[]>;
  updateDocument(id: number, data: Partial<Omit<Document, "id" | "createdAt" | "updatedAt" | "hash">>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  // Document fields (signature locations)
  createDocumentField(field: InsertDocumentField): Promise<DocumentField>;
  getDocumentFields(documentId: number): Promise<DocumentField[]>;
  updateDocumentField(id: number, data: Partial<Omit<DocumentField, "id" | "createdAt" | "updatedAt">>): Promise<DocumentField>;
  deleteDocumentField(id: number): Promise<void>;
  
  // Signature requests
  createSignatureRequest(request: InsertSignatureRequest & { token: string }): Promise<SignatureRequest>;
  getSignatureRequest(token: string): Promise<SignatureRequest | undefined>;
  getSignatureRequestsByDocument(documentId: number): Promise<SignatureRequest[]>;
  getSignatureRequestsByUser(userId: number): Promise<SignatureRequest[]>;
  updateSignatureRequest(id: number, data: Partial<Omit<SignatureRequest, "id" | "token" | "createdAt" | "updatedAt">>): Promise<SignatureRequest>;
  
  // Signatures
  createSignature(signature: InsertSignature): Promise<Signature>;
  getSignatures(signatureRequestId: number): Promise<Signature[]>;
  
  // Document audit trail
  createAuditTrailEntry(entry: InsertDocumentAuditTrail): Promise<DocumentAuditTrail>;
  getAuditTrail(documentId: number): Promise<DocumentAuditTrail[]>;
  
  // Camp document agreements
  createCampDocumentAgreement(agreement: InsertCampDocumentAgreement): Promise<CampDocumentAgreement>;
  getCampDocumentAgreements(campId: number): Promise<(CampDocumentAgreement & { document: Document })[]>;
  deleteCampDocumentAgreement(id: number): Promise<void>;
  getCampDocumentAgreementsByCampId(campId: number): Promise<CampDocumentAgreement[]>;
  updateCampDocumentAgreement(id: number, data: Partial<Omit<CampDocumentAgreement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CampDocumentAgreement>;
  
  // Organization profile methods
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationPublicProfile(organizationId: number): Promise<{
    organization: Organization, 
    activeCamps: (Camp & { campSports?: any[] })[]
  }>;
  updateOrganizationProfile(id: number, profileData: Partial<Organization>): Promise<Organization>;
  
  // Organization messaging methods
  createOrganizationMessage(message: Omit<InsertOrganizationMessage, "id">): Promise<OrganizationMessage>;
  getOrganizationMessage(messageId: number): Promise<OrganizationMessage | null>;
  getOrganizationMessages(organizationId: number): Promise<OrganizationMessage[]>;
  getUnreadOrganizationMessages(organizationId: number): Promise<OrganizationMessage[]>;
  markMessageAsRead(messageId: number): Promise<OrganizationMessage>;
  
  // Permission management methods
  createPermissionSet(permissionSet: InsertPermissionSet): Promise<PermissionSet>;
  getPermissionSet(id: number): Promise<PermissionSet | undefined>;
  getPermissionSetsByOrganization(organizationId: number): Promise<PermissionSet[]>;
  getDefaultPermissionSetForRole(organizationId: number, role: Role): Promise<PermissionSet | undefined>;
  updatePermissionSet(id: number, data: Partial<Omit<PermissionSet, "id" | "createdAt" | "updatedAt">>): Promise<PermissionSet>;
  deletePermissionSet(id: number): Promise<void>;
  
  // Permission methods
  createPermission(permission: InsertPermission): Promise<Permission>;
  getPermissionsBySet(permissionSetId: number): Promise<Permission[]>;
  updatePermission(id: number, data: Partial<Omit<Permission, "id">>): Promise<Permission>;
  deletePermission(id: number): Promise<void>;
  
  // User permission assignment methods
  assignPermissionSetToUser(userPermission: InsertUserPermission): Promise<UserPermission>;
  getUserPermissionSets(userId: number): Promise<(UserPermission & { permissionSet: PermissionSet })[]>;
  removeUserPermission(id: number): Promise<void>;
  getAllUserPermissionsForOrganization(organizationId: number): Promise<any[]>;
  
  // Permission checking methods
  checkUserPermission(userId: number, resource: string, action: string, scope?: string): Promise<boolean>;
  
  // Subscription plan methods
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: number, data: Partial<Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">>): Promise<SubscriptionPlan>;
  
  // Organization subscription methods
  createOrganizationSubscription(subscription: InsertOrganizationSubscription): Promise<OrganizationSubscription>;
  getOrganizationSubscription(organizationId: number): Promise<OrganizationSubscription | undefined>;
  updateOrganizationSubscription(id: number, data: Partial<Omit<OrganizationSubscription, "id" | "createdAt" | "updatedAt">>): Promise<OrganizationSubscription>;
  getOrganizationActiveSubscription(organizationId: number): Promise<(OrganizationSubscription & { plan: SubscriptionPlan }) | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async createUser(insertUser: InsertUser & { organizationId?: number }): Promise<User> {
    // Ensure we're using the hashed password format consistently
    console.log("Full insert user data:", insertUser);
    
    const [user] = await db.insert(users).values({
      username: insertUser.username.toLowerCase(),
      password: insertUser.password, // This should already be hashed when passed in
      passwordHash: insertUser.password, // Match the password field for backward compatibility
      email: insertUser.email,
      role: insertUser.role,
      organizationId: insertUser.organizationId,
      first_name: insertUser.first_name,
      last_name: insertUser.last_name,
    }).returning();
    
    console.log("User created with data:", user);
    return user;
  }

  async updateUserRole(userId: number, newRole: Role): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: number, profileData: Partial<Omit<User, "id" | "password" | "passwordHash" | "role" | "createdAt" | "updatedAt">>): Promise<User> {
    try {
      console.log(`Updating user profile for user ID ${userId}:`, profileData);
      
      const [updatedUser] = await db.update(users)
        .set({
          ...profileData,
          updatedAt: new Date() // Always update the updatedAt timestamp
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`Updated user profile for user ID ${userId}`);
      return updatedUser;
    } catch (error: any) {
      console.error(`Error updating user profile for user ID ${userId}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        stack: error.stack
      });
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async getOrganizationStaff(orgId: number): Promise<User[]> {
    // Instead of using Array ANY, use OR conditions for each role
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          or(
            eq(users.role, "coach" as Role),
            eq(users.role, "manager" as Role),
            eq(users.role, "volunteer" as Role)
          )
        )
      );
  }

  async getCampStaff(campId: number): Promise<Array<User & { staffRole: StaffRole }>> {
    try {
      const staffMembers = await db
        .select({
          ...users,
          staffRole: campStaff.role
        })
        .from(users)
        .innerJoin(campStaff, eq(users.id, campStaff.userId))
        .where(eq(campStaff.campId, campId));
      
      return staffMembers;
    } catch (error) {
      console.error(`Error fetching staff for camp ${campId}:`, error);
      throw new Error(`Failed to fetch camp staff: ${error}`);
    }
  }

  async addCampStaff(campId: number, userId: number, role: StaffRole): Promise<{ id: number }> {
    try {
      const [result] = await db
        .insert(campStaff)
        .values({
          campId,
          userId,
          role,
        })
        .returning({ id: campStaff.id });
      
      return result;
    } catch (error) {
      console.error(`Error adding staff to camp ${campId}:`, error);
      throw new Error(`Failed to add camp staff: ${error}`);
    }
  }

  async updateCampStaff(campId: number, userId: number, role: StaffRole): Promise<{ id: number } | null> {
    try {
      const [existingStaff] = await db
        .select()
        .from(campStaff)
        .where(
          and(
            eq(campStaff.campId, campId),
            eq(campStaff.userId, userId)
          )
        );
      
      if (!existingStaff) {
        return null;
      }
      
      const [result] = await db
        .update(campStaff)
        .set({
          role,
        })
        .where(
          and(
            eq(campStaff.campId, campId),
            eq(campStaff.userId, userId)
          )
        )
        .returning({ id: campStaff.id });
      
      return result;
    } catch (error) {
      console.error(`Error updating staff role for camp ${campId}, user ${userId}:`, error);
      throw new Error(`Failed to update camp staff role: ${error}`);
    }
  }

  async removeCampStaff(campId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(campStaff)
        .where(
          and(
            eq(campStaff.campId, campId),
            eq(campStaff.userId, userId)
          )
        );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error removing staff from camp ${campId}:`, error);
      throw new Error(`Failed to remove camp staff: ${error}`);
    }
  }

  async createCamp(campData: any): Promise<any> {
  try {
    console.log("=== Camp Creation Process Start ===");
    console.log("1. Raw camp data:", JSON.stringify(campData, null, 2));

    // Validate required fields
    if (!campData.sportId || !campData.skillLevel) {
      throw new Error("Sport ID and skill level are required");
    }

    // First verify the sport exists
    const sport = await db.query.sports.findFirst({
      where: (sports, { eq }) => eq(sports.id, campData.sportId)
    });

    if (!sport) {
      throw new Error(`Sport with ID ${campData.sportId} does not exist`);
    }

    // Function to generate a random slug
    const generateSlug = () => {
      // Using the crypto module imported at the top of the file
      return crypto.randomBytes(12).toString('hex');
    };
    
    // Generate a unique slug for the camp
    const slug = generateSlug();
    console.log("Generated slug for new camp:", slug);

    return await db.transaction(async (trx) => {
      // Create the camp
      const [newCamp] = await trx.insert(camps).values({
        name: String(campData.name).trim(),
        description: String(campData.description).trim(),
        streetAddress: String(campData.streetAddress).trim(),
        city: String(campData.city).trim(),
        state: String(campData.state).trim().toUpperCase(),
        zipCode: String(campData.zipCode).trim(),
        additionalLocationDetails: campData.additionalLocationDetails ? String(campData.additionalLocationDetails).trim() : null,
        startDate: new Date(campData.startDate),
        endDate: new Date(campData.endDate),
        registrationStartDate: new Date(campData.registrationStartDate),
        registrationEndDate: new Date(campData.registrationEndDate),
        price: parseInt(String(campData.price), 10),
        capacity: parseInt(String(campData.capacity), 10),
        organizationId: parseInt(String(campData.organizationId), 10),
        type: campData.type || "group",
        visibility: campData.visibility || "public",
        waitlistEnabled: campData.waitlistEnabled ?? true,
        minAge: parseInt(String(campData.minAge), 10),
        maxAge: parseInt(String(campData.maxAge), 10),
        repeatType: campData.repeatType || "none",
        repeatCount: parseInt(String(campData.repeatCount || '0'), 10),
        slug: slug // Add the unique slug
      }).returning();

      console.log("2. Created camp:", JSON.stringify(newCamp, null, 2));

      // Create camp sport
      await trx.insert(campSports).values({
        campId: newCamp.id,
        sportId: parseInt(String(campData.sportId), 10),
        skillLevel: campData.skillLevel
      });

      console.log("3. Created camp sport relation");

      // Create schedules if provided
      if (campData.schedules?.length > 0) {
        for (const schedule of campData.schedules) {
          await trx.insert(campSchedules).values({
            campId: newCamp.id,
            dayOfWeek: parseInt(String(schedule.dayOfWeek), 10),
            startTime: schedule.startTime.padStart(5, '0'),
            endTime: schedule.endTime.padStart(5, '0')
          });
        }
        console.log("4. Created schedules");
      }

      return newCamp;
    });
  } catch (error: any) {
    console.error("Camp creation failed:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      sql: error.sql,
      parameters: error.parameters,
      stack: error.stack
    });
    throw error;
  }
}

  async listCamps(organizationId?: number, includeDeleted = false): Promise<(Camp & { campSports?: any[] })[]> {
    try {
      console.log(organizationId ? `Fetching camps for organization ${organizationId}` : "Fetching all camps");
      console.log(`Including deleted camps: ${includeDeleted}`);
      
      // First, get all camps
      let query = db.select().from(camps);
      
      // Apply filters
      const conditions = [];
      
      if (organizationId) {
        conditions.push(eq(camps.organizationId, organizationId));
      }
      
      // Don't include deleted or cancelled camps by default
      if (!includeDeleted) {
        // Using column names directly since Drizzle's mapping seems to be inconsistent
        conditions.push(sql`${camps.id} IS NOT NULL AND "is_deleted" = false`);
      }
      
      // Apply all conditions if any exist
      if (conditions.length > 0) {
        if (conditions.length === 1) {
          query = query.where(conditions[0]);
        } else {
          query = query.where(and(...conditions));
        }
      }
      
      const allCamps = await query;
      console.log(`Retrieved ${allCamps.length} camps`);
      
      // For each camp, fetch the related camp sports
      const enrichedCamps = await Promise.all(allCamps.map(async (camp) => {
        const sportsList = await db.select().from(campSports).where(eq(campSports.campId, camp.id));
        return {
          ...camp,
          campSports: sportsList,
          defaultStartTime: await this.getDefaultStartTimeForCamp(camp.id),
          defaultEndTime: await this.getDefaultEndTimeForCamp(camp.id)
        };
      }));
      
      return enrichedCamps;
    } catch (error) {
      console.error("Error listing camps:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to list camps: ${error.message}`);
    }
  }

  async getCamp(id: number): Promise<Camp | undefined> {
    try {
      console.log(`Fetching camp details for ID: ${id}`);
      
      // First get the basic camp information
      const [camp] = await db.select().from(camps).where(eq(camps.id, id));
      
      if (!camp) {
        console.log(`No camp found with ID: ${id}`);
        return undefined;
      }
      
      // Get the camp sports information
      const campSportsList = await db.select()
        .from(campSports)
        .where(eq(campSports.campId, id));
      
      if (campSportsList.length > 0) {
        console.log(`Found ${campSportsList.length} sports for camp ID: ${id}`);
      } else {
        console.log(`No sports found for camp ID: ${id}`);
      }
      
      // Attach the sports information to the camp object
      const result = {
        ...camp,
        campSports: campSportsList,
        defaultStartTime: await this.getDefaultStartTimeForCamp(id),
        defaultEndTime: await this.getDefaultEndTimeForCamp(id)
      };
      
      return result;
    } catch (error) {
      console.error("Error getting camp details:", error);
      throw error;
    }
  }
  
  async getCampBySlug(slug: string): Promise<Camp | undefined> {
    try {
      console.log(`Fetching camp details for slug: ${slug}`);
      
      // First get the basic camp information
      const [camp] = await db.select().from(camps).where(eq(camps.slug, slug));
      
      if (!camp) {
        console.log(`No camp found with slug: ${slug}`);
        return undefined;
      }
      
      // Get the camp sports information
      const campSportsList = await db.select()
        .from(campSports)
        .where(eq(campSports.campId, camp.id));
      
      if (campSportsList.length > 0) {
        console.log(`Found ${campSportsList.length} sports for camp with slug: ${slug}`);
      } else {
        console.log(`No sports found for camp with slug: ${slug}`);
      }
      
      // Attach the sports information to the camp object
      const result = {
        ...camp,
        campSports: campSportsList,
        defaultStartTime: await this.getDefaultStartTimeForCamp(camp.id),
        defaultEndTime: await this.getDefaultEndTimeForCamp(camp.id)
      };
      
      return result;
    } catch (error) {
      console.error("Error getting camp details by slug:", error);
      throw error;
    }
  }
  
  async updateCamp(id: number, campData: Partial<Omit<Camp, "id" | "organizationId">>): Promise<Camp> {
    try {
      console.log(`Updating camp ${id} with data:`, campData);
      
      // We need to first get the current camp to preserve fields not being updated
      const currentCamp = await this.getCamp(id);
      if (!currentCamp) {
        throw new Error(`Camp with ID ${id} not found`);
      }
      
      // Update the camp
      const [updatedCamp] = await db.update(camps)
        .set({
          // Only update fields that are provided in campData
          ...(campData.name !== undefined && { name: campData.name }),
          ...(campData.description !== undefined && { description: campData.description }),
          ...(campData.streetAddress !== undefined && { streetAddress: campData.streetAddress }),
          ...(campData.city !== undefined && { city: campData.city }),
          ...(campData.state !== undefined && { state: campData.state }),
          ...(campData.zipCode !== undefined && { zipCode: campData.zipCode }),
          ...(campData.additionalLocationDetails !== undefined && { additionalLocationDetails: campData.additionalLocationDetails }),
          ...(campData.startDate !== undefined && { startDate: new Date(campData.startDate) }),
          ...(campData.endDate !== undefined && { endDate: new Date(campData.endDate) }),
          ...(campData.registrationStartDate !== undefined && { registrationStartDate: new Date(campData.registrationStartDate) }),
          ...(campData.registrationEndDate !== undefined && { registrationEndDate: new Date(campData.registrationEndDate) }),
          ...(campData.price !== undefined && { price: campData.price }),
          ...(campData.capacity !== undefined && { capacity: campData.capacity }),
          ...(campData.type !== undefined && { type: campData.type }),
          ...(campData.visibility !== undefined && { visibility: campData.visibility }),
          ...(campData.waitlistEnabled !== undefined && { waitlistEnabled: campData.waitlistEnabled }),
          ...(campData.minAge !== undefined && { minAge: campData.minAge }),
          ...(campData.maxAge !== undefined && { maxAge: campData.maxAge }),
          ...(campData.repeatType !== undefined && { repeatType: campData.repeatType }),
          ...(campData.repeatCount !== undefined && { repeatCount: campData.repeatCount }),
        })
        .where(eq(camps.id, id))
        .returning();
      
      console.log(`Updated camp ${id} successfully`);
      return updatedCamp;
    } catch (error: any) {
      console.error(`Error updating camp ${id}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        stack: error.stack
      });
      throw new Error(`Failed to update camp: ${error.message}`);
    }
  }

  async getRegistrationsByCamp(campId: number): Promise<Registration[]> {
    try {
      return await db.select().from(registrations).where(eq(registrations.campId, campId));
    } catch (error) {
      console.error("Error in getRegistrationsByCamp:", error);
      return [];
    }
  }

  async createRegistration(registration: Omit<Registration, "id">): Promise<Registration> {
    const [newRegistration] = await db.insert(registrations).values({
      campId: registration.campId,
      childId: registration.childId,
      paid: registration.paid,
      stripePaymentId: registration.stripePaymentId,
      waitlisted: registration.waitlisted,
      registeredAt: new Date(),
    }).returning();
    return newRegistration;
  }

  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration;
  }
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations)
      .values({
        name: org.name,
        description: org.description,
      })
      .returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization;
  }

  async updateOrganization(id: number, orgData: Partial<Omit<Organization, "id" | "createdAt">>): Promise<Organization> {
    try {
      console.log(`Updating organization ${id} with data:`, orgData);
      
      // Verify the organization exists
      const organization = await this.getOrganization(id);
      if (!organization) {
        throw new Error(`Organization with ID ${id} not found`);
      }
      
      // Update the organization
      const [updatedOrganization] = await db.update(organizations)
        .set({
          ...(orgData.name && { name: orgData.name }),
          ...(orgData.description !== undefined && { description: orgData.description }),
          ...(orgData.stripeAccountId !== undefined && { stripeAccountId: orgData.stripeAccountId }),
          ...(orgData.logoUrl !== undefined && { logoUrl: orgData.logoUrl })
        })
        .where(eq(organizations.id, id))
        .returning();
      
      console.log(`Updated organization ${id}`);
      return updatedOrganization;
    } catch (error) {
      console.error(`Error updating organization ${id}:`, error);
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }

  async getOrganizationUsers(orgId: number): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.organizationId, orgId));
  }

  async getOrganizationOwner(orgId: number): Promise<User | undefined> {
    try {
      console.log(`Fetching organization owner for organization ID: ${orgId}`);
      
      const [owner] = await db.select()
        .from(users)
        .where(
          and(
            eq(users.organizationId, orgId),
            eq(users.role, "camp_creator" as Role)
          )
        );
      
      return owner;
    } catch (error: any) {
      console.error(`Error fetching organization owner for org ID ${orgId}:`, error);
      throw new Error(`Failed to fetch organization owner: ${error.message}`);
    }
  }

  async createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations)
      .values({
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      })
      .returning();
    return newInvitation;
  }

  async getInvitation(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation;
  }

  async acceptInvitation(token: string): Promise<Invitation> {
    const [invitation] = await db.update(invitations)
      .set({ accepted: true })
      .where(eq(invitations.token, token))
      .returning();
    return invitation;
  }
  
  async acceptInvitationWithNames(token: string, firstName: string, lastName: string, password?: string): Promise<{ invitation: Invitation, user: any }> {
    // First find the invitation to get email
    const [invitationRecord] = await db.select()
      .from(invitations)
      .where(eq(invitations.token, token));
      
    if (!invitationRecord) {
      throw new Error("Invitation not found");
    }

    // Prepare password hash if provided
    let hashedPassword = '';
    if (password) {
      hashedPassword = await hashPassword(password);
    }
    
    // Start a transaction to update the invitation and create or update the user
    return await db.transaction(async (tx) => {
      // Mark the invitation as accepted
      const [updatedInvitation] = await tx.update(invitations)
        .set({ accepted: true })
        .where(eq(invitations.token, token))
        .returning();
        
      // Check if a user with this email already exists
      const [existingUser] = await tx.select()
        .from(users)
        .where(eq(users.email, invitationRecord.email));
      
      let user;
        
      if (existingUser) {
        // If user exists, update the first and last name if they are empty
        if (!existingUser.first_name || !existingUser.last_name) {
          await tx.update(users)
            .set({ 
              first_name: firstName,
              last_name: lastName,
              organizationId: invitationRecord.organizationId,
              role: invitationRecord.role
            })
            .where(eq(users.id, existingUser.id));
        }
        user = existingUser;
      } else {
        // If user doesn't exist, create a new user
        console.log("Creating new user from invitation:", {
          email: invitationRecord.email,
          role: invitationRecord.role,
          organizationId: invitationRecord.organizationId,
          firstName,
          lastName
        });
        
        // Generate username from the part of the email before the @ symbol
        const emailParts = invitationRecord.email.split('@');
        const username = emailParts[0];
        
        // Insert the new user with the password if provided
        const [newUser] = await tx.insert(users).values({
          username,
          email: invitationRecord.email,
          password: password || '', 
          passwordHash: hashedPassword, 
          role: invitationRecord.role,
          organizationId: invitationRecord.organizationId,
          first_name: firstName,
          last_name: lastName,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        console.log(`New user created with username derived from email: ${username}`);
        user = newUser;
      }
      
      return { invitation: updatedInvitation, user };
    });
  }

  async listOrganizationInvitations(organizationId: number): Promise<Invitation[]> {
    // Filter out invitations that have expired or have been accepted
    const now = new Date();
    return await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.organizationId, organizationId),
        gt(invitations.expiresAt, now), // Only return non-expired invitations
        eq(invitations.accepted, false) // Only return invitations that haven't been accepted
      ));
  }
  
  async deleteInvitation(invitationId: number, organizationId: number): Promise<Invitation | undefined> {
    // First check if the invitation exists and belongs to the organization
    const [invitation] = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, organizationId)
      ));
    
    if (!invitation) return undefined;
    
    // Delete the invitation
    const [deletedInvitation] = await db.delete(invitations)
      .where(eq(invitations.id, invitationId))
      .returning();
    
    return deletedInvitation;
  }
  async getChildrenByParent(parentId: number): Promise<Child[]> {
    console.log(`[Storage] Getting children for parent ID: ${parentId}`);
    
    // First get all children
    const childrenData = await db.select()
      .from(children)
      .where(eq(children.parentId, parentId));
    
    console.log(`[Storage] Raw SQL query: SELECT * FROM children WHERE parent_id = ${parentId}`);
    console.log(`[Storage] Found ${childrenData.length} children for parent ID: ${parentId}`);
    
    // For each child, get their sports interests
    const extendedChildren = await Promise.all(childrenData.map(async (child) => {
      const childSportsData = await db.select()
        .from(childSports)
        .where(eq(childSports.childId, child.id));
      
      // Add sportsInterests property if there are any
      if (childSportsData.length > 0) {
        return {
          ...child,
          sportsInterests: childSportsData.map(sport => ({
            sportId: sport.sportId,
            skillLevel: sport.skillLevel,
            preferredPositions: sport.preferredPositions,
            currentTeam: sport.currentTeam
          }))
        };
      }
      
      return child;
    }));
    
    return extendedChildren;
  }

  async getChild(childId: number): Promise<Child | undefined> {
    // Get the child
    const [child] = await db.select()
      .from(children)
      .where(eq(children.id, childId));
    
    if (!child) return undefined;
    
    // Get sports interests
    const childSportsData = await db.select()
      .from(childSports)
      .where(eq(childSports.childId, childId));
    
    // Add sportsInterests property if there are any
    if (childSportsData.length > 0) {
      return {
        ...child,
        sportsInterests: childSportsData.map(sport => ({
          sportId: sport.sportId,
          skillLevel: sport.skillLevel,
          preferredPositions: sport.preferredPositions,
          currentTeam: sport.currentTeam
        }))
      };
    }
    
    return child;
  }
  
  async createChild(childData: Omit<Child, "id">): Promise<Child> {
    try {
      console.log("Creating new child:", childData);
      const [newChild] = await db.insert(children).values({
        fullName: childData.fullName,
        dateOfBirth: childData.dateOfBirth,
        gender: childData.gender,
        parentId: childData.parentId,
        profilePhoto: childData.profilePhoto || null,
        emergencyContact: childData.emergencyContact || null,
        emergencyPhone: childData.emergencyPhone || null,
        emergencyRelation: childData.emergencyRelation || null,
        allergies: childData.allergies || [],
        medicalConditions: childData.medicalConditions || [],
        medications: childData.medications || [],
        specialNeeds: childData.specialNeeds || null,
        preferredContact: childData.preferredContact,
        communicationOptIn: childData.communicationOptIn
      }).returning();
      
      return newChild;
    } catch (error) {
      console.error("Error creating child:", error);
      throw new Error("Failed to create child");
    }
  }
  
  async getDefaultStartTimeForCamp(campId: number): Promise<string | null> {
    try {
      // Get the default schedule for the camp (first one)
      const [firstSchedule] = await db.select()
        .from(campSchedules)
        .where(eq(campSchedules.campId, campId))
        .orderBy(campSchedules.dayOfWeek)
        .limit(1);
      
      return firstSchedule?.startTime || null;
    } catch (error) {
      console.error("Error getting default start time:", error);
      return null;
    }
  }
  
  async getDefaultEndTimeForCamp(campId: number): Promise<string | null> {
    try {
      // Get the default schedule for the camp (first one)
      const [firstSchedule] = await db.select()
        .from(campSchedules)
        .where(eq(campSchedules.campId, campId))
        .orderBy(campSchedules.dayOfWeek)
        .limit(1);
      
      return firstSchedule?.endTime || null;
    } catch (error) {
      console.error("Error getting default end time:", error);
      return null;
    }
  }
  
  // Camp Sessions methods
  async createCampSession(session: InsertCampSession): Promise<CampSession> {
    try {
      console.log(`Creating new camp session for camp ID ${session.campId}:`, session);
      
      const [createdSession] = await db.insert(campSessions).values({
        ...session,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log(`Successfully created camp session with ID ${createdSession.id}`);
      return createdSession;
    } catch (error: any) {
      console.error(`Error creating camp session:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to create camp session: ${error.message}`);
    }
  }

  async getCampSessions(campId: number): Promise<CampSession[]> {
    try {
      console.log(`Fetching sessions for camp ID ${campId}`);
      
      const sessions = await db.select()
        .from(campSessions)
        .where(eq(campSessions.campId, campId))
        .orderBy(campSessions.sessionDate, campSessions.startTime);
      
      console.log(`Retrieved ${sessions.length} sessions for camp ID ${campId}`);
      return sessions;
    } catch (error: any) {
      console.error(`Error fetching camp sessions:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to fetch camp sessions: ${error.message}`);
    }
  }

  async updateCampSession(id: number, sessionData: Partial<Omit<CampSession, "id" | "createdAt" | "updatedAt">>): Promise<CampSession> {
    try {
      console.log(`Updating camp session with ID ${id}:`, sessionData);
      
      const [updatedSession] = await db.update(campSessions)
        .set({
          ...sessionData,
          updatedAt: new Date()
        })
        .where(eq(campSessions.id, id))
        .returning();
      
      if (!updatedSession) {
        throw new Error(`Camp session with ID ${id} not found`);
      }
      
      console.log(`Successfully updated camp session ID ${id}`);
      return updatedSession;
    } catch (error: any) {
      console.error(`Error updating camp session with ID ${id}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to update camp session: ${error.message}`);
    }
  }

  async deleteCampSession(id: number): Promise<void> {
    try {
      console.log(`Deleting camp session with ID ${id}`);
      
      // First verify the session exists
      const [session] = await db.select()
        .from(campSessions)
        .where(eq(campSessions.id, id));
      
      if (!session) {
        throw new Error(`Camp session with ID ${id} not found`);
      }
      
      await db.delete(campSessions)
        .where(eq(campSessions.id, id));
      
      console.log(`Successfully deleted camp session ID ${id}`);
    } catch (error: any) {
      console.error(`Error deleting camp session with ID ${id}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to delete camp session: ${error.message}`);
    }
  }

  // Recurrence Pattern methods
  async createRecurrencePattern(pattern: InsertRecurrencePattern): Promise<RecurrencePattern> {
    try {
      console.log(`Creating new recurrence pattern for camp ID ${pattern.campId}:`, pattern);
      
      const [createdPattern] = await db.insert(recurrencePatterns).values({
        ...pattern,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log(`Successfully created recurrence pattern with ID ${createdPattern.id}`);
      return createdPattern;
    } catch (error: any) {
      console.error(`Error creating recurrence pattern:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to create recurrence pattern: ${error.message}`);
    }
  }

  async getRecurrencePatterns(campId: number): Promise<RecurrencePattern[]> {
    try {
      console.log(`Fetching recurrence patterns for camp ID ${campId}`);
      
      const patterns = await db.select()
        .from(recurrencePatterns)
        .where(eq(recurrencePatterns.campId, campId));
      
      console.log(`Retrieved ${patterns.length} recurrence patterns for camp ID ${campId}`);
      return patterns;
    } catch (error: any) {
      console.error(`Error fetching recurrence patterns:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to fetch recurrence patterns: ${error.message}`);
    }
  }

  async getRecurrencePattern(id: number): Promise<RecurrencePattern | undefined> {
    try {
      console.log(`Fetching recurrence pattern with ID ${id}`);
      
      const [pattern] = await db.select()
        .from(recurrencePatterns)
        .where(eq(recurrencePatterns.id, id));
      
      return pattern;
    } catch (error: any) {
      console.error(`Error fetching recurrence pattern:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to fetch recurrence pattern: ${error.message}`);
    }
  }

  async updateRecurrencePattern(id: number, patternData: Partial<Omit<RecurrencePattern, "id" | "createdAt" | "updatedAt">>): Promise<RecurrencePattern> {
    try {
      console.log(`Updating recurrence pattern with ID ${id}:`, patternData);
      
      const [updatedPattern] = await db.update(recurrencePatterns)
        .set({
          ...patternData,
          updatedAt: new Date()
        })
        .where(eq(recurrencePatterns.id, id))
        .returning();
      
      if (!updatedPattern) {
        throw new Error(`Recurrence pattern with ID ${id} not found`);
      }
      
      console.log(`Successfully updated recurrence pattern ID ${id}`);
      return updatedPattern;
    } catch (error: any) {
      console.error(`Error updating recurrence pattern with ID ${id}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to update recurrence pattern: ${error.message}`);
    }
  }

  async deleteRecurrencePattern(id: number): Promise<void> {
    try {
      console.log(`Deleting recurrence pattern with ID ${id}`);
      
      // First verify the pattern exists
      const [pattern] = await db.select()
        .from(recurrencePatterns)
        .where(eq(recurrencePatterns.id, id));
      
      if (!pattern) {
        throw new Error(`Recurrence pattern with ID ${id} not found`);
      }
      
      await db.delete(recurrencePatterns)
        .where(eq(recurrencePatterns.id, id));
      
      console.log(`Successfully deleted recurrence pattern ID ${id}`);
    } catch (error: any) {
      console.error(`Error deleting recurrence pattern with ID ${id}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to delete recurrence pattern: ${error.message}`);
    }
  }

  async generateCampSessionsFromPattern(patternId: number): Promise<CampSession[]> {
    try {
      console.log(`Generating camp sessions from recurrence pattern ID ${patternId}`);
      
      // Get the recurrence pattern
      const pattern = await this.getRecurrencePattern(patternId);
      if (!pattern) {
        throw new Error(`Recurrence pattern with ID ${patternId} not found`);
      }
      
      const { campId, startDate, endDate, days_of_week, start_time, end_time, pattern_type, repeat_type } = pattern;
      
      // Generate dates between start and end based on the recurrence pattern
      const sessions: CampSession[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      // Helper function to check if a date falls on one of the specified days of the week
      const isOnSpecifiedDay = (date: Date, days: number[]) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        return days.includes(dayOfWeek);
      };
      
      // Helper function to add days to a date
      const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
      };
      
      // Helper function to get interval days based on repeat type
      const getIntervalDays = (type: string) => {
        switch (type) {
          case 'daily': return 1;
          case 'weekly': return 7;
          case 'biweekly': return 14;
          default: return 1; // Default to daily
        }
      };
      
      const intervalDays = getIntervalDays(repeat_type);
      
      while (currentDate <= end) {
        if (pattern_type === 'specific_days') {
          // Only create sessions on the specified days of the week
          if (isOnSpecifiedDay(currentDate, days_of_week)) {
            sessions.push({
              id: 0, // Will be set by the database
              campId,
              session_date: new Date(currentDate),
              start_time,
              end_time,
              status: 'active',
              notes: null,
              recurrence_group_id: patternId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          currentDate.setDate(currentDate.getDate() + 1); // Move to next day
        } else {
          // For other pattern types, create a session and then jump by the interval
          sessions.push({
            id: 0, // Will be set by the database
            campId,
            session_date: new Date(currentDate),
            start_time,
            end_time,
            status: 'active',
            notes: null,
            recurrence_group_id: patternId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          currentDate.setDate(currentDate.getDate() + intervalDays);
        }
      }
      
      // Save all the generated sessions to the database
      const createdSessions = await db.transaction(async (trx) => {
        const results: CampSession[] = [];
        
        for (const session of sessions) {
          const [createdSession] = await trx.insert(campSessions).values(session).returning();
          results.push(createdSession);
        }
        
        return results;
      });
      
      console.log(`Successfully generated ${createdSessions.length} camp sessions from recurrence pattern ID ${patternId}`);
      return createdSessions;
    } catch (error: any) {
      console.error(`Error generating camp sessions from recurrence pattern:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      throw new Error(`Failed to generate camp sessions: ${error.message}`);
    }
  }
  
  async updateChild(childId: number, childData: Partial<Omit<Child, "id">> & { sportsInterests?: Array<{ sportId: number, skillLevel: SportLevel }> }): Promise<Child> {
    try {
      console.log("Updating child with data:", JSON.stringify(childData, null, 2));
      
      // Deal with boolean conversion explicitly
      if (typeof childData.communicationOptIn === 'string') {
        childData.communicationOptIn = childData.communicationOptIn === 'true';
        console.log("Converted communicationOptIn to boolean:", childData.communicationOptIn);
      }
      
      // Use a transaction to ensure all updates happen together
      return await db.transaction(async (trx) => {
        // Check if the child exists first
        const existingChild = await db.query.children.findFirst({
          where: eq(children.id, childId)
        });
        
        if (!existingChild) {
          console.error(`Child not found with ID: ${childId}`);
          throw new Error(`Child not found with ID: ${childId}`);
        }
        
        console.log("Found existing child:", existingChild);
        
        // 1. Update the child record first
        const [updatedChild] = await trx.update(children)
          .set({
            ...(childData.fullName !== undefined && { fullName: childData.fullName }),
            ...(childData.dateOfBirth !== undefined && { dateOfBirth: childData.dateOfBirth }),
            ...(childData.gender !== undefined && { gender: childData.gender }),
            ...(childData.profilePhoto !== undefined && { profilePhoto: childData.profilePhoto }),
            ...(childData.emergencyContact !== undefined && { emergencyContact: childData.emergencyContact }),
            ...(childData.emergencyPhone !== undefined && { emergencyPhone: childData.emergencyPhone }),
            ...(childData.emergencyRelation !== undefined && { emergencyRelation: childData.emergencyRelation }),
            ...(childData.allergies !== undefined && { allergies: childData.allergies }),
            ...(childData.medicalConditions !== undefined && { medicalConditions: childData.medicalConditions }),
            ...(childData.medications !== undefined && { medications: childData.medications }),
            ...(childData.specialNeeds !== undefined && { specialNeeds: childData.specialNeeds }),
            ...(childData.preferredContact !== undefined && { preferredContact: childData.preferredContact }),
            ...(childData.communicationOptIn !== undefined && { communicationOptIn: childData.communicationOptIn }),
            ...(childData.currentGrade !== undefined && { currentGrade: childData.currentGrade }),
            ...(childData.schoolName !== undefined && { schoolName: childData.schoolName }),
            ...(childData.sportsHistory !== undefined && { sportsHistory: childData.sportsHistory }),
            ...(childData.jerseySize !== undefined && { jerseySize: childData.jerseySize }),
            ...(childData.height !== undefined && { height: childData.height }),
            ...(childData.weight !== undefined && { weight: childData.weight }),
          })
          .where(eq(children.id, childId))
          .returning();

        // 2. If sportsInterests is included, update the child_sports records
        if (childData.sportsInterests && childData.sportsInterests.length > 0) {
          // First, delete any existing child_sports records
          await trx.delete(childSports).where(eq(childSports.childId, childId));
          
          // Then insert the new ones
          for (const sport of childData.sportsInterests) {
            if (sport.sportId > 0) { // Only insert sports with valid IDs
              await trx.insert(childSports).values({
                childId: childId,
                sportId: sport.sportId,
                skillLevel: sport.skillLevel
              });
            }
          }
          
          console.log(`Updated ${childData.sportsInterests.length} sports interests for child ${childId}`);
        }
        
        return updatedChild;
      });
    } catch (error) {
      console.error("Error updating child:", error);
      throw new Error("Failed to update child");
    }
  }

  async createCampSport(campSport: {
    campId: number;
    sportId: number;
    skillLevel: SportLevel;
  }): Promise<CampSport> {
    const [newCampSport] = await db.insert(campSports).values(campSport).returning();
    return newCampSport;
  }
  async getCampSchedules(campId: number): Promise<CampSchedule[]> {
    try {
      return await db.select()
        .from(campSchedules)
        .where(eq(campSchedules.campId, campId))
        .orderBy(campSchedules.dayOfWeek);
    } catch (error) {
      console.error("Error getting camp schedules:", error);
      throw error;
    }
  }
  
  async getCampScheduleExceptions(campId: number): Promise<ScheduleException[]> {
    try {
      return await db.select()
        .from(scheduleExceptions)
        .where(eq(scheduleExceptions.campId, campId))
        .orderBy(scheduleExceptions.exceptionDate);
    } catch (error) {
      console.error("Error getting schedule exceptions:", error);
      throw error;
    }
  }
  
  async createScheduleException(exception: InsertScheduleException): Promise<ScheduleException> {
    try {
      const [newException] = await db.insert(scheduleExceptions).values({
        campId: exception.campId,
        originalScheduleId: exception.originalScheduleId,
        exceptionDate: new Date(exception.exceptionDate),
        dayOfWeek: exception.dayOfWeek,
        startTime: exception.startTime,
        endTime: exception.endTime,
        status: exception.status || "active",
        reason: exception.reason
      }).returning();
      
      return newException;
    } catch (error) {
      console.error("Error creating schedule exception:", error);
      throw error;
    }
  }
  
  async updateScheduleException(id: number, exception: Partial<Omit<ScheduleException, "id">>): Promise<ScheduleException> {
    try {
      const [updatedException] = await db.update(scheduleExceptions)
        .set({
          ...(exception.exceptionDate !== undefined && { exceptionDate: new Date(exception.exceptionDate) }),
          ...(exception.dayOfWeek !== undefined && { dayOfWeek: exception.dayOfWeek }),
          ...(exception.startTime !== undefined && { startTime: exception.startTime }),
          ...(exception.endTime !== undefined && { endTime: exception.endTime }),
          ...(exception.status !== undefined && { status: exception.status }),
          ...(exception.reason !== undefined && { reason: exception.reason })
        })
        .where(eq(scheduleExceptions.id, id))
        .returning();
        
      return updatedException;
    } catch (error) {
      console.error("Error updating schedule exception:", error);
      throw error;
    }
  }
  
  async deleteScheduleException(id: number): Promise<void> {
    try {
      await db.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id));
    } catch (error) {
      console.error("Error deleting schedule exception:", error);
      throw new Error("Failed to delete schedule exception");
    }
  }
  
  async getScheduleException(id: number): Promise<ScheduleException | undefined> {
    try {
      const [exception] = await db.select()
        .from(scheduleExceptions)
        .where(eq(scheduleExceptions.id, id));
      
      return exception;
    } catch (error) {
      console.error("Error getting schedule exception:", error);
      throw error;
    }
  }

  // Custom fields methods
  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    try {
      const [newField] = await db.insert(customFields).values({
        name: field.name,
        label: field.label,
        description: field.description,
        fieldType: field.fieldType,
        required: field.required ?? false,
        organizationId: field.organizationId,
        validationType: field.validationType || "none",
        options: field.options,
        fieldSource: field.fieldSource || "registration", // Use the provided source or default to "registration"
        isInternal: field.isInternal ?? false, // Default to false if not provided (visible to everyone)
      }).returning();
      
      return newField;
    } catch (error) {
      console.error("Error creating custom field:", error);
      throw error;
    }
  }

  async getCustomField(id: number): Promise<CustomField | undefined> {
    try {
      const [field] = await db.select()
        .from(customFields)
        .where(eq(customFields.id, id));
      
      return field;
    } catch (error) {
      console.error("Error getting custom field:", error);
      throw error;
    }
  }

  async listCustomFields(organizationId: number, fieldSource?: "registration" | "camp"): Promise<CustomField[]> {
    try {
      // Base query with organization filter
      let query = db.select()
        .from(customFields)
        .where(eq(customFields.organizationId, organizationId));
      
      // Add field source filter if provided
      if (fieldSource) {
        query = query.where(eq(customFields.fieldSource, fieldSource));
      }
      
      // Execute the query with ordering
      return await query.orderBy(customFields.name);
    } catch (error) {
      console.error("Error listing custom fields:", error);
      return [];
    }
  }

  async updateCustomField(id: number, field: Partial<Omit<CustomField, "id" | "organizationId">>): Promise<CustomField> {
    try {
      const [updatedField] = await db.update(customFields)
        .set({
          ...(field.name !== undefined && { name: field.name }),
          ...(field.label !== undefined && { label: field.label }),
          ...(field.description !== undefined && { description: field.description }),
          ...(field.fieldType !== undefined && { fieldType: field.fieldType }),
          ...(field.required !== undefined && { required: field.required }),
          ...(field.validationType !== undefined && { validationType: field.validationType }),
          ...(field.options !== undefined && { options: field.options }),
          ...(field.isInternal !== undefined && { isInternal: field.isInternal }),
          updatedAt: new Date(),
        })
        .where(eq(customFields.id, id))
        .returning();
      
      return updatedField;
    } catch (error) {
      console.error("Error updating custom field:", error);
      throw error;
    }
  }

  async deleteCustomField(id: number): Promise<void> {
    try {
      await db.delete(customFields)
        .where(eq(customFields.id, id));
    } catch (error) {
      console.error("Error deleting custom field:", error);
      throw error;
    }
  }

  // Camp custom fields methods
  async addCustomFieldToCamp(campField: InsertCampCustomField): Promise<CampCustomField> {
    try {
      const [newCampField] = await db.insert(campCustomFields).values({
        campId: campField.campId,
        customFieldId: campField.customFieldId,
        order: campField.order || 0,
        required: campField.required,
      }).returning();
      
      return newCampField;
    } catch (error) {
      console.error("Error adding custom field to camp:", error);
      throw error;
    }
  }

  async getCampCustomFields(campId: number): Promise<(CampCustomField & { field: CustomField })[]> {
    try {
      const results = await db.select({
        id: campCustomFields.id,
        campId: campCustomFields.campId,
        customFieldId: campCustomFields.customFieldId,
        order: campCustomFields.order,
        required: campCustomFields.required,
        field: customFields
      })
      .from(campCustomFields)
      .innerJoin(customFields, eq(campCustomFields.customFieldId, customFields.id))
      .where(eq(campCustomFields.campId, campId))
      .orderBy(campCustomFields.order);
      
      return results;
    } catch (error) {
      console.error("Error getting camp custom fields:", error);
      return [];
    }
  }

  async updateCampCustomField(id: number, campField: Partial<Omit<CampCustomField, "id">>): Promise<CampCustomField> {
    try {
      const [updatedCampField] = await db.update(campCustomFields)
        .set({
          ...(campField.order !== undefined && { order: campField.order }),
          ...(campField.required !== undefined && { required: campField.required }),
        })
        .where(eq(campCustomFields.id, id))
        .returning();
      
      return updatedCampField;
    } catch (error) {
      console.error("Error updating camp custom field:", error);
      throw error;
    }
  }

  async removeCampCustomField(id: number): Promise<void> {
    try {
      await db.delete(campCustomFields)
        .where(eq(campCustomFields.id, id));
    } catch (error) {
      console.error("Error removing camp custom field:", error);
      throw error;
    }
  }

  // Custom field responses methods
  async createCustomFieldResponse(response: InsertCustomFieldResponse): Promise<CustomFieldResponse> {
    try {
      const [newResponse] = await db.insert(customFieldResponses).values({
        registrationId: response.registrationId,
        customFieldId: response.customFieldId,
        response: response.response,
        responseArray: response.responseArray,
      }).returning();
      
      return newResponse;
    } catch (error) {
      console.error("Error creating custom field response:", error);
      throw error;
    }
  }

  async getCustomFieldResponses(registrationId: number): Promise<(CustomFieldResponse & { field: CustomField })[]> {
    try {
      const results = await db.select({
        id: customFieldResponses.id,
        registrationId: customFieldResponses.registrationId,
        customFieldId: customFieldResponses.customFieldId,
        response: customFieldResponses.response,
        responseArray: customFieldResponses.responseArray,
        createdAt: customFieldResponses.createdAt,
        updatedAt: customFieldResponses.updatedAt,
        field: customFields
      })
      .from(customFieldResponses)
      .innerJoin(customFields, eq(customFieldResponses.customFieldId, customFields.id))
      .where(eq(customFieldResponses.registrationId, registrationId));
      
      return results;
    } catch (error) {
      console.error("Error getting custom field responses:", error);
      return [];
    }
  }

  async updateCustomFieldResponse(id: number, response: Partial<Omit<CustomFieldResponse, "id">>): Promise<CustomFieldResponse> {
    try {
      const [updatedResponse] = await db.update(customFieldResponses)
        .set({
          ...(response.response !== undefined && { response: response.response }),
          ...(response.responseArray !== undefined && { responseArray: response.responseArray }),
          updatedAt: new Date(),
        })
        .where(eq(customFieldResponses.id, id))
        .returning();
      
      return updatedResponse;
    } catch (error) {
      console.error("Error updating custom field response:", error);
      throw error;
    }
  }
  
  // Camp meta fields methods (custom field values for camps)
  async createCampMetaField(field: InsertCampMetaField): Promise<CampMetaField> {
    try {
      const [newField] = await db.insert(campMetaFields).values({
        campId: field.campId,
        customFieldId: field.customFieldId,
        response: field.response,
        responseArray: field.responseArray,
      }).returning();
      
      return newField;
    } catch (error) {
      console.error("Error creating camp meta field:", error);
      throw error;
    }
  }

  async getCampMetaFields(campId: number): Promise<(CampMetaField & { field: CustomField })[]> {
    try {
      const results = await db.select({
        id: campMetaFields.id,
        campId: campMetaFields.campId,
        customFieldId: campMetaFields.customFieldId,
        response: campMetaFields.response,
        responseArray: campMetaFields.responseArray,
        createdAt: campMetaFields.createdAt,
        updatedAt: campMetaFields.updatedAt,
        field: customFields
      })
      .from(campMetaFields)
      .innerJoin(customFields, eq(campMetaFields.customFieldId, customFields.id))
      .where(eq(campMetaFields.campId, campId));
      
      return results;
    } catch (error) {
      console.error("Error getting camp meta fields:", error);
      return [];
    }
  }

  async updateCampMetaField(id: number, field: Partial<Omit<CampMetaField, "id">>): Promise<CampMetaField> {
    try {
      const [updatedField] = await db.update(campMetaFields)
        .set({
          ...(field.response !== undefined && { response: field.response }),
          ...(field.responseArray !== undefined && { responseArray: field.responseArray }),
          updatedAt: new Date()
        })
        .where(eq(campMetaFields.id, id))
        .returning();
      
      return updatedField;
    } catch (error) {
      console.error("Error updating camp meta field:", error);
      throw error;
    }
  }

  async deleteCampMetaField(id: number): Promise<void> {
    try {
      await db.delete(campMetaFields)
        .where(eq(campMetaFields.id, id));
    } catch (error) {
      console.error("Error deleting camp meta field:", error);
      throw error;
    }
  }
  
  // Camp soft delete method - only allowed before registration start date
  async softDeleteCamp(campId: number): Promise<Camp> {
    try {
      console.log(`Soft deleting camp ID: ${campId}`);
      
      // First get the camp to check if it's before registration start date
      const camp = await this.getCamp(campId);
      if (!camp) {
        throw new Error(`Camp with ID ${campId} not found`);
      }
      
      // Check if registration has already started
      const now = new Date();
      if (now >= camp.registrationStartDate) {
        throw new Error("Cannot delete a camp after registration has started. Use cancelCamp instead.");
      }
      
      // Update the camp to mark it as deleted (using raw column names)
      const { rows } = await db.execute(
        sql`UPDATE camps 
            SET is_deleted = true, deleted_at = ${new Date()}
            WHERE id = ${campId}
            RETURNING *`
      );
      const updatedCamp = rows[0];
      
      console.log(`Camp ID: ${campId} has been soft deleted`);
      return updatedCamp;
    } catch (error: any) {
      console.error(`Error soft deleting camp ID: ${campId}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        stack: error.stack
      });
      throw new Error(`Failed to soft delete camp: ${error.message}`);
    }
  }
  
  // Camp cancellation method - can be used after registration start date
  async cancelCamp(campId: number, reason?: string): Promise<Camp> {
    try {
      console.log(`Cancelling camp ID: ${campId}`);
      
      // First get the camp to check if it exists
      const camp = await this.getCamp(campId);
      if (!camp) {
        throw new Error(`Camp with ID ${campId} not found`);
      }
      
      // Update the camp to mark it as cancelled (using raw column names)
      const { rows } = await db.execute(
        sql`UPDATE camps 
            SET is_cancelled = true, cancelled_at = ${new Date()}, cancel_reason = ${reason || null}
            WHERE id = ${campId}
            RETURNING *`
      );
      const updatedCamp = rows[0];
      
      console.log(`Camp ID: ${campId} has been cancelled`);
      return updatedCamp;
    } catch (error: any) {
      console.error(`Error cancelling camp ID: ${campId}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        stack: error.stack
      });
      throw new Error(`Failed to cancel camp: ${error.message}`);
    }
  }

  // Attendance tracking methods
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    // Insert into the attendance_records table with the correct column names
    const [newRecord] = await db.execute(
      sql`INSERT INTO attendance_records 
          (registration_id, camp_id, child_id, date, status, notes, recorded_by, recorded_at, updated_at) 
          VALUES (
            ${record.registrationId}, 
            ${record.campId}, 
            ${record.childId}, 
            ${record.date}, 
            ${record.status}, 
            ${record.notes}, 
            ${record.recordedBy}, 
            ${new Date()}, 
            ${new Date()}
          ) 
          RETURNING *`
    ).then(result => result.rows);
    
    return newRecord as AttendanceRecord;
  }
  
  async getAttendanceRecords(campId: number, date?: Date): Promise<AttendanceRecord[]> {
    let sqlQuery;
    
    if (date) {
      // Filter by the specific date (comparing only the date part)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      sqlQuery = sql`
        SELECT * FROM attendance_records 
        WHERE camp_id = ${campId}
        AND date >= ${startOfDay} AND date <= ${endOfDay}
        ORDER BY date
      `;
    } else {
      sqlQuery = sql`
        SELECT * FROM attendance_records 
        WHERE camp_id = ${campId}
        ORDER BY date
      `;
    }
    
    const result = await db.execute(sqlQuery);
    return result.rows as AttendanceRecord[];
  }
  
  async getAttendanceByRegistration(registrationId: number): Promise<AttendanceRecord[]> {
    const result = await db.execute(
      sql`SELECT * FROM attendance_records 
          WHERE registration_id = ${registrationId}
          ORDER BY date`
    );
    return result.rows as AttendanceRecord[];
  }
  
  async updateAttendanceRecord(id: number, data: Partial<Omit<AttendanceRecord, "id" | "recordedAt" | "updatedAt">>): Promise<AttendanceRecord> {
    // Create the template parts for our SQL query
    const now = new Date();
    let setClauseParts = [];
    let sqlParams: any = { id, updated_at: now };
    
    // Add each property to be updated
    if (data.status) {
      setClauseParts.push(sql`status = ${data.status}`);
    }
    if (data.notes) {
      setClauseParts.push(sql`notes = ${data.notes}`);
    }
    if (data.date) {
      setClauseParts.push(sql`date = ${data.date}`);
    }
    if (data.registrationId) {
      setClauseParts.push(sql`registration_id = ${data.registrationId}`);
    }
    if (data.campId) {
      setClauseParts.push(sql`camp_id = ${data.campId}`);
    }
    if (data.childId) {
      setClauseParts.push(sql`child_id = ${data.childId}`);
    }
    if (data.recordedBy) {
      setClauseParts.push(sql`recorded_by = ${data.recordedBy}`);
    }
    
    // Always update the updated_at timestamp
    setClauseParts.push(sql`updated_at = ${now}`);
    
    // Join all the SET clauses
    const setClauses = sql.join(setClauseParts, sql`, `);
    
    // Build and execute the full query
    const result = await db.execute(sql`
      UPDATE attendance_records 
      SET ${setClauses}
      WHERE id = ${id}
      RETURNING *
    `);
    
    if (result.rows.length === 0) {
      throw new Error(`Attendance record with id ${id} not found`);
    }
    
    return result.rows[0] as AttendanceRecord;
  }
  
  // Enhanced registration methods
  getRegistrationsWithChildInfo(campId: number): Promise<(Registration & { child: Child })[]>;
  
  // Document management methods
  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      // Generate a document hash for verification
      // Using the crypto module imported at the top of the file
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify({
          title: document.title,
          content: document.content,
          organizationId: document.organizationId,
          createdAt: new Date().toISOString(),
        }))
        .digest('hex');
      
      const [newDocument] = await db.insert(documents).values({
        ...document,
        hash,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return newDocument;
    } catch (error: any) {
      console.error("Error creating document:", error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    } catch (error: any) {
      console.error(`Error getting document ${id}:`, error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }
  
  async getDocumentsByOrganization(organizationId: number): Promise<Document[]> {
    try {
      // Log the generated SQL for debugging
      const query = db.select().from(documents).where(eq(documents.organizationId, organizationId));
      console.log("Generated SQL:", query.toSQL());
      
      return await query;
    } catch (error: any) {
      console.error(`Error getting documents for organization ${organizationId}:`, error);
      throw new Error(`Failed to get organization documents: ${error.message}`);
    }
  }
  
  async updateDocument(id: number, data: Partial<Omit<Document, "id" | "createdAt" | "updatedAt" | "hash">>): Promise<Document> {
    try {
      // If content is updated, regenerate the hash
      let hash = undefined;
      
      if (data.content) {
        const document = await this.getDocument(id);
        if (!document) {
          throw new Error(`Document with ID ${id} not found`);
        }
        
        // Using the crypto module imported at the top of the file
        hash = crypto.createHash('sha256')
          .update(JSON.stringify({
            title: data.title || document.title,
            content: data.content,
            organizationId: document.organizationId,
            createdAt: document.createdAt.toISOString(),
          }))
          .digest('hex');
      }
      
      const [updatedDocument] = await db.update(documents)
        .set({
          ...data,
          ...(hash && { hash }),
          updatedAt: new Date()
        })
        .where(eq(documents.id, id))
        .returning();
      
      return updatedDocument;
    } catch (error: any) {
      console.error(`Error updating document ${id}:`, error);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }
  
  async deleteDocument(id: number): Promise<void> {
    try {
      await db.delete(documents).where(eq(documents.id, id));
    } catch (error: any) {
      console.error(`Error deleting document ${id}:`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
  
  // Document fields (signature locations)
  async createDocumentField(field: InsertDocumentField): Promise<DocumentField> {
    try {
      const [newField] = await db.insert(documentFields).values({
        ...field,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return newField;
    } catch (error: any) {
      console.error("Error creating document field:", error);
      throw new Error(`Failed to create document field: ${error.message}`);
    }
  }
  
  async getDocumentFields(documentId: number): Promise<DocumentField[]> {
    try {
      return await db.select().from(documentFields).where(eq(documentFields.documentId, documentId));
    } catch (error: any) {
      console.error(`Error getting fields for document ${documentId}:`, error);
      throw new Error(`Failed to get document fields: ${error.message}`);
    }
  }
  
  async updateDocumentField(id: number, data: Partial<Omit<DocumentField, "id" | "createdAt" | "updatedAt">>): Promise<DocumentField> {
    try {
      const [updatedField] = await db.update(documentFields)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(documentFields.id, id))
        .returning();
      
      return updatedField;
    } catch (error: any) {
      console.error(`Error updating document field ${id}:`, error);
      throw new Error(`Failed to update document field: ${error.message}`);
    }
  }
  
  async deleteDocumentField(id: number): Promise<void> {
    try {
      await db.delete(documentFields).where(eq(documentFields.id, id));
    } catch (error: any) {
      console.error(`Error deleting document field ${id}:`, error);
      throw new Error(`Failed to delete document field: ${error.message}`);
    }
  }
  
  // Signature requests
  async createSignatureRequest(request: InsertSignatureRequest & { token: string }): Promise<SignatureRequest> {
    try {
      const [newRequest] = await db.insert(signatureRequests).values({
        ...request,
        status: request.status || "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      // Create an audit entry for request creation
      await this.createAuditTrailEntry({
        documentId: request.documentId,
        userId: request.requestedById,
        action: "sent",
        ipAddress: request.ipAddress || null,
        userAgent: request.userAgent || null,
        timestamp: new Date()
      });
      
      return newRequest;
    } catch (error: any) {
      console.error("Error creating signature request:", error);
      throw new Error(`Failed to create signature request: ${error.message}`);
    }
  }
  
  async getSignatureRequest(token: string): Promise<SignatureRequest | undefined> {
    try {
      const [request] = await db.select().from(signatureRequests)
        .where(eq(signatureRequests.token, token));
      return request;
    } catch (error: any) {
      console.error(`Error getting signature request with token ${token}:`, error);
      throw new Error(`Failed to get signature request: ${error.message}`);
    }
  }
  
  async getSignatureRequestsByDocument(documentId: number): Promise<SignatureRequest[]> {
    try {
      return await db.select().from(signatureRequests)
        .where(eq(signatureRequests.documentId, documentId));
    } catch (error: any) {
      console.error(`Error getting signature requests for document ${documentId}:`, error);
      throw new Error(`Failed to get document signature requests: ${error.message}`);
    }
  }
  
  async getSignatureRequestsByUser(userId: number): Promise<SignatureRequest[]> {
    try {
      return await db.select().from(signatureRequests)
        .where(eq(signatureRequests.requestedToId, userId));
    } catch (error: any) {
      console.error(`Error getting signature requests for user ${userId}:`, error);
      throw new Error(`Failed to get user signature requests: ${error.message}`);
    }
  }
  
  async updateSignatureRequest(id: number, data: Partial<Omit<SignatureRequest, "id" | "token" | "createdAt" | "updatedAt">>): Promise<SignatureRequest> {
    try {
      const [updatedRequest] = await db.update(signatureRequests)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(signatureRequests.id, id))
        .returning();
      
      // Create an audit entry for status changes
      if (data.status) {
        let action: "viewed" | "signed" | "expired" | "declined" | "revoked";
        switch(data.status) {
          case "signed": action = "signed"; break;
          case "expired": action = "expired"; break;
          case "declined": action = "declined"; break;
          case "revoked": action = "revoked"; break;
          default: action = "viewed"; break;
        }
        
        await this.createAuditTrailEntry({
          documentId: updatedRequest.documentId,
          userId: updatedRequest.requestedToId,
          action,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          timestamp: new Date()
        });
      }
      
      return updatedRequest;
    } catch (error: any) {
      console.error(`Error updating signature request ${id}:`, error);
      throw new Error(`Failed to update signature request: ${error.message}`);
    }
  }
  
  // Signatures
  async createSignature(signature: InsertSignature): Promise<Signature> {
    try {
      const [newSignature] = await db.insert(signatures).values({
        ...signature,
        createdAt: new Date(),
      }).returning();
      
      // Update the signature request status
      await this.updateSignatureRequest(signature.signatureRequestId, { 
        status: "signed", 
        completedAt: new Date(),
        ipAddress: signature.ipAddress,
        userAgent: signature.userAgent
      });
      
      return newSignature;
    } catch (error: any) {
      console.error("Error creating signature:", error);
      throw new Error(`Failed to create signature: ${error.message}`);
    }
  }
  
  async getSignatures(signatureRequestId: number): Promise<Signature[]> {
    try {
      return await db.select().from(signatures)
        .where(eq(signatures.signatureRequestId, signatureRequestId));
    } catch (error: any) {
      console.error(`Error getting signatures for request ${signatureRequestId}:`, error);
      throw new Error(`Failed to get signatures: ${error.message}`);
    }
  }
  
  // Document audit trail
  async createAuditTrailEntry(entry: InsertDocumentAuditTrail): Promise<DocumentAuditTrail> {
    try {
      const [newEntry] = await db.insert(documentAuditTrail).values({
        ...entry,
        timestamp: entry.timestamp || new Date(),
      }).returning();
      
      return newEntry;
    } catch (error: any) {
      console.error("Error creating audit trail entry:", error);
      throw new Error(`Failed to create audit trail entry: ${error.message}`);
    }
  }
  
  async getAuditTrail(documentId: number): Promise<DocumentAuditTrail[]> {
    try {
      return await db.select().from(documentAuditTrail)
        .where(eq(documentAuditTrail.documentId, documentId))
        .orderBy(documentAuditTrail.timestamp);
    } catch (error: any) {
      console.error(`Error getting audit trail for document ${documentId}:`, error);
      throw new Error(`Failed to get document audit trail: ${error.message}`);
    }
  }
  
  // Camp document agreement methods
  async createCampDocumentAgreement(agreement: InsertCampDocumentAgreement): Promise<CampDocumentAgreement> {
    try {
      // Check if the document exists
      const document = await this.getDocument(agreement.documentId);
      if (!document) {
        throw new Error(`Document with ID ${agreement.documentId} not found`);
      }
      
      // Check if the camp exists
      const camp = await this.getCamp(agreement.campId);
      if (!camp) {
        throw new Error(`Camp with ID ${agreement.campId} not found`);
      }
      
      // Insert the agreement
      const [newAgreement] = await db.insert(campDocumentAgreements).values({
        ...agreement,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log(`Created camp document agreement for camp ${agreement.campId} and document ${agreement.documentId}`);
      return newAgreement;
    } catch (error: any) {
      console.error("Error creating camp document agreement:", error);
      throw new Error(`Failed to create camp document agreement: ${error.message}`);
    }
  }
  
  async getCampDocumentAgreements(campId: number): Promise<(CampDocumentAgreement & { document: Document })[]> {
    try {
      // Get all agreements for the camp
      const agreements = await db.select().from(campDocumentAgreements)
        .where(eq(campDocumentAgreements.campId, campId));
      
      // If no agreements, return empty array
      if (!agreements.length) {
        return [];
      }
      
      // Get all document IDs from agreements
      const documentIds = agreements.map(agreement => agreement.documentId);
      
      // Get all the documents data
      const documentsData = await db.select().from(documents)
        .where(inArray(documents.id, documentIds));
      
      // Map documents data to agreements
      const result = agreements.map(agreement => {
        const documentData = documentsData.find(doc => doc.id === agreement.documentId);
        return {
          ...agreement,
          document: documentData!
        };
      });
      
      return result as (CampDocumentAgreement & { document: Document })[];
    } catch (error: any) {
      console.error(`Error getting document agreements for camp ${campId}:`, error);
      throw new Error(`Failed to get document agreements: ${error.message}`);
    }
  }
  
  async deleteCampDocumentAgreement(id: number): Promise<void> {
    try {
      await db.delete(campDocumentAgreements)
        .where(eq(campDocumentAgreements.id, id));
      
      console.log(`Deleted camp document agreement with ID ${id}`);
    } catch (error: any) {
      console.error(`Error deleting camp document agreement ${id}:`, error);
      throw new Error(`Failed to delete camp document agreement: ${error.message}`);
    }
  }
  
  async getCampDocumentAgreementsByCampId(campId: number): Promise<CampDocumentAgreement[]> {
    try {
      return await db.select().from(campDocumentAgreements)
        .where(eq(campDocumentAgreements.campId, campId));
    } catch (error: any) {
      console.error(`Error getting document agreements for camp ${campId}:`, error);
      throw new Error(`Failed to get document agreements for camp: ${error.message}`);
    }
  }
  
  async updateCampDocumentAgreement(
    id: number, 
    data: Partial<Omit<CampDocumentAgreement, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<CampDocumentAgreement> {
    try {
      console.log(`Updating camp document agreement ${id} with data:`, data);
      
      const [updatedAgreement] = await db.update(campDocumentAgreements)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(campDocumentAgreements.id, id))
        .returning();
      
      console.log(`Updated camp document agreement ${id} successfully`);
      return updatedAgreement;
    } catch (error: any) {
      console.error(`Error updating camp document agreement ${id}:`, error);
      throw new Error(`Failed to update camp document agreement: ${error.message}`);
    }
  }
  
  async getRegistrationsWithChildInfo(campId: number): Promise<(Registration & { child: Child })[]> {
    try {
      // Get all registrations for the camp
      const regs = await db
        .select()
        .from(registrations)
        .where(eq(registrations.campId, campId));
      
      // If no registrations, return empty array
      if (!regs.length) {
        return [];
      }
      
      // Get all the children IDs from registrations
      const childIds = regs.map(reg => reg.childId);
      
      // Get all the children data
      const childrenData = await db
        .select()
        .from(children)
        .where(inArray(children.id, childIds));
      
      // Map children data to registrations
      const result = regs.map(reg => {
        const childData = childrenData.find(child => child.id === reg.childId);
        return {
          ...reg,
          child: childData
        };
      });
      
      return result as (Registration & { child: Child })[];
    } catch (error) {
      console.error("Error getting registrations with child info:", error);
      throw new Error("Failed to get registrations with child info");
    }
  }

  // Dashboard data methods
  async getAllCampSessions(organizationId: number): Promise<(CampSession & { camp: Camp })[]> {
    try {
      // Performance optimization: Reduced excessive logging
      
      // Get all camps for the organization
      const orgCamps = await db.select().from(camps).where(
        and(
          eq(camps.organizationId, organizationId),
          eq(camps.isDeleted, false)
        )
      );
      
      if (!orgCamps.length) {
        return [];
      }
      
      const campIds = orgCamps.map(camp => camp.id);
      
      // Get all sessions for these camps
      const sessions = await db.select().from(campSessions).where(
        inArray(campSessions.campId, campIds)
      );
      
      // Create a map of camp id to camp object for quick lookup (more efficient than multiple lookups)
      const campsMap = new Map(orgCamps.map(camp => [camp.id, camp]));
      
      // Combine the sessions with their camp data
      const result = sessions.map(session => ({
        ...session,
        camp: campsMap.get(session.campId)!
      }));
      
      return result;
    } catch (error) {
      console.error("Error getting all camp sessions:", error.message);
      throw new Error(`Failed to get all camp sessions: ${error.message}`);
    }
  }
  
  async getTodaySessions(organizationId: number): Promise<(CampSession & { camp: Camp })[]> {
    try {
      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get all sessions for today
      const allSessions = await this.getAllCampSessions(organizationId);
      
      // Filter for today's sessions only
      return allSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate.toISOString().split('T')[0] === todayStr;
      });
    } catch (error) {
      console.error("Error getting today's sessions:", error);
      throw new Error(`Failed to get today's sessions: ${error.message}`);
    }
  }
  
  async getRecentRegistrations(organizationId: number, hours = 48): Promise<Registration[]> {
    try {
      // Calculate the cutoff time (default 48 hours ago)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      // Get all camps for the organization
      const orgCamps = await db.select().from(camps).where(
        and(
          eq(camps.organizationId, organizationId),
          eq(camps.isDeleted, false)
        )
      );
      
      if (!orgCamps.length) {
        return [];
      }
      
      const campIds = orgCamps.map(camp => camp.id);
      
      // Get recent registrations for these camps
      return await db.select().from(registrations)
        .where(
          and(
            inArray(registrations.campId, campIds),
            gte(registrations.registeredAt, cutoffTime)
          )
        );
    } catch (error) {
      console.error("Error getting recent registrations:", error);
      throw new Error(`Failed to get recent registrations: ${error.message}`);
    }
  }
  
  async getTotalRegistrationsCount(organizationId: number): Promise<number> {
    try {
      // Get all camps for the organization
      const orgCamps = await db.select().from(camps).where(
        and(
          eq(camps.organizationId, organizationId),
          eq(camps.isDeleted, false)
        )
      );
      
      if (!orgCamps.length) {
        return 0;
      }
      
      const campIds = orgCamps.map(camp => camp.id);
      
      // Count all registrations for these camps
      const result = await db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(registrations)
        .where(inArray(registrations.campId, campIds));
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error("Error getting total registrations count:", error);
      throw new Error(`Failed to get total registrations count: ${error.message}`);
    }
  }
  
  async getCampCountsByStatus(organizationId: number): Promise<{ status: string; count: number }[]> {
    try {
      // Get current date
      const today = new Date();
      
      // Get all non-deleted camps for the organization
      const orgCamps = await db.select().from(camps).where(
        and(
          eq(camps.organizationId, organizationId),
          eq(camps.isDeleted, false)
        )
      );
      
      // Categorize camps by status
      const statusCounts = {
        registrationOpen: 0,
        registrationClosed: 0,
        active: 0,
        completed: 0,
        cancelled: 0
      };
      
      for (const camp of orgCamps) {
        const regStartDate = new Date(camp.registrationStartDate);
        const regEndDate = new Date(camp.registrationEndDate);
        const campStartDate = new Date(camp.startDate);
        const campEndDate = new Date(camp.endDate);
        
        if (camp.isCancelled) {
          statusCounts.cancelled++;
        } else if (today < regStartDate) {
          // Registration hasn't opened yet
          statusCounts.registrationClosed++;
        } else if (today >= regStartDate && today <= regEndDate) {
          // Registration is open
          statusCounts.registrationOpen++;
        } else if (today > regEndDate && today < campStartDate) {
          // Registration is closed but camp hasn't started
          statusCounts.registrationClosed++;
        } else if (today >= campStartDate && today <= campEndDate) {
          // Camp is active
          statusCounts.active++;
        } else if (today > campEndDate) {
          // Camp is completed
          statusCounts.completed++;
        }
      }
      
      // Convert to array format
      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
    } catch (error) {
      console.error("Error getting camp counts by status:", error);
      throw new Error(`Failed to get camp counts by status: ${error.message}`);
    }
  }

  // Organization profile methods
  async getOrganizationBySlug(slugOrName: string): Promise<Organization | undefined> {
    try {
      // Try to find by slug first
      let orgResult = await db.select()
        .from(organizations)
        .where(eq(organizations.slug, slugOrName));
      
      // If no result found by slug, try to find by name (converted to slug format)
      if (!orgResult.length) {
        // Generate a slug-like string from the name for comparison
        const nameToSlug = slugOrName.toLowerCase().replace(/-/g, ' ');
        
        orgResult = await db.select()
          .from(organizations)
          .where(
            sql`LOWER(REPLACE(${organizations.name}, ' ', '-')) = ${slugOrName} OR LOWER(${organizations.name}) = ${nameToSlug}`
          );
      }
      
      return orgResult[0];
    } catch (error: any) {
      console.error(`Error fetching organization by slug or name ${slugOrName}:`, error.message);
      return undefined;
    }
  }
  
  async listPublicOrganizationCamps(orgId: number): Promise<(Camp & { sportName?: string, registeredCount?: number })[]> {
    try {
      console.log(`Fetching public camps for organization ${orgId}`);
      
      // Get visible and active camps for this organization
      const campsList = await db.select().from(camps)
        .where(
          and(
            eq(camps.organizationId, orgId),
            eq(camps.visibility, "public"),
            eq(camps.isDeleted, false),
            eq(camps.isCancelled, false),
            gt(camps.endDate, new Date()) // Only future and current camps
          )
        );
      
      // Enrich with sports information
      const enhancedCamps = await Promise.all(campsList.map(async (camp) => {
        // Get the camp sports
        const campSportsData = await db.select().from(campSports)
          .where(eq(campSports.campId, camp.id))
          .limit(1); // We just need one for basic listing
        
        let sportName = "Unlisted Sport";
        
        // If we have a sport, get its name
        if (campSportsData.length > 0) {
          const sportId = campSportsData[0].sportId;
          const sportData = await db.select().from(sports)
            .where(eq(sports.id, sportId))
            .limit(1);
          
          if (sportData.length > 0) {
            sportName = sportData[0].name;
          }
        }
        
        // Get registration count
        const [{ count }] = await db.select({
          count: count()
        }).from(registrations)
          .where(eq(registrations.campId, camp.id));
        
        return {
          ...camp,
          sportName,
          registeredCount: Number(count) || 0
        };
      }));
      
      return enhancedCamps;
    } catch (error: any) {
      console.error("Error fetching public organization camps:", error);
      return [];
    }
  }
  
  async getOrganizationPublicProfile(organizationId: number): Promise<{
    organization: Organization, 
    activeCamps: (Camp & { campSports?: any[] })[]
  }> {
    try {
      console.log(`Fetching public profile for organization ${organizationId}`);
      
      // Get organization details
      const [organization] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      
      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }
      
      // Get active camps (not deleted, not cancelled, registration end date not passed)
      const now = new Date();
      const activeCamps = await db.select()
        .from(camps)
        .where(
          and(
            eq(camps.organizationId, organizationId),
            eq(camps.isDeleted, false),
            eq(camps.isCancelled, false),
            gte(camps.registrationEndDate, now),
            eq(camps.visibility, 'public') // Only get public camps
          )
        )
        .orderBy(camps.startDate);
      
      // For each camp, fetch the related camp sports
      const enrichedCamps = await Promise.all(activeCamps.map(async (camp) => {
        const sportsList = await db.select().from(campSports).where(eq(campSports.campId, camp.id));
        return {
          ...camp,
          campSports: sportsList,
        };
      }));
      
      return {
        organization,
        activeCamps: enrichedCamps
      };
    } catch (error: any) {
      console.error(`Error fetching organization profile for ID ${organizationId}:`, error);
      throw new Error(`Failed to fetch organization profile: ${error.message}`);
    }
  }

  async updateOrganizationProfile(id: number, profileData: Partial<Organization>): Promise<Organization> {
    try {
      // Remove undefined values to reduce payload size and avoid unnecessary updates
      const cleanedData = Object.entries(profileData)
        .filter(([_, value]) => value !== undefined)
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, any>);
      
      // Check if there's anything to update
      if (Object.keys(cleanedData).length === 0) {
        // If no update data, just return the current record
        const org = await this.getOrganization(id);
        if (!org) {
          throw new Error(`Organization with ID ${id} not found`);
        }
        return org;
      }
      
      // Perform the update with cleaned data
      const [updatedOrg] = await db.update(organizations)
        .set(cleanedData)
        .where(eq(organizations.id, id))
        .returning();
      
      return updatedOrg;
    } catch (error: any) {
      console.error(`Error updating organization profile for ID ${id}:`, error);
      throw new Error(`Failed to update organization profile: ${error.message}`);
    }
  }
  
  // Organization messaging methods
  async createOrganizationMessage(message: Omit<InsertOrganizationMessage, "id">): Promise<OrganizationMessage> {
    try {
      console.log(`Creating organization message for org ID ${message.organizationId}`);
      
      const [newMessage] = await db.insert(organizationMessages)
        .values({
          organizationId: message.organizationId,
          senderId: message.senderId,
          senderName: message.senderName,
          senderEmail: message.senderEmail,
          content: message.content,
          isRead: false, // Always start as unread
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newMessage;
    } catch (error: any) {
      console.error(`Error creating organization message:`, error);
      throw new Error(`Failed to create organization message: ${error.message}`);
    }
  }

  async getOrganizationMessage(messageId: number): Promise<OrganizationMessage | null> {
    try {
      console.log(`Fetching organization message with ID ${messageId}`);
      
      const [message] = await db.select()
        .from(organizationMessages)
        .where(eq(organizationMessages.id, messageId));
      
      return message || null;
    } catch (error: any) {
      console.error(`Error fetching organization message with ID ${messageId}:`, error);
      throw new Error(`Failed to fetch organization message: ${error.message}`);
    }
  }

  async getOrganizationMessages(organizationId: number): Promise<OrganizationMessage[]> {
    try {
      console.log(`Fetching all messages for organization ${organizationId}`);
      
      return await db.select()
        .from(organizationMessages)
        .where(eq(organizationMessages.organizationId, organizationId))
        .orderBy(desc(organizationMessages.createdAt)); // Using desc from drizzle-orm
    } catch (error: any) {
      console.error(`Error fetching organization messages for org ID ${organizationId}:`, error);
      throw new Error(`Failed to fetch organization messages: ${error.message}`);
    }
  }

  async getUnreadOrganizationMessages(organizationId: number): Promise<OrganizationMessage[]> {
    try {
      console.log(`Fetching unread messages for organization ${organizationId}`);
      
      return await db.select()
        .from(organizationMessages)
        .where(
          and(
            eq(organizationMessages.organizationId, organizationId),
            eq(organizationMessages.isRead, false)
          )
        )
        .orderBy(desc(organizationMessages.createdAt)); // Using desc from drizzle-orm
    } catch (error: any) {
      console.error(`Error fetching unread organization messages for org ID ${organizationId}:`, error);
      throw new Error(`Failed to fetch unread organization messages: ${error.message}`);
    }
  }

  async markMessageAsRead(messageId: number): Promise<OrganizationMessage> {
    try {
      console.log(`Marking message ${messageId} as read`);
      
      const [updatedMessage] = await db.update(organizationMessages)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(eq(organizationMessages.id, messageId))
        .returning();
      
      return updatedMessage;
    } catch (error: any) {
      console.error(`Error marking message ${messageId} as read:`, error);
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  // Permission Set methods
  async createPermissionSet(permissionSet: InsertPermissionSet): Promise<PermissionSet> {
    try {
      console.log("Creating permission set:", permissionSet);
      
      const [newPermissionSet] = await db.insert(permissionSets).values({
        name: permissionSet.name,
        description: permissionSet.description,
        organizationId: permissionSet.organizationId,
        isDefault: permissionSet.isDefault || false,
        defaultForRole: permissionSet.defaultForRole || null,
      }).returning();
      
      console.log("Created permission set:", newPermissionSet);
      return newPermissionSet;
    } catch (error: any) {
      console.error("Error creating permission set:", error);
      throw new Error(`Failed to create permission set: ${error.message}`);
    }
  }
  
  async getPermissionSet(id: number): Promise<PermissionSet | undefined> {
    try {
      const [permissionSet] = await db.select().from(permissionSets).where(eq(permissionSets.id, id));
      return permissionSet;
    } catch (error: any) {
      console.error(`Error getting permission set ${id}:`, error);
      throw new Error(`Failed to get permission set: ${error.message}`);
    }
  }
  
  async getPermissionSetsByOrganization(organizationId: number): Promise<PermissionSet[]> {
    try {
      return await db.select().from(permissionSets).where(eq(permissionSets.organizationId, organizationId));
    } catch (error: any) {
      console.error(`Error getting permission sets for organization ${organizationId}:`, error);
      throw new Error(`Failed to get permission sets: ${error.message}`);
    }
  }
  
  async getDefaultPermissionSetForRole(organizationId: number, role: Role): Promise<PermissionSet | undefined> {
    try {
      const [permissionSet] = await db.select().from(permissionSets)
        .where(and(
          eq(permissionSets.organizationId, organizationId),
          eq(permissionSets.defaultForRole, role),
          eq(permissionSets.isDefault, true)
        ));
      return permissionSet;
    } catch (error: any) {
      console.error(`Error getting default permission set for role ${role}:`, error);
      throw new Error(`Failed to get default permission set: ${error.message}`);
    }
  }
  
  async updatePermissionSet(id: number, data: Partial<Omit<PermissionSet, "id" | "createdAt" | "updatedAt">>): Promise<PermissionSet> {
    try {
      console.log(`Updating permission set ${id} with data:`, data);
      
      const [updatedPermissionSet] = await db.update(permissionSets)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(permissionSets.id, id))
        .returning();
      
      return updatedPermissionSet;
    } catch (error: any) {
      console.error(`Error updating permission set ${id}:`, error);
      throw new Error(`Failed to update permission set: ${error.message}`);
    }
  }
  
  async deletePermissionSet(id: number): Promise<void> {
    try {
      // This should cascade delete all associated permissions and user assignments
      await db.delete(permissionSets).where(eq(permissionSets.id, id));
    } catch (error: any) {
      console.error(`Error deleting permission set ${id}:`, error);
      throw new Error(`Failed to delete permission set: ${error.message}`);
    }
  }
  
  // Permission methods
  async createPermission(permission: InsertPermission): Promise<Permission> {
    try {
      console.log("Creating permission:", permission);
      
      const [newPermission] = await db.insert(permissions).values({
        permissionSetId: permission.permissionSetId,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope || "organization",
        allowed: permission.allowed
      }).returning();
      
      return newPermission;
    } catch (error: any) {
      console.error("Error creating permission:", error);
      throw new Error(`Failed to create permission: ${error.message}`);
    }
  }
  
  async getPermissionsBySet(permissionSetId: number): Promise<Permission[]> {
    try {
      return await db.select().from(permissions).where(eq(permissions.permissionSetId, permissionSetId));
    } catch (error: any) {
      console.error(`Error getting permissions for set ${permissionSetId}:`, error);
      throw new Error(`Failed to get permissions: ${error.message}`);
    }
  }
  
  async updatePermission(id: number, data: Partial<Omit<Permission, "id">>): Promise<Permission> {
    try {
      console.log(`Updating permission ${id} with data:`, data);
      
      const [updatedPermission] = await db.update(permissions)
        .set(data)
        .where(eq(permissions.id, id))
        .returning();
      
      return updatedPermission;
    } catch (error: any) {
      console.error(`Error updating permission ${id}:`, error);
      throw new Error(`Failed to update permission: ${error.message}`);
    }
  }
  
  async deletePermission(id: number): Promise<void> {
    try {
      await db.delete(permissions).where(eq(permissions.id, id));
    } catch (error: any) {
      console.error(`Error deleting permission ${id}:`, error);
      throw new Error(`Failed to delete permission: ${error.message}`);
    }
  }
  
  // User permission assignment methods
  async assignPermissionSetToUser(userPermission: InsertUserPermission): Promise<UserPermission> {
    try {
      console.log("Assigning permission set to user:", userPermission);
      
      const [newUserPermission] = await db.insert(userPermissions).values({
        userId: userPermission.userId,
        permissionSetId: userPermission.permissionSetId
      }).returning();
      
      return newUserPermission;
    } catch (error: any) {
      console.error("Error assigning permission set to user:", error);
      throw new Error(`Failed to assign permission set: ${error.message}`);
    }
  }
  
  async getUserPermissionSets(userId: number): Promise<(UserPermission & { permissionSet: PermissionSet })[]> {
    try {
      // Get all user permission assignments
      const userPerms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
      
      // For each assignment, fetch the associated permission set
      const result = await Promise.all(userPerms.map(async (up) => {
        const [permSet] = await db.select().from(permissionSets).where(eq(permissionSets.id, up.permissionSetId));
        return {
          ...up,
          permissionSet: permSet
        };
      }));
      
      return result;
    } catch (error: any) {
      console.error(`Error getting permission sets for user ${userId}:`, error);
      throw new Error(`Failed to get user permission sets: ${error.message}`);
    }
  }
  
  async removeUserPermission(id: number): Promise<void> {
    try {
      await db.delete(userPermissions).where(eq(userPermissions.id, id));
    } catch (error: any) {
      console.error(`Error removing user permission ${id}:`, error);
      throw new Error(`Failed to remove user permission: ${error.message}`);
    }
  }
  
  async getAllUserPermissionsForOrganization(organizationId: number): Promise<any[]> {
    try {
      console.log(`Getting all user permissions for organization ${organizationId}`);
      
      // Get all users in the organization
      const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
      
      if (!orgUsers.length) {
        console.log(`No users found for organization ${organizationId}`);
        return [];
      }
      
      console.log(`Found ${orgUsers.length} users in organization ${organizationId}`);
      
      // For each user, get their permissions
      const result = await Promise.all(orgUsers.map(async (user) => {
        // Get user's assigned permission sets with permissions
        const userPermSets = await this.getUserPermissionSets(user.id);
        
        // Get permissions for each set
        const permissionSetsWithPermissions = await Promise.all(
          userPermSets.map(async (ups) => {
            const permissions = await this.getPermissionsBySet(ups.permissionSetId);
            return {
              id: ups.permissionSetId,
              name: ups.permissionSet.name,
              permissions: permissions
            };
          })
        );
        
        // If the user has no specific permissions, get their default role-based permission set
        if (permissionSetsWithPermissions.length === 0 && user.role) {
          const defaultSet = await this.getDefaultPermissionSetForRole(organizationId, user.role);
          
          if (defaultSet) {
            const permissions = await this.getPermissionsBySet(defaultSet.id);
            permissionSetsWithPermissions.push({
              id: defaultSet.id,
              name: defaultSet.name + " (default for " + user.role + ")",
              permissions
            });
          }
        }
        
        return {
          userId: user.id,
          username: user.username,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
          email: user.email,
          role: user.role,
          permissionSets: permissionSetsWithPermissions
        };
      }));
      
      return result;
    } catch (error: any) {
      console.error(`Error getting all user permissions for organization ${organizationId}:`, error);
      throw new Error(`Failed to get all user permissions: ${error.message}`);
    }
  }
  
  // Permission checking
  async checkUserPermission(userId: number, resource: string, action: string, scope: string = "organization"): Promise<boolean> {
    try {
      // First, get the user to determine their role
      const user = await this.getUser(userId);
      if (!user) {
        console.log(`User ${userId} not found when checking permissions`);
        return false;
      }
      
      console.log(`Checking permission for user ${userId} (${user.role}): ${resource}.${action} in scope ${scope}`);
      
      // 1. First check if the user has any specific permission sets assigned
      const userPermSets = await this.getUserPermissionSets(userId);
      
      // If the user has assigned permission sets, check them first
      if (userPermSets.length > 0) {
        console.log(`User ${userId} has ${userPermSets.length} assigned permission sets`);
        
        // For each permission set, check if it grants the requested permission
        for (const userPermSet of userPermSets) {
          const perms = await this.getPermissionsBySet(userPermSet.permissionSetId);
          
          // Find if any permissions match the resource, action, and scope
          const matchingPerm = perms.find(p => 
            p.resource === resource && 
            p.action === action && 
            (p.scope === scope || p.scope === "organization") // Organization scope is a superset of camp scope
          );
          
          if (matchingPerm && matchingPerm.allowed) {
            console.log(`User has explicit permission granted through set ${userPermSet.permissionSetId}`);
            return true;
          }
        }
      }
      
      // 2. If no explicit permission found, fall back to role-based permissions
      if (user.organizationId) {
        const defaultRolePermSet = await this.getDefaultPermissionSetForRole(user.organizationId, user.role);
        
        if (defaultRolePermSet) {
          console.log(`Checking default permissions for role ${user.role}`);
          
          const rolePerms = await this.getPermissionsBySet(defaultRolePermSet.id);
          
          // Find if any permissions match the resource, action, and scope
          const matchingPerm = rolePerms.find(p => 
            p.resource === resource && 
            p.action === action && 
            (p.scope === scope || p.scope === "organization")
          );
          
          if (matchingPerm && matchingPerm.allowed) {
            console.log(`User has permission granted through role ${user.role}`);
            return true;
          }
        }
      }
      
      // 3. Special case: camp_creator role has all permissions
      if (user.role === "camp_creator") {
        console.log(`User is a camp_creator, granting permission by default`);
        return true;
      }
      
      console.log(`Permission denied for user ${userId}: ${resource}.${action}`);
      return false;
    } catch (error: any) {
      console.error(`Error checking permission for user ${userId}:`, error);
      throw new Error(`Failed to check permission: ${error.message}`);
    }
  }

  // Subscription plan methods
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    try {
      const [newPlan] = await db.insert(subscriptionPlans).values({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingInterval: plan.billingInterval,
        features: plan.features,
        tier: plan.tier,
        platformFeePercent: plan.platformFeePercent,
        isActive: plan.isActive ?? true,
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
        maxCamps: plan.maxCamps,
        maxAthletes: plan.maxAthletes,
        maxTeamMembers: plan.maxTeamMembers,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return newPlan;
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      throw new Error(`Failed to create subscription plan: ${error.message}`);
    }
  }
  
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    try {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
      return plan;
    } catch (error: any) {
      console.error(`Error getting subscription plan ${id}:`, error);
      throw new Error(`Failed to get subscription plan: ${error.message}`);
    }
  }
  
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
    } catch (error: any) {
      console.error("Error getting all subscription plans:", error);
      throw new Error(`Failed to get subscription plans: ${error.message}`);
    }
  }
  
  async updateSubscriptionPlan(id: number, data: Partial<Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">>): Promise<SubscriptionPlan> {
    try {
      const [updatedPlan] = await db.update(subscriptionPlans)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      return updatedPlan;
    } catch (error: any) {
      console.error(`Error updating subscription plan ${id}:`, error);
      throw new Error(`Failed to update subscription plan: ${error.message}`);
    }
  }
  
  // Organization subscription methods
  async createOrganizationSubscription(subscription: InsertOrganizationSubscription): Promise<OrganizationSubscription> {
    try {
      const [newSubscription] = await db.insert(organizationSubscriptions).values({
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate ?? new Date(),
        endDate: subscription.endDate,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        currentPeriodStart: subscription.currentPeriodStart ?? new Date(),
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return newSubscription;
    } catch (error: any) {
      console.error("Error creating organization subscription:", error);
      throw new Error(`Failed to create organization subscription: ${error.message}`);
    }
  }
  
  async getOrganizationSubscription(organizationId: number): Promise<OrganizationSubscription | undefined> {
    try {
      // Get the most recent subscription for the organization
      const [subscription] = await db.select().from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, organizationId))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);
      
      return subscription;
    } catch (error: any) {
      console.error(`Error getting organization subscription for org ${organizationId}:`, error);
      throw new Error(`Failed to get organization subscription: ${error.message}`);
    }
  }
  
  async updateOrganizationSubscription(id: number, data: Partial<Omit<OrganizationSubscription, "id" | "createdAt" | "updatedAt">>): Promise<OrganizationSubscription> {
    try {
      const [updatedSubscription] = await db.update(organizationSubscriptions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(organizationSubscriptions.id, id))
        .returning();
      
      return updatedSubscription;
    } catch (error: any) {
      console.error(`Error updating organization subscription ${id}:`, error);
      throw new Error(`Failed to update organization subscription: ${error.message}`);
    }
  }
  
  async getOrganizationActiveSubscription(organizationId: number): Promise<(OrganizationSubscription & { plan: SubscriptionPlan }) | undefined> {
    try {
      // Get the active subscription for the organization
      const subscriptions = await db.select({
        subscription: organizationSubscriptions,
        plan: subscriptionPlans
      })
      .from(organizationSubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(organizationSubscriptions.planId, subscriptionPlans.id)
      )
      .where(
        and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        )
      )
      .orderBy(desc(organizationSubscriptions.createdAt))
      .limit(1);
      
      if (subscriptions.length === 0) {
        return undefined;
      }
      
      const { subscription, plan } = subscriptions[0];
      return {
        ...subscription,
        plan
      };
    } catch (error: any) {
      console.error(`Error getting organization active subscription for org ${organizationId}:`, error);
      throw new Error(`Failed to get organization active subscription: ${error.message}`);
    }
  }
}

export const storage = new DatabaseStorage();