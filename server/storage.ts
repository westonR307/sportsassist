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

  async createCamp(campData: any): Promise<any> {
    try {
      console.log("=== Camp Creation Process Start ===");
      console.log("1. Incoming camp data:", {
        ...campData,
        organizationId: campData.organizationId,
        schedules: campData.schedules
      });

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

      // Prepare the data
      const preparedData = {
        ...campData,
        organizationId,
        price: Number(campData.price),
        capacity: Number(campData.capacity),
        minAge: Number(campData.minAge),
        maxAge: Number(campData.maxAge),
        repeatCount: Number(campData.repeatCount || 0),
        waitlistEnabled: true,
        visibility: campData.visibility || "public",
        repeatType: campData.repeatType || "none",
        startDate: new Date(campData.startDate),
        endDate: new Date(campData.endDate),
        registrationStartDate: new Date(campData.registrationStartDate),
        registrationEndDate: new Date(campData.registrationEndDate)
      };

      console.log("2. Prepared data:", preparedData);

      // Validate the data
      let validatedData;
      try {
        const validation = insertCampSchema.safeParse(preparedData);
        if (!validation.success) {
          console.error("Validation errors:", validation.error.errors);
          throw validation.error;
        }
        validatedData = validation.data;
        console.log("3. Data validated successfully");
      } catch (error) {
        console.error("Validation failed:", error);
        throw error;
      }

      // Create the camp
      let newCamp;
      try {
        [newCamp] = await db.insert(camps).values({
          name: validatedData.name,
          description: validatedData.description,
          streetAddress: validatedData.streetAddress,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          additionalLocationDetails: validatedData.additionalLocationDetails,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          registrationStartDate: validatedData.registrationStartDate,
          registrationEndDate: validatedData.registrationEndDate,
          price: validatedData.price,
          capacity: validatedData.capacity,
          organizationId: validatedData.organizationId,
          type: validatedData.type,
          visibility: validatedData.visibility,
          waitlistEnabled: validatedData.waitlistEnabled,
          minAge: validatedData.minAge,
          maxAge: validatedData.maxAge,
          repeatType: validatedData.repeatType,
          repeatCount: validatedData.repeatCount
        }).returning();
        console.log("4. Camp created successfully:", newCamp);
      } catch (error) {
        console.error("Database insertion failed:", {
          error: error,
          sql: error.sql,
          parameters: error.parameters
        });
        throw error;
      }

      // Create schedules
      if (validatedData.schedules?.length > 0) {
        try {
          console.log("5. Creating schedules:", validatedData.schedules);
          await Promise.all(
            validatedData.schedules.map(schedule =>
              db.insert(campSchedules).values({
                campId: newCamp.id,
                dayOfWeek: Number(schedule.dayOfWeek),
                startTime: schedule.startTime,
                endTime: schedule.endTime
              })
            )
          );
          console.log("6. Schedules created successfully");
        } catch (error) {
          console.error("Schedule creation failed:", error);
          throw error;
        }
      }

      console.log("=== Camp Creation Complete ===");
      return newCamp;
    } catch (error: any) {
      console.error("Camp creation failed:", {
        name: error.name,
        message: error.message,
        errors: error.errors,
        code: error.code,
        detail: error.detail,
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