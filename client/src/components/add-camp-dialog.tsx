import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCampSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

// Map sport names to IDs for the API
const SPORT_IDS = {
  "Basketball": 1,
  "Soccer": 2,
  "Baseball": 3,
  "Tennis": 4,
  "Swimming": 5,
  "Football": 6,
  "Volleyball": 7,
  "Track and Field": 8,
  "Golf": 9,
  "Hockey": 10
};
const sportsMap: Record<string, number> = {
  Archery: 1,
  Badminton: 2,
  Baseball: 3,
  Basketball: 4,
  Biathlon: 5,
  Billiards: 6,
  Bobsleigh: 7,
  Bodybuilding: 8,
  Bowling: 9,
  Boxing: 10,
  Canoeing: 11,
  Cheerleading: 12,
  Chess: 13,
  Climbing: 14,
  Cricket: 15,
  CrossFit: 16,
  Curling: 17,
  Cycling: 18,
  Darts: 19,
  Equestrian: 20,
  "Field Hockey": 22,
  "Figure Skating": 23,
  Fishing: 24,
  "Football (American)": 25,
  "Frisbee (Ultimate)": 26,
  Golf: 27,
  Gymnastics: 28,
  Handball: 29,
  "Hockey (Ice)": 30,
  "Hockey (Roller)": 31,
  Judo: 32,
  Karate: 33,
  Kayaking: 34,
  Kickboxing: 35,
  Lacrosse: 36,
  "Mixed Martial Arts (MMA)": 37,
  Motocross: 38,
  Netball: 39,
  Paddleboarding: 40,
  Paintball: 41,
  Parkour: 42,
  Pickleball: 43,
  Powerlifting: 44,
  Racquetball: 45,
  "Rock Climbing": 46,
  Rowing: 47,
  Rugby: 48,
  Running: 49,
  Sailing: 50,
  Skateboarding: 51,
  Skiing: 52,
  Snowboarding: 53,
  Soccer: 54,
  Softball: 55,
  "Speed Skating": 56,
  Squash: 57,
  Surfing: 58,
  Swimming: 59,
  "Table Tennis": 60,
  Taekwondo: 61,
  Tennis: 62,
  "Track and Field": 63,
  Triathlon: 64,
  Volleyball: 65,
  "Water Polo": 66,
  Weightlifting: 67,
  Wrestling: 68,
  Yoga: 69,
  Zumba: 70,
};

const sportsList = [
  "Archery",
  "Badminton",
  "Baseball",
  "Basketball",
  "Biathlon",
  "Billiards",
  "Bobsleigh",
  "Bodybuilding",
  "Bowling",
  "Boxing",
  "Canoeing",
  "Cheerleading",
  "Chess",
  "Climbing",
  "Cricket",
  "CrossFit",
  "Curling",
  "Cycling",
  "Darts",
  "Equestrian",
  "Fencing",
  "Field Hockey",
  "Figure Skating",
  "Fishing",
  "Football (American)",
  "Frisbee (Ultimate)",
  "Golf",
  "Gymnastics",
  "Handball",
  "Hockey (Ice)",
  "Hockey (Roller)",
  "Judo",
  "Karate",
  "Kayaking",
  "Kickboxing",
  "Lacrosse",
  "Mixed Martial Arts (MMA)",
  "Motocross",
  "Netball",
  "Paddleboarding",
  "Paintball",
  "Parkour",
  "Pickleball",
  "Powerlifting",
  "Racquetball",
  "Rock Climbing",
  "Rowing",
  "Rugby",
  "Running",
  "Sailing",
  "Skateboarding",
  "Skiing",
  "Snowboarding",
  "Soccer",
  "Softball",
  "Speed Skating",
  "Squash",
  "Surfing",
  "Swimming",
  "Table Tennis",
  "Taekwondo",
  "Tennis",
  "Track and Field",
  "Triathlon",
  "Volleyball",
  "Water Polo",
  "Weightlifting",
  "Wrestling",
  "Yoga",
  "Zumba",
].sort();

// Map UI skill levels to schema skill levels
const skillLevelMap: Record<string, string> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
  "All Levels": "beginner", // Default to beginner for "All Levels"
};

