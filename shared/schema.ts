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
  campSports
} from "./tables";

export type Role = "camp_creator" | "manager" | "coach" | "volunteer" | "parent" | "athlete";
export type SportLevel = "beginner" | "intermediate" | "advanced";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type ContactMethod = "email" | "sms" | "app";
export type CampType = "one_on_one" | "group" | "team" | "virtual";
export type CampVisibility = "public" | "private";
export type RepeatType = "none" | "weekly" | "monthly";
export type StaffRole = "manager" | "coach" | "volunteer";

export const publicRoles = ["camp_creator", "parent", "athlete"] as const;

// Define all schemas after tables are defined
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
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
        skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
        preferredPositions: z.array(z.string()).optional(),
        currentTeam: z.string().optional(),
      })
    ).optional(),
    dateOfBirth: z.string(),
    allergies: z.array(z.string()).optional().default([]),
    medicalConditions: z.array(z.string()).optional().default([]),
    medications: z.array(z.string()).optional().default([]),
  });

export const insertCampSchema = createInsertSchema(camps).extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "Please use 2-letter state code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  additionalLocationDetails: z.string().optional(),
  sportId: z.number().optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  startDate: z.string().refine((date) => new Date(date) >= new Date(), {
    message: "Start date must be in the future",
  }),
  endDate: z.string().refine((date) => new Date(date) >= new Date(), {
    message: "End date must be in the future",
  }),
  registrationStartDate: z.string(),
  registrationEndDate: z.string(),
  price: z.number().min(0, "Price must be 0 or greater"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  type: z.enum(["one_on_one", "group", "team", "virtual"]),
  visibility: z.enum(["public", "private"]),
  waitlistEnabled: z.boolean().default(true),
  minAge: z.number().min(1, "Minimum age must be at least 1"),
  maxAge: z.number().min(1, "Maximum age must be at least 1"),
  repeatType: z.enum(["none", "weekly", "monthly"]).default("none"),
  repeatCount: z.number().min(0, "Repeat count must be 0 or greater").default(0),
  schedules: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Start time must be in HH:mm format (00:00-23:59)"
    }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "End time must be in HH:mm format (00:00-23:59)"
    }),
  })).optional().refine((schedules) => {
    if (!schedules) return true;
    return schedules.every(schedule => {
      const start = new Date(`1970-01-01T${schedule.startTime}`);
      const end = new Date(`1970-01-01T${schedule.endTime}`);
      return start < end;
    });
  }, {
    message: "End time must be after start time for each schedule"
  }),
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const regStartDate = new Date(data.registrationStartDate);
  const regEndDate = new Date(data.registrationEndDate);

  return regStartDate <= regEndDate && // Registration start must be before or on registration end
         regEndDate <= startDate && // Registration must end before or on camp start
         startDate <= endDate && // Camp start must be before or on camp end
         data.minAge <= data.maxAge; // Min age must be less than or equal to max age
}, {
  message: "Invalid date sequence or age range",
  path: ["dates"]
});

export const insertRegistrationSchema = createInsertSchema(registrations);
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  stripeAccountId: true,
  createdAt: true,
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
export type InsertChildSport = z.infer<typeof insertChildSchema>["sportsInterests"][number];
export type CampSchedule = typeof campSchedules.$inferSelect;
export type InsertCampSchedule = z.infer<typeof insertCampSchema>["schedules"][number];
export type CampSport = typeof campSports.$inferSelect;

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
  campSchedules,
  campSports
};