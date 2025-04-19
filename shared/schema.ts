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
  campMetaFields,
  attendanceRecords,
  permissionSets,
  permissions,
  userPermissions,
  campSessions,
  recurrencePatterns,
  documents,
  documentFields,
  signatureRequests,
  signatures,
  documentAuditTrail,
  campDocumentAgreements,
  organizationMessages,
  subscriptionPlans,
  organizationSubscriptions,
  platformMetrics,
  systemEvents,
  campMessages,
  campMessageRecipients,
  campMessageReplies,
  availabilitySlots,
  slotBookings
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
  ValidationType,
  SchedulingType,
  AvailabilityStatus,
  BookingStatus
} from "./types";

export const publicRoles = ["platform_admin", "camp_creator", "parent", "athlete"] as const;

// Common UTC-safe date transformation function to ensure consistency
const createUtcSafeDateTransformer = (fieldName: string) => {
  return z.union([
    z.string(),
    z.date(),
    z.custom<Date>((val) => val instanceof Date)
  ]).transform(val => {
    console.log(`[${fieldName} Debug] Processing ${fieldName}:`, val);

    // If already a Date object, return as is
    if (val instanceof Date) {
      return val;
    }

    // Convert string to Date
    if (typeof val === 'string') {
      // Handle YYYY-MM-DD format
      if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = val.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      }

      // Parse other date string formats
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date for ${fieldName}: ${val}`);
      }
      return date;
    }

    throw new Error(`Invalid date value for ${fieldName}`);
  });
};

// Define schemas
export const insertUserSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(publicRoles),
  organizationName: z.string().optional(),
  organizationDescription: z.string().optional(),
}).refine((data) => {
  if (data.role === 'camp_creator' && !data.organizationName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Organization name is required for camp creators",
  path: ["organizationName"]
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

// Make location fields optional for virtual camps using a simpler approach
export const insertCampSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  streetAddress: z.string().optional(),
  city: z.string().optional(), 
  state: z.string().optional(),
  zipCode: z.string().optional(),
  additionalLocationDetails: z.string().optional().nullable(),
  startDate: createUtcSafeDateTransformer('startDate'),
  endDate: createUtcSafeDateTransformer('endDate'),
  registrationStartDate: createUtcSafeDateTransformer('registrationStartDate'),
  registrationEndDate: createUtcSafeDateTransformer('registrationEndDate'),
  price: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  capacity: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  organizationId: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  type: z.enum(["one_on_one", "group", "team"]),
  visibility: z.enum(["public", "private"]).default("public"),
  waitlistEnabled: z.boolean().default(true),
  customRegistrationEnabled: z.boolean().optional().default(false),
  minAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  isDeleted: z.boolean().optional().default(false),
  isCancelled: z.boolean().optional().default(false),
  deletedAt: z.date().optional().nullable(),
  cancelledAt: z.date().optional().nullable(),
  cancelReason: z.string().optional().nullable(),
  maxAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  repeatType: z.enum(["none", "weekly", "monthly"]).default("none").optional(),
  repeatCount: z.number().or(z.string().transform(val => parseInt(String(val || '0'), 10))).default(0),
  schedulingType: z.enum(["fixed", "availability"]).default("fixed"),
  schedules: z.array(z.object({
    dayOfWeek: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format")
  })),
  sportId: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  isVirtual: z.boolean().optional().default(false),
  virtualMeetingUrl: z.union([
    z.string().url("Please enter a valid URL"),
    z.string().length(0), // Allow empty string for non-virtual camps
    z.null()
  ]).optional()
}).strict()
  .refine((data) => {
    // If it's a virtual camp, the URL is required and must be valid
    if (data.isVirtual === true && (!data.virtualMeetingUrl || data.virtualMeetingUrl === "")) {
      return false;
    }
    // If it's not a virtual camp, location fields are required but we don't validate virtualMeetingUrl
    if (data.isVirtual !== true && (!data.streetAddress || !data.city || !data.state || !data.zipCode)) {
      return false;
    }
    return true;
  }, {
    message: "For virtual camps, a meeting URL is required. For in-person camps, location details are required.",
    path: ["isVirtual"] // This will make the error show up on the isVirtual field
  })
  .refine((data) => {
    // Only validate schedules for fixed scheduling type
    if (data.schedulingType === "fixed") {
      return Array.isArray(data.schedules) && data.schedules.length > 0;
    }
    // For availability-based scheduling, no schedules are required
    return true;
  }, {
    message: "For fixed scheduling camps, at least one schedule is required.",
    path: ["schedules"]
  })
  .transform(data => ({
    ...data,
    // Ensure schedules is always an array
    schedules: data.schedulingType === "availability" ? [] : data.schedules
  }));

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
  fieldSource: z.enum(["registration", "camp"]).default("registration"),
  isInternal: z.boolean().default(false), // If true, only visible to organization members
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

// Schema for camp meta fields (custom field values for camps)
export const insertCampMetaFieldSchema = createInsertSchema(campMetaFields).omit({
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
export type CampMetaField = typeof campMetaFields.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type InsertCampCustomField = z.infer<typeof insertCampCustomFieldSchema>;
export type InsertCustomFieldResponse = z.infer<typeof insertCustomFieldResponseSchema>;
export type InsertCampMetaField = z.infer<typeof insertCampMetaFieldSchema>;
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

// Document management schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  hash: true,
}).extend({
  type: z.enum(["waiver", "agreement", "consent", "policy", "custom"]),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("draft"),
});

export const insertDocumentFieldSchema = createInsertSchema(documentFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fieldType: z.enum(["signature", "initial", "date", "text", "checkbox", "dynamic_field"]),
  dataSource: z.enum([
    "athlete_name", "athlete_dob", "athlete_gender",
    "athlete_emergency_contact", "athlete_emergency_phone",
    "athlete_emergency_relation", "athlete_allergies",
    "athlete_medical_conditions", "athlete_medications", 
    "athlete_special_needs", "athlete_jersey_size", "athlete_shoe_size",
    "parent_name", "parent_email", "parent_phone",
    "camp_name", "camp_dates", "camp_location"
  ]).optional(),
});

export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).omit({
  id: true,
  token: true,
  createdAt: true, 
  updatedAt: true,
  sentAt: true,
  viewedAt: true,
  completedAt: true,
  reminderSentAt: true,
}).extend({
  status: z.enum(["pending", "signed", "expired", "declined", "revoked"]).default("pending"),
  expiresAt: z.date().optional(),
});

export const insertSignatureSchema = createInsertSchema(signatures).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentAuditTrailSchema = createInsertSchema(documentAuditTrail).omit({
  id: true,
  timestamp: true,
});

// Create schema for connecting documents to camps
export const insertCampDocumentAgreementSchema = createInsertSchema(campDocumentAgreements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export document types
export type Document = typeof documents.$inferSelect;
export type DocumentField = typeof documentFields.$inferSelect;
export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type Signature = typeof signatures.$inferSelect;
export type DocumentAuditTrail = typeof documentAuditTrail.$inferSelect;
export type CampDocumentAgreement = typeof campDocumentAgreements.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertDocumentField = z.infer<typeof insertDocumentFieldSchema>;
export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type InsertDocumentAuditTrail = z.infer<typeof insertDocumentAuditTrailSchema>;
export type InsertCampDocumentAgreement = z.infer<typeof insertCampDocumentAgreementSchema>;

// Organization messages
export const insertOrganizationMessageSchema = createInsertSchema(organizationMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isRead: true
});

export const insertCampMessageSchema = z.object({
  campId: z.number(),
  organizationId: z.number(),
  senderId: z.number(),
  senderName: z.string(),
  subject: z.string(),
  content: z.string(),
  sentToAll: z.boolean().default(false)
});

export const insertCampMessageRecipientSchema = z.object({
  messageId: z.number(),
  registrationId: z.number(),
  childId: z.number(),
  parentId: z.number()
});

export const insertCampMessageReplySchema = z.object({
  messageId: z.number(),
  senderId: z.number(),
  senderName: z.string(),
  content: z.string(),
  organizationId: z.number().optional(),
  campId: z.number()
});

export type OrganizationMessage = typeof organizationMessages.$inferSelect;
export type InsertOrganizationMessage = z.infer<typeof insertOrganizationMessageSchema>;
export type CampMessage = typeof campMessages.$inferSelect;
export type InsertCampMessage = z.infer<typeof insertCampMessageSchema>;
export type CampMessageRecipient = typeof campMessageRecipients.$inferSelect; 
export type InsertCampMessageRecipient = z.infer<typeof insertCampMessageRecipientSchema>;
export type CampMessageReply = typeof campMessageReplies.$inferSelect;
export type InsertCampMessageReply = z.infer<typeof insertCampMessageReplySchema>;

// Permission management schemas
export const insertPermissionSetSchema = createInsertSchema(permissionSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Permission types
export type PermissionSet = typeof permissionSets.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertPermissionSet = z.infer<typeof insertPermissionSetSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Subscription plan schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  platformFeePercent: z.number().min(0).max(100),
  price: z.number().min(0),
  annualPrice: z.number().min(0).optional(),
  maxTeamMembers: z.number().min(1),
  maxCamps: z.number().min(1),
  displayOrder: z.number().default(0)
});

export const insertOrganizationSubscriptionSchema = createInsertSchema(organizationSubscriptions).omit({
  id: true, 
  createdAt: true,
  updatedAt: true
}).extend({
  status: z.enum(["active", "canceled", "past_due", "trialing", "unpaid", "incomplete", "incomplete_expired"]).default("active"),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  billingInterval: z.enum(["month", "year"]).default("month"),
  trialEnd: z.date().optional().nullable()
});

// Export subscription types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertOrganizationSubscription = z.infer<typeof insertOrganizationSubscriptionSchema>;

// Availability-based scheduling schemas and types
export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentBookings: true,
}).extend({
  slotDate: createUtcSafeDateTransformer('slotDate'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format"),
  status: z.enum(["available", "booked", "unavailable"]).default("available"),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.preprocess(
    (val) => val === null || val === undefined ? null : val,
    z.union([z.null(), createUtcSafeDateTransformer('recurrenceEndDate')])
  ).optional()
});

export const insertSlotBookingSchema = createInsertSchema(slotBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  bookingDate: true,
  cancelledAt: true,
  notificationSent: true,
  reminderSent: true,
  feedbackSent: true
}).extend({
  status: z.enum(["confirmed", "cancelled", "rescheduled", "waitlisted"]).default("confirmed"),
  cancelReason: z.string().optional(),
  notes: z.string().optional()
});

export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type SlotBooking = typeof slotBookings.$inferSelect;
export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type InsertSlotBooking = z.infer<typeof insertSlotBookingSchema>;

// Tables are already exported from tables.ts

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