const skillLevels = ["Beginner", "Intermediate", "Advanced", "All Levels"];

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
  const [selectedSport, setSelectedSport] = React.useState<string | null>(null);
  const [skillLevel, setSkillLevel] = React.useState("Beginner");
  const [openSportCombobox, setOpenSportCombobox] = React.useState(false);
  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [currentTab, setCurrentTab] = React.useState("basic");
  const [submitting, setSubmitting] = React.useState(false); // Added for loading state

  // Get default dates
  const today = new Date();
  const regStart = new Date(today);
  const regEnd = new Date(today);
  regEnd.setDate(regEnd.getDate() + 30); // Registration ends in 30 days
  const campStart = new Date(regEnd);
  campStart.setDate(campStart.getDate() + 1); // Camp starts day after registration ends
  const campEnd = new Date(campStart);
  campEnd.setDate(campEnd.getDate() + 7); // Camp runs for 7 days by default

  const form = useForm<z.infer<typeof insertCampSchema>>({
    resolver: zodResolver(insertCampSchema),
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
      registrationStartDate: regStart.toISOString().split("T")[0],
      registrationEndDate: regEnd.toISOString().split("T")[0],
      startDate: campStart.toISOString().split("T")[0],
      endDate: campEnd.toISOString().split("T")[0],
      schedules: [],
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCampSchema>) => {
      setSubmitting(true); // Set submitting to true before API call
      if (!user?.organizationId) {
        throw new Error("Organization ID required");
      }

      if (!selectedSport) {
        throw new Error("Sport selection is required");
      }

      const sportId = sportsMap[selectedSport] || 1;
      const mappedSkillLevel = skillLevelMap[skillLevel] || "beginner";


      const requestData = {
        ...data,
        startDate: formatDateForPostgres(data.startDate),
        endDate: formatDateForPostgres(data.endDate),
        registrationStartDate: formatDateForPostgres(data.registrationStartDate),
        registrationEndDate: formatDateForPostgres(data.registrationEndDate),
        organizationId: user.organizationId,
        price: Number(data.price) || 0,
        capacity: Number(data.capacity) || 20,
        minAge: Number(data.minAge) || 5,
        maxAge: Number(data.maxAge) || 18,
        repeatCount: Number(data.repeatCount) || 0,
        sportId: 1, // Fixed ID for Basketball based on DB schema
        skillLevel: mappedSkillLevel,
        schedules: schedules.map(schedule => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime.padStart(5, '0'),
          endTime: schedule.endTime.padStart(5, '0')
        }))
      };

      console.log("Creating camp with data:", JSON.stringify(requestData, null, 2));

      try {
        const response = await apiRequest("POST", "/api/camps", requestData);
        console.log("Camp created successfully:", response);
        return response;
      } catch (error: any) {
        console.error("Camp creation error:", error);
        throw error;
      } finally {
        setSubmitting(false); // Set submitting to false after API call, regardless of success or failure
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      onOpenChange(false);
      form.reset();
      setSchedules([]);
      setSelectedSport(null);
      setSkillLevel("Beginner");
      toast({
        title: "Success",
        description: "Camp created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Camp creation error:", error);
      let errorMessage = "Failed to create camp";

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        Object.keys(validationErrors).forEach((field) => {
          form.setError(field as any, {
            type: "manual",
            message: validationErrors[field].join(", "),
          });
        });
        errorMessage = "Please correct the highlighted fields";
      } else if (error.message) {
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

  const onSubmit = async (data: z.infer<typeof insertCampSchema>) => {
    if (!selectedSport) {
      toast({
        title: "Error",
        description: "Please select a sport",
        variant: "destructive",
      });
      setCurrentTab("basic");
      return;
    }

    if (schedules.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one schedule",
        variant: "destructive",
      });
      setCurrentTab("settings");
      return;
    }

    // Enhanced schedule validation
    for (const schedule of schedules) {
      if (!schedule.startTime || !schedule.endTime) {
        toast({
          title: "Error",
          description: "Schedule times cannot be empty",
          variant: "destructive",
        });
        setCurrentTab("settings");
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
        setCurrentTab("settings");
        return;
      }

      if (end <= start) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        setCurrentTab("settings");
        return;
      }
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

    console.log("Submitting form with data:", { 
      ...data, 
      schedules,
      sportId: sportsMap[selectedSport],
      skillLevel: skillLevelMap[skillLevel] 
    });

    createCampMutation.mutate({ ...data, schedules });
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
                          <option key={sport} value={sport}>
                            {sport}
                          </option>
                        ))}
                      </select>
                      {selectedSport && (
                        <div className="mt-1 text-sm text-green-600">
                          Selected: {selectedSport}
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
                        {skillLevels.map((level) => (
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Camp Start Date</FormLabel>
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
                          <FormLabel>Camp End Date</FormLabel>
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
                      name="minAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : 5,
                                )
                              }
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
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : 18,
                                )
                              }
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
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : 0,
                                )
                              }
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
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : 20,
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Camp Schedule</h3>
                      <Button type="button" onClick={addSchedule} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Schedule
                      </Button>
                    </div>

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
                              {daysOfWeek.map((day, i) => (
                                <option key={i} value={i}>
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

                    {schedules.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No schedules added. Click "Add Schedule" to create camp schedules.
                      </div>
                    )}
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
                        if (schedules.length > 0) {
                          setCurrentTab("location");
                        } else {
                          toast({
                            title: "Warning",
                            description: "Please add at least one schedule.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-0">
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
                        const isValid = await form.trigger([
                          "streetAddress",
                          "city",
                          "state",
                          "zipCode",
                        ]);
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
                      type="submit"
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