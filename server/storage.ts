import {
  users,
  children,
  camps,
  registrations,
  organizations,
  invitations,
  type User,
  type InsertUser,
  type Child,
  type Camp,
  type Registration,
  type Organization,
  type InsertOrganization,
  type Invitation,
  type InsertInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { organizationId?: number }): Promise<User>;

  // Child operations
  createChild(child: Omit<Child, "id">): Promise<Child>;
  getChild(id: number): Promise<Child | undefined>;
  getChildrenByParent(parentId: number): Promise<Child[]>;

  // Camp operations
  createCamp(camp: Omit<Camp, "id">): Promise<Camp>;
  getCamp(id: number): Promise<Camp | undefined>;
  listCamps(): Promise<Camp[]>;

  // Registration operations
  createRegistration(registration: Omit<Registration, "id">): Promise<Registration>;
  getRegistration(id: number): Promise<Registration | undefined>;
  getRegistrationsByCamp(campId: number): Promise<Registration[]>;

  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationUsers(orgId: number): Promise<User[]>;

  // Invitation operations
  createInvitation(invitation: InsertInvitation & { token: string }): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string): Promise<Invitation>;
  listOrganizationInvitations(organizationId: number): Promise<Invitation[]>;
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { organizationId?: number }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      role: insertUser.role,
      organizationId: insertUser.organizationId,
    }).returning();
    return user;
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