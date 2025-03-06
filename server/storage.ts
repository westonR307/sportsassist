import {
  users,
  camps,
  organizations,
  invitations,
  type User,
  type InsertUser,
  type Role,
  type Camp,
  type Organization,
  type InsertOrganization,
  type Invitation,
  type InsertInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, inArray } from "drizzle-orm";
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
  createCamp(camp: Omit<Camp, "id">): Promise<Camp>;
  listCamps(): Promise<Camp[]>;
  getCamp(id: number): Promise<Camp | undefined>;
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
    console.log("Getting user by ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      console.log("Found user:", {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId
      });
    } else {
      console.log("No user found with ID:", id);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("Getting user by username:", username);
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    if (user) {
      console.log("Found user:", {
        id: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId
      });
    } else {
      console.log("No user found with username:", username);
    }
    return user;
  }

  async createUser(insertUser: InsertUser & { organizationId?: number }): Promise<User> {
    console.log("Creating user:", { ...insertUser, password: '[REDACTED]' });
    const [user] = await db.insert(users).values({
      username: insertUser.username.toLowerCase(),
      password: insertUser.password,
      email: insertUser.email,
      role: insertUser.role,
      organizationId: insertUser.organizationId,
    }).returning();
    console.log("Created user:", { ...user, password: '[REDACTED]' });
    return user;
  }

  async updateUserRole(userId: number, newRole: Role): Promise<User> {
    console.log("Starting role update for user:", userId, "to role:", newRole);
    try {
      const [user] = await db
        .update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        const error = new Error(`Failed to update user ${userId} to role ${newRole}`);
        console.error("Role update failed:", error);
        throw error;
      }

      console.log("Successfully updated user role:", {
        userId,
        oldRole: user.role,
        newRole: newRole
      });
      return user;
    } catch (error) {
      console.error("Database error during role update:", error);
      throw error;
    }
  }

  async getOrganizationStaff(orgId: number): Promise<User[]> {
    const staffRoles = ["coach", "manager", "volunteer"] as const;
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          inArray(users.role, staffRoles)
        )
      );
  }

  async createCamp(camp: Omit<Camp, "id">): Promise<Camp> {
    try {
      console.log("Creating camp with data:", camp);

      const [newCamp] = await db.insert(camps).values({
        name: camp.name,
        description: camp.description,
        street_address: camp.streetAddress,
        city: camp.city,
        state: camp.state,
        zip_code: camp.zipCode,
        start_date: new Date(camp.startDate),
        end_date: new Date(camp.endDate),
        registration_start_date: new Date(camp.registrationStartDate),
        registration_end_date: new Date(camp.registrationEndDate),
        price: camp.price,
        capacity: camp.capacity,
        organization_id: camp.organizationId,
        type: camp.type,
        visibility: camp.visibility,
        waitlist_enabled: camp.waitlistEnabled,
        min_age: camp.minAge,
        max_age: camp.maxAge,
        repeat_type: camp.repeatType,
        repeat_count: camp.repeatCount
      }).returning();

      console.log("Successfully created camp:", newCamp);

      // Map snake_case back to camelCase
      return {
        id: newCamp.id,
        name: newCamp.name,
        description: newCamp.description,
        streetAddress: newCamp.street_address,
        city: newCamp.city,
        state: newCamp.state,
        zipCode: newCamp.zip_code,
        startDate: newCamp.start_date,
        endDate: newCamp.end_date,
        registrationStartDate: newCamp.registration_start_date,
        registrationEndDate: newCamp.registration_end_date,
        price: newCamp.price,
        capacity: newCamp.capacity,
        organizationId: newCamp.organization_id,
        type: newCamp.type,
        visibility: newCamp.visibility,
        waitlistEnabled: newCamp.waitlist_enabled,
        minAge: newCamp.min_age,
        maxAge: newCamp.max_age,
        repeatType: newCamp.repeat_type,
        repeatCount: newCamp.repeat_count
      } as Camp;
    } catch (error) {
      console.error("Error creating camp:", error);
      throw error;
    }
  }

  async listCamps(): Promise<Camp[]> {
    try {
      const campList = await db.select().from(camps);
      console.log("Retrieved camps from database:", campList);

      return campList.map(camp => ({
        id: camp.id,
        name: camp.name,
        description: camp.description,
        streetAddress: camp.street_address,
        city: camp.city,
        state: camp.state,
        zipCode: camp.zip_code,
        startDate: camp.start_date,
        endDate: camp.end_date,
        registrationStartDate: camp.registration_start_date,
        registrationEndDate: camp.registration_end_date,
        price: camp.price,
        capacity: camp.capacity,
        organizationId: camp.organization_id,
        type: camp.type,
        visibility: camp.visibility,
        waitlistEnabled: camp.waitlist_enabled,
        minAge: camp.min_age,
        maxAge: camp.max_age,
        repeatType: camp.repeat_type,
        repeatCount: camp.repeat_count
      } as Camp));
    } catch (error) {
      console.error("Error listing camps:", error);
      throw error;
    }
  }

  async getCamp(id: number): Promise<Camp | undefined> {
    try {
      const [camp] = await db.select().from(camps).where(eq(camps.id, id));
      if (!camp) return undefined;

      return {
        id: camp.id,
        name: camp.name,
        description: camp.description,
        streetAddress: camp.street_address,
        city: camp.city,
        state: camp.state,
        zipCode: camp.zip_code,
        startDate: camp.start_date,
        endDate: camp.end_date,
        registrationStartDate: camp.registration_start_date,
        registrationEndDate: camp.registration_end_date,
        price: camp.price,
        capacity: camp.capacity,
        organizationId: camp.organization_id,
        type: camp.type,
        visibility: camp.visibility,
        waitlistEnabled: camp.waitlist_enabled,
        minAge: camp.min_age,
        maxAge: camp.max_age,
        repeatType: camp.repeat_type,
        repeatCount: camp.repeat_count
      } as Camp;
    } catch (error) {
      console.error("Error getting camp:", error);
      throw error;
    }
  }
  async getRegistrationsByCamp(campId: number): Promise<any[]> {
    try {
      // Import registrations from schema
      const { registrations } = await import("@shared/schema");
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
      paid: registration.paid ?? false,
      stripePaymentId: registration.stripePaymentId,
      waitlisted: registration.waitlisted ?? false,
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
}

export const storage = new DatabaseStorage();