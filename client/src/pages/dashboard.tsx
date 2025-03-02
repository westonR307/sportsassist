import { DAYS_OF_WEEK } from "./constants";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camp, Child, insertChildSchema, Invitation, insertInvitationSchema, InsertInvitation, Sport, SportLevel, Gender, ContactMethod, insertCampSchema, CampType, CampVisibility } from "@shared/schema";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as z from 'zod';

function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      price: 0,
      capacity: 10,
      waitlistEnabled: true,
      type: "group" as CampType,
      visibility: "public" as CampVisibility,
      organizationId: user?.organizationId,
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

function CampManagementList() {
  const { data: camps, isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!camps?.length) {
    return (
      <div className="text-center p-4 text-gray-500">
        No camps created yet. Click "Add Camp" to create your first camp.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {camps.map((camp) => (
        <CampCard key={camp.id} camp={camp} isManager />
      ))}
    </div>
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

function Dashboard() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "parent":
      return <ParentDashboard />;
    case "camp_creator":
      return <CampCreatorDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "coach":
      return <CoachDashboard />;
    case "volunteer":
      return <VolunteerDashboard />;
    case "athlete":
      return <AthleteDashboard />;
    case "admin": // Handle legacy admin role
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Role Update Required</h1>
            <p className="text-gray-600 mb-6">
              We've updated our role system. Your admin role needs to be migrated to "Camp Creator".
              Please log out and log back in to complete the migration.
            </p>
            <Button
              className="w-full"
              onClick={() => logoutMutation.mutate()}
            >
              Logout to Update Role
            </Button>
          </div>
        </div>
      );
    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Invalid Role</h1>
            <p className="text-gray-600 mb-6">
              Your account has an invalid role. Please log out and contact support if this issue persists.
            </p>
            <Button
              className="w-full"
              onClick={() => logoutMutation.mutate()}
            >
              Logout
            </Button>
          </div>
        </div>
      );
  }
}

function ParentDashboard() {
  const { user, logoutMutation } = useAuth();
  const [activeSection, setActiveSection] = React.useState<'overview' | 'athletes' | 'camps'>('overview');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Side Navigation */}
      <nav className="w-64 bg-white shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Sports Camp</h2>
          <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
        </div>
        <div className="p-2">
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'overview' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('overview')}
          >
            Dashboard Overview
          </button>
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'athletes' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('athletes')}
          >
            Manage Athletes
          </button>
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'camps' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('camps')}
          >
            Available Camps
          </button>
        </div>
        <div className="p-4 mt-auto border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logoutMutation.mutate()}
          >
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Athletes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">3</div>
                  <p className="text-sm text-gray-500">Registered athletes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Camps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2</div>
                  <p className="text-sm text-gray-500">Starting soon</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1</div>
                  <p className="text-sm text-gray-500">Current camp enrollments</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'athletes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Manage Athletes</h1>
              <AddChildDialog />
            </div>
            <AthletesList />
          </div>
        )}

        {activeSection === 'camps' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Available Camps</h1>
            <CampsList />
          </div>
        )}
      </main>
    </div>
  );
}

function AthletesList() {
  const { data: athletes, isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {athletes?.map((athlete) => (
        <AthleteCard key={athlete.id} athlete={athlete} />
      ))}
    </div>
  );
}

function AthleteCard({ athlete }: { athlete: Child }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{athlete.fullName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-gray-600">
            Age: {new Date().getFullYear() - new Date(athlete.dateOfBirth).getFullYear()}
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampsList() {
  const { data: camps, isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {camps?.map((camp) => (
        <CampCard key={camp.id} camp={camp} />
      ))}
    </div>
  );
}

function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
    enabled: !!user?.organizationId,
  });
  const [showCampDialog, setShowCampDialog] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Camp Creator Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Organization Members</CardTitle>
                <InviteMemberDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pending Invitations</h3>
                <div className="grid gap-4">
                  {invitations?.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Camps</CardTitle>
                <Button onClick={() => setShowCampDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Camp
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CampManagementList />
            </CardContent>
          </Card>
        </div>
      </main>

      {showCampDialog && (
        <AddCampDialog open={showCampDialog} onOpenChange={setShowCampDialog} />
      )}
    </div>
  );
}

function ManagerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [activeSection, setActiveSection] = React.useState<'overview' | 'camps' | 'staff'>('overview');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Side Navigation */}
      <nav className="w-64 bg-white shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Sports Camp</h2>
          <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
        </div>
        <div className="p-2">
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'overview' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('overview')}
          >
            Dashboard Overview
          </button>
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'camps' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('camps')}
          >
            Manage Camps
          </button>
          <button
            className={`w-full text-left px-4 py-2 rounded-lg mb-1 ${
              activeSection === 'staff' ? 'bg-gray-100 font-medium' : ''
            }`}
            onClick={() => setActiveSection('staff')}
          >
            Staff Management
          </button>
        </div>
        <div className="p-4 mt-auto border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logoutMutation.mutate()}
          >
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Camps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">5</div>
                  <p className="text-sm text-gray-500">Currently running</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Athletes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">128</div>
                  <p className="text-sm text-gray-500">Across all camps</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Staff Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">12</div>
                  <p className="text-sm text-gray-500">Active staff</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'camps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Manage Camps</h1>
              <AddCampDialog open={false} onOpenChange={() => {}} />
            </div>
            <CampManagementList />
          </div>
        )}

        {activeSection === 'staff' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p>Staff management features coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

function CoachDashboard() {
  const { user, logoutMutation } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Coach Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">My Assigned Camps</h2>
          {/* Add camp list with participant management */}
        </section>
      </main>
    </div>
  );
}

