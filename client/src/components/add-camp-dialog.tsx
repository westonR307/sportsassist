import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCampSchema } from "@shared/schema";
import { sportsMap, sportsList } from "@shared/sports-utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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


// Map UI skill levels to schema skill levels
const uiSkillLevels = ["Beginner", "Intermediate", "Advanced", "All Levels"];

// Map UI skill levels to schema skill levels
const skillLevelMap: Record<string, string> = {
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

const formatDateForPostgres = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

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

// Custom date input component to handle Date objects correctly
const DateInput = ({ field, ...props }: { field: any }) => {
  return (
    <Input
      type="date"
      {...field}
      {...props}
      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
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

  // Extended schema type for the form
  type ExtendedCampSchema = z.infer<typeof insertCampSchema> & { 
    defaultStartTime: string; 
    defaultEndTime: string;
  };

  const form = useForm<ExtendedCampSchema>({
    resolver: zodResolver(insertCampSchema.extend({
      defaultStartTime: z.string().optional(),
      defaultEndTime: z.string().optional()
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
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
    },
  });
  
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
              minAge: campData.minAge,
              maxAge: campData.maxAge,
              repeatType: campData.repeatType,
              repeatCount: campData.repeatCount,
              registrationStartDate: new Date(campData.registrationStartDate),
              registrationEndDate: new Date(campData.registrationEndDate),
              startDate: new Date(campData.startDate),
              endDate: new Date(campData.endDate),
              defaultStartTime: "09:00", // Set default values
              defaultEndTime: "17:00",
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

        // Extract and remove defaultStartTime and defaultEndTime from data
        const { defaultStartTime, defaultEndTime, ...dataWithoutDefaults } = data;
        
        const requestData = {
          ...dataWithoutDefaults,
          startDate: data.startDate,
          endDate: data.endDate,
          registrationStartDate: data.registrationStartDate,
          registrationEndDate: data.registrationEndDate,
          organizationId: user.organizationId,
          price: Number(data.price) || 0,
          capacity: Number(data.capacity) || 20,
          minAge: Number(data.minAge) || 5,
          maxAge: Number(data.maxAge) || 18,
          repeatCount: Number(data.repeatCount) || 0,
          sportId: sportId, // Use the sportId from the selected sport
          skillLevel: mappedSkillLevel,
          isVirtual: data.isVirtual || false,
          virtualMeetingUrl: data.isVirtual ? data.virtualMeetingUrl : undefined,
          // Create at least one schedule entry based on the default times
          // This will satisfy the schema requirement while we transition to enhanced scheduling
          schedules: [
            {
              dayOfWeek: 0, // Sunday as default
              startTime: defaultStartTime || "09:00",
              endTime: defaultEndTime || "17:00"
            }
          ]
        };

        console.log("Creating camp with data:", JSON.stringify(requestData, null, 2));
        
        // The apiRequest function automatically parses JSON responses
        const response = await apiRequest("POST", "/api/camps", requestData);
        console.log("Camp created successfully:", response);
        
        // Now create all the planned sessions for this camp
        if (plannedSessions.length > 0 && response.id) {
          console.log(`Creating ${plannedSessions.length} sessions for camp ${response.id}`);
          
          // Create a batch of promises to create all sessions
          const sessionPromises = plannedSessions.map(session => {
            // Prepare session data for API call, removing temporary ID
            const { id, campId, ...sessionData } = session;
            return apiRequest("POST", `/api/camps/${response.id}/sessions`, {
              ...sessionData,
              campId: response.id,
              // Format date properly for PostgreSQL
              date: sessionData.date instanceof Date ? formatDateForPostgres(sessionData.date) : sessionData.date
            });
          });
          
          // Wait for all sessions to be created
          await Promise.all(sessionPromises);
          console.log("All sessions created successfully!");
        }
        
        return response;
      } catch (error: any) {
        console.error("Camp creation error:", error);
        throw error;
      } finally {
        setSubmitting(false); // Set submitting to false after API call, regardless of success or failure
      }
    },
    onSuccess: async (data) => {
      console.log("Camp created successfully with data:", data);
      
      // Save custom meta fields
      if (data.id) {
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
            const addedFields = metaFieldsRef.current.getFields?.() || [];
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
                  
                  await apiRequest("POST", `/api/camps/${data.id}/meta-fields`, {
                    customFieldId: field.customFieldId,
                    campId: data.id,
                    response: field.response || null,
                    responseArray: field.responseArray || null,
                  });
                  console.log(`Successfully saved field ${field.customFieldId} to camp ${data.id}`);
                } catch (fieldError) {
                  console.error(`Error saving individual field ${field.customFieldId}:`, fieldError);
                }
              }
              console.log("All meta fields saved via direct API calls");
            }
            
            // Also try the original method as a fallback
            const saveResult = await metaFieldsRef.current.saveFieldsIfNeeded();
            console.log(`Meta fields save result from component method: ${saveResult}`);
            
            // If we have duplicated meta fields, save those as well
            if (duplicateData?.metaFields && duplicateData.metaFields.length > 0) {
              console.log(`Duplicating ${duplicateData.metaFields.length} meta fields for new camp ${data.id}`);
              const metaFieldPromises = duplicateData.metaFields.map((metaField: any) => {
                // Copy the meta field but with the new camp ID
                const { id, campId, ...metaFieldData } = metaField;
                return apiRequest('POST', `/api/camps/${data.id}/meta-fields`, {
                  ...metaFieldData,
                  campId: data.id
                });
              });
              await Promise.all(metaFieldPromises);
              console.log("Duplicated meta fields saved successfully");
            }
          } catch (error) {
            console.error("Error saving meta fields:", error);
            toast({
              title: "Warning",
              description: "Camp created but there was an issue saving custom meta fields.",
              variant: "destructive",
            });
          }
        }
      }
      
      // If a document was selected for agreement, save that relationship
      if (selectedDocumentId && data.id) {
        try {
          console.log(`Setting document agreement ${selectedDocumentId} for camp ${data.id}`);
          await apiRequest('PUT', `/api/camps/${data.id}/agreements`, {
            documentId: selectedDocumentId
          });
          console.log("Document agreement saved successfully");
        } catch (error) {
          console.error("Error saving document agreement:", error);
          toast({
            title: "Warning",
            description: "Camp created but there was an issue saving the document agreement.",
            variant: "destructive",
          });
        }
      }

      // If custom fields were selected, associate them with the camp
      if (selectedCustomFields.length > 0 && data.id) {
        try {
          console.log(`Setting ${selectedCustomFields.length} custom fields for camp ${data.id}`);
          await Promise.all(selectedCustomFields.map(fieldId => 
            apiRequest('POST', `/api/camps/${data.id}/custom-fields`, { 
              customFieldId: fieldId,
              required: true
            })
          ));
          console.log("Custom fields associated successfully");
        } catch (error) {
          console.error("Error associating custom fields:", error);
          toast({
            title: "Warning",
            description: "Camp created but there was an issue setting up custom fields.",
            variant: "destructive",
          });
        }
      }

      // If staff members were selected, associate them with the camp
      if (campStaffRef.current && data.id) {
        try {
          const selectedStaff = campStaffRef.current.getSelectedStaff();
          if (selectedStaff.length > 0) {
            console.log(`Setting ${selectedStaff.length} staff members for camp ${data.id}`);
            await Promise.all(selectedStaff.map(staff => 
              apiRequest('POST', `/api/camps/${data.id}/staff`, { 
                userId: staff.userId,
                role: staff.role
              })
            ));
            console.log("Staff members associated successfully");
          }
        } catch (error) {
          console.error("Error associating staff members:", error);
          toast({
            title: "Warning",
            description: "Camp created but there was an issue associating staff members.",
            variant: "destructive",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      onOpenChange(false);
      form.reset();
      setSchedules([]);
      setSelectedSport(null);
      setSkillLevel("Beginner");
      setPlannedSessions([]); // Reset planned sessions
      setSelectedDocumentId(null); // Reset selected document
      setSelectedCustomFields([]); // Reset selected custom fields
      if (campStaffRef.current) {
        campStaffRef.current.clearSelectedStaff(); // Clear selected staff members
      }
      toast({
        title: "Success",
        description: "Camp created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Camp creation error:", error);
      let errorMessage = "Failed to create camp";

      // Our apiRequest throws Error objects with message property
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof Schedule, value: string | number) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };
  
  // Handle adding a custom field to the registration form
  const handleAddCustomField = async (fieldId: number) => {
    // Check if the field is already selected
    if (!selectedCustomFields.includes(fieldId)) {
      setSelectedCustomFields([...selectedCustomFields, fieldId]);
      
      // If we don't have the field details, fetch them
      if (!customFieldDetails[fieldId] && user?.organizationId) {
        try {
          const response = await fetch(`/api/organizations/${user.organizationId}/custom-fields/${fieldId}`);
          if (response.ok) {
            const fieldData = await response.json();
            setCustomFieldDetails(prev => ({
              ...prev,
              [fieldId]: {
                label: fieldData.label,
                isInternal: fieldData.isInternal
              }
            }));
          }
        } catch (error) {
          console.error("Error fetching field details:", error);
        }
      }
    }
  };

  const onSubmit = async (data: ExtendedCampSchema) => {
    console.log("Form submitted with data:", data);
    
    if (!selectedSport) {
      console.log("Error: No sport selected");
      toast({
        title: "Error",
        description: "Please select a sport",
        variant: "destructive",
      });
      setCurrentTab("basic");
      return;
    };
    
    // Validate virtual meeting URL for virtual camps
    if (data.isVirtual && !data.virtualMeetingUrl) {
      console.log("Error: No virtual meeting URL provided for virtual camp");
      toast({
        title: "Error",
        description: "Please provide a meeting URL for the virtual camp",
        variant: "destructive",
      });
      setCurrentTab("location");
      return;
    }

    // Validate default start and end times for enhanced scheduling
    if (!data.defaultStartTime || !data.defaultEndTime) {
      console.log("Error: No default times set for scheduling");
      toast({
        title: "Error",
        description: "Please set default start and end times for scheduling",
        variant: "destructive",
      });
      setCurrentTab("schedule");
      return;
    }

    // Validate default time format
    const defaultStart = new Date(`1970-01-01T${data.defaultStartTime}`);
    const defaultEnd = new Date(`1970-01-01T${data.defaultEndTime}`);

    if (isNaN(defaultStart.getTime()) || isNaN(defaultEnd.getTime())) {
      toast({
        title: "Error",
        description: "Invalid default time format",
        variant: "destructive",
      });
      setCurrentTab("schedule");
      return;
    }

    if (defaultEnd <= defaultStart) {
      toast({
        title: "Error",
        description: "Default end time must be after default start time",
        variant: "destructive",
      });
      setCurrentTab("schedule");
      return;
    }

    // Validate dates
    const regStartDate = new Date(data.registrationStartDate);
    const regEndDate = new Date(data.registrationEndDate);
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime()) || 
        isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast({
        title: "Error",
        description: "Invalid date format",
        variant: "destructive",
      });
      return;
    }

    if (regEndDate <= regStartDate) {
      toast({
        title: "Error",
        description: "Registration end date must be after registration start date",
        variant: "destructive",
      });
      return;
    }

    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "Camp end date must be after camp start date",
        variant: "destructive",
      });
      return;
    }

    if (startDate <= regEndDate) {
      toast({
        title: "Error",
        description: "Camp start date must be after registration end date",
        variant: "destructive",
      });
      return;
    }

    // Extract defaultStartTime/defaultEndTime when logging for first call
    const { defaultStartTime: defStart, defaultEndTime: defEnd, ...submittingData } = data;

    console.log("Submitting form with data:", { 
      ...submittingData, 
      // Create at least one schedule entry based on the default times
      schedules: [
        {
          dayOfWeek: 0, // Sunday as default
          startTime: defStart,
          endTime: defEnd
        }
      ],
      sportId: parseInt(selectedSport) || 1,
      skillLevel: skillLevelMap[skillLevel] 
    });

    // Extract defaultStartTime/defaultEndTime when logging to avoid confusion
    const { defaultStartTime, defaultEndTime, ...dataForLog } = data;
    
    console.log("About to call mutation with data", { 
      ...dataForLog, 
      schedules: [
        {
          dayOfWeek: 0, // Sunday as default
          startTime: defaultStartTime,
          endTime: defaultEndTime
        }
      ],
      sport: selectedSport,
      level: skillLevel
    });
    try {
      // Extract defaultStartTime and defaultEndTime fields, then pass the rest to the mutation
      const { defaultStartTime, defaultEndTime, ...campData } = data;
      
      // Format dates as ISO strings
      const formattedData = {
        ...campData,
        defaultStartTime,
        defaultEndTime,
        registrationStartDate: campData.registrationStartDate,
        registrationEndDate: campData.registrationEndDate,
        startDate: campData.startDate,
        endDate: campData.endDate,
        isVirtual: campData.isVirtual || false,
        virtualMeetingUrl: campData.isVirtual ? campData.virtualMeetingUrl : undefined,
        // Create at least one schedule entry based on the default times
        schedules: [
          {
            dayOfWeek: 0, // Sunday as default
            startTime: defaultStartTime,
            endTime: defaultEndTime
          }
        ]
      };
      
      createCampMutation.mutate(formattedData as ExtendedCampSchema);
      console.log("Mutation called successfully");
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs
                defaultValue="basic"
                className="w-full"
                value={currentTab}
                onValueChange={setCurrentTab}
              >
                <TabsList className="grid grid-cols-4 mb-4 sticky top-0 bg-background z-10">
                  <TabsTrigger value="basic">Information</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
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
                        onChange={(e) =>
                          setSelectedSport(e.target.value || null)
                        }
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
                        onChange={(e) => setSkillLevel(e.target.value)}
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
                      onClick={async () => {
                        const isValid = await form.trigger([
                          "name",
                          "description",
                        ]);
                        if (isValid) {
                          setCurrentTab("schedule");
                        }
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Calendar Scheduling</h3>
                    </div>

                    <Tabs defaultValue="enhanced">
                      <TabsList className="hidden">
                        <TabsTrigger value="enhanced">Calendar Scheduling</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="enhanced" className="pt-4">
                        <div className="p-3 bg-muted rounded-md mb-4">
                          <p className="text-sm">
                            Our calendar-based scheduling system allows you to create a flexible camp schedule.
                            After creating the camp, you'll be able to:
                          </p>
                          <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                            <li>Click on dates to add sessions</li>
                            <li>Set specific start and end times for each day</li>
                            <li>Create recurring patterns for regular sessions</li>
                            <li>Manage individual sessions</li>
                          </ul>
                        </div>
                        
                        {form.watch('startDate') && form.watch('endDate') ? (
                          <div className="mt-4">
                            <div className="grid gap-3 mb-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor="defaultStartTime">Default Start Time</Label>
                                  <Input
                                    id="defaultStartTime"
                                    type="time"
                                    defaultValue="09:00"
                                    onChange={(e) => {
                                      // This sets a default start time that will be used when clicking on days
                                      form.setValue('defaultStartTime', e.target.value);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="defaultEndTime">Default End Time</Label>
                                  <Input
                                    id="defaultEndTime"
                                    type="time"
                                    defaultValue="17:00"
                                    onChange={(e) => {
                                      // This sets a default end time that will be used when clicking on days
                                      form.setValue('defaultEndTime', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <p>Now you can schedule camp sessions directly by using the calendar below. Set your default start and end times, then click on dates to add sessions.</p>
                            </div>
                            
                            <div className="border rounded-md p-4">
                              <div className="calendar-container">
                                {form.watch('startDate') && form.watch('endDate') ? (
                                  <div>
                                    <div className="text-center py-4 mb-4">
                                      <p>Schedule your camp sessions using the calendar below.</p>
                                      <p className="mt-2 text-sm">
                                        The default session time will be from {formatTimeFor12Hour(form.watch('defaultStartTime') || '09:00')} to {formatTimeFor12Hour(form.watch('defaultEndTime') || '17:00')} for days you select.
                                      </p>
                                    </div>
                                    
                                    {/* Interactive calendar scheduler component */}
                                    <div>
                                      {/* We're using a temporary camp ID until the actual camp is created */}
                                      <CalendarScheduler
                                        campId={tempCampId}
                                        startDate={new Date(form.watch('startDate'))}
                                        endDate={new Date(form.watch('endDate'))}
                                        sessions={plannedSessions}
                                        onSave={() => {
                                          // This gets called when sessions are added or deleted
                                          console.log("Sessions planned:", plannedSessions);
                                        }}
                                        canManage={true}
                                        // Override the add and delete methods to work with local state instead of API calls
                                        customHandlers={{
                                          addSession: (sessionData) => {
                                            // Create a new session with a temporary ID
                                            const newSession = {
                                              ...sessionData,
                                              id: Date.now(), // Use timestamp as temporary ID
                                              campId: tempCampId,
                                              status: "active"
                                            };
                                            setPlannedSessions([...plannedSessions, newSession]);
                                            return Promise.resolve(newSession);
                                          },
                                          deleteSession: (sessionId) => {
                                            setPlannedSessions(plannedSessions.filter(s => s.id !== sessionId));
                                            return Promise.resolve(true);
                                          }
                                        }}
                                      />
                                      
                                      <div className="mt-4 text-sm text-muted-foreground">
                                        <p className="font-medium">How to use the calendar:</p>
                                        <ol className="list-decimal pl-5 space-y-1 mt-2">
                                          <li>Select a date on the calendar</li>
                                          <li>Set the start and end times</li>
                                          <li>Click "Add Session at Selected Times"</li>
                                          <li>Your sessions will be created when you submit the camp</li>
                                        </ol>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground">
                                    <p>Please set your camp's start and end dates first.</p>
                                    <p className="mt-2 text-sm">Once dates are set, you'll be able to configure the camp schedule.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>Please set your camp start and end dates in the Information tab first.</p>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setCurrentTab("basic")}
                              className="mt-4"
                            >
                              Go to Information Tab
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                      
                      {/* Legacy scheduling content removed */}
                    </Tabs>
                  </div>

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
                      onClick={() => {
                        // Enhanced scheduling validation
                        if (!form.watch('defaultStartTime') || !form.watch('defaultEndTime')) {
                          toast({
                            title: "Warning",
                            description: "Please set default start and end times.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setCurrentTab("location");
                      }}
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
                            This is a virtual camp
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check this box if the camp will be held virtually through a meeting link or videoconference.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("isVirtual") ? (
                    <FormField
                      control={form.control}
                      name="virtualMeetingUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Virtual Meeting URL <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://zoom.us/j/123456789" 
                              required
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground">
                            Enter the URL where participants will join the virtual camp.
                          </p>
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
                            <FormLabel>Street Address <span className="text-red-500">*</span></FormLabel>
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
                              <FormLabel>City <span className="text-red-500">*</span></FormLabel>
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
                              <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="CA" maxLength={2} />
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
                              <FormLabel>ZIP Code <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="12345"
                                  pattern="\d{5}(-\d{4})?"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="additionalLocationDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Location Information</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Any additional details about the location"
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentTab("schedule");
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        const isVirtual = form.getValues("isVirtual");
                        let isValid;
                        
                        if (isVirtual) {
                          // If virtual, only validate virtual meeting URL
                          isValid = await form.trigger(["virtualMeetingUrl"]);
                        } else {
                          // If physical, validate physical location fields
                          isValid = await form.trigger([
                            "streetAddress",
                            "city",
                            "state",
                            "zipCode",
                          ]);
                        }
                        
                        if (isValid) {
                          setCurrentTab("settings");
                        }
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-0">
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
                            <option value="one_on_one">One-on-One</option>
                            <option value="team">Team</option>
                            <option value="virtual">Virtual</option>
                          </select>
                        </FormControl>
                        <FormMessage />
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
                            <option value="private">Private</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="waitlistEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Enable waitlist when camp is full
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repeatType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Schedule</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="none">No Repeat</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("repeatType") !== "none" && (
                    <FormField
                      control={form.control}
                      name="repeatCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Number of{" "}
                            {form.watch("repeatType") === "weekly"
                              ? "Weeks"
                              : "Months"}{" "}
                            to Repeat
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? 0
                                    : parseInt(e.target.value),
                                )
                              }
                              min={0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="border-t pt-4 mt-6 mb-4">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <FileText className="mr-2 h-5 w-5" /> 
                      Document Agreements
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select a document that participants must sign when registering for this camp.
                    </p>
                    
                    {/* We use the isNewCamp flag to prevent API calls and store the selection */}
                    <DocumentAgreementsSelector 
                      campId={tempCampId}
                      isNewCamp={true}
                      onDocumentSelect={setSelectedDocumentId}
                    />
                  </div>
                  
                  <div className="border-t pt-4 mt-6 mb-4">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <Layers className="mr-2 h-5 w-5" /> 
                      Registration Custom Fields
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add custom fields for participants to fill out during registration.
                    </p>
                    
                    {user?.organizationId && (
                      <div>
                        <div className="mb-4">
                          <AddCampCustomFieldButtonDialog
                            organizationId={user.organizationId}
                            onFieldSelected={handleAddCustomField}
                            variant="outline"
                            label="Add Custom Registration Field"
                            size="default"
                          />
                        </div>
                        
                        {selectedCustomFields.length > 0 ? (
                          <div className="space-y-2 mt-4">
                            <h4 className="text-sm font-medium">Selected Fields:</h4>
                            <div className="grid gap-2">
                              {selectedCustomFields.map((fieldId) => (
                                <div 
                                  key={fieldId} 
                                  className="flex items-center justify-between bg-muted p-2 rounded-md"
                                >
                                  <div className="flex items-center flex-1">
                                    <span className="text-sm">
                                      {customFieldDetails[fieldId]?.label || `Custom Field #${fieldId}`}
                                    </span>
                                    {customFieldDetails[fieldId]?.isInternal && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        Internal
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCustomFields(
                                        selectedCustomFields.filter((id) => id !== fieldId)
                                      );
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No custom fields selected yet. Click the button above to add fields.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentTab("location");
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("Submit button clicked manually");
                        if (!selectedSport) {
                          console.log("Please select a sport");
                          toast({
                            title: "Error",
                            description: "Please select a sport",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        if (!form.watch('defaultStartTime') || !form.watch('defaultEndTime')) {
                          console.log("Please set default start and end times");
                          toast({
                            title: "Error",
                            description: "Please set default start and end times for scheduling",
                            variant: "destructive",
                          });
                          setCurrentTab("schedule");
                          return;
                        }
                        
                        // Get form data
                        const data = form.getValues();
                        console.log("Form data:", data);
                        
                        // Call mutation manually - using empty schedules array
                        // This is just a placeholder since we're now using the enhanced scheduling
                        // The camp creation API still expects a schedules array
                        const defaultStartTime = form.watch('defaultStartTime') || "09:00";
                        const defaultEndTime = form.watch('defaultEndTime') || "17:00";
                        createCampMutation.mutate({ 
                          ...data, 
                          defaultStartTime,
                          defaultEndTime,
                          schedules: [] // We're not using regular schedules anymore
                        });
                      }}
                      disabled={createCampMutation.isPending || submitting} // Disable button while submitting
                    >
                      {createCampMutation.isPending || submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Camp"
                      )}
                    </Button>
                  </div>
                </TabsContent>


              </Tabs>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}