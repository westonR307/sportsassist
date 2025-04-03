import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Calendar, MapPin, DollarSign, Clock, Settings, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Camp, CampSchedule } from "@shared/schema";
import { DAYS_OF_WEEK } from "@/pages/constants";
import { ScheduleCalendar } from "./schedule-calendar";
import { EditCampMetaFields } from "./edit-camp-meta-fields";

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Define the form schema for editing a camp
const editCampSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  type: z.enum(["one_on_one", "group", "team", "virtual"]),
  visibility: z.enum(["public", "private"]),
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
  const [currentTab, setCurrentTab] = React.useState<"details" | "schedule" | "location" | "pricing" | "customFields">("details");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the camp's schedules
  const { data: scheduleData } = useQuery({
    queryKey: ['/api/camps', camp.id, 'schedules'],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/camps/${camp.id}/schedules`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedules');
      }
      return res.json();
    }
  });

  // Initialize schedules state when data is loaded
  useEffect(() => {
    if (scheduleData && scheduleData.schedules) {
      setSchedules(
        scheduleData.schedules.map((schedule: CampSchedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime.substring(0, 5), // Convert from HH:MM:SS to HH:MM
          endTime: schedule.endTime.substring(0, 5),
        }))
      );
      setIsLoading(false);
    }
  }, [scheduleData]);

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
    },
  });

  // Function to format date strings for input fields
  function formatDateForInput(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  }

  // Functions to manage schedules
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

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // First, update the camp details
      const updateCampResponse = await apiRequest("PUT", `/api/camps/${camp.id}`, values);
      const updatedCamp = await updateCampResponse.json();
      
      // Then, update the schedules
      const updateSchedulesResponse = await apiRequest("PUT", `/api/camps/${camp.id}/schedules`, {
        schedules: schedules.map(schedule => ({
          ...schedule,
          campId: camp.id
        }))
      });
      
      return updatedCamp;
    },
    onSuccess: () => {
      toast({
        title: "Camp updated",
        description: "Your camp has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", camp.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", camp.id, "schedules"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update camp: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    console.log("Submitting form with values:", values);
    
    // Schedule validation
    if (schedules.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one schedule",
        variant: "destructive",
      });
      setCurrentTab("schedule");
      return;
    }

    // Validate schedule times
    for (const schedule of schedules) {
      if (!schedule.startTime || !schedule.endTime) {
        toast({
          title: "Error",
          description: "Schedule times cannot be empty",
          variant: "destructive",
        });
        setCurrentTab("schedule");
        return;
      }

      const start = new Date(`1970-01-01T${schedule.startTime}`);
      const end = new Date(`1970-01-01T${schedule.endTime}`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({
          title: "Error",
          description: "Invalid time format",
          variant: "destructive",
        });
        setCurrentTab("schedule");
        return;
      }

      if (end <= start) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        setCurrentTab("schedule");
        return;
      }
    }
    
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Edit Camp
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentTab("schedule")}
                type="button"
              >
                <Clock className="h-4 w-4 mr-1" />
                View Schedule
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Update the information for your camp.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              defaultValue="details"
              value={currentTab}
              onValueChange={(value) => setCurrentTab(value as "details" | "schedule" | "location" | "pricing" | "customFields")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="details"
                  className={cn(
                    "flex items-center gap-2",
                    currentTab === "details" &&
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className={cn(
                    "flex items-center gap-2",
                    currentTab === "schedule" &&
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  )}
                >
                  <Clock className="h-4 w-4" />
                  <span>Schedule</span>
                </TabsTrigger>
                <TabsTrigger
                  value="location"
                  className={cn(
                    "flex items-center gap-2",
                    currentTab === "location" &&
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className={cn(
                    "flex items-center gap-2",
                    currentTab === "pricing" &&
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  )}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Settings</span>
                </TabsTrigger>
                <TabsTrigger
                  value="customFields"
                  className={cn(
                    "flex items-center gap-2",
                    currentTab === "customFields" &&
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Custom Fields</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Camp Schedule</h3>
                    </div>
                    
                    {/* Calendar-based schedule interface */}
                    <ScheduleCalendar
                      startDate={new Date(form.getValues().startDate)}
                      endDate={new Date(form.getValues().endDate)}
                      schedules={schedules.map(s => ({
                        id: Math.floor(Math.random() * 1000000), // Temporary ID for display purposes
                        campId: camp.id,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime + ':00',
                        endTime: s.endTime + ':00'
                      }))}
                      onSchedulesChange={(newSchedules) => {
                        setSchedules(newSchedules.map(s => ({
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime.substring(0, 5),
                          endTime: s.endTime.substring(0, 5)
                        })));
                      }}
                      campId={camp.id}
                    />

                    {/* Legacy schedule interface (as backup) */}
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Manual Schedule Entry</h3>
                        <Button type="button" onClick={addSchedule} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Schedule
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        You can also manually add schedule items below. Changes here will be reflected in the calendar above.
                      </p>

                      {schedules.length === 0 ? (
                        <div className="text-center py-8 border rounded-lg text-muted-foreground">
                          No schedules added yet. Add one using the button above or the calendar.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {schedules.map((schedule, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-4 p-4 border rounded-lg relative"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => removeSchedule(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>

                              <div className="flex-1 space-y-4">
                                <div>
                                  <Label>Day of Week</Label>
                                  <select
                                    value={schedule.dayOfWeek}
                                    onChange={(e) =>
                                      updateSchedule(index, "dayOfWeek", parseInt(e.target.value))
                                    }
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                  >
                                    {DAYS_OF_WEEK.map((day, i) => (
                                      <option key={i} value={i + 1}>
                                        {day}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Start Time</Label>
                                    <Input
                                      type="time"
                                      value={schedule.startTime}
                                      onChange={(e) =>
                                        updateSchedule(index, "startTime", e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label>End Time</Label>
                                    <Input
                                      type="time"
                                      value={schedule.endTime}
                                      onChange={(e) =>
                                        updateSchedule(index, "endTime", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                            <option value="one_on_one">One-on-One</option>
                            <option value="group">Group</option>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
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
              </TabsContent>
              
              <TabsContent value="customFields" className="space-y-4">
                <EditCampMetaFields campId={camp.id} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
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