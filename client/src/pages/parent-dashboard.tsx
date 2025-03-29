import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, User, CalendarDays, ListChecks, Medal, Award, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Child } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChildSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Schema for adding a child athlete
const addChildSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Please enter a valid date",
  }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  emergencyContact: z.string().min(10, { message: "Emergency contact should be at least 10 characters" }),
  emergencyPhone: z.string().min(10, { message: "Phone number should be at least 10 digits" }),
  medicalInformation: z.string().optional(),
  specialNeeds: z.string().optional(),
});

type AddChildFormValues = z.infer<typeof addChildSchema>;

// Parent Dashboard Layout component
interface ParentDashboardLayoutProps {
  children: React.ReactNode;
}

function ParentDashboardLayout({ children }: ParentDashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <ParentSidebar />
      <div className="flex-1 p-6 md:p-8">{children}</div>
    </div>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [addChildDialogOpen, setAddChildDialogOpen] = React.useState(false);
  
  // Query to fetch children data for this parent
  const {
    data: children,
    isLoading,
    error,
  } = useQuery<Child[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!user && user.role === "parent",
  });

  return (
    <ParentDashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Athletes</h1>
          <Button onClick={() => setAddChildDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Athlete
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Info className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Failed to load your athletes.</p>
              <p className="text-sm text-muted-foreground">Please try again later.</p>
            </CardContent>
          </Card>
        ) : !children || children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No athletes added yet</p>
              <Button onClick={() => setAddChildDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first athlete
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <AthleteCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      {/* Add Athlete Dialog */}
      <AddAthleteDialog 
        open={addChildDialogOpen} 
        onOpenChange={setAddChildDialogOpen} 
      />
    </ParentDashboardLayout>
  );
}

function AthleteCard({ child }: { child: Child }) {
  // Calculate age based on date of birth
  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="h-2 bg-primary w-full" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{child.fullName}</CardTitle>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {calculateAge(child.dateOfBirth)} years old
          </span>
        </div>
        <CardDescription>
          {new Date(child.dateOfBirth).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>Upcoming Registrations: 0</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span>Completed Camps: 0</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Medal className="h-4 w-4 text-muted-foreground" />
          <span>Interests: Not set</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" size="sm">View Profile</Button>
        <Button variant="outline" size="sm">Register for Camp</Button>
      </CardFooter>
    </Card>
  );
}

function AddAthleteDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      emergencyContact: "",
      emergencyPhone: "",
      medicalInformation: "",
      specialNeeds: "",
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (values: AddChildFormValues) => {
      const res = await apiRequest("POST", "/api/parent/children", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Athlete added",
        description: "Your athlete has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add athlete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AddChildFormValues) => {
    addChildMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add an Athlete</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Jane Doe" />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. John Doe" />
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
                      <Input {...field} placeholder="e.g. 123-456-7890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medicalInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Information (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any medical conditions or allergies" />
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
                  <FormLabel>Special Needs (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any special needs or requirements" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addChildMutation.isPending}
              >
                {addChildMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Athlete
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}