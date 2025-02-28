import {
  users,
  children,
  camps,
  registrations,
  organizations,
  type User,
  type InsertUser,
  type Child,
  type Camp,
  type Registration,
  type Organization,
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
  createUser(user: InsertUser): Promise<User>;

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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createChild(child: Omit<Child, "id">): Promise<Child> {
    const [newChild] = await db.insert(children).values(child).returning();
    return newChild;
  }

  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async getChildrenByParent(parentId: number): Promise<Child[]> {
    return await db.select().from(children).where(eq(children.parentId, parentId));
  }

  async createCamp(camp: Omit<Camp, "id">): Promise<Camp> {
    const [newCamp] = await db.insert(camps).values(camp).returning();
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
      ...registration,
      paid: false,
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
}

export const storage = new DatabaseStorage();