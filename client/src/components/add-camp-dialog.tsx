import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertCampSchema, type Camp } from "@shared/schema";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type DayOfWeek = typeof DAYS_OF_WEEK[number];
type SkillLevel = "beginner" | "intermediate" | "advanced";

interface SportSelection {
  sportId: number;
  skillLevel: SkillLevel;
}

interface AddCampDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCampDialog({ open, onOpenChange }: AddCampDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = React.useState<DayOfWeek[]>([]);
  const [selectedSports, setSelectedSports] = React.useState<SportSelection[]>([]);
  const [daySchedules, setDaySchedules] = React.useState<Record<DayOfWeek, { startTime: string; endTime: string }>>({
    Sunday: { startTime: "09:00", endTime: "17:00" },
    Monday: { startTime: "09:00", endTime: "17:00" },
    Tuesday: { startTime: "09:00", endTime: "17:00" },
    Wednesday: { startTime: "09:00", endTime: "17:00" },
    Thursday: { startTime: "09:00", endTime: "17:00" },
    Friday: { startTime: "09:00", endTime: "17:00" },
    Saturday: { startTime: "09:00", endTime: "17:00" },
  });

  const { data: sports } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/sports"],
  });

  const { data: organizationStaff } = useQuery<{ id: number; username: string; role: string }[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/staff`],
    enabled: !!user?.organizationId,
  });

  const form = useForm<z.infer<typeof insertCampSchema>>({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      type: "group",
      visibility: "public",
      price: 0,
      capacity: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      registrationStartDate: new Date().toISOString().split("T")[0],
      registrationEndDate: new Date().toISOString().split("T")[0],
      waitlistEnabled: true,
      minAge: 5,
      maxAge: 18,
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCampSchema>) => {
      if (!user?.organizationId) {
        throw new Error("Organization ID required");
      }

      const campData = {
        ...data,
        organizationId: user.organizationId,
        createdById: user.id,
        sports: selectedSports,
        schedules: selectedDays.map(day => ({
          dayOfWeek: DAYS_OF_WEEK.indexOf(day),
          startTime: daySchedules[day].startTime,
          endTime: daySchedules[day].endTime,
        })),
      };

      return await apiRequest("POST", "/api/camps", campData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      toast({
        title: "Success",
        description: "Camp created successfully",
      });
      form.reset();
      setSelectedDays([]);
      setSelectedSports([]);
      setDaySchedules({
        Sunday: { startTime: "09:00", endTime: "17:00" },
        Monday: { startTime: "09:00", endTime: "17:00" },
        Tuesday: { startTime: "09:00", endTime: "17:00" },
        Wednesday: { startTime: "09:00", endTime: "17:00" },
        Thursday: { startTime: "09:00", endTime: "17:00" },
        Friday: { startTime: "09:00", endTime: "17:00" },
        Saturday: { startTime: "09:00", endTime: "17:00" },
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertCampSchema>) => {
    createCampMutation.mutate(data);
  };

  const handleDaySelection = (day: DayOfWeek, checked: boolean) => {
    if (checked) {
      setSelectedDays(prev => [...prev, day]);
    } else {
      setSelectedDays(prev => prev.filter(d => d !== day));
    }
  };

  const updateDaySchedule = (day: DayOfWeek, field: "startTime" | "endTime", value: string) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSportSelection = (sportId: number, checked: boolean) => {
    if (checked) {
      setSelectedSports(prev => [...prev, { sportId, skillLevel: "beginner" }]);
    } else {
      setSelectedSports(prev => prev.filter(s => s.sportId !== sportId));
    }
  };

  const handleSkillLevelChange = (sportId: number, skillLevel: SkillLevel) => {
    setSelectedSports(prev =>
      prev.map(sport =>
        sport.sportId === sportId ? { ...sport, skillLevel } : sport
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-none bg-background z-10 pb-4 border-b">
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
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
                        <textarea
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[100px]"
                          placeholder="Enter camp description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter street address" />
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
                          <Input {...field} placeholder="Enter city" />
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
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12345" pattern="\d{5}(-\d{4})?" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Date fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="registrationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
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
                        <FormLabel>Registration End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
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
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Add waitlist option */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Registration Options</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="waitlistEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Enable waitlist when camp is full</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (number of athletes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            min={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (in dollars)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value?.toString() ?? "0"}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            min={0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Age Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Age Range</h3>
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            min={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>


              {/* Sports Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sports</h3>
                <div className="grid gap-4">
                  {sports?.map((sport) => (
                    <div key={sport.id} className="space-y-2 border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSports.some(s => s.sportId === sport.id)}
                          onChange={(e) => handleSportSelection(sport.id, e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{sport.name}</span>
                      </div>
                      {selectedSports.some(s => s.sportId === sport.id) && (
                        <div>
                          <FormLabel className="text-xs">Skill Level</FormLabel>
                          <select
                            value={selectedSports.find(s => s.sportId === sport.id)?.skillLevel}
                            onChange={(e) => handleSkillLevelChange(sport.id, e.target.value as SkillLevel)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Weekly Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="space-y-2 border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(day)}
                          onChange={(e) => handleDaySelection(day, e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{day}</span>
                      </div>
                      {selectedDays.includes(day) && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <FormLabel className="text-xs">Start Time</FormLabel>
                            <Input
                              type="time"
                              value={daySchedules[day]?.startTime || "09:00"}
                              onChange={(e) => updateDaySchedule(day, "startTime", e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <Input
                              type="time"
                              value={daySchedules[day]?.endTime || "17:00"}
                              onChange={(e) => updateDaySchedule(day, "endTime", e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={createCampMutation.isPending}
              >
                {createCampMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Camp"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}