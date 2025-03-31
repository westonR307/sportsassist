export type Role = "camp_creator" | "manager" | "coach" | "volunteer" | "parent" | "athlete";
export type SportLevel = "beginner" | "intermediate" | "advanced";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type ContactMethod = "email" | "sms" | "app";
export type CampType = "one_on_one" | "group" | "team" | "virtual";
export type CampVisibility = "public" | "private";
export type RepeatType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type RecurrencePattern = "all_days" | "weekdays" | "weekends" | "specific_days" | "custom";
export type StaffRole = "manager" | "coach" | "volunteer";
export type CampStatus = "active" | "cancelled" | "deleted";

// Custom registration field types
export type FieldType = "short_text" | "long_text" | "dropdown" | "single_select" | "multi_select";

// Validation types for custom fields
export type ValidationType = "required" | "email" | "phone" | "number" | "date" | "none";