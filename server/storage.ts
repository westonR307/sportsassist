import {
  type User,
  type InsertUser,
  type Child,
  type Camp,
  type Registration,
  type Organization,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private children: Map<number, Child>;
  private camps: Map<number, Camp>;
  private registrations: Map<number, Registration>;
  private organizations: Map<number, Organization>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.children = new Map();
    this.camps = new Map();
    this.registrations = new Map();
    this.organizations = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChild(child: Omit<Child, "id">): Promise<Child> {
    const id = this.currentId++;
    const newChild = { ...child, id };
    this.children.set(id, newChild);
    return newChild;
  }

  async getChild(id: number): Promise<Child | undefined> {
    return this.children.get(id);
  }

  async getChildrenByParent(parentId: number): Promise<Child[]> {
    return Array.from(this.children.values()).filter(
      (child) => child.parentId === parentId,
    );
  }

  async createCamp(camp: Omit<Camp, "id">): Promise<Camp> {
    const id = this.currentId++;
    const newCamp = { ...camp, id };
    this.camps.set(id, newCamp);
    return newCamp;
  }

  async getCamp(id: number): Promise<Camp | undefined> {
    return this.camps.get(id);
  }

  async listCamps(): Promise<Camp[]> {
    return Array.from(this.camps.values());
  }

  async createRegistration(registration: Omit<Registration, "id">): Promise<Registration> {
    const id = this.currentId++;
    const newRegistration = { ...registration, id };
    this.registrations.set(id, newRegistration);
    return newRegistration;
  }

  async getRegistration(id: number): Promise<Registration | undefined> {
    return this.registrations.get(id);
  }

  async getRegistrationsByCamp(campId: number): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(
      (registration) => registration.campId === campId,
    );
  }
}

export const storage = new MemStorage();
