import React, { useState, useEffect } from "react";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Trash } from "lucide-react";

// Sport list and mapping data - should match parent-dashboard.tsx
const sportsList = [
  "Archery", "Badminton", "Baseball", "Basketball", "Biathlon", "Bocce", "Bowling", "Boxing",
  "Canoeing", "Cheerleading", "Chess", "Cricket", "Croquet", "Cross Country", "Curling", "Cycling",
  "Dance", "Diving", "Dodgeball", "Equestrian", "Fencing", "Field Hockey", "Figure Skating",
  "Fishing", "Flag Football", "Football", "Frisbee", "Golf", "Gymnastics", "Handball", "Hiking",
  "Hockey", "Horseback Riding", "Judo", "Karate", "Kayaking", "Kickball", "Lacrosse", "Martial Arts",
  "Motocross", "Paintball", "Pickleball", "Ping Pong", "Quidditch", "Racquetball", "Rodeo",
  "Roller Derby", "Roller Skating", "Rowing", "Rugby", "Running", "Sailing", "Skateboarding",
  "Skiing", "Snowboarding", "Soccer", "Softball", "Speed Skating", "Squash", "Surfing", "Swimming",
  "Table Tennis", "Taekwondo", "Tennis", "Track and Field", "Triathlon", "Ultimate Frisbee", 
  "Volleyball", "Water Polo", "Weightlifting", "Wrestling", "Yoga", "Zumba",
];

// Create a map of sport names to IDs (matching server)
const sportsMap: Record<string, number> = {
  Archery: 1, Badminton: 2, Baseball: 3, Basketball: 4, Biathlon: 5, Bocce: 6, Bowling: 7, Boxing: 8,
  Canoeing: 9, Cheerleading: 10, Chess: 11, Cricket: 12, Croquet: 13, "Cross Country": 14, Curling: 15,
  Cycling: 16, Dance: 17, Diving: 18, Dodgeball: 19, Equestrian: 20, Fencing: 21, "Field Hockey": 22,
  "Figure Skating": 23, Fishing: 24, "Flag Football": 25, Football: 26, Frisbee: 27, Golf: 28,
  Gymnastics: 29, Handball: 30, Hiking: 31, Hockey: 32, "Horseback Riding": 33, Judo: 34, Karate: 35,
  Kayaking: 36, Kickball: 37, Lacrosse: 38, "Martial Arts": 39, Motocross: 40, Paintball: 41,
  Pickleball: 42, "Ping Pong": 43, Quidditch: 44, Racquetball: 45, Rodeo: 46, "Roller Derby": 47,
  "Roller Skating": 48, Rowing: 49, Rugby: 50, Running: 51, Sailing: 52, Skateboarding: 53, Skiing: 54,
  Snowboarding: 55, Soccer: 56, Softball: 57, "Speed Skating": 58, Squash: 59, Surfing: 60, Swimming: 61,
  "Table Tennis": 62, Taekwondo: 63, Tennis: 64, "Track and Field": 65, Triathlon: 66, "Ultimate Frisbee": 67,
  Volleyball: 68, "Water Polo": 69, Weightlifting: 70, Wrestling: 71, Yoga: 72, Zumba: 73,
};

// Skill level options that match the schema
const skillLevels = [
  "beginner", 
  "intermediate", 
  "advanced"
];

// Skill level display names
const skillLevelNames: Record<string, string> = {
  "beginner": "Beginner - Just starting out",
  "intermediate": "Intermediate - Some experience",
  "advanced": "Advanced - Significant experience"
};

// Schema for editing a child athlete (same as adding)
const editChildSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Please enter a valid date",
  }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  currentGrade: z.string().optional(),
  schoolName: z.string().optional(),
  sportsHistory: z.string().optional(),
  emergencyContact: z.string().min(10, { message: "Emergency contact should be at least 10 characters" }),
  emergencyPhone: z.string().min(10, { message: "Phone number should be at least 10 digits" }),
  medicalInformation: z.string().optional(),
  specialNeeds: z.string().optional(),
  jerseySize: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  profilePhoto: z.string().optional(),
  // Sports interests
  sportsInterests: z.array(z.object({
    sportId: z.number(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
    preferredPositions: z.array(z.string()).optional(),
    currentTeam: z.string().optional(),
  })).optional(),
  // Default values for required fields in DB schema
  preferredContact: z.enum(["email", "sms", "app"]).default("email"),
  communicationOptIn: z.boolean().default(true),
});

