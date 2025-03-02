import {
  users,
  type User,
  type InsertUser,
  type Role,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
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
    console.log("Found user:", user);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("Getting user by username:", username);
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    console.log("Found user:", user);
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
  async createChild(child: Omit<Child, "id">): Promise<Child> {
    const [newChild] = await db.insert(children).values({
      name: child.name,
      age: child.age,
      parentId: child.parentId,
      medicalInfo: child.medicalInfo,
      emergencyContact: child.emergencyContact,
    }).returning();
    return newChild;
  }

  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async getChildrenByParent(parentId: number): Promise<Child[]> {
    return await db.select()
      .from(children)
      .where(eq(children.parentId, parentId))
      .orderBy(children.fullName);
  }

  async createCamp(camp: Omit<Camp, "id">): Promise<Camp> {
    const [newCamp] = await db.insert(camps).values({
      name: camp.name,
      description: camp.description,
      location: camp.location,
      startDate: camp.startDate,
      endDate: camp.endDate,
      price: camp.price,
      capacity: camp.capacity,
      organizationId: camp.organizationId,
      waitlistEnabled: camp.waitlistEnabled ?? true,
    }).returning();
    return newCamp;
  }

  async getCamp(id: number): Promise<Camp | undefined> {
    const [camp] = await db.select().from(camps).where(eq(camps.id, id));
    return camp;
  }

  async listCamps(): Promise<Camp[]> {
    return await db.select().from(camps);
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

  async getRegistrationsByCamp(campId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.campId, campId));
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