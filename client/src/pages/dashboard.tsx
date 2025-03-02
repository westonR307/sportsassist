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

// Basic components first
function CampCard({ camp, isManager }: { camp: Camp; isManager?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{camp.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2">{camp.description}</p>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm">{camp.location}</p>
            <p className="text-sm">Capacity: {camp.capacity}</p>
          </div>
          <div className="flex gap-2">
            {isManager && <Button variant="outline" size="sm">Edit</Button>}
            <Button variant="outline" size="sm">View Details</Button>
          </div>
        </div>
      </CardContent>
    </Card>
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

function InviteMemberDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
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
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${user?.organizationId}/invitations`] 
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
  return <div>Parent Dashboard</div>;
}

function ManagerDashboard() {
  return <div>Manager Dashboard</div>;
}

function CoachDashboard() {
  return <div>Coach Dashboard</div>;
}

function VolunteerDashboard() {
  return <div>Volunteer Dashboard</div>;
}

function AthleteDashboard() {
  return <div>Athlete Dashboard</div>;
}

export default Dashboard;