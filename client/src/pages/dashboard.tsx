import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Settings,
  Users,
  BarChart3,
  Calendar,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { insertCampSchema, insertInvitationSchema, type Camp } from "@shared/schema";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

type DayOfWeek = typeof DAYS_OF_WEEK[number];
type RepeatType = typeof REPEAT_OPTIONS[number]['value'];

export function SideNavigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user?.organizationId) return null;

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Sports Camp Manager</h2>
      </div>
      <nav className="p-4 space-y-2">
        <Link href="/dashboard">
          <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
            location === '/dashboard' ? 'bg-gray-100' : ''
          }`}>
            <Calendar className="h-5 w-5" />
            <span>Camps</span>
          </a>
        </Link>
        <Link href="/dashboard/reports">
          <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
            location === '/dashboard/reports' ? 'bg-gray-100' : ''
          }`}>
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
          </a>
        </Link>
        <Link href="/dashboard/team">
          <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
            location === '/dashboard/team' ? 'bg-gray-100' : ''
          }`}>
            <Users className="h-5 w-5" />
            <span>Team</span>
          </a>
        </Link>
        <Link href="/dashboard/settings">
          <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
            location === '/dashboard/settings' ? 'bg-gray-100' : ''
          }`}>
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </a>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </nav>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SideNavigation />
      <div className="pl-64">
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function CampsDashboard() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { data: camps, isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Camps</h1>
        <Button onClick={() => setShowAddCampDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Camp
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !camps || camps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No camps created yet</p>
            <Button onClick={() => setShowAddCampDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first camp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {camps.map((camp) => (
            <Card key={camp.id}>
              <CardHeader>
                <CardTitle>{camp.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                      {camp.visibility}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Registration: {new Date(camp.registrationStartDate).toLocaleDateString()} - {new Date(camp.registrationEndDate).toLocaleDateString()}</p>
                    <p>Camp: {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddCampDialog && (
        <AddCampDialog
          open={showAddCampDialog}
          onOpenChange={setShowAddCampDialog}
        />
      )}
    </div>
  );
}

function Dashboard() {
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

  return (
    <DashboardLayout>
      {user.role === "camp_creator" && <CampsDashboard />}
    </DashboardLayout>
  );
}

export default Dashboard;

function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = React.useState<DayOfWeek[]>([]);
  const [selectedSports, setSelectedSports] = React.useState<Array<{ sportId: number; skillLevel: string }>>([]);
  const [daySchedules, setDaySchedules] = React.useState<Record<DayOfWeek, { startTime: string; endTime: string }>>({});

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

  const handleDaySelection = (day: DayOfWeek, checked: boolean) => {
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertInvitationSchema>) => {
      if (!user?.organizationId) {
        throw new Error("No organization ID found");
      }

      const formattedData = {
        ...data,
        organizationId: user.organizationId,
        expiresAt: new Date(data.expiresAt),
      };

      const res = await apiRequest(
        "POST",
        `/api/organizations/${user.organizationId}/invitations`,
        formattedData
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      return await res.json();
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

  const onSubmit = (data: z.infer<typeof insertInvitationSchema>) => {
    inviteMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Invite Team Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <option value="coach">Coach</option>
                      <option value="manager">Manager</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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

function ResendButton({ invitation, organizationId }: { invitation: any; organizationId: number }){
  const { toast } = useToast();

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/organizations/${organizationId}/invitations`,
        {
          email: invitation.email,
          role: invitation.role,
          organizationId: organizationId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend invitation");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({title: "Success",
        description: "Invitation resentsuccessfully",
      });
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
    <Button
      variant="outline"
      size="sm"
      onClick={() => resendMutation.mutate()}
      disabled={resendMutation.isPending}
    >
      {resendMutation.isPending ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Resending...
        </>
      ) : (
        'Resend'
      )}
    </Button>
  );
}

function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);

  const { data: invitations } = useQuery<{ id: number; email: string; role: string; expiresAt: Date }[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
    enabled: !!user?.organizationId,
  });

  return (
    <DashboardLayout>
      <div className="grid gap-6">
        <CampsDashboard/>
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-500">Manage your organization's team members and settings.</p>
              {invitations && invitations.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="text-sm">
                          {invitation.email} - {invitation.role}
                        </div>
                        <ResendButton
                          invitation={invitation}
                          organizationId={user?.organizationId || 0}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export { DashboardLayout, InviteMemberDialog, ResendButton };
export default Dashboard;