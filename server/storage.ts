import {
  users,
  camps,
  organizations,
  invitations,
  children,
  campSports,
  registrations,
  campSchedules,
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
  type Camp,
  insertCampSchema
} from "@shared/schema";
import { type Role, type SportLevel } from "@shared/types";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
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
  createCamp(camp: Omit<Camp, "id"> & { schedules?: InsertCampSchedule[] }): Promise<Camp>;
  listCamps(): Promise<Camp[]>;
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
    const staffRoles = ["coach", "manager", "volunteer"] as Role[];
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          sql`${users.role} = ANY(${staffRoles})`
        )
      );
  }

  async createCamp(campData: any): Promise<any> {
    try {
      console.log("=== Camp Creation Process Start ===");
      console.log("1. Raw camp data:", JSON.stringify(campData, null, 2));

      // First ensure organizationId is a number
      let organizationId: number;
      try {
        organizationId = parseInt(String(campData.organizationId), 10);
        if (isNaN(organizationId)) {
          throw new Error("Invalid organization ID");
        }
      } catch (error) {
        console.error("Organization ID conversion failed:", error);
        throw new Error("Invalid organization ID format");
      }

      // Prepare the data with explicit type conversions
      const preparedData = {
        name: campData.name,
        description: campData.description,
        streetAddress: campData.streetAddress,
        city: campData.city,
        state: campData.state,
        zipCode: campData.zipCode,
        additionalLocationDetails: campData.additionalLocationDetails,
        startDate: new Date(campData.startDate),
        endDate: new Date(campData.endDate),
        registrationStartDate: new Date(campData.registrationStartDate),
        registrationEndDate: new Date(campData.registrationEndDate),
        price: parseInt(String(campData.price), 10),
        capacity: parseInt(String(campData.capacity), 10),
        organizationId: organizationId,
        type: campData.type,
        visibility: campData.visibility || "public",
        waitlistEnabled: true,
        minAge: parseInt(String(campData.minAge), 10),
        maxAge: parseInt(String(campData.maxAge), 10),
        repeatType: campData.repeatType || "none",
        repeatCount: parseInt(String(campData.repeatCount || '0'), 10)
      };

      console.log("2. Prepared data:", JSON.stringify(preparedData, null, 2));

      // Create the camp
      const [newCamp] = await db.insert(camps).values(preparedData).returning();
      console.log("3. Created camp:", JSON.stringify(newCamp, null, 2));

      // Create schedules if provided
      if (campData.schedules?.length > 0) {
        console.log("4. Creating schedules:", JSON.stringify(campData.schedules, null, 2));

        const schedulePromises = campData.schedules.map(schedule => {
          const scheduleData = {
            campId: newCamp.id,
            dayOfWeek: parseInt(String(schedule.dayOfWeek), 10),
            startTime: schedule.startTime,
            endTime: schedule.endTime
          };
          return db.insert(campSchedules).values(scheduleData);
        });

        await Promise.all(schedulePromises);
        console.log("5. Schedules created successfully");
      }

      return newCamp;
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

  async listCamps(): Promise<Camp[]> {
    try {
      console.log("Fetching all camps");
      const allCamps = await db.select().from(camps);
      console.log("Retrieved camps:", JSON.stringify(allCamps, null, 2));
      return allCamps;
    } catch (error) {
      console.error("Error listing camps:", error);
      throw error;
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
}

export const storage = new DatabaseStorage();