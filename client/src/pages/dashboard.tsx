import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camp, insertCampSchema } from "@shared/schema";
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

// Basic Dashboard component
function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "camp_creator":
      return <CampCreatorDashboard />;
    case "parent":
    case "manager":
    case "coach":
    case "volunteer":
    case "athlete":
      return <div className="p-4">Dashboard for {user.role} coming soon...</div>;
    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Invalid Role</h1>
            <p className="text-gray-600 mb-6">
              Your account has an invalid role. Please contact support.
            </p>
          </div>
        </div>
      );
  }
}

// Camp Creator Dashboard
function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();
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
                <CardTitle>Camps</CardTitle>
                <Button onClick={() => setShowCampDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Camp
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CampList />
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

// Camp List Component
function CampList() {
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
        <CampCard key={camp.id} camp={camp} />
      ))}
    </div>
  );
}

// Camp Card Component
function CampCard({ camp }: { camp: Camp }) {
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
            <Button variant="outline" size="sm">View Details</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add Camp Dialog
function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();

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
      const res = await apiRequest("POST", "/api/camps", data);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createCampMutation.mutate(data))} className="space-y-4">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
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

export default Dashboard;