import { pgTable, text, serial, integer, boolean, timestamp, time } from "drizzle-orm/pg-core";
import { type CampType, type CampVisibility, type RepeatType } from "./types";

export const camps = pgTable("camps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  additionalLocationDetails: text("additional_location_details"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationStartDate: timestamp("registration_start_date").notNull(),
  registrationEndDate: timestamp("registration_end_date").notNull(),
  price: integer("price").notNull(),
  capacity: integer("capacity").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  type: text("type").$type<CampType>().notNull(),
  visibility: text("visibility").$type<CampVisibility>().notNull().default("public"),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  repeatType: text("repeat_type").$type<RepeatType>().notNull().default("none"),
  repeatCount: integer("repeat_count").notNull().default(0),
});

export const campSchedules = pgTable("camp_schedules", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
});

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
  passwordHash: text("passwordHash").notNull(),
  role: text("role").$type<Role>().notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  first_name: text("first_name"),
  last_name: text("last_name"),
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

export const sports = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender").$type<Gender>().notNull(),
  profilePhoto: text("profile_photo"),
  parentId: integer("parent_id").references(() => users.id).notNull(),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  emergencyRelation: text("emergency_relation"),
  allergies: text("allergies").array(),
  medicalConditions: text("medical_conditions").array(),
  medications: text("medications").array(),
  specialNeeds: text("special_needs"),
  preferredContact: text("preferred_contact").$type<ContactMethod>().notNull(),
  communicationOptIn: boolean("communication_opt_in").notNull(),
});

export const childSports = pgTable("child_sports", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => children.id).notNull(),
  sportId: integer("sport_id").references(() => sports.id).notNull(),
  skillLevel: text("skill_level").$type<SportLevel>().notNull(),
  preferredPositions: text("preferred_positions").array(),
  currentTeam: text("current_team"),
});

export const campStaff = pgTable("camp_staff", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").$type<StaffRole>().notNull(),
});

export const campSports = pgTable("camp_sports", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  sportId: integer("sport_id").references(() => sports.id),
  customSport: text("custom_sport"),
  skillLevel: text("skill_level").$type<SportLevel>().notNull(),
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