type EditChildFormValues = z.infer<typeof editChildSchema>;

interface EditAthleteDialogProps {
  athlete: ExtendedChild | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAthleteDialog({ 
  athlete,
  open, 
  onOpenChange 
}: EditAthleteDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<EditChildFormValues>({
    resolver: zodResolver(editChildSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      currentGrade: "",
      schoolName: "",
      sportsHistory: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalInformation: "",
      specialNeeds: "",
      jerseySize: "",
      height: "",
      weight: "",
      profilePhoto: "",
      sportsInterests: [], 
    },
  });
  
  // Add useFieldArray for managing dynamic sports entries
  const { fields, append, remove } = useFieldArray({
    name: "sportsInterests",
    control: form.control,
  });

  // Set form values when athlete data changes
  useEffect(() => {
    if (athlete) {
      // Format date of birth from ISO to YYYY-MM-DD for input[type="date"]
      const dob = athlete.dateOfBirth 
        ? new Date(athlete.dateOfBirth).toISOString().split('T')[0] 
        : "";

      form.reset({
        fullName: athlete.fullName || "",
        dateOfBirth: dob,
        gender: athlete.gender || "male",
        currentGrade: athlete.currentGrade || "",
        schoolName: athlete.schoolName || "",
        sportsHistory: athlete.sportsHistory || "",
        emergencyContact: athlete.emergencyContact || "",
        emergencyPhone: athlete.emergencyPhone || "",
        medicalInformation: athlete.medicalInformation || "",
        specialNeeds: athlete.specialNeeds || "",
        jerseySize: athlete.jerseySize || "",
        height: athlete.height || "",
        weight: athlete.weight || "",
        profilePhoto: athlete.profilePhoto || "",
        sportsInterests: athlete.sportsInterests || [],
        preferredContact: athlete.preferredContact || "email",
        communicationOptIn: athlete.communicationOptIn === false ? false : true,
      });
    }
  }, [athlete, form]);

  const updateChildMutation = useMutation({
    mutationFn: async (values: EditChildFormValues) => {
      if (!athlete?.id) throw new Error("No athlete ID provided");
      const res = await apiRequest("PUT", `/api/parent/children/${athlete.id}`, values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      onOpenChange(false);
      toast({
        title: "Athlete updated",
        description: "Your athlete's profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update athlete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditChildFormValues) => {
    updateChildMutation.mutate(values);
  };

  if (!athlete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Athlete</DialogTitle>
          <DialogDescription>
            Update {athlete.fullName}'s profile information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Jane Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Grade</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 8th Grade" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 123-456-7890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Current school name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 5 feet 8 inches" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 150 lbs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-md">Sports Experience</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => 
                    append({
                      sportId: 0,
                      skillLevel: "beginner",
                      preferredPositions: [],
                      currentTeam: ""
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sport
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="sportsHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sports History</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief sports background and experience" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fields.length > 0 && (
                <div className="space-y-4 rounded-md border p-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Sport #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`sportsInterests.${index}.sportId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sport</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                >
                                  <option value="">Select a sport</option>
                                  {sportsList.map((sport) => (
                                    <option key={sport} value={sportsMap[sport] || 0}>
                                      {sport}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`sportsInterests.${index}.skillLevel`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Skill Level</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                >
                                  {skillLevels.map(level => (
                                    <option key={level} value={level}>
                                      {skillLevelNames[level]}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4 rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground mb-2">No sports added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => 
                      append({
                        sportId: 0,
                        skillLevel: "beginner",
                        preferredPositions: [],
                        currentTeam: ""
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sport
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jerseySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey/T-Shirt Size</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="">Select size</option>
                        <option value="YS">Youth Small</option>
                        <option value="YM">Youth Medium</option>
                        <option value="YL">Youth Large</option>
                        <option value="YXL">Youth XL</option>
                        <option value="AS">Adult Small</option>
                        <option value="AM">Adult Medium</option>
                        <option value="AL">Adult Large</option>
                        <option value="AXL">Adult XL</option>
                        <option value="A2XL">Adult 2XL</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medicalInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Information (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any medical conditions or allergies" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialNeeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Needs (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any special needs or requirements" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateChildMutation.isPending}
              >
                {updateChildMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}