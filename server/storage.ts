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

  async listCamps(): Promise<Camp[]> {
    try {
      console.log("Fetching all camps");
      const allCamps = await db.select().from(camps);
      console.log("Retrieved camps:", JSON.stringify(allCamps, null, 2));
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