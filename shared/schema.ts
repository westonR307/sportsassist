import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type Role = "admin" | "manager" | "coach" | "volunteer" | "parent";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stripeAccountId: text("stripe_account_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<Role>().notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").$type<Role>().notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  token: text("token").notNull().unique(),
  accepted: boolean("accepted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  parentId: integer("parent_id").references(() => users.id).notNull(),
  medicalInfo: text("medical_info"),
  emergencyContact: text("emergency_contact"),
});

export const camps = pgTable("camps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  price: integer("price").notNull(), // In cents
  capacity: integer("capacity").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
});

export const campStaff = pgTable("camp_staff", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").$type<Role>().notNull(),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  childId: integer("child_id").references(() => children.id).notNull(),
  paid: boolean("paid").notNull().default(false),
  stripePaymentId: text("stripe_payment_id"),
  waitlisted: boolean("waitlisted").notNull().default(false),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

// Schema for inserting new records
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  email: true,
}).extend({
  organizationName: z.string().optional(),
  organizationDescription: z.string().optional(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  accepted: true,
  createdAt: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  parentId: true,
});

export const insertCampSchema = createInsertSchema(camps);
export const insertRegistrationSchema = createInsertSchema(registrations);
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  stripeAccountId: true,
  createdAt: true,
});

// Types for the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type Camp = typeof camps.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;