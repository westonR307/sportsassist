import React, { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { BasicInfoMetaFields, BasicInfoMetaFieldsRef } from "@/components/custom-fields/basic-info-meta-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2, Calendar, MapPin, DollarSign, Dumbbell, Plus, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Camp } from "@shared/schema";
import { sportsMap, sportsList, skillLevelNames } from "@shared/sports-utils";
import { DocumentAgreementsSelector } from "./document-agreements-selector";
import CampStaffSelector from "./camp-staff-selector";

// Define a type for the form values explicitly
type CampDates = {
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
};

// Define the form schema for editing a camp
const editCampSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  type: z.enum(["one_on_one", "group", "team", "virtual"]),
  visibility: z.enum(["public", "private"]),
  isVirtual: z.boolean().optional().default(false),
  virtualMeetingUrl: z.union([
    z.string().url("Please enter a valid URL"),
    z.string().length(0),
    z.literal("")
  ]).optional(),
});

type FormValues = z.infer<typeof editCampSchema>;

interface EditCampDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp: Camp;
}

export function EditCampDialog({ open, onOpenChange, camp }: EditCampDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("basic");
  
  // For sport and skill level management
  const [selectedSport, setSelectedSport] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("beginner");
  
  // Create a ref for the BasicInfoMetaFields component
  const metaFieldsRef = useRef<BasicInfoMetaFieldsRef>(null);
  
  // Fetch camp sports data
  const { data: campSports, isLoading: isLoadingSports, error: sportsError } = useQuery({
    queryKey: [`/api/camps/${camp.id}/sports`],
    enabled: open, // Only fetch when dialog is open
  });
  
  // Debug logs
  React.useEffect(() => {
    console.log("Edit Camp Dialog - Camp Sports Data:", campSports);
    console.log("Edit Camp Dialog - Is Loading Sports:", isLoadingSports);
    console.log("Edit Camp Dialog - Sports Error:", sportsError);
    console.log("Edit Camp Dialog - Sports List:", sportsList);
  }, [campSports, isLoadingSports, sportsError]);

  // Format date string to YYYY-MM-DD for input[type=date]
  const formatDateForInput = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Form setup with default values from the existing camp
  const form = useForm<FormValues>({
    resolver: zodResolver(editCampSchema),
    defaultValues: {
      name: camp.name,
      description: camp.description,
      startDate: formatDateForInput(camp.startDate),
      endDate: formatDateForInput(camp.endDate),
      registrationStartDate: formatDateForInput(camp.registrationStartDate),
      registrationEndDate: formatDateForInput(camp.registrationEndDate),
      streetAddress: camp.streetAddress,
      city: camp.city,
      state: camp.state,
      zipCode: camp.zipCode,
      price: camp.price,
      capacity: camp.capacity,
      type: camp.type,
      visibility: camp.visibility,
      isVirtual: camp.isVirtual || false,
      virtualMeetingUrl: camp.virtualMeetingUrl || "",
    },
  });

  // Mutation for updating a camp
  const updateCampMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      try {
        // Convert date strings to proper ISO format
        const formattedValues = {
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
          registrationStartDate: new Date(values.registrationStartDate).toISOString(),
          registrationEndDate: new Date(values.registrationEndDate).toISOString(),
        };
        
        // Handle virtual camps - clear location fields if it's a virtual camp
        if (values.isVirtual) {
          // For virtual camps, set empty values for physical location fields
          formattedValues.streetAddress = "";
          formattedValues.city = "";
          formattedValues.state = "";
          formattedValues.zipCode = "";
          
          // Ensure virtual meeting URL is set
          if (!formattedValues.virtualMeetingUrl) {
            formattedValues.virtualMeetingUrl = "https://meet.google.com/example";
          } else if (!formattedValues.virtualMeetingUrl.startsWith('http')) {
            // URL doesn't start with http/https, prepend https://
            formattedValues.virtualMeetingUrl = `https://${formattedValues.virtualMeetingUrl}`;
          }
        } else {
          // For in-person camps, clear the virtual meeting URL
          formattedValues.virtualMeetingUrl = "";
          
          // Validate location fields
          if (!formattedValues.streetAddress || !formattedValues.city || 
              !formattedValues.state || !formattedValues.zipCode) {
            throw new Error("Location fields are required for in-person camps");
          }
        }

        console.log("Making PATCH request with values:", formattedValues);
        // The apiRequest function automatically parses JSON responses
        const responseData = await apiRequest("PATCH", `/api/camps/${camp.id}`, formattedValues);
        console.log("Successfully updated camp with response:", responseData);
        return responseData;
      } catch (err: any) {
        console.error("Error in camp update mutation:", err);
        throw new Error(err?.message || "Failed to update camp");
      }
    },
    onSuccess: (data) => {
      console.log("Mutation success with data:", data);
      
      // Show success message
      toast({
        title: "Camp updated",
        description: "Your camp has been updated successfully.",
      });
      
      // Invalidate the camps queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${camp.id}`] });
      
      // Close the dialog
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      
      // Show error message
      toast({
        title: "Failed to update camp",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    // First save the meta fields if any are present
    console.log("Saving meta fields before camp update...");
    if (metaFieldsRef.current) {
      try {
        const metaFieldsSaved = await metaFieldsRef.current.saveFieldsIfNeeded();
        console.log("Meta fields save result:", metaFieldsSaved);
      } catch (error) {
        console.error("Error saving meta fields:", error);
        toast({
          title: "Warning",
          description: "There was an issue saving some custom fields",
          variant: "destructive",
        });
      }
    }
    
    // Now update the camp itself
    updateCampMutation.mutate(values);
  };

  // Function to handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Camp</DialogTitle>
          <DialogDescription>
            Update the details of your camp
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="basic">
                  <Calendar className="h-4 w-4 mr-2" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="location">
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </TabsTrigger>
                <TabsTrigger value="details">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="sports">
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Sports
                </TabsTrigger>
                <TabsTrigger value="agreements">
                  <FileText className="h-4 w-4 mr-2" />
                  Agreements
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Camp Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="registrationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Camp staff management */}
                <div className="mt-8 border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Camp Staff</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign coaches and staff members to this camp.
                  </p>
                  <CampStaffSelector 
                    campId={camp.id}
                    organizationId={camp.organizationId}
                  />
                </div>

                {/* Custom fields for basic information */}
                <div className="mt-8 border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Additional Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add custom fields to provide more details about your camp.
                  </p>
                  <BasicInfoMetaFields 
                    ref={metaFieldsRef}
                    campId={camp.id} 
                    organizationId={camp.organizationId}
                  />
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <FormField
                  control={form.control}
                  name="isVirtual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked: boolean) => {
                            field.onChange(checked);
                            // Clear location errors when virtual camp is selected
                            if (checked) {
                              form.clearErrors("streetAddress");
                              form.clearErrors("city");
                              form.clearErrors("state");
                              form.clearErrors("zipCode");
                            }
                          }}
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
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
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
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Type</FormLabel>
                        <FormControl>
                          <select
                            className={cn(
                              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            )}
                            {...field}
                          >
                            <option value="one_on_one">One-on-One</option>
                            <option value="group">Group</option>
                            <option value="team">Team</option>
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
                            className={cn(
                              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            )}
                            {...field}
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sports" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Camp Sports</h3>
                  
                  {/* Current sports list */}
                  <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                    <h4 className="text-sm font-medium mb-2">Current Sports</h4>
                    {Array.isArray(campSports) && campSports.length > 0 ? (
                      <div className="space-y-2">
                        {campSports.map((sport: any) => (
                          <div key={sport.id} className="flex items-center justify-between bg-card p-2 rounded-md">
                            <div>
                              <span className="font-semibold">{sportsList.find(s => s.id === sport.sportId)?.name}</span>
                              <span className="text-muted-foreground ml-2">({skillLevelNames[sport.skillLevel]})</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={async () => {
                                try {
                                  await apiRequest(
                                    "DELETE", 
                                    `/api/camps/${camp.id}/sports/${sport.id}`
                                  );
                                  
                                  // Show success message
                                  toast({
                                    title: "Sport removed",
                                    description: "The sport has been removed from this camp",
                                  });
                                  
                                  // Refresh camp sports data
                                  queryClient.invalidateQueries({ 
                                    queryKey: [`/api/camps/${camp.id}/sports`]
                                  });
                                  
                                  // Refresh camps list to update the UI
                                  queryClient.invalidateQueries({ 
                                    queryKey: ["/api/camps"] 
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Failed to remove sport",
                                    description: "There was an error removing the sport from this camp",
                                    variant: "destructive",
                                  });
                                  console.error("Error removing sport:", error);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No sports added yet</p>
                    )}
                  </div>
                  
                  {/* Add new sport form */}
                  <div className="border rounded-md p-4 space-y-3">
                    <h4 className="text-sm font-medium">Add Sport</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Sport selection */}
                      <div className="space-y-1">
                        <Label htmlFor="sport-select">Sport</Label>
                        <select
                          id="sport-select"
                          value={selectedSport}
                          onChange={(e) => setSelectedSport(e.target.value)}
                          className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          )}
                        >
                          <option value="">Select a sport</option>
                          {sportsList.map((sport) => (
                            <option key={sport.id} value={sport.id}>
                              {sport.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Skill level selection */}
                      <div className="space-y-1">
                        <Label htmlFor="skill-level-select">Skill Level</Label>
                        <select
                          id="skill-level-select"
                          value={skillLevel}
                          onChange={(e) => setSkillLevel(e.target.value)}
                          className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          )}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="all_levels">All Skill Levels</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Add button */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!selectedSport) {
                          toast({
                            title: "Sport selection required",
                            description: "Please select a sport to add",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          const response = await apiRequest(
                            "POST", 
                            `/api/camps/${camp.id}/sports`,
                            {
                              sportId: parseInt(selectedSport),
                              skillLevel
                            }
                          );
                          
                          // Show success message
                          toast({
                            title: "Sport added",
                            description: "The sport has been added to this camp",
                          });
                          
                          // Reset form
                          setSelectedSport("");
                          
                          // Refresh camp sports data
                          queryClient.invalidateQueries({ 
                            queryKey: [`/api/camps/${camp.id}/sports`]
                          });
                          
                          // Refresh camps list to update the UI
                          queryClient.invalidateQueries({ 
                            queryKey: ["/api/camps"] 
                          });
                        } catch (error) {
                          toast({
                            title: "Failed to add sport",
                            description: "There was an error adding the sport to this camp",
                            variant: "destructive",
                          });
                          console.error("Error adding sport:", error);
                        }
                      }}
                      disabled={!selectedSport}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sport
                    </Button>
                  </div>
                </div>
              </TabsContent>


              
              <TabsContent value="agreements" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Camp Agreements</h3>
                  
                  {/* List of documents that can be used as agreements */}
                  <div className="border rounded-md p-4 bg-muted/30 space-y-4">
                    <h4 className="text-sm font-medium">Select a Document as Agreement</h4>
                    
                    <DocumentAgreementsSelector campId={camp.id} />
                  </div>
                  
                  <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    <p>
                      <strong>Note:</strong> Selected agreement documents will be sent to parents/athletes 
                      when they register for this camp. They will be required to sign the agreement 
                      before their registration is complete.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCampMutation.isPending}
              >
                {updateCampMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
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