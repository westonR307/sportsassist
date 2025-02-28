import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type Role = "admin" | "manager" | "coach" | "volunteer" | "parent";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<Role>().notNull(),
  organizationId: integer("organization_id"),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stripeAccountId: text("stripe_account_id"),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  parentId: integer("parent_id").notNull(),
});

export const camps = pgTable("camps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  price: integer("price").notNull(),
  capacity: integer("capacity").notNull(),
  organizationId: integer("organization_id").notNull(),
});

export const campStaff = pgTable("camp_staff", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").$type<Role>().notNull(),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").notNull(),
  childId: integer("child_id").notNull(),
  paid: boolean("paid").notNull().default(false),
  stripePaymentId: text("stripe_payment_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  organizationId: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  parentId: true,
});
export const insertCampSchema = createInsertSchema(camps);
export const insertRegistrationSchema = createInsertSchema(registrations);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type Camp = typeof camps.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Organization = typeof organizations.$inferSelect;