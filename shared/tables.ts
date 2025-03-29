import { pgTable, text, serial, integer, boolean, timestamp, time, json } from "drizzle-orm/pg-core";
import { 
  type CampType, type CampVisibility, type RepeatType, 
  type Role, type Gender, type ContactMethod, 
  type SportLevel, type StaffRole,
  type FieldType, type ValidationType
} from "./types";

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

// Table for handling one-time schedule exceptions
export const scheduleExceptions = pgTable("schedule_exceptions", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  originalScheduleId: integer("original_schedule_id").references(() => campSchedules.id),
  exceptionDate: timestamp("exception_date").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("active"), // active, cancelled, rescheduled
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  currentGrade: text("current_grade"),
  schoolName: text("school_name"),
  sportsHistory: text("sports_history"),
  achievements: text("achievements").array(),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  emergencyRelation: text("emergency_relation"),
  allergies: text("allergies").array(),
  medicalConditions: text("medical_conditions").array(),
  medications: text("medications").array(),
  specialNeeds: text("special_needs"),
  preferredContact: text("preferred_contact").$type<ContactMethod>().notNull(),
  communicationOptIn: boolean("communication_opt_in").notNull(),
  jerseySize: text("jersey_size"),
  shoeSize: text("shoe_size"),
  height: text("height"),
  weight: text("weight"),
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

// Custom form field definitions that can be reused across camps
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  fieldType: text("field_type").$type<FieldType>().notNull(),
  required: boolean("required").notNull().default(false),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  validationType: text("validation_type").$type<ValidationType>().notNull().default("none"),
  options: json("options").$type<string[]>(), // For dropdown, single-select, and multi-select fields
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Association between camps and the custom fields used in their registration forms
export const campCustomFields = pgTable("camp_custom_fields", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  customFieldId: integer("custom_field_id").references(() => customFields.id).notNull(),
  order: integer("order").notNull().default(0), // Order to display fields in the form
  required: boolean("required"), // Override the default required setting if needed
});

// Responses to custom fields, linked to a registration
export const customFieldResponses = pgTable("custom_field_responses", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").references(() => registrations.id).notNull(),
  customFieldId: integer("custom_field_id").references(() => customFields.id).notNull(),
  response: text("response"), // String response for short_text, long_text
  responseArray: json("response_array").$type<string[]>(), // For multi-select fields
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});