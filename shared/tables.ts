import { pgTable, text, serial, integer, boolean, timestamp, time, json, jsonb, varchar } from "drizzle-orm/pg-core";
import { 
  type CampType, type CampVisibility, type RepeatType, 
  type Role, type Gender, type ContactMethod, 
  type SportLevel, type StaffRole,
  type FieldType, type ValidationType,
  type CampStatus, type RecurrencePattern,
  type DocumentType, type DocumentStatus, 
  type SignatureStatus, type SignatureFieldType,
  type DynamicFieldSource, type AuditAction,
  type ResourceType, type PermissionAction, type PermissionScope
} from "./types";

// Define the table structure for the new enhanced camp session scheduling
export const campSessions = pgTable("camp_sessions", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  sessionDate: timestamp("session_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("active"), // active, cancelled, rescheduled
  notes: text("notes"),
  recurrenceGroupId: integer("recurrence_group_id"), // To group sessions that were created together
  rescheduledDate: timestamp("rescheduled_date"), // New date if the session is rescheduled
  rescheduledStartTime: time("rescheduled_start_time"), // New start time if rescheduled
  rescheduledEndTime: time("rescheduled_end_time"), // New end time if rescheduled
  rescheduledStatus: text("rescheduled_status"), // 'confirmed' or 'tbd'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Store information about recurrence patterns for easily recreating them
export const recurrencePatterns = pgTable("recurrence_patterns", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  name: text("name").notNull(), // User-provided name like "Monday and Wednesday afternoons"
  patternType: text("pattern_type").$type<RecurrencePattern>().notNull(),
  repeatType: text("repeat_type").$type<RepeatType>().notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  daysOfWeek: integer("days_of_week").array(), // Array of days of week (0-6)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
  isDeleted: boolean("is_deleted").notNull().default(false),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  repeatCount: integer("repeat_count").notNull().default(0),
  slug: text("slug").unique(),
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

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Monthly price in cents
  annualPrice: integer("annual_price"), // Annual price in cents (optional discount)
  platformFeePercent: integer("platform_fee_percent").notNull(), // Platform fee percentage for this plan
  maxTeamMembers: integer("max_team_members").notNull(), // Maximum number of team members allowed
  maxCamps: integer("max_camps").notNull(), // Maximum number of camps allowed
  allowCustomizableForms: boolean("allow_customizable_forms").default(false), // Allow custom registration forms
  allowCustomBranding: boolean("allow_custom_branding").default(false), // Allow custom branding
  allowAdvancedReporting: boolean("allow_advanced_reporting").default(false), // Allow advanced reporting
  allowApiAccess: boolean("allow_api_access").default(false), // Allow API access
  allowMultiSport: boolean("allow_multi_sport").default(false), // Allow multiple sports
  allowCustomPermissions: boolean("allow_custom_permissions").default(false), // Allow custom permission sets
  isActive: boolean("is_active").default(true), // Whether this plan is currently available
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  stripePriceId: text("stripe_price_id"), // Stripe price ID for this plan
  stripeProductId: text("stripe_product_id"), // Stripe product ID for this plan
  displayOrder: integer("display_order").default(0), // Order to display plans
});

// Organization subscriptions table
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull().default("active"), // active, canceled, past_due, trialing, etc.
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  billingCycleAnchor: timestamp("billing_cycle_anchor"),
  billingInterval: text("billing_interval").default("month"), // month or year
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  trialEnd: timestamp("trial_end"),
  canceledAt: timestamp("canceled_at"),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status"),
  stripeAccountDetailsSubmitted: boolean("stripe_account_details_submitted").default(false),
  stripeAccountChargesEnabled: boolean("stripe_account_charges_enabled").default(false),
  stripeAccountPayoutsEnabled: boolean("stripe_account_payouts_enabled").default(false),
  stripeFeePassthrough: boolean("stripe_fee_passthrough").default(false), // If true, fee is passed to athlete; if false, creator absorbs fee
  stripePlatformFeePercent: integer("stripe_platform_fee_percent").default(15), // Default 15% platform fee
  createdAt: timestamp("created_at").notNull().defaultNow(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  aboutText: text("about_text"),
  contactEmail: text("contact_email"),
  websiteUrl: text("website_url"),
  socialLinks: jsonb("social_links"),
  bannerImageUrl: text("banner_image_url"),
  displayName: text("display_name"),
  slug: text("slug"),
  // Added fields for Mission Statement and Features
  missionStatement: text("mission_statement"),
  feature1Title: text("feature_1_title"),
  feature1Description: text("feature_1_description"),
  feature2Title: text("feature_2_title"),
  feature2Description: text("feature_2_description"),
  feature3Title: text("feature_3_title"),
  feature3Description: text("feature_3_description"),
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
  profile_photo: text("profile_photo"),
  phone_number: text("phone_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip_code: text("zip_code"),
  onboarding_completed: boolean("onboarding_completed").default(false),
  preferred_contact: text("preferred_contact").$type<ContactMethod>(),
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
  preferredContact: text("preferred_contact").$type<ContactMethod>(),
  communicationOptIn: boolean("communication_opt_in"),
  jerseySize: text("jersey_size"),
  shoeSize: text("shoe_size"),
  // height and weight fields have been removed from the database
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
  fieldSource: text("field_source").notNull().default("registration"), // Either 'registration' or 'camp'
  isInternal: boolean("is_internal").notNull().default(false), // If true, only visible to organization members
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

// Custom field responses for camps (meta information for camps)
export const campMetaFields = pgTable("camp_meta_fields", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  customFieldId: integer("custom_field_id").references(() => customFields.id).notNull(),
  response: text("response"), // String response for short_text, long_text
  responseArray: json("response_array").$type<string[]>(), // For multi-select fields
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Attendance records for camp participants
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").references(() => registrations.id).notNull(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  childId: integer("child_id").references(() => children.id).notNull(),
  date: timestamp("date").notNull(), // The date of attendance
  status: text("status").$type<'present' | 'absent' | 'late' | 'excused'>().notNull().default('absent'),
  notes: text("notes"), // Optional notes about the attendance (reason for absence, etc)
  recordedBy: integer("recorded_by").references(() => users.id).notNull(), // Staff member who recorded this
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Document management tables
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // Rich text content (null if it's a PDF upload)
  version: integer("version").notNull().default(1),
  status: text("status").$type<DocumentStatus>().notNull().default("draft"),
  type: text("type").$type<DocumentType>().notNull().default("waiver"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  authorId: integer("author_id").references(() => users.id),
  filePath: text("file_path"), // URL to the stored PDF document (null if it's a rich text document)
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  hash: text("hash") // SHA-256 hash of the document for integrity verification
});

export const documentFields = pgTable("document_fields", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  fieldType: text("field_type").$type<SignatureFieldType>().notNull(),
  label: text("label").notNull(),
  required: boolean("required").notNull().default(true),
  pageNumber: integer("page_number").notNull().default(1), // For multi-page PDFs
  xPosition: integer("x_position").notNull(), // X coordinate for positioning (0-100% of page width)
  yPosition: integer("y_position").notNull(), // Y coordinate for positioning (0-100% of page height)
  width: integer("width").notNull().default(200), // Width in pixels
  height: integer("height").notNull().default(50), // Height in pixels
  order: integer("order").notNull().default(0), // Order of fields for sequential signing
  dataSource: text("data_source").$type<DynamicFieldSource>(), // For dynamic field data source
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const signatureRequests = pgTable("signature_requests", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  requestedForId: integer("requested_for_id").references(() => users.id), // If this is for a specific user
  requestedForEmail: text("requested_for_email"), // If sending to an email that's not a user yet
  campId: integer("camp_id").references(() => camps.id), // If associated with a camp
  registrationId: integer("registration_id").references(() => registrations.id), // If associated with a registration
  status: text("status").$type<SignatureStatus>().notNull().default("pending"),
  token: text("token").notNull().unique(), // Secure token for signing link
  message: text("message"), // Optional message to the signer
  expiresAt: timestamp("expires_at"), // When the signature request expires
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  viewedAt: timestamp("viewed_at"), // When the document was first viewed
  completedAt: timestamp("completed_at"), // When signing was completed
  reminderSentAt: timestamp("reminder_sent_at"), // Last time a reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const signatures = pgTable("signatures", {
  id: serial("id").primaryKey(),
  signatureRequestId: integer("signature_request_id").references(() => signatureRequests.id).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  documentFieldId: integer("document_field_id").references(() => documentFields.id).notNull(),
  signatureData: text("signature_data").notNull(), // The actual signature data (image data URI, text value, etc.)
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  ipAddress: text("ip_address").notNull(), // Signer's IP address
  userAgent: text("user_agent").notNull(), // Browser user agent
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentAuditTrail = pgTable("document_audit_trail", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  signatureRequestId: integer("signature_request_id").references(() => signatureRequests.id),
  userId: integer("user_id").references(() => users.id), // User who performed the action (null for non-authenticated actions)
  action: text("action").$type<AuditAction>().notNull(),
  details: jsonb("details"), // Additional details about the action
  ipAddress: text("ip_address"), // IP address where the action was performed
  userAgent: text("user_agent"), // Browser user agent
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Table to link documents that are required for camps
export const campDocumentAgreements = pgTable("camp_document_agreements", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  required: boolean("required").notNull().default(true), // Whether this document is required before participation
  sendOnRegistration: boolean("send_on_registration").notNull().default(true), // Whether to automatically send upon registration
  displayOrder: integer("display_order").notNull().default(0), // Order to display documents
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Table for organization messages (in-platform communication)
export const organizationMessages = pgTable("organization_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  senderId: integer("sender_id").references(() => users.id),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campMessages = pgTable("camp_messages", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").references(() => camps.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  senderName: text("sender_name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentToAll: boolean("sent_to_all").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campMessageRecipients = pgTable("camp_message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => campMessages.id).notNull(),
  registrationId: integer("registration_id").references(() => registrations.id).notNull(),
  childId: integer("child_id").references(() => children.id).notNull(),
  parentId: integer("parent_id").references(() => users.id).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  emailDelivered: boolean("email_delivered").notNull().default(false),
  emailOpenedAt: timestamp("email_opened_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Permission management tables

// Permission sets define named groups of permissions
export const permissionSets = pgTable("permission_sets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  isDefault: boolean("is_default").default(false),
  defaultForRole: text("default_for_role").$type<Role>(), // If this set is the default for a role
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Permissions define specific resource-action pairs
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  permissionSetId: integer("permission_set_id").references(() => permissionSets.id).notNull(),
  resource: text("resource").$type<ResourceType>().notNull(),
  action: text("action").$type<PermissionAction>().notNull(),
  scope: text("scope").$type<PermissionScope>().default("organization").notNull(),
  allowed: boolean("allowed").default(false).notNull(),
});

// User permission assignments link users to permission sets
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  permissionSetId: integer("permission_set_id").references(() => permissionSets.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Platform metrics table for admin dashboard
export const platformMetrics = pgTable("platform_metrics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(), // 'daily_users', 'revenue', 'registrations', etc.
  metricDate: timestamp("metric_date").notNull(), // Date this metric is for
  metricValue: integer("metric_value").notNull(), // Numeric value
  metricValueFloat: text("metric_value_float"), // Float value for percentages, etc.
  metricDetails: jsonb("metric_details"), // Additional details as JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System events for monitoring/auditing
export const systemEvents = pgTable("system_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'error', 'warning', 'info', etc.
  eventSource: text("event_source").notNull(), // Component that generated the event
  eventMessage: text("event_message").notNull(), // Human-readable message
  eventDetails: jsonb("event_details"), // Additional details (stack trace, etc.)
  userId: integer("user_id").references(() => users.id), // User who triggered the event (if applicable)
  ipAddress: text("ip_address"), // IP address where the event originated
  userAgent: text("user_agent"), // Browser/client info
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  severity: text("severity").notNull().default("info"), // 'critical', 'error', 'warning', 'info', 'debug'
});

