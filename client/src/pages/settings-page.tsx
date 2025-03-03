import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  description: string;
  contactEmail: string;
}

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string(),
  contactEmail: z.string().email("Invalid email address"),
});

type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: organization, isLoading: isLoadingOrg } = useQuery<Organization>({
    queryKey: [`/api/organizations/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });

  const form = useForm<OrganizationSettings>({
    resolver: zodResolver(organizationSettingsSchema),
  });

  // Update form when organization data is loaded
  React.useEffect(() => {
    if (organization) {
      console.log("Setting form data:", organization);
      form.reset({
        name: organization.name || "",
        description: organization.description || "",
        contactEmail: organization.contactEmail || "",
      });
    }
  }, [organization, form]);

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationSettings) => {
      if (!user?.organizationId) throw new Error("No organization ID found");

      const res = await apiRequest(
        "PATCH",
        `/api/organizations/${user.organizationId}`,
        data
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update organization");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}`] });
      toast({
        title: "Success",
        description: "Organization settings updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update organization settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationSettings) => {
    console.log("Submitting data:", data);
    updateOrganizationMutation.mutate(data);
  };

  if (isLoadingOrg) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Organization Settings</h1>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter organization name" />
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
                        <FormLabel>Organization Description</FormLabel>
                        <FormControl>
                          <textarea 
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[100px]"
                            placeholder="Enter organization description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Enter contact email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateOrganizationMutation.isPending}
                    className="w-full"
                  >
                    {updateOrganizationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;