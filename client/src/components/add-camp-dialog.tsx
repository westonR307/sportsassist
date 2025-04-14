import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
// import { insertCampSchema } from "@shared/schema";
import { sportsMap, sportsList } from "@shared/sports-utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { normalizeDate, formatDateForPostgres } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvailabilitySlotManager } from "@/components/availability-slots/availability-slot-manager";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, X, Calendar as CalendarIcon, FileText, Layers, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { CalendarScheduler } from "@/components/calendar-scheduler";
import { DocumentAgreementsSelector } from "@/components/document-agreements-selector";
import { AddCampCustomFieldButtonDialog } from "@/components/custom-fields/add-camp-custom-field-button-dialog";
import { BasicInfoMetaFields, BasicInfoMetaFieldsRef } from "@/components/custom-fields/basic-info-meta-fields";
import CampStaffSelector from "@/components/camp-staff-selector";
import { CampTypeSelection } from "@/components/camp-type-selection";


// Map UI skill levels to schema skill levels
const uiSkillLevels = ["Beginner", "Intermediate", "Advanced", "All Levels"];

// Map UI skill levels to schema skill levels
const skillLevelMap: Record<string, "beginner" | "intermediate" | "advanced" | "all_levels"> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
  "All Levels": "all_levels", // Map to all_levels for "All Levels"
};

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Removed local formatDateForPostgres function - now imported from date-utils.ts

// Format a time string from 24-hour to 12-hour format (e.g., "09:00" to "9:00 AM")
const formatTimeFor12Hour = (timeStr: string): string => {
  try {
    const [hours, minutes] = timeStr.split(":");
    const hoursNum = parseInt(hours, 10);
    const suffix = hoursNum >= 12 ? "PM" : "AM";
    const hours12 = hoursNum % 12 === 0 ? 12 : hoursNum % 12;
    return `${hours12}:${minutes} ${suffix}`;
  } catch (e) {
    return timeStr;
  }
};

// Custom date input component for form fields
const DateInput = ({ field, ...props }: { field: any }) => {
  // Use our dedicated utility for consistent date handling
  const formattedValue = normalizeDate(field.value);

  return (
    <Input
      type="date"
      {...field}
      {...props}
      value={formattedValue}
      onChange={(e) => {
        console.log(`DateInput: Input change event: ${e.target.value}`);
        // Store the raw string value directly to avoid any manipulation
        field.onChange(e.target.value);
      }}
    />
  );
};

