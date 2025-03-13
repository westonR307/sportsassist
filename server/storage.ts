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
  type Role,
  type Camp,
  type Organization,
  type InsertOrganization,
  type Invitation,
  type InsertInvitation,
  type Child,
  type CampSport,
  type SportLevel,
  type Registration,
  type CampSchedule,
  type InsertCampSchedule,
  insertCampSchema
} from "@shared/schema";
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

  async createCamp(campData: Omit<Camp, "id"> & { schedules?: InsertCampSchedule[] }): Promise<Camp> {
    try {
      console.log("========= Creating Camp - Debug Info =========");
      console.log("Raw camp data:", JSON.stringify(campData, null, 2));

      const baseData = {
        name: campData.name,
        description: campData.description,
        streetAddress: campData.streetAddress,
        city: campData.city,
        state: campData.state,
        zipCode: campData.zipCode,
        additionalLocationDetails: campData.additionalLocationDetails,
        startDate: campData.startDate,
        endDate: campData.endDate,
        registrationStartDate: campData.registrationStartDate,
        registrationEndDate: campData.registrationEndDate,
        price: Number(campData.price),
        capacity: Number(campData.capacity),
        organizationId: Number(campData.organizationId),
        type: campData.type,
        visibility: campData.visibility || "public",
        waitlistEnabled: true,
        minAge: Number(campData.minAge),
        maxAge: Number(campData.maxAge),
        repeatType: campData.repeatType || "none",
        repeatCount: Number(campData.repeatCount || 0)
      };

      console.log("Processed camp data:", JSON.stringify(baseData, null, 2));

      // First create the camp
      const [newCamp] = await db.insert(camps)
        .values(baseData)
        .returning();

      console.log("Created camp:", JSON.stringify(newCamp, null, 2));

      // Then create schedules if provided
      if (campData.schedules && campData.schedules.length > 0) {
        console.log("Creating schedules:", JSON.stringify(campData.schedules, null, 2));

        for (const schedule of campData.schedules) {
          const scheduleData = {
            campId: newCamp.id,
            dayOfWeek: Number(schedule.dayOfWeek),
            startTime: schedule.startTime,
            endTime: schedule.endTime
          };

          console.log("Creating schedule:", JSON.stringify(scheduleData, null, 2));

          await db.insert(campSchedules)
            .values(scheduleData)
            .returning();
        }
      }

      return newCamp;
    } catch (error: any) {
      console.error("Camp creation failed:", {
        error: error.message,
        sqlState: error.sqlState,
        code: error.code,
        detail: error.detail,
        table: error.table,
        constraint: error.constraint,
        routine: error.routine,
        schema: error.schema,
        stack: error.stack
      });
      throw error;
    }
  }

  async listCamps(): Promise<Camp[]> {
    try {
      return await db.select().from(camps);
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