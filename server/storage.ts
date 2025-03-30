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
  insertCampSchema,
  sports
} from "@shared/schema";
import { type Role, type SportLevel } from "@shared/types";
import { db } from "./db";
import { eq, sql, and, or } from "drizzle-orm";
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
  getDefaultStartTimeForCamp(campId: number): Promise<string | null>;
  getDefaultEndTimeForCamp(campId: number): Promise<string | null>;
  
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

  async listCamps(organizationId?: number): Promise<(Camp & { campSports?: any[] })[]> {
    try {
      console.log(organizationId ? `Fetching camps for organization ${organizationId}` : "Fetching all camps");
      
      // First, get all camps
      let query = db.select().from(camps);
      if (organizationId) {
        query = query.where(eq(camps.organizationId, organizationId));
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
      const [camp] = await db.select().from(camps).where(eq(camps.id, id));
      return camp;
    } catch (error) {
      console.error("Error getting camp:", error);
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
  
  async updateChild(childId: number, childData: Partial<Omit<Child, "id">> & { sportsInterests?: Array<{ sportId: number, skillLevel: SportLevel }> }): Promise<Child> {
    try {
      console.log("Updating child with data:", JSON.stringify(childData, null, 2));
      
      // Use a transaction to ensure all updates happen together
      return await db.transaction(async (trx) => {
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
}

export const storage = new DatabaseStorage();