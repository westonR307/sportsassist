import {
  users,
  camps,
  organizations,
  invitations,
  children,
  campSports,
  registrations,
  campSchedules,
  scheduleExceptions,
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
  createUser(user: InsertUser & { organizationId?: number }): Promise<User>;
  updateUserRole(userId: number, newRole: Role): Promise<User>;
  getOrganizationStaff(orgId: number): Promise<User[]>;
  createCamp(camp: Omit<Camp, "id"> & { schedules?: CampSchedule[] }): Promise<Camp>;
  updateCamp(id: number, campData: Partial<Omit<Camp, "id" | "organizationId">>): Promise<Camp>;
  listCamps(organizationId?: number): Promise<Camp[]>;
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
  createCampSport(campSport: { campId: number; sportId: number; skillLevel: SportLevel; }): Promise<CampSport>;
  getCampSchedules(campId: number): Promise<CampSchedule[]>;
  getCampScheduleExceptions(campId: number): Promise<ScheduleException[]>;
  createScheduleException(exception: InsertScheduleException): Promise<ScheduleException>;
  updateScheduleException(id: number, exception: Partial<Omit<ScheduleException, "id">>): Promise<ScheduleException>;
  getScheduleException(id: number): Promise<ScheduleException | undefined>;
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

  async createUser(insertUser: InsertUser & { organizationId?: number }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: insertUser.username.toLowerCase(),
      password: insertUser.password,
      passwordHash: insertUser.password, // Add the passwordHash field with the same value
      email: insertUser.email,
      role: insertUser.role,
      organizationId: insertUser.organizationId,
    }).returning();
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

  async listCamps(organizationId?: number): Promise<Camp[]> {
    try {
      console.log(organizationId ? `Fetching camps for organization ${organizationId}` : "Fetching all camps");
      
      // If organizationId is provided, filter by it
      let query = db.select().from(camps);
      if (organizationId) {
        query = query.where(eq(camps.organizationId, organizationId));
      }
      
      const allCamps = await query;
      console.log(`Retrieved ${allCamps.length} camps`);
      return allCamps;
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
    return await db.select()
      .from(children)
      .where(eq(children.parentId, parentId));
  }

  async getChild(childId: number): Promise<Child | undefined> {
    const [child] = await db.select()
      .from(children)
      .where(eq(children.id, childId));
    return child;
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
}

export const storage = new DatabaseStorage();