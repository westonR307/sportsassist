import React, { useState, useEffect } from "react";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { 
  sportsList, 
  sportsMap, 
  sportsById, 
  skillLevels, 
  skillLevelNames,
  getSportName,
  jerseySizeNames 
} from "@shared/sports-utils";
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

// All sports-related constants now imported from shared/sports-utils.ts

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
  // Height and weight fields removed
  profilePhoto: z.string().optional(),
  // Sports interests
  sportsInterests: z.array(z.object({
    sportId: z.number(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
    preferredPositions: z.array(z.string()).optional(),
    currentTeam: z.string().optional(),
  })).optional(),
  // Make communication fields optional but provide defaults
  preferredContact: z.enum(["email", "sms", "app"]).optional().default("email"),
  communicationOptIn: z.boolean().optional().default(true),
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
      // Height and weight fields removed
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
        // Height and weight fields removed
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
      
      // Create a comprehensive payload with all fields
      const payload = {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender || 'male',
        communicationOptIn: values.communicationOptIn ?? true,
        preferredContact: values.preferredContact ?? "email",
        
        // Include all optional fields (even empty ones)
        emergencyContact: values.emergencyContact,
        emergencyPhone: values.emergencyPhone,
        sportsInterests: values.sportsInterests || [],
        currentGrade: values.currentGrade,
        schoolName: values.schoolName,
        jerseySize: values.jerseySize,
        medicalInformation: values.medicalInformation,
        specialNeeds: values.specialNeeds,
        sportsHistory: values.sportsHistory,
      };
      
      console.log("Comprehensive edit mutation payload:", JSON.stringify(payload, null, 2));
      
      // Use fetch directly for more control over the request
      try {
        const response = await fetch(`/api/parent/children/${athlete.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include" // Important: include credentials for auth
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error: ${response.status}`, errorText);
          throw new Error(`Failed to update athlete: ${errorText || response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Edit athlete - update successful, received data:", data);
        return data;
      } catch (error) {
        console.error("Edit athlete - update request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Edit athlete - mutation success callback with data:", data);
      // Invalidate the query to refresh the athlete data
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      
      // Close the dialog
      onOpenChange(false);
      
      // Show success notification
      toast({
        title: "Athlete Profile Updated",
        description: "Your athlete's profile has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Edit athlete - mutation error callback:", error);
      toast({
        title: "Failed to Update Athlete",
        description: error.message || "There was an error updating the athlete profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditChildFormValues) => {
    console.log("Starting athlete update process...");
    // Create a more visible log to help debug
    console.log("Submitting data:", values);
    
    // Force the required fields
    const formattedValues = {
      ...values,
      communicationOptIn: values.communicationOptIn ?? true,
      preferredContact: values.preferredContact ?? "email",
    };
    
    // Create a more visible log of the payload
    console.log("Full payload:", JSON.stringify(formattedValues, null, 2));
    
    // Try with the formatted values - use the mutation's built in callbacks
    updateChildMutation.mutate(formattedValues);
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

            {/* Height and weight form fields removed */}

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
                                    <option key={sport.id} value={sport.id}>
                                      {sport.name}
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
            
            <FormField
              control={form.control}
              name="communicationOptIn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Communication Opt-In</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Allow this athlete to receive communications about camp updates
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="preferredContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact Method</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS/Text</option>
                      <option value="app">App Notification</option>
                    </select>
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
                className="min-w-[120px]"
              >
                {updateChildMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}