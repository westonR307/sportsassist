import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camp, Child, insertChildSchema, Invitation, insertInvitationSchema, InsertInvitation } from "@shared/schema";
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

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "parent":
      return <ParentDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "coach":
      return <CoachDashboard />;
    case "volunteer":
      return <VolunteerDashboard />;
    default:
      return <div>Invalid role</div>;
  }
}

function ParentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: camps, isLoading: isLoadingCamps } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  const { data: children, isLoading: isLoadingChildren } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Parent Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Children</h2>
            <AddChildDialog />
          </div>
          {isLoadingChildren ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children?.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Available Camps</h2>
          {isLoadingCamps ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps?.map((camp) => (
                <CampCard key={camp.id} camp={camp} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/invitations`],
    enabled: !!user?.organizationId,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
              <CardTitle>Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Manage organizations and their settings</p>
              <Button className="mt-4">Manage Organizations</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Manage user accounts and permissions</p>
              <Button className="mt-4">Manage Users</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Configure global system settings</p>
              <Button className="mt-4">System Settings</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ManagerDashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: camps, isLoading: isLoadingCamps } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Camps</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Camp
            </Button>
          </div>

          {isLoadingCamps ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps?.map((camp) => (
                <CampCard key={camp.id} camp={camp} isManager />
              ))}
            </div>
          )}
        </section>
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

  const form = useForm({
    resolver: zodResolver(insertChildSchema),
    defaultValues: {
      name: "",
      age: undefined,
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: { name: string; age: number }) => {
      console.log("Submitting data:", data); // Debug log
      const res = await apiRequest("POST", "/api/children", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add child");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Child added successfully",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error); // Debug log
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = form.getValues();
    console.log("Form submitted with data:", formData); // Debug log

    if (!formData.name || formData.age === undefined) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const age = Number(formData.age);
    if (isNaN(age) || age < 0 || age > 16) {
      form.setError("age", {
        type: "manual",
        message: "Age must be between 0 and 16",
      });
      return;
    }

    addChildMutation.mutate({
      name: formData.name,
      age,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Child</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
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
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="16"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : Number(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={addChildMutation.isPending}
            >
              {addChildMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Child
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
        <CardTitle>{child.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Age: {child.age}</p>
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
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
        data
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