export function AddCampDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState("Beginner");
  const [openSportCombobox, setOpenSportCombobox] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentTab, setCurrentTab] = useState("basic");
  const [submitting, setSubmitting] = useState(false); // Added for loading state
  const [tempCampId, setTempCampId] = useState(-1); // Temporary ID for calendar scheduler
  const [plannedSessions, setPlannedSessions] = useState<any[]>([]); // Sessions to be created
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null); // For document agreement
  const [selectedCustomFields, setSelectedCustomFields] = useState<number[]>([]); // Store selected custom field IDs
  const [customFieldDetails, setCustomFieldDetails] = useState<{ [id: number]: {label: string, isInternal: boolean} }>({});
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<{userId: number, role: string}[]>([]); // Store selected staff members
  const [availabilitySlots, setAvailabilitySlots] = useState<{date: Date, startTime: string, endTime: string, capacity: number}[]>([]); // Store availability slots

  // New state for camp creation flow
  const [showTypeSelection, setShowTypeSelection] = useState(true);
  const [selectedSchedulingType, setSelectedSchedulingType] = useState<"fixed" | "availability">("fixed");
  const metaFieldsRef = useRef<BasicInfoMetaFieldsRef>(null);
  const campStaffRef = useRef<React.ElementRef<typeof CampStaffSelector>>(null); // Ref for CampStaffSelector component

  // Get default dates
  const today = new Date();
  const regStart = new Date(today);
  const regEnd = new Date(today);
  regEnd.setDate(regEnd.getDate() + 30); // Registration ends in 30 days
  const campStart = new Date(regEnd);
  campStart.setDate(campStart.getDate() + 1); // Camp starts day after registration ends
  const campEnd = new Date(campStart);
  campEnd.setDate(campEnd.getDate() + 7); // Camp runs for 7 days by default

  // Define the schema type for our form
  type ExtendedCampSchema = {
    name: string;
    description: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    additionalLocationDetails?: string | null;
    startDate: string | Date;
    endDate: string | Date;
    registrationStartDate: string | Date;
    registrationEndDate: string | Date;
    price: number;
    capacity: number;
    organizationId: number;
    type: "one_on_one" | "group" | "team" | "virtual";
    visibility: "public" | "private";
    waitlistEnabled: boolean;
    customRegistrationEnabled: boolean; // Added custom registration flag
    minAge: number;
    maxAge: number;
    repeatType: "none" | "weekly" | "monthly";
    repeatCount: number;
    schedules: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }[];
    sportId: number;
    skillLevel: "beginner" | "intermediate" | "advanced" | "all_levels";
    isVirtual?: boolean;
    virtualMeetingUrl?: string;
    schedulingType: "fixed" | "availability";
    // Default times are now handled in the CalendarScheduler component
  };

  const form = useForm<ExtendedCampSchema>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().min(1, "Description is required"),
      streetAddress: z.string().min(1, "Street address is required").optional(),
      city: z.string().min(1, "City is required").optional(),
      state: z.string().length(2, "Please use 2-letter state code").optional(),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format").optional(),
      additionalLocationDetails: z.string().optional().nullable(),
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date()),
      registrationStartDate: z.string().or(z.date()),
      registrationEndDate: z.string().or(z.date()),
      price: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
      capacity: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
      organizationId: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
      type: z.enum(["one_on_one", "group", "team", "virtual"]),
      visibility: z.enum(["public", "private"]).default("public"),
      waitlistEnabled: z.boolean().default(true),
      customRegistrationEnabled: z.boolean().default(false), // Added field for custom registration
      minAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
      maxAge: z.number().or(z.string().transform(val => parseInt(String(val), 10))),
      repeatType: z.enum(["none", "weekly", "monthly"]).default("none"),
      repeatCount: z.number().or(z.string().transform(val => parseInt(String(val || '0'), 10))).default(0),
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
        z.string().length(0), // Empty string for non-virtual camps
        z.literal("") // Another way to match empty string
      ]).optional(),
      schedulingType: z.enum(["fixed", "availability"]).default("fixed")
    })),
    defaultValues: {
      name: "",
      description: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      price: 0,
      capacity: 20,
      type: "group",
      visibility: "public",
      waitlistEnabled: true,
      customRegistrationEnabled: false, // Added default for custom registration
      minAge: 5,
      maxAge: 18,
      repeatType: "none",
      repeatCount: 0,
      registrationStartDate: regStart,
      registrationEndDate: regEnd,
      startDate: campStart,
      endDate: campEnd,
      schedules: [],
      isVirtual: false,
      virtualMeetingUrl: "",
      schedulingType: "fixed",
      // Set default values for required fields that were causing validation errors
      organizationId: user?.organizationId || 1,
      sportId: 1, // Will be updated when sport is selected
      skillLevel: "all_levels", // Default skill level
      // Default times are now handled in the CalendarScheduler component
    },
  });

  // Effect to set organization ID directly in the form when the component mounts
  useEffect(() => {
    if (user?.organizationId) {
      form.setValue("organizationId", user.organizationId, { shouldValidate: true });
      console.log("Set organizationId to", user.organizationId);
    }
  }, [user, form]);

  // Effect to set initial skillLevel value
  useEffect(() => {
    const mappedSkillLevel = skillLevelMap[skillLevel];
    if (mappedSkillLevel) {
      form.setValue("skillLevel", mappedSkillLevel, { shouldValidate: true });
      console.log("Initial skillLevel set to", mappedSkillLevel);
    }
  }, [form, skillLevel]);
  
  // Effect to check for duplicate camp data from localStorage
  useEffect(() => {
    if (open) {
      try {
        const duplicateDataString = localStorage.getItem('duplicateCampData');
        if (duplicateDataString) {
          // Parse the data
          const duplicateData = JSON.parse(duplicateDataString);
          console.log("Found duplicate camp data:", duplicateData);
          setDuplicateData(duplicateData);

          // Populate form with the duplicate camp data
          if (duplicateData.camp) {
            const campData = duplicateData.camp;

            // Set form values
            form.reset({
              ...form.getValues(),
              name: campData.name,
              description: campData.description,
              streetAddress: campData.streetAddress,
              city: campData.city,
              state: campData.state,
              zipCode: campData.zipCode,
              price: campData.price,
              capacity: campData.capacity,
              type: campData.type,
              visibility: campData.visibility,
              waitlistEnabled: campData.waitlistEnabled,
              customRegistrationEnabled: campData.customRegistrationEnabled || false, // Preserve custom registration settings
              minAge: campData.minAge,
              maxAge: campData.maxAge,
              repeatType: campData.repeatType,
              repeatCount: campData.repeatCount,
              registrationStartDate: new Date(campData.registrationStartDate),
              registrationEndDate: new Date(campData.registrationEndDate),
              startDate: new Date(campData.startDate),
              endDate: new Date(campData.endDate),
              // Default times are now handled in the CalendarScheduler component
              isVirtual: campData.isVirtual || false,
              virtualMeetingUrl: campData.virtualMeetingUrl || "",
            });

            // Set sport selection if available
            if (campData.sportId) {
              setSelectedSport(String(campData.sportId));
            }

            // Set custom fields
            if (duplicateData.customFields && duplicateData.customFields.length > 0) {
              setSelectedCustomFields(duplicateData.customFields.map((field: any) => field.customFieldId));
            }

            // Show success message
            toast({
              title: "Camp Data Loaded",
              description: "Duplicated camp data has been loaded. You can now edit and save the new camp.",
            });

            // Clear localStorage after loading
            localStorage.removeItem('duplicateCampData');
          }
        }
      } catch (error) {
        console.error("Error loading duplicate camp data:", error);
        toast({
          title: "Error",
          description: "Failed to load duplicated camp data. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [open, form, toast]);

  const createCampMutation = useMutation({
    mutationFn: async (data: ExtendedCampSchema) => {
      setSubmitting(true); // Set submitting to true before API call
      try {
        if (!user?.organizationId) {
          throw new Error("Organization ID required");
        }

        if (!selectedSport) {
          throw new Error("Sport selection is required");
        }

        const sportId = parseInt(selectedSport) || 1;
        const mappedSkillLevel = skillLevelMap[skillLevel] || "beginner";

        // Make a copy of the data and exclude any potential defaultStartTime/defaultEndTime properties
        // Use type assertion to bypass TypeScript errors
        const dataObj = data as any;
        const { defaultStartTime, defaultEndTime, ...dataWithoutDefaults } = dataObj;

        // Create the base request data object
        const requestData = {
          ...dataWithoutDefaults,
          // Format dates properly for consistent handling
          startDate: formatDateForPostgres(data.startDate),
          endDate: formatDateForPostgres(data.endDate),
          registrationStartDate: formatDateForPostgres(data.registrationStartDate),
          registrationEndDate: formatDateForPostgres(data.registrationEndDate),
          organizationId: user.organizationId,
          price: Number(data.price) || 0,
          capacity: selectedSchedulingType === 'fixed' ? (Number(data.capacity) || 20) : 999,
          minAge: Number(data.minAge) || 5,
          maxAge: Number(data.maxAge) || 18,
          repeatCount: Number(data.repeatCount) || 0,
          sportId: sportId, // Use the sportId from the selected sport
          skillLevel: mappedSkillLevel,
          isVirtual: data.isVirtual || false,
          virtualMeetingUrl: data.isVirtual ? data.virtualMeetingUrl : undefined,
          schedulingType: selectedSchedulingType, // Explicitly set the scheduling type
          customRegistrationEnabled: data.customRegistrationEnabled || false, // Include custom registration flag
        };

        // Handle different scheduling types
        if (selectedSchedulingType === 'fixed') {
          console.log("Processing fixed schedule camp");

          // For fixed scheduling, we need schedules
          if (plannedSessions.length > 0) {
            // If we have planned sessions, use them to create schedules
            requestData.schedules = plannedSessions.map(session => ({
              dayOfWeek: new Date(session.sessionDate).getDay(),
              startTime: session.startTime.substring(0, 5),
              endTime: session.endTime.substring(0, 5)
            }));
          } else {
            // Fallback to default schedule
            requestData.schedules = [
              {
                dayOfWeek: 0, // Sunday as default
                startTime: "09:00", // Using hardcoded default time
                endTime: "17:00" // Using hardcoded default time
              }
            ];
          }
        } else {
          // For availability-based camps, we still need an empty schedules array 
          // to satisfy the schema, but will manage actual scheduling via availability slots
          requestData.schedules = [];

          // Availability-based camps don't support waitlists
          requestData.waitlistEnabled = false;
        }

        console.log("Creating camp with data:", JSON.stringify(requestData, null, 2));

        try {
          // Use apiRequest from @/lib/api.ts which directly returns JSON data
          console.log("About to send POST request to /api/camps with data:", requestData);
          const responseData = await apiRequest("POST", "/api/camps", requestData);
          console.log("Camp created successfully:", responseData);

          // Now create all the planned sessions for this camp
          if (plannedSessions.length > 0 && responseData.id) {
            console.log(`Creating ${plannedSessions.length} sessions for camp ${responseData.id}`);

            // Create a batch of promises to create all sessions
            const sessionPromises = plannedSessions.map(session => {
              // Prepare session data for API call, removing temporary ID
              const { id, campId, ...sessionData } = session;
              return apiRequest("POST", `/api/camps/${responseData.id}/sessions`, {
                ...sessionData,
                campId: responseData.id,
                // Format date properly for PostgreSQL
                date: sessionData.date instanceof Date ? formatDateForPostgres(sessionData.date) : sessionData.date
              });
            });

            // Wait for all sessions to be created
            await Promise.all(sessionPromises);
            console.log("All sessions created successfully!");
          }

          return responseData;
        } catch (error) {
          console.error("API request failed:", error);
          throw error;
        }
      } catch (error: any) {
        console.error("Camp creation error:", error);
        throw error;
      } finally {
        setSubmitting(false); // Set submitting to false after API call, regardless of success or failure
      }
    },
    onSuccess: async (data) => {
      console.log("Camp created successfully with data:", data);

      // Initialize an array to track all post-creation promises
      const promises: Promise<any>[] = [];
      
      // Save custom meta fields
      if (data.id) {
        // We already have the promises array initialized above

        // Save availability slots if schedulingType is 'availability'
        if (form.getValues('schedulingType') === 'availability' && availabilitySlots.length > 0) {
          try {
            console.log(`Saving ${availabilitySlots.length} availability slots for camp ${data.id}`);

            // Create an array to store all promises for slot creation
            const slotPromises = [];

            // Process slots one by one and collect promises
            for (const slot of availabilitySlots) {
              try {
                // Format date for PostgreSQL
                const formattedDate = formatDateForPostgres(slot.date);

                console.log("Sending availability slot data:", {
                  campId: data.id,
                  slotDate: formattedDate,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  maxBookings: slot.capacity
                });

                // Create the promise for this slot creation and add to array
                const slotData = {
                  slotDate: formattedDate,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  maxBookings: slot.capacity, // Server expects maxBookings instead of capacity
                  notes: "", // Add required fields based on the server API endpoint
                  creatorId: user?.id // Add the creator ID from the authenticated user
                };
                
                console.log("Sending availability slot with data:", slotData);
                
                // Calculate duration in minutes for better data consistency
                const calculateDurationMinutes = () => {
                  const [startHours, startMinutes] = slot.startTime.split(':').map(part => parseInt(part, 10));
                  const [endHours, endMinutes] = slot.endTime.split(':').map(part => parseInt(part, 10));
                  
                  const startTotalMinutes = startHours * 60 + startMinutes;
                  const endTotalMinutes = endHours * 60 + endMinutes;
                  
                  return endTotalMinutes - startTotalMinutes;
                };
                
                const enhancedSlotData = {
                  ...slotData,
                  durationMinutes: calculateDurationMinutes(),
                  bufferBefore: 0,
                  bufferAfter: 0
                };
                
                console.log("Sending enhanced availability slot with data:", enhancedSlotData);
                
                // Use apiRequest helper instead of raw fetch for more consistent error handling
                const slotPromise = apiRequest<any>('POST', `/api/camps/${data.id}/availability-slots`, enhancedSlotData)
                  .then((jsonResponse: any) => {
                    console.log("Slot creation successful response:", jsonResponse);
                    return jsonResponse;
                  })
                  .catch((slotError: any) => {
                    console.error(`Error creating slot with date ${formattedDate}:`, slotError);
                    // Add more diagnostic information
                    console.error("Request data was:", JSON.stringify(enhancedSlotData));
                    if (slotError.response) {
                      console.error("Response status:", slotError.response.status);
                      console.error("Response data:", slotError.response.data);
                    }
                    throw slotError; // Re-throw to mark this promise as rejected
                  });
                
                slotPromises.push(slotPromise);
              } catch (slotError) {
                console.error(`Error preparing slot with date ${slot.date}:`, slotError);
              }
            }

            // Add the slot creation promise array to the main promises array
            promises.push(
              // Wait for all slot promises to complete (succeed or fail)
              Promise.allSettled(slotPromises).then(results => {
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                
                console.log(`All availability slots processed - ${successful} successful, ${failed} failed`);
                
                if (successful > 0) {
                  toast({
                    title: "Success",
                    description: failed > 0 
                      ? `Camp created with ${successful} slots. ${failed} slots failed to save.`
                      : "Camp and availability slots saved successfully!",
                  });
                } else if (failed > 0) {
                  toast({
                    title: "Warning",
                    description: "Camp created but there was an issue saving availability slots.",
                    variant: "destructive",
                  });
                }
              })
            );
          } catch (error) {
            console.error("Error saving availability slots:", error);
            toast({
              title: "Warning",
              description: "Camp created but there was an issue saving availability slots.",
              variant: "destructive",
            });
          }
        }

        // Save the staff assignments
        if (campStaffRef.current) {
          try {
            // Create a promise for staff assignment saving and add it to the promises array
            const staffPromise = campStaffRef.current.saveStaffAssignments(data.id)
              .then(() => {
                console.log("Staff assignments saved successfully");
              })
              .catch((error) => {
                console.error("Error saving staff assignments:", error);
                toast({
                  title: "Warning",
                  description: "Camp created but there was an issue saving staff assignments.",
                  variant: "destructive",
                });
                throw error; // Re-throw to mark this promise as rejected
              });
            
            promises.push(staffPromise);
          } catch (error) {
            console.error("Error preparing staff assignment save:", error);
            toast({
              title: "Warning",
              description: "Camp created but there was an issue saving staff assignments.",
              variant: "destructive",
            });
          }
        }

        console.log(`Camp creation successful - Starting meta fields save process for camp ID: ${data.id}`);
        if (metaFieldsRef.current) {
          console.log("metaFieldsRef is available, proceeding with save...");
          try {
            // Set the campId for the meta fields component and save
            console.log(`Setting camp ID ${data.id} in metaFieldsRef`);
            metaFieldsRef.current.setCampId(data.id);

            // Force a small delay to ensure state updates properly
            await new Promise(resolve => setTimeout(resolve, 100));

            // First make a direct API call to ensure we're working with the proper campId
            const addedFields = metaFieldsRef.current.getFields() || [];
            console.log(`Found ${addedFields.length} meta fields to save`, addedFields);

            // Save fields directly through API calls rather than relying on the component method
            if (addedFields.length > 0) {
              console.log(`Directly saving ${addedFields.length} meta fields for camp ${data.id}`);
              for (const field of addedFields) {
                try {
                  console.log(`Saving field data:`, {
                    customFieldId: field.customFieldId,
                    campId: data.id,
                    response: field.response || null,
                    responseArray: field.responseArray || null,
                  });

                  await apiRequest("POST", "/api/camp-custom-fields", {
                    customFieldId: field.customFieldId,
                    campId: data.id,
                    response: field.response || null,
                    responseArray: field.responseArray || null,
                  });
                } catch (innerError) {
                  console.error(`Error saving meta field ${field.customFieldId}:`, innerError);
                }
              }
              console.log("All meta fields saved successfully");
            } else {
              console.log("No meta fields to save");
            }

          } catch (error) {
            console.error("Error saving meta fields:", error);
            toast({
              title: "Warning", 
              description: "Camp created but there was an issue saving meta fields.",
              variant: "destructive"
            });
          }
        }

        // Associate the document agreement if selected
        if (selectedDocumentId) {
          try {
            // Create a promise for document agreement association and add to promises array
            const docPromise = apiRequest("POST", "/api/camp-document-agreements", {
              campId: data.id,
              documentId: selectedDocumentId
            })
            .then(async (response: Response) => {
              // apiRequest already throws if response is not OK
              const jsonResponse = await response.json();
              console.log("Document agreement associated successfully", jsonResponse);
              return jsonResponse;
            })
            .catch((error: any) => {
              console.error("Error associating document agreement:", error);
              toast({
                title: "Warning",
                description: "Camp created but there was an issue associating the document agreement.",
                variant: "destructive"
              });
              throw error; // Re-throw to mark this promise as rejected
            });
            
            // Add to the promises array that was defined outside
            promises.push(docPromise);
          } catch (error) {
            console.error("Error preparing document agreement association:", error);
            toast({
              title: "Warning",
              description: "Camp created but there was an issue associating the document agreement.",
              variant: "destructive"
            });
          }
        }
      }

      // Wait for all promises to complete before finishing
      try {
        // Run all collected promises if they exist
        if (Array.isArray(promises) && promises.length > 0) {
          await Promise.all(promises);
          console.log("All post-creation tasks completed successfully");
        } else {
          console.log("No post-creation tasks to complete");
        }
      } catch (error) {
        console.error("Error in post-creation tasks:", error);
      } finally {
        toast({
          title: "Success",
          description: "Camp created successfully!",
        });

        // Reset form
        form.reset();
        setSelectedSport(null);
        setSkillLevel("Beginner");
        setSchedules([]);
        setPlannedSessions([]);
        setSelectedDocumentId(null);
        setSelectedCustomFields([]);
        setCustomFieldDetails({});
        setTempCampId(-1);
        setSelectedStaff([]);
        setAvailabilitySlots([]);

        // Close dialog
        onOpenChange(false);

        // Refresh camps list
        queryClient.invalidateQueries({ queryKey: ['/api/camps'] });
      }
    },
    onError: (error: any) => {
      console.error("Camp creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create camp. Please try again.",
        variant: "destructive",
      });
    },
  });

  // When a user submits the form
  const onSubmit = async (data: ExtendedCampSchema) => {
    console.log("Form submitted with data:", data);

    try {
      // Set and validate required fields first
      if (!user?.organizationId) {
        throw new Error("Organization ID is missing");
      }

      // Set organizationId and wait for it to be applied
      await form.setValue("organizationId", user.organizationId, { shouldValidate: true });

      // Validate and set sport
      if (!selectedSport) {
        toast({
          title: "Error",
          description: "Please select a sport for this camp",
          variant: "destructive",
        });
        return;
      }
      await form.setValue("sportId", parseInt(selectedSport), { shouldValidate: true });

      // Validate and set skill level
      const mappedSkillLevel = skillLevelMap[skillLevel];
      if (!mappedSkillLevel) {
        toast({
          title: "Error",
          description: "Please select a skill level",
          variant: "destructive",
        });
        return;
      }
      
      // Type check to ensure the value is one of the valid enum values
      if (mappedSkillLevel === "beginner" || 
          mappedSkillLevel === "intermediate" || 
          mappedSkillLevel === "advanced" || 
          mappedSkillLevel === "all_levels") {
        await form.setValue("skillLevel", mappedSkillLevel, { shouldValidate: true });
      } else {
        // Default to all_levels if mapping is invalid
        await form.setValue("skillLevel", "all_levels", { shouldValidate: true });
      }

      // Force validation of these specific fields first
      await form.trigger(["organizationId", "sportId", "skillLevel"]);

      // Then validate all fields
      const isValid = await form.trigger();

      if (!isValid) {
        console.error("Validation failed:", form.formState.errors);
        throw new Error("Please check all required fields");
      }

    } catch (error) {
      console.error("Form validation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Please check all required fields",
        variant: "destructive",
      });
      return;
    }

    // Log the final form values for debugging
    console.log("Final form values:", {
      organizationId: form.getValues("organizationId"),
      sportId: form.getValues("sportId"),
      skillLevel: form.getValues("skillLevel")
    });

    // Handle virtual meeting URL based on camp type
    if (data.isVirtual) {
      // This is a virtual camp, ensure a valid URL is provided
      if (!data.virtualMeetingUrl || !data.virtualMeetingUrl.trim()) {
        // No URL provided for virtual camp, set a default
        const defaultUrl = "https://meet.google.com/example";
        form.setValue("virtualMeetingUrl", defaultUrl);
        console.log("Setting default virtual meeting URL:", defaultUrl);
      } else if (!data.virtualMeetingUrl.startsWith('http')) {
        // URL doesn't start with http/https, prepend https://
        const fixedUrl = `https://${data.virtualMeetingUrl}`;
        form.setValue("virtualMeetingUrl", fixedUrl);
        console.log("Fixed virtual meeting URL format:", fixedUrl);
      }
    } else {
      // Not a virtual camp, set an empty string (not null or undefined)
      form.setValue("virtualMeetingUrl", "");
      console.log("Set empty string for virtualMeetingUrl in non-virtual camp");

      // Remove any validation errors for virtualMeetingUrl
      form.clearErrors("virtualMeetingUrl");
    }

    // Only trigger validation for virtual camps
    if (data.isVirtual) {
      await form.trigger("virtualMeetingUrl");
    }

    console.log("Virtual meeting URL value after processing:", form.getValues("virtualMeetingUrl"));

    // Format all dates consistently and ensure data types are correct
    const formattedData = {
      ...data,
      sportId: parseInt(String(selectedSport || form.getValues("sportId") || '0')),
      skillLevel: (skillLevelMap[skillLevel] || form.getValues("skillLevel") || "all_levels") as "beginner" | "intermediate" | "advanced" | "all_levels", 
      schedulingType: selectedSchedulingType,
      organizationId: user?.organizationId || form.getValues("organizationId") || 1, // Ensure organizationId is set
      virtualMeetingUrl: data.isVirtual ? form.getValues("virtualMeetingUrl") : "", // Get the possibly updated URL
      registrationStartDate: formatDateForPostgres(data.registrationStartDate),
      registrationEndDate: formatDateForPostgres(data.registrationEndDate),
      startDate: formatDateForPostgres(data.startDate),
      endDate: formatDateForPostgres(data.endDate)
    };

    console.log("About to call mutation with data", { 
        ...data,
        sportId: parseInt(selectedSport || '0'),
        skillLevel: skillLevelMap[skillLevel],
        schedulingType: selectedSchedulingType
      });

      try {
        // Handle scheduling based on type - add explicit type checking for debugging
        console.log(`Processing camp with scheduling type: ${selectedSchedulingType}`);

        if (selectedSchedulingType === 'fixed') {
          console.log("Fixed schedule camp - checking sessions:", plannedSessions);

          if (plannedSessions.length === 0) {
            toast({
              title: "Error",
              description: "Please add at least one session to the schedule",
              variant: "destructive",
            });
            return;
          }

          // Process sessions for fixed schedule camps
          formattedData.schedules = plannedSessions.map(session => {
            const dayOfWeek = new Date(session.sessionDate).getDay();
            const startTime = session.startTime.substring(0, 5);
            const endTime = session.endTime.substring(0, 5);

            console.log(`Processed session: day=${dayOfWeek}, start=${startTime}, end=${endTime}`);

            return {
              dayOfWeek,
              startTime,
              endTime
            };
          });

          console.log("Final schedules for fixed camp:", formattedData.schedules);
        } else {
          console.log("Availability-based camp - sending empty schedules array");
          formattedData.schedules = [];
        }

        // Log final data before sending
        console.log("Calling mutation with formatted data:", JSON.stringify(formattedData, null, 2));

        // Force the schedulingType to be explicitly set to ensure it's not overridden
        formattedData.schedulingType = selectedSchedulingType;

        // Call the mutation
        await createCampMutation.mutateAsync(formattedData);
      } catch (error) {
        console.error("Error calling mutation:", error);
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Camp</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {showTypeSelection ? (
            <CampTypeSelection
              onSelect={(type) => {
                setSelectedSchedulingType(type);
                setShowTypeSelection(false);
                form.setValue("schedulingType", type);
              }}
            />
          ) : (
            <Form {...form}>
              <form onSubmit={(event) => {
                console.log("Form submit event triggered");
                // Log form validation errors
                console.log("Form errors:", form.formState.errors);
                form.handleSubmit(async (data) => {
                  console.log("Form submit handler called with data:", data);

                  // Force-set required values one last time before submission
                  // Always set organizationId
                  if (user?.organizationId) {
                    form.setValue("organizationId", user.organizationId, { shouldValidate: true });
                  } else {
                    // Fallback to 1 if user context doesn't have organizationId
                    form.setValue("organizationId", 1, { shouldValidate: true });
                  }

                  // Always set sportId
                  if (selectedSport) {
                    form.setValue("sportId", parseInt(selectedSport), { shouldValidate: true });
                  } else if (sportsList.length > 0) {
                    // Use the first sport in the list as default
                    form.setValue("sportId", sportsList[0].id, { shouldValidate: true });
                  } else {
                    // Last resort fallback
                    form.setValue("sportId", 1, { shouldValidate: true });
                  }

                  // Always set skillLevel 
                  if (skillLevel) {
                    // Explicitly convert to the enum type
                    const mappedSkillLevel = skillLevelMap[skillLevel];
                    if (mappedSkillLevel === "beginner" || 
                        mappedSkillLevel === "intermediate" || 
                        mappedSkillLevel === "advanced" || 
                        mappedSkillLevel === "all_levels") {
                      form.setValue("skillLevel", mappedSkillLevel, { shouldValidate: true });
                    } else {
                      // Default to all_levels if skill level mapping is invalid
                      form.setValue("skillLevel", "all_levels", { shouldValidate: true });
                    }
                  } else {
                    // Default to all_levels if not set
                    form.setValue("skillLevel", "all_levels", { shouldValidate: true });
                  }

                  // Set schedulingType
                  form.setValue("schedulingType", selectedSchedulingType);

                  // Handle virtual meeting URL for virtual camps
                  if (data.isVirtual && (!data.virtualMeetingUrl || !data.virtualMeetingUrl.trim())) {
                    form.setValue("virtualMeetingUrl", "https://meet.google.com/example");
                  } else if (!data.isVirtual) {
                    // For non-virtual camps, set to empty string instead of null to maintain type safety
                    form.setValue("virtualMeetingUrl", "");
                    // Also clear any validation errors related to the virtual meeting URL field
                    form.clearErrors("virtualMeetingUrl");
                  }

                  // Ensure additionalLocationDetails is properly set to an empty string if null or undefined
                  if (data.additionalLocationDetails === null || data.additionalLocationDetails === undefined) {
                    form.setValue("additionalLocationDetails", "");
                  }

                  // Ensure required fields are properly set
                  if (user?.organizationId) {
                    form.setValue("organizationId", user.organizationId);
                  }

                  // Make sure sportId is set (select first sport if needed)
                  if (!data.sportId && sportsList.length > 0) {
                    const firstSportId = sportsList[0].id;
                    form.setValue("sportId", firstSportId);
                    setSelectedSport(String(firstSportId));
                  }

                  // Ensure skillLevel is set
                  if (!data.skillLevel) {
                    // Get mapped skill level, defaulting to "all_levels" if mapping is invalid
                    const mappedSkillLevel = skillLevelMap[skillLevel];
                    if (mappedSkillLevel === "beginner" || 
                        mappedSkillLevel === "intermediate" || 
                        mappedSkillLevel === "advanced" || 
                        mappedSkillLevel === "all_levels") {
                      form.setValue("skillLevel", mappedSkillLevel, { shouldValidate: true });
                    } else {
                      form.setValue("skillLevel", "all_levels", { shouldValidate: true });
                    }
                  }

                  // Log values after fixing them
                  console.log("Fixed values:", {
                    organizationId: form.getValues("organizationId"),
                    sportId: form.getValues("sportId"),
                    skillLevel: form.getValues("skillLevel"),
                    virtualMeetingUrl: form.getValues("virtualMeetingUrl")
                  });

                  // Trigger validation on all fields
                  await form.trigger();

                  // Check again if we have validation errors
                  if (Object.keys(form.formState.errors).length > 0) {
                    console.error("Form still has validation errors after trying to fix:", form.formState.errors);
                    toast({
                      title: "Form validation failed",
                      description: "Please check all required fields are filled correctly.",
                      variant: "destructive"
                    });
                    return;
                  }

                  // All set - submit the form
                  onSubmit(form.getValues());
                }, (errors) => {
                  console.error("Form validation failed:", errors);
                  toast({
                    title: "Form validation failed",
                    description: "Please check all required fields are filled correctly.",
                    variant: "destructive"
                  });
                })(event);
              }} className="space-y-6">
                {/* Back button to return to selection screen */}
                <div className="mb-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowTypeSelection(true)}
                    className="flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to Type Selection
                  </Button>
                </div>

                <Tabs
                  defaultValue="basic"
                  className="w-full"
                  value={currentTab}
                  onValueChange={setCurrentTab}
                >
                  <TabsList className="grid grid-cols-3 mb-4 sticky top-0 bg-background z-10">
                    <TabsTrigger value="basic">Information</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="schedule">Scheduling</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Camp Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter camp name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Describe the camp"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormItem>
                        <FormLabel>Sport</FormLabel>
                        <select
                          value={selectedSport || ""}
                          onChange={(e) => {
                            const value = e.target.value || null;
                            setSelectedSport(value);
                            // Immediately set sportId in the form when it changes
                            if (value) {
                              form.setValue("sportId", parseInt(value), { shouldValidate: true });
                              console.log("Set sportId to", parseInt(value));
                            }
                          }}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="" disabled>
                            Select a sport...
                          </option>
                          {sportsList.map((sport) => (
                            <option key={sport.id} value={sport.id}>
                              {sport.name}
                            </option>
                          ))}
                        </select>
                        {selectedSport && (
                          <div className="mt-1 text-sm text-green-600">
                            Selected: {sportsList.find(s => s.id === parseInt(selectedSport))?.name}
                          </div>
                        )}
                      </FormItem>

                      <FormItem>
                        <FormLabel>Skill Level</FormLabel>
                        <select
                          value={skillLevel}
                          onChange={(e) => {
                            const newSkillLevel = e.target.value;
                            setSkillLevel(newSkillLevel);
                            // Immediately set skillLevel in the form when it changes
                            const mappedSkillLevel = skillLevelMap[newSkillLevel];
                            if (mappedSkillLevel) {
                              form.setValue("skillLevel", mappedSkillLevel, { shouldValidate: true });
                              console.log("Set skillLevel to", mappedSkillLevel);
                            }
                          }}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          {uiSkillLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </FormItem>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registrationStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Start</FormLabel>
                            <FormControl>
                              <DateInput field={field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registrationEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration End</FormLabel>
                            <FormControl>
                              <DateInput field={field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camp Start Date</FormLabel>
                            <FormControl>
                              <DateInput field={field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camp End Date</FormLabel>
                            <FormControl>
                              <DateInput field={field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minAge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Age</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) => {
                                  // Allow actual empty values but convert valid inputs to numbers
                                  const value = e.target.value.trim();
                                  field.onChange(value ? parseInt(value) : '');
                                }}
                                min={1}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxAge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Age</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) => {
                                  // Allow actual empty values but convert valid inputs to numbers
                                  const value = e.target.value.trim();
                                  field.onChange(value ? parseInt(value) : '');
                                }}
                                min={1}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) => {
                                  // Allow actual empty values but convert valid inputs to numbers
                                  const value = e.target.value.trim();
                                  field.onChange(value ? parseInt(value) : '');
                                }}
                                min={0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedSchedulingType === 'fixed' && (
                        <FormField
                          control={form.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  min={1}
                                  onChange={(e) => {
                                    // Allow actual empty values but convert valid inputs to numbers
                                    const value = e.target.value.trim();
                                    field.onChange(value ? parseInt(value) : '');
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedSchedulingType === 'availability' && (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Capacity is managed per time slot in availability mode
                          </p>
                        </FormItem>
                      )}

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Camp Type</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              >
                                <option value="group">Group</option>
                                <option value="one_on-one">One-on-One</option>
                                <option value="team">Team</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Camp staff management */}
                    <div className="mt-8 border-t pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-medium">Camp Staff</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Assign coaches and staff members to this camp.
                            Note: Staff assignments will be saved when the camp is created.
                          </p>
                        </div>
                      </div>
                      {user?.organizationId && (
                        <CampStaffSelector
                          ref={campStaffRef}
                          campId={tempCampId} // We use the temporary ID for initial selection
                          organizationId={user.organizationId}
                          isNew={true} // Flag to indicate this is a new camp
                        />
                      )}
                    </div>

                    {/* Add the custom meta fields component */}
                    <div className="mt-8 border-t pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-medium">Additional Information</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Add custom fields to provide more details about your camp.
                            Click "Save Fields" after adding your custom fields. 
                            They will be permanently saved when you create the camp.
                          </p>
                        </div>
                      </div>
                      {user?.organizationId && (
                        <BasicInfoMetaFields
                          ref={metaFieldsRef}
                          organizationId={user.organizationId}
                          // Show the save button exactly like in edit camp dialog
                          showSaveButton={true}
                        />
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        onClick={() => setCurrentTab("location")}
                      >
                        Next
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="isVirtual"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              This is a virtual camp (conducted online)
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch('isVirtual') ? (
                      <FormField
                        control={form.control}
                        name="virtualMeetingUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Virtual Meeting URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://zoom.us/j/123456789" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="streetAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="123 Main St" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="City" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="NY" maxLength={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="12345" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="additionalLocationDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Location Details</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value || ''} 
                                  placeholder="E.g., Field #3, North Entrance, Classroom 101"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <div className="flex justify-between space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentTab("basic")}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setCurrentTab("schedule")}
                      >
                        Next
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Scheduling Type</h3>
                      </div>

                      <div className="py-2 px-4 bg-muted/50 rounded-md mb-4">
                        <p className="text-sm font-medium">Selected: {selectedSchedulingType === 'fixed' ? 'Fixed Schedule' : 'Availability-Based'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedSchedulingType === 'fixed' 
                            ? 'Predefined days and times for all participants' 
                            : 'Similar to Calendly, participants book available time slots'}
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setShowTypeSelection(true)}
                          className="px-0 py-1 h-auto text-xs"
                        >
                          Change scheduling type
                        </Button>
                      </div>

                      {form.watch('schedulingType') === 'availability' && (
                        <div className="mt-4 border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-4">Availability Slots</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create available time slots that participants can book, similar to Calendly.
                          </p>

                          <AvailabilitySlotManager
                            campStartDate={new Date(form.getValues().startDate)}
                            campEndDate={new Date(form.getValues().endDate)}
                            slots={availabilitySlots}
                            onSlotsChange={setAvailabilitySlots}
                          />

                          {availabilitySlots.length > 0 && (
                            <div className="mt-4 p-3 bg-muted/50 rounded-md">
                              <p className="text-sm font-medium mb-2">Created {availabilitySlots.length} availability slots</p>
                              <p className="text-xs text-muted-foreground">
                                These slots will be saved when you create the camp. Participants will be able to book these slots.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {form.watch('schedulingType') === 'fixed' && (
                        <div className="mt-4 border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-4">Fixed Schedule</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create a fixed schedule for all participants. Sessions will be generated based on the schedule.
                          </p>

                          <div className="space-y-4">
                            <CalendarScheduler
                              campId={tempCampId}
                              startDate={new Date(form.getValues().startDate)}
                              endDate={new Date(form.getValues().endDate)}
                              sessions={plannedSessions}
                              onSave={() => {
                                // Only log the save event, but don't trigger form submission
                                console.log("Save triggered from calendar, sessions count:", plannedSessions.length);
                              }}
                              canManage={true}
                              customHandlers={{
                                addSession: async (sessionData) => {
                                  // Create a new planned session
                                  const newSession = {
                                    ...sessionData,
                                    id: Date.now(), // Temporary ID
                                    campId: tempCampId
                                  };
                                  console.log("Adding planned session:", newSession);
                                  setPlannedSessions([...plannedSessions, newSession]);
                                  return newSession;
                                },
                                deleteSession: async (sessionId) => {
                                  // Remove from planned sessions
                                  console.log("Removing planned session:", sessionId);
                                  setPlannedSessions(plannedSessions.filter(s => s.id !== sessionId));
                                  return true;
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {form.watch('schedulingType') === 'fixed' && (
                        <FormField
                          control={form.control}
                          name="waitlistEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Enable waitlist when camp reaches capacity
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  If checked, parents can join a waitlist when the camp is full
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Custom Registration Form Option */}
                      <FormField
                        control={form.control}
                        name="customRegistrationEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-6">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Enable custom registration fields
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                If checked, parents will be asked to complete additional custom fields during registration
                              </p>
                              {field.value && (
                                <p className="text-xs mt-2 text-blue-500">
                                  <Link to="/custom-fields" className="hover:underline">
                                    ➤ Go to Custom Fields page to create and manage your custom fields
                                  </Link>
                                </p>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="visibility"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visibility</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              >
                                <option value="public">Public</option>
                                <option value="private">Private (Invite Only)</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="mt-6 border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-lg font-medium">Document Agreement</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Select a document agreement that participants must sign when registering.
                            </p>
                          </div>
                        </div>

                        {tempCampId && tempCampId > 0 ? (
                          <DocumentAgreementsSelector
                            campId={tempCampId}
                            onDocumentSelect={setSelectedDocumentId}
                            isNewCamp={true}
                          />
                        ) : (
                          <div className="text-center p-6 border border-dashed rounded-md">
                            <p className="text-sm text-muted-foreground">
                              Document agreements will be available after saving initial camp details.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between space-x-2 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentTab("location")}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Manual form validation and submission for debugging
                          console.log("Debug Form Trigger - Current form state:", form.getValues());
                          console.log("Debug Form Trigger - Selected sport:", selectedSport);
                          console.log("Debug Form Trigger - Selected scheduling type:", selectedSchedulingType);
                          console.log("Debug Form Trigger - Form errors:", form.formState.errors);

                          // Manually check all fields
                          form.trigger().then(isValid => {
                            if (isValid) {
                              console.log("Form is valid, manually submitting...");
                              onSubmit(form.getValues() as ExtendedCampSchema);
                            } else {
                              console.log("Form validation failed", form.formState.errors);
                            }
                          });
                        }}
                      >
                        Debug Submit
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-1"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" /> Create Camp
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}