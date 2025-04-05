export type Role = "platform_admin" | "camp_creator" | "manager" | "coach" | "volunteer" | "parent" | "athlete";
export type SportLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type ContactMethod = "email" | "sms" | "app";
export type CampType = "one_on_one" | "group" | "team" | "virtual";
export type CampVisibility = "public" | "private";
export type RepeatType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type RecurrencePattern = "all_days" | "weekdays" | "weekends" | "specific_days" | "custom";
export type StaffRole = "manager" | "coach" | "volunteer";
export type CampStatus = "active" | "cancelled" | "deleted";

// Permission system types
export type ResourceType = 
  "camps" | 
  "athletes" | 
  "team" | 
  "documents" | 
  "settings" | 
  "reports" | 
  "communications" | 
  "registrations" | 
  "sessions" |
  "schedules" |
  "custom_fields";

export type PermissionAction = 
  "view" | 
  "create" | 
  "edit" | 
  "delete" | 
  "approve" | 
  "assign" | 
  "message";

// Permission application scope
export type PermissionScope = "organization" | "camp" | "self";

// Custom registration field types
export type FieldType = "short_text" | "long_text" | "dropdown" | "single_select" | "multi_select";

// Validation types for custom fields
export type ValidationType = "required" | "email" | "phone" | "number" | "date" | "none";

// Document and signature related types
export type DocumentType = "waiver" | "agreement" | "consent" | "policy" | "custom";
export type DocumentStatus = "draft" | "active" | "inactive" | "archived";
export type SignatureStatus = "pending" | "signed" | "expired" | "declined" | "revoked";
export type SignatureFieldType = "signature" | "initial" | "date" | "text" | "checkbox" | "dynamic_field";

// Dynamic field data sources
export type DynamicFieldSource = 
  // Athlete profile fields
  | "athlete_name" 
  | "athlete_dob" 
  | "athlete_gender"
  | "athlete_emergency_contact" 
  | "athlete_emergency_phone"
  | "athlete_emergency_relation"
  | "athlete_allergies"
  | "athlete_medical_conditions"
  | "athlete_medications"
  | "athlete_special_needs"
  | "athlete_jersey_size"
  | "athlete_shoe_size"
  // Parent information
  | "parent_name"
  | "parent_email"
  | "parent_phone"
  // Camp information
  | "camp_name"
  | "camp_dates"
  | "camp_location";
export type AuditAction = "created" | "viewed" | "signed" | "sent" | "modified" | "expired" | "declined" | "revoked";

// Subscription related types
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "unpaid" | "incomplete" | "incomplete_expired";
export type BillingInterval = "month" | "year";
export type PlanTier = "free" | "basic" | "premium" | "enterprise";