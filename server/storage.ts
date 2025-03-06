import {
  users,
  camps,
  organizations,
  invitations,
  children,
  campSports,
  registrations,
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
  type Registration
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
  createCamp(camp: Omit<Camp, "id">): Promise<Camp>;
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
  createCampSport(campSport: {
    campId: number;
    sportId: number;
    skillLevel: SportLevel;
  }): Promise<CampSport>;
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
        additional_location_details: camp.additionalLocationDetails,
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

      // Map snake_case back to camelCase
      return {
        id: newCamp.id,
        name: newCamp.name,
        description: newCamp.description,
        streetAddress: newCamp.street_address,
        city: newCamp.city,
        state: newCamp.state,
        zipCode: newCamp.zip_code,
        additionalLocationDetails: newCamp.additional_location_details,
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
        additionalLocationDetails: camp.additional_location_details,
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
        additionalLocationDetails: camp.additional_location_details,
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

  async getRegistrationsByCamp(campId: number): Promise<Registration[]> {
    try {
      const registrationsList = await db.select().from(registrations).where(eq(registrations.campId, campId));
      return registrationsList;
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
}

export const storage = new DatabaseStorage();