import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertCampSchema,
  type InsertInvitation,
  type Camp,
  type Invitation,
  insertInvitationSchema,
} from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { and, inArray } from "drizzle-orm";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const REPEAT_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Repeats weekly" },
  { value: "monthly", label: "Repeats monthly" },
] as const;

function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [selectedSports, setSelectedSports] = React.useState<Array<{ sportId: number; skillLevel: string }>>([]);
  const [daySchedules, setDaySchedules] = React.useState<Record<string, { startTime: string; endTime: string }>>({});

  const { data: sports } = useQuery({
    queryKey: ["/api/sports"],
  });

  const { data: organizationStaff } = useQuery({
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
      type: "group" as const,
      visibility: "public" as const,
      price: null,
      capacity: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      registrationStartDate: new Date().toISOString().split("T")[0],
      registrationEndDate: new Date().toISOString().split("T")[0],
      waitlistEnabled: true,
      repeatType: "none" as const,
      coachId: undefined,
      assistantId: undefined,
    },
  });

  const handleDaySelection = (day: string, checked: boolean) => {
    if (checked) {
      setSelectedDays(prev => [...prev, day]);
      setDaySchedules(prev => ({
        ...prev,
        [day]: { startTime: "09:00", endTime: "17:00" },
      }));
    } else {
      setSelectedDays(prev => prev.filter(d => d !== day));
      setDaySchedules(prev => {
        const newSchedules = { ...prev };
        delete newSchedules[day];
        return newSchedules;
      });
    }
  };

  const updateDaySchedule = (day: string, field: "startTime" | "endTime", value: string) => {
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

  const handleSkillLevelChange = (sportId: number, skillLevel: string) => {
    setSelectedSports(prev =>
      prev.map(sport =>
        sport.sportId === sportId ? { ...sport, skillLevel } : sport
      )
    );
  };

  const createCampMutation = useMutation({
    mutationFn: async (campData: z.infer<typeof insertCampSchema>) => {
      console.log("Starting mutation with data:", campData);
      const response = await apiRequest("POST", "/api/camps", campData);

      if (!response.ok) {
        const error = await response.json();
        console.error("API error:", error);
        throw new Error(error.message || "Failed to create camp");
      }

      return await response.json();
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
      setDaySchedules({});
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create camp",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submission started");

    const formData = form.getValues();
    console.log("Form data:", formData);

    if (!user?.organizationId || !user?.id) {
      toast({
        title: "Error",
        description: "Organization ID and user ID are required",
        variant: "destructive",
      });
      return;
    }


    if (selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day for the camp schedule",
        variant: "destructive",
      });
      return;
    }

    if (selectedSports.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one sport",
        variant: "destructive",
      });
      return;
    }

    const campData = {
      name: formData.name,
      description: formData.description,
      streetAddress: formData.streetAddress,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      startDate: formData.startDate,
      endDate: formData.endDate,
      registrationStartDate: formData.registrationStartDate,
      registrationEndDate: formData.registrationEndDate,
      price: formData.price ? Number(formData.price) * 100 : 0,
      capacity: formData.capacity,
      type: formData.type || "group",
      visibility: formData.visibility || "public",
      waitlistEnabled: formData.waitlistEnabled,
      organizationId: user.organizationId,
      createdById: user.id,
      sports: selectedSports,
      schedules: selectedDays.map(day => ({
        dayOfWeek: DAYS_OF_WEEK.indexOf(day),
        startTime: daySchedules[day].startTime,
        endTime: daySchedules[day].endTime,
      })),
      repeatType: formData.repeatType || "none",
      coachId: formData.coachId,
      assistantId: formData.assistantId,
    };

    console.log("Submitting camp data:", campData);

    try {
      await createCampMutation.mutateAsync(campData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-none bg-background z-10 pb-4 border-b">
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Location Details</h3>
                    <div className="grid grid-cols-1 gap-4">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  </div>
                </div>

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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Repeat Schedule</h3>
                <FormField
                  control={form.control}
                  name="repeatType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          {REPEAT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Camp Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Registration Period</h3>
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
                            min={new Date().toISOString().split("T")[0]}
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
                            min={form.watch("registrationStartDate")}
                            max={form.watch("startDate")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>


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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sports</h3>
                <div className="grid gap-4">
                  {sports?.map((sport: any) => (
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
                            onChange={(e) => handleSkillLevelChange(sport.id, e.target.value)}
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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Staff Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="coachId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coach</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          >
                            <option value="">Select a coach</option>
                            {organizationStaff?.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.username} ({staff.role})
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
                    name="assistantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assistant</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          >
                            <option value="">Select an assistant</option>
                            {organizationStaff?.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.username} ({staff.role})
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          min={0}
                          step="0.01"
                          placeholder="Enter price"
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
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          min={1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
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
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <FormLabel>Enable Waitlist</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full mb-4"
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

function InviteMemberDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof insertInvitationSchema>>({
    resolver: zodResolver(insertInvitationSchema),
    defaultValues: {
      email: "",
      role: "coach" as const,
      organizationId: user?.organizationId || 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertInvitationSchema>) => {
      const res = await apiRequest("POST", `/api/organizations/${user?.organizationId}/invitations`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}/invitations`] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: z.infer<typeof insertInvitationSchema>) => {
    if (!user?.organizationId) {
      toast({
        title: "Error",
        description: "You must be part of an organization to invite team members",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({
      ...data,
      organizationId: user.organizationId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="Enter email address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="manager">Manager</option>
                      <option value="coach">Coach</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  try {
    const { user } = useAuth();

    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="w-[300px]">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      );
    }

    switch (user.role) {
      case "camp_creator":
        return <CampCreatorDashboard />;
      default:
        return (
          <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Welcome, {user.username}</p>
                  <p className="text-sm text-gray-500 mt-2">Role: {user.role}</p>
                  <p className="mt-4">Dashboard features for {user.role} coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  } catch (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);

  const { data: invitations } = useQuery({
    queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
    enabled: !!user?.organizationId,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Camp Creator Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.username}</p>
            </div>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Camps Management Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Your Camps</CardTitle>
                <Button onClick={() => setShowAddCampDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Camp
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add query for camps */}
                {(() => {
                  const { data: camps, isLoading } = useQuery({
                    queryKey: ["/api/camps"],
                  });

                  if (isLoading) {
                    return (
                      <div className="text-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Loading camps...</p>
                      </div>
                    );
                  }

                  if (!camps || camps.length === 0) {
                    return (
                      <div className="text-center text-gray-500">
                        No camps created yet. Click "Add Camp" to create your first camp.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {camps.map((camp: any) => (
                        <Card key={camp.id} className="flex flex-col">
                          <CardHeader>
                            <CardTitle className="text-lg">{camp.name}</CardTitle>
                            <p className="text-sm text-gray-500">
                              {camp.streetAddress}<br />
                              {camp.city}, {camp.state} {camp.zipCode}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <p className="text-sm">{camp.description}</p>
                              <div className="flex justify-between items-center text-sm">
                                <span>Capacity: {camp.capacity}</span>
                                <span>Price: ${camp.price / 100}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Type: {camp.type}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  camp.visibility === 'public'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {camp.visibility}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                <p>Registration: {new Date(camp.registrationStartDate).toLocaleDateString()} - {new Date(camp.registrationEndDate).toLocaleDateString()}</p>
                                <p>Camp: {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </CardContent>
                          <div className="mt-auto p-4 pt-0 flex justify-end gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Manage</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Organization Management Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Organization</CardTitle>
                <InviteMemberDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-500">Manage your organization's team members and settings.</p>
                {invitations && invitations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Pending Invitations</h3>
                    <div className="space-y-2">
                      {invitations.map((invitation: any) => (
                        <div key={invitation.id} className="text-sm">
                          {invitation.email} - {invitation.role}
                        </div>
                      ))}
                    </div>
                  </div>                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {showAddCampDialog && <AddCampDialog open={showAddCampDialog} onOpenChange={setShowAddCampDialog} />}
    </div>
  );
}

export default Dashboard;