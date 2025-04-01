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
  attendanceRecords,
  campSessions,
  recurrencePatterns,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
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
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type CampSession,
  type InsertCampSession,
  type RecurrencePattern,
  type InsertRecurrencePattern,
  insertCampSchema,
  sports
} from "@shared/schema";
import { type Role, type SportLevel } from "@shared/types";
import { db } from "./db";
import { eq, sql, and, or, gte, lte, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

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
  createCamp(camp: Omit<Camp, "id"> & { schedules?: CampSchedule[] }): Promise<Camp>;
  updateCamp(id: number, campData: Partial<Omit<Camp, "id" | "organizationId">>): Promise<Camp>;
  listCamps(organizationId?: number): Promise<(Camp & { campSports?: any[], defaultStartTime?: string | null, defaultEndTime?: string | null })[]>;
  getCamp(id: number): Promise<Camp | undefined>;
  getRegistrationsByCamp(campId: number): Promise<Registration[]>;
  createRegistration(registration: Omit<Registration, "id">): Promise<Registration>;
  getRegistration(id: number): Promise<Registration | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  updateOrganization(id: number, orgData: Partial<Omit<Organization, "id" | "createdAt">>): Promise<Organization>;
  getOrganizationUsers(orgId: number): Promise<User[]>;
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
  listCustomFields(organizationId: number): Promise<CustomField[]>;
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
        repeatCount: parseInt(String(campData.repeatCount || '0'), 10)
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

  async listOrganizationInvitations(organizationId: number): Promise<Invitation[]> {
    return await db.select()
      .from(invitations)
      .where(eq(invitations.organizationId, organizationId));
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

  async listCustomFields(organizationId: number): Promise<CustomField[]> {
    try {
      return await db.select()
        .from(customFields)
        .where(eq(customFields.organizationId, organizationId))
        .orderBy(customFields.name);
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
      console.log(`Storage - Getting all camp sessions for organization ${organizationId}`);
      
      // Get all camps for the organization
      const orgCamps = await db.select().from(camps).where(
        and(
          eq(camps.organizationId, organizationId),
          eq(camps.isDeleted, false)
        )
      );
      
      console.log(`Storage - Found ${orgCamps.length} camps for organization ${organizationId}`);
      
      if (!orgCamps.length) {
        console.log("Storage - No camps found, returning empty sessions array");
        return [];
      }
      
      const campIds = orgCamps.map(camp => camp.id);
      console.log(`Storage - Camp IDs: ${campIds.join(', ')}`);
      
      // Get all sessions for these camps
      const sessions = await db.select().from(campSessions).where(
        inArray(campSessions.campId, campIds)
      );
      
      console.log(`Storage - Found ${sessions.length} sessions for these camps`);
      if (sessions.length > 0) {
        console.log(`Storage - Sample session data:`, JSON.stringify(sessions[0]));
      }
      
      // If no sessions found, let's check the database directly to see what's in there
      if (sessions.length === 0) {
        const allSessions = await db.select().from(campSessions);
        console.log(`Storage - Total sessions in database: ${allSessions.length}`);
        if (allSessions.length > 0) {
          console.log(`Storage - Sample session from all sessions:`, JSON.stringify(allSessions[0]));
          console.log(`Storage - Session camp IDs in database:`, allSessions.map(s => s.campId).join(', '));
        }
      }
      
      // Create a map of camp id to camp object for quick lookup
      const campsMap = new Map(orgCamps.map(camp => [camp.id, camp]));
      
      // Combine the sessions with their camp data
      const result = sessions.map(session => ({
        ...session,
        camp: campsMap.get(session.campId)!
      }));
      
      console.log(`Storage - Returning ${result.length} combined sessions`);
      return result;
    } catch (error) {
      console.error("Error getting all camp sessions:", error);
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
}

export const storage = new DatabaseStorage();