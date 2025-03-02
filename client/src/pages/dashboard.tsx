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
import { insertInvitationSchema, insertCampSchema } from "@shared/schema";
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

function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [selectedSports, setSelectedSports] = React.useState<Array<{ sportId: number, skillLevel: string }>>([]);

  const { data: sports } = useQuery({
    queryKey: ["/api/sports"],
  });

  const form = useForm({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: new Date(),
      endDate: new Date(),
      price: 0,
      capacity: 10,
      waitlistEnabled: true,
      type: "group",
      visibility: "public",
      organizationId: user?.organizationId || 0,
      sports: [],
      schedules: [],
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCampSchema>) => {
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        sports: selectedSports,
        schedules: selectedDays.map(day => ({
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
        })),
      };
      const res = await apiRequest("POST", "/api/camps", formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create camp");
      }
      return res.json();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createCampMutation.mutate(data))} className="space-y-4">
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} 
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        onChange={e => field.onChange(e.target.value)} />
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
                      <Input type="date" {...field} 
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        onChange={e => field.onChange(e.target.value)} />
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
                    <FormLabel>Price (in cents)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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

            {/* Schedule Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Schedule</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDays([...selectedDays, day]);
                        } else {
                          setSelectedDays(selectedDays.filter(d => d !== day));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span>{day}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel>Start Time</FormLabel>
                  <Input
                    type="time"
                    defaultValue="09:00"
                    onChange={(e) => {
                      // Update start time in schedules
                    }}
                  />
                </div>
                <div>
                  <FormLabel>End Time</FormLabel>
                  <Input
                    type="time"
                    defaultValue="17:00"
                    onChange={(e) => {
                      // Update end time in schedules
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sports Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sports</h3>
              {sports?.map((sport: any) => (
                <div key={sport.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSports.some(s => s.sportId === sport.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSports([...selectedSports, { sportId: sport.id, skillLevel: "beginner" }]);
                        } else {
                          setSelectedSports(selectedSports.filter(s => s.sportId !== sport.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span>{sport.name}</span>
                  </div>
                  {selectedSports.some(s => s.sportId === sport.id) && (
                    <select
                      value={selectedSports.find(s => s.sportId === sport.id)?.skillLevel}
                      onChange={(e) => {
                        const newSports = selectedSports.map(s =>
                          s.sportId === sport.id
                            ? { ...s, skillLevel: e.target.value }
                            : s
                        );
                        setSelectedSports(newSports);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  )}
                </div>
              ))}
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
              {createCampMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
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
        <Button variant="outline">
          Manage Team
        </Button>
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
            <Button 
              type="submit" 
              className="w-full"
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
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
                <p className="text-gray-500">
                  Manage your organization's team members and settings.
                </p>
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

      {showAddCampDialog && (
        <AddCampDialog open={showAddCampDialog} onOpenChange={setShowAddCampDialog} />
      )}
    </div>
  );
}

export default Dashboard;