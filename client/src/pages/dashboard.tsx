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
  insertInvitationSchema,
  type InsertInvitation,
  type Camp,
  type Invitation,
} from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as z from 'zod';

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
  const [repeatType, setRepeatType] = React.useState("none");
  const [repeatDuration, setRepeatDuration] = React.useState(1);
  const [daySchedules, setDaySchedules] = React.useState<Record<string, { startTime: string; endTime: string }>>({});

  const { data: sports } = useQuery({
    queryKey: ["/api/sports"],
  });

  const form = useForm<z.infer<typeof insertCampSchema>>({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      type: "group" as const,
      visibility: "public" as const,
      price: 0,
      capacity: 10,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      waitlistEnabled: true,
      sports: [],
      schedules: [],
    },
  });

  const handleDaySelection = (day: string, checked: boolean) => {
    if (checked) {
      setSelectedDays([...selectedDays, day]);
      setDaySchedules({
        ...daySchedules,
        [day]: { startTime: "09:00", endTime: "17:00" },
      });
    } else {
      setSelectedDays(selectedDays.filter((d) => d !== day));
      const newSchedules = { ...daySchedules };
      delete newSchedules[day];
      setDaySchedules(newSchedules);
    }
  };

  const updateDaySchedule = (day: string, field: "startTime" | "endTime", value: string) => {
    setDaySchedules({
      ...daySchedules,
      [day]: {
        ...daySchedules[day],
        [field]: value,
      },
    });
  };

  const createCampMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating camp with data:", data);
      const res = await apiRequest("POST", "/api/camps", data);
      const responseData = await res.json();
      console.log("API Response:", responseData);
      if (!res.ok) {
        throw new Error(responseData.message || "Failed to create camp");
      }
      return responseData;
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
      console.error("Camp creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create camp",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (formData: z.infer<typeof insertCampSchema>) => {
    try {
      console.log("Form submission started");
      console.log("Form data:", formData);
      console.log("Selected days:", selectedDays);
      console.log("Day schedules:", daySchedules);
      console.log("Selected sports:", selectedSports);

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
        ...formData,
        organizationId: user?.organizationId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        price: Number(formData.price) * 100,
        sports: selectedSports.map(sport => ({
          sportId: sport.sportId,
          skillLevel: sport.skillLevel,
        })),
        schedules: selectedDays.map(day => ({
          dayOfWeek: DAYS_OF_WEEK.indexOf(day),
          startTime: daySchedules[day].startTime,
          endTime: daySchedules[day].endTime,
        })),
      };

      console.log("Submitting camp data:", campData);
      await createCampMutation.mutateAsync(campData);
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please check the console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
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
                          <option value="one_on_one">One on One</option>
                          <option value="group">Group</option>
                          <option value="team">Team</option>
                          <option value="virtual">Virtual</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

            {/* Age Range and Capacity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Age Range and Capacity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ageRangeMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Age</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageRangeMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Age</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} />
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
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Registration Dates */}
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
                      <FormLabel>Registration End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Camp Dates and Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Camp Schedule</h3>

              {/* Camp Start/End Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Repeat Options */}
              <div className="space-y-2">
                <FormLabel>Repeat</FormLabel>
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  {REPEAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {repeatType !== "none" && (
                  <div className="flex items-center gap-2 mt-2">
                    <span>Repeat for</span>
                    <Input
                      type="number"
                      min={1}
                      value={repeatDuration}
                      onChange={(e) => setRepeatDuration(parseInt(e.target.value, 10))}
                      className="w-20"
                    />
                    <span>{repeatType === "weekly" ? "weeks" : "months"}</span>
                  </div>
                )}
              </div>

              {/* Weekly Schedule */}
              <div className="space-y-4">
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
            </div>

            {/* Sports and Skill Levels */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sports</h3>
              {sports?.map((sport: any) => (
                <div key={sport.id} className="space-y-2 border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSports.some((s) => s.sportId === sport.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSports([...selectedSports, { sportId: sport.id, skillLevel: "beginner" }]);
                        } else {
                          setSelectedSports(selectedSports.filter((s) => s.sportId !== sport.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{sport.name}</span>
                  </div>
                  {selectedSports.some((s) => s.sportId === sport.id) && (
                    <div>
                      <FormLabel className="text-xs">Skill Level</FormLabel>
                      <select
                        value={selectedSports.find((s) => s.sportId === sport.id)?.skillLevel}
                        onChange={(e) => {
                          const newSports = selectedSports.map((s) =>
                            s.sportId === sport.id ? { ...s, skillLevel: e.target.value } : s
                          );
                          setSelectedSports(newSports);
                        }}
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

            {/* Price and Settings */}
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
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        min={0}
                        step={1}
                      />
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

            <Button
              type="submit"
              className="w-full"
              disabled={createCampMutation.isPending}
            >
              {createCampMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Camp
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm({
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
      const res = await apiRequest("POST", "/api/invitations", data);
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
          <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
              <div className="text-center text-gray-500">
                No camps created yet. Click "Add Camp" to create your first camp.
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
                  </div>
                )}
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