import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  organizations,
  users,
  invitations,
  sports,
  children,
  childSports,
  camps,
  campStaff,
  registrations,
  campSchedules,
  campSports,
  scheduleExceptions,
  customFields,
  campCustomFields,
  customFieldResponses,
  attendanceRecords,
  campSessions,
  recurrencePatterns
} from "./tables";

// Import types
import {
  Role,
  SportLevel,
  Gender,
  ContactMethod,
  CampType,
  CampVisibility,
  RepeatType,
  StaffRole,
  FieldType,
  ValidationType
} from "./types";

export const publicRoles = ["camp_creator", "parent", "athlete"] as const;

// Common UTC-safe date transformation function to ensure consistency
const createUtcSafeDateTransformer = (fieldName: string) => {
  return z.string().or(z.date()).transform(val => {
    console.log(`[${fieldName} Debug] Processing ${fieldName}: ${String(val)}`);
    
    if (val instanceof Date) {
      console.log(`[${fieldName} Debug] Value is Date object: ${val.toISOString()}`);
      return val;
    }
    
    // Handle YYYY-MM-DD format without timezone issues
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = val.split('-').map(Number);
      
      // Create a date in UTC at noon to avoid date shifts
      const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      console.log(`[${fieldName} Debug] Parsed YYYY-MM-DD string: ${val} → UTC date: ${utcDate.toISOString()}`);
      return utcDate;
    }
    
    // For other string formats, parse using UTC to avoid timezone shifts
    const date = new Date(val);
    console.log(`[${fieldName} Debug] Fallback parsing: ${String(val)} → ${date.toISOString()}`);
    return date;
  });
};

// Define schemas
export const insertUserSchema = createInsertSchema(users, {
  passwordHash: z.string().optional(), // Make it optional in schema since we'll set it in the backend
  profile_photo: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
  preferred_contact: z.enum(["email", "sms", "app"]).optional()
}).extend({
  role: z.enum(publicRoles),
  organizationName: z.string().optional(),
  organizationDescription: z.string().optional(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  accepted: true,
  createdAt: true,
}).extend({
  role: z.enum(["manager", "coach", "volunteer"] as const),
  email: z.string().email("Invalid email address"),
  organizationId: z.number(),
  expiresAt: z.date()
});

export const insertChildSchema = createInsertSchema(children)
  .omit({
    id: true,
    parentId: true,
  })
  .extend({
    sportsInterests: z.array(
      z.object({
        sportId: z.number(),
        skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
        preferredPositions: z.array(z.string()).optional(),
        currentTeam: z.string().optional(),
      })
    ).optional(),
    dateOfBirth: z.string(),
    currentGrade: z.string().optional(),
    schoolName: z.string().optional(),
    sportsHistory: z.string().optional(),
    achievements: z.array(z.string()).optional().default([]),
    allergies: z.array(z.string()).optional().default([]),
    medicalConditions: z.array(z.string()).optional().default([]),
    medications: z.array(z.string()).optional().default([]),
    jerseySize: z.string().optional(),
    shoeSize: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
  });

// Schema for camp sessions
export const insertCampSessionSchema = createInsertSchema(campSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  sessionDate: createUtcSafeDateTransformer('sessionDate'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  status: z.enum(["active", "cancelled", "rescheduled"]),
  rescheduledDate: z.preprocess(
    (val) => val === null || val === undefined ? null : val,
    z.union([z.null(), createUtcSafeDateTransformer('rescheduledDate')])
  ).optional(),
  rescheduledStartTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format").nullable().optional(),
  rescheduledEndTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format").nullable().optional(),
  rescheduledStatus: z.enum(["confirmed", "tbd"]).nullable().optional(),
});

// Schema for recurrence patterns
export const insertRecurrencePatternSchema = createInsertSchema(recurrencePatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startDate: createUtcSafeDateTransformer('patternStartDate'),
  endDate: createUtcSafeDateTransformer('patternEndDate'),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format")
});

export const insertScheduleExceptionSchema = z.object({
  campId: z.number(),
  originalScheduleId: z.number().optional(),
  exceptionDate: createUtcSafeDateTransformer('exceptionDate'),
  dayOfWeek: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  status: z.enum(["active", "cancelled", "rescheduled"]).default("active"),
  reason: z.string().optional()
});