function VolunteerDashboard() {
  const { user, logoutMutation } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Volunteer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Assigned Activities</h2>
          {/* Add assigned activities list */}
        </section>
      </main>
    </div>
  );
}

function AddChildDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedSports, setSelectedSports] = React.useState<Array<{ sportId: number, skillLevel: SportLevel }>>([]);

  const { data: sports } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  const form = useForm({
    resolver: zodResolver(insertChildSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: new Date().toISOString().split('T')[0],
      gender: "prefer_not_to_say" as Gender,
      emergencyContact: "",
      emergencyPhone: "",
      emergencyRelation: "",
      allergies: [],
      medicalConditions: [],
      medications: [],
      specialNeeds: "",
      preferredContact: "email" as ContactMethod,
      communicationOptIn: true,
      sportsInterests: [],
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertChildSchema>) => {
      console.log("Submitting data:", data);
      const res = await apiRequest("POST", "/api/children", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add athlete");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Athlete added successfully",
      });
      form.reset();
      setSelectedSports([]);
      setIsOpen(false);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
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
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Athlete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an Athlete</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => addChildMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Emergency Contact</h3>
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship to Athlete</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Medical Information</h3>
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Separate with commas"
                          value={field.value.join(", ")}
                          onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Conditions</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Separate with commas"
                          value={field.value.join(", ")}
                          onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medications</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Separate with commas"
                          value={field.value.join(", ")}
                          onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Needs/Accommodations</FormLabel>
                      <FormControl><FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sports Interests */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sports Interests</h3>
                {sports?.map((sport) => (
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
                          form.setValue("sportsInterests", selectedSports);
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
                              ? { ...s, skillLevel: e.target.value as SportLevel }
                              : s
                          );
                          setSelectedSports(newSports);
                          form.setValue("sportsInterests", newSports);
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

              {/* Communication Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Communication Preferences</h3>
                <FormField
                  control={form.control}
                  name="preferredContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Contact Method</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                          <option value="app">App Notifications</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="communicationOptIn"
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
                      <FormLabel>Opt-in to camp updates and announcements</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={addChildMutation.isPending}
            >
              {addChildMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Athlete
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChildCard({ child }: { child: Child }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{child.fullName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-gray-600">
            Date of Birth: {new Date(child.dateOfBirth).toLocaleDateString()}
          </p>
          {child.allergies && child.allergies.length > 0 && (
            <p className="text-gray-600">
              <strong>Allergies:</strong> {child.allergies.join(", ")}
            </p>
          )}
          {child.medicalConditions && child.medicalConditions.length > 0 && (
            <p className="text-gray-600">
              <strong>Medical Conditions:</strong> {child.medicalConditions.join(", ")}
            </p>
          )}
          <p className="text-gray-600">
            <strong>Emergency Contact:</strong> {child.emergencyContact}
            {child.emergencyPhone && ` (${child.emergencyPhone})`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CampCard({ camp, isManager }: { camp: Camp; isManager?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{camp.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{camp.description}</p>
        <div className="space-y-2">
          <div>
            <strong>Location:</strong> {camp.location}
          </div>
          <div>
            <strong>Dates:</strong>{" "}
            {new Date(camp.startDate).toLocaleDateString()} -{" "}
            {new Date(camp.endDate).toLocaleDateString()}
          </div>
          <div>
            <strong>Price:</strong> ${camp.price / 100}
          </div>
          <div>
            <strong>Capacity:</strong> {camp.capacity}
          </div>
          {isManager && (
            <div>
              <Button className="w-full mt-4">Edit Camp</Button>
              <Button className="w-full mt-2" variant="destructive">
                Delete Camp
              </Button>
            </div>
          )}
          {!isManager && <Button className="w-full mt-4">Register</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function InviteMemberDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<InsertInvitation>({
    resolver: zodResolver(insertInvitationSchema),
    defaultValues: {
      email: "",
      role: "coach" as const,
      organizationId: user?.organizationId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InsertInvitation) => {
      if (!user?.organizationId) {
        throw new Error("No organization ID found");
      }
      const res = await apiRequest(
        "POST",
        `/api/organizations/${user.organizationId}/invitations`,
        {
          ...data,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send invitation");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
      });
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

  const onSubmit = form.handleSubmit((data) => {
    console.log("Submitting invitation:", data);
    inviteMutation.mutate({
      ...data,
      organizationId: user?.organizationId!,
    });
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} />
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
                      <option value="camp_creator">Camp Creator</option>
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

function AthleteDashboard() {
  const { user, logoutMutation } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Athlete Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">My Camps</h2>
          {/* Add camp list with participant management */}
        </section>
      </main>
    </div>
  );
}