export const insertCampSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "Please use 2-letter state code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  additionalLocationDetails: z.string().optional().nullable(),
  startDate: createUtcSafeDateTransformer('startDate'),
  endDate: createUtcSafeDateTransformer('endDate'),
  registrationStartDate: createUtcSafeDateTransformer('registrationStartDate'),
  registrationEndDate: createUtcSafeDateTransformer('registrationEndDate'),
  price: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  capacity: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  organizationId: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  type: z.enum(["one_on_one", "group", "team", "virtual"]),
  visibility: z.enum(["public", "private"]).default("public"),
  waitlistEnabled: z.boolean().default(true),
  minAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  isDeleted: z.boolean().optional().default(false),
  isCancelled: z.boolean().optional().default(false),
  deletedAt: z.date().optional().nullable(),
  cancelledAt: z.date().optional().nullable(),
  cancelReason: z.string().optional().nullable(),
  maxAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  repeatType: z.enum(["none", "weekly", "monthly"]).default("none"),
  repeatCount: z.number().or(z.string().transform(val => parseInt(String(val || '0'), 10))).default(0),
  schedules: z.array(z.object({
    dayOfWeek: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format")
  })).min(1, "At least one schedule is required"),
  sportId: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"])
}).strict();

export const insertRegistrationSchema = createInsertSchema(registrations);
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  stripeAccountId: true,
  createdAt: true,
  logoUrl: true,
});

// Custom fields schemas for registration forms
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fieldType: z.enum(["short_text", "long_text", "dropdown", "single_select", "multi_select"]),
  validationType: z.enum(["required", "email", "phone", "number", "date", "none"]).default("none"),
  options: z.array(z.string()).optional(),
});

export const insertCampCustomFieldSchema = createInsertSchema(campCustomFields).omit({
  id: true,
});

export const insertCustomFieldResponseSchema = createInsertSchema(customFieldResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  response: z.string().optional(),
  responseArray: z.array(z.string()).optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type Camp = typeof camps.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Sport = typeof sports.$inferSelect;
export type ChildSport = typeof childSports.$inferSelect;
export type InsertChildSport = Exclude<z.infer<typeof insertChildSchema>["sportsInterests"], undefined>[number];
export type CampSchedule = typeof campSchedules.$inferSelect;
export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type InsertScheduleException = z.infer<typeof insertScheduleExceptionSchema>;
//export type InsertCampSchedule = z.infer<typeof insertCampScheduleSchema>;
export type CampSport = typeof campSports.$inferSelect;

// Enhanced scheduling types
export type CampSession = typeof campSessions.$inferSelect;
export type InsertCampSession = z.infer<typeof insertCampSessionSchema>;
export type RecurrencePattern = typeof recurrencePatterns.$inferSelect;
export type InsertRecurrencePattern = z.infer<typeof insertRecurrencePatternSchema>;

// Custom fields types
export type CustomField = typeof customFields.$inferSelect;
export type CampCustomField = typeof campCustomFields.$inferSelect; 
export type CustomFieldResponse = typeof customFieldResponses.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type InsertCampCustomField = z.infer<typeof insertCampCustomFieldSchema>;
export type InsertCustomFieldResponse = z.infer<typeof insertCustomFieldResponseSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Type for attendance status
export const AttendanceStatus = z.enum(['present', 'absent', 'late', 'excused']);
export type AttendanceStatus = z.infer<typeof AttendanceStatus>;

// Schema for inserting attendance records
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  recordedAt: true,
  updatedAt: true
});
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

// Re-export tables
export {
  organizations,
  users,
  invitations,
  sports,
  children,
  childSports,
  camps,
  campStaff,
  registrations,
  campSports,
  campSchedules,
  scheduleExceptions,
  customFields,
  campCustomFields,
  customFieldResponses,
  attendanceRecords,
  campSessions,
  recurrencePatterns
};

export const predefinedSports = [
  "Archery", "Badminton", "Baseball", "Basketball", "Biathlon",
  "Billiards", "Bobsleigh", "Bodybuilding", "Bowling", "Boxing",
  "Canoeing", "Cheerleading", "Chess", "Climbing", "Cricket",
  "CrossFit", "Curling", "Cycling", "Darts", "Equestrian",
  "Fencing", "Field Hockey", "Figure Skating", "Fishing", "Football (American)",
  "Frisbee (Ultimate)", "Golf", "Gymnastics", "Handball", "Hockey (Ice)",
  "Hockey (Roller)", "Judo", "Karate", "Kayaking", "Kickboxing",
  "Lacrosse", "Mixed Martial Arts (MMA)", "Motocross", "Netball", "Paddleboarding",
  "Paintball", "Parkour", "Pickleball", "Powerlifting", "Racquetball",
  "Rock Climbing", "Rowing", "Rugby", "Running", "Sailing",
  "Skateboarding", "Skiing", "Snowboarding", "Soccer", "Softball",
  "Speed Skating", "Squash", "Surfing", "Swimming", "Table Tennis",
  "Taekwondo", "Tennis", "Track and Field", "Triathlon", "Volleyball",
  "Water Polo", "Weightlifting", "Wrestling", "Yoga", "Zumba"
] as const;