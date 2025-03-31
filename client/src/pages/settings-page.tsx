import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2, User, Building2, Lock, Upload } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  description: string | null;
  stripeAccountId?: string | null;
  createdAt?: Date;
  logoUrl?: string | null;
}

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().nullable().optional(),
});

type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: organization, isLoading: isLoadingOrg } = useQuery<Organization>({
    queryKey: [`/api/organizations/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });

  const orgForm = useForm<OrganizationSettings>({
    resolver: zodResolver(organizationSettingsSchema),
    values: organization ? {
      name: organization.name,
      description: organization.description,
    } : undefined,
  });

  const passwordForm = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Update form values when organization data is loaded
  React.useEffect(() => {
    if (organization) {
      console.log("Setting organization data:", organization);
      orgForm.setValue("name", organization.name);
      orgForm.setValue("description", organization.description);
      
      if (organization.logoUrl) {
        setLogoUrl(organization.logoUrl);
      }
    }
  }, [organization, orgForm]);

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationSettings) => {
      if (!user?.organizationId) {
        throw new Error("No organization ID found");
      }

      const result = await apiRequest(
        "PATCH",
        `/api/organizations/${user.organizationId}`,
        data
      );

      return result;
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
  
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      return await apiRequest(
        "POST",
        "/api/user/change-password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      console.error("Password change error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.organizationId) {
        throw new Error("No organization ID found");
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/organization-logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload logo");
      }
      
      const data = await response.json();
      
      // Update the organization with the new logo URL
      await apiRequest(
        "PATCH",
        `/api/organizations/${user.organizationId}`,
        { logoUrl: data.url }
      );
      
      return data;
    },
    onSuccess: (data) => {
      setLogoUrl(data.url);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}`] });
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logo upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  const onSubmitOrganization = (data: OrganizationSettings) => {
    console.log("Submitting organization data:", data);
    updateOrganizationMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordChangeData) => {
    console.log("Submitting password change");
    changePasswordMutation.mutate(data);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogoMutation.mutate(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle organization view specifically if user is a camp creator
  const renderOrganizationContent = () => {
    if (!user?.organizationId) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No organization found
            </p>
          </CardContent>
        </Card>
      );
    }

    if (isLoadingOrg) {
      return (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Update your organization's information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...orgForm}>
              <form onSubmit={orgForm.handleSubmit(onSubmitOrganization)} className="space-y-4">
                <FormField
                  control={orgForm.control}
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
                  control={orgForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Description</FormLabel>
                      <FormControl>
                        <textarea 
                          {...field}
                          value={field.value || ''}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[100px]"
                          placeholder="Enter organization description"
                        />
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

        <Card>
          <CardHeader>
            <CardTitle>Organization Logo</CardTitle>
            <CardDescription>Upload your organization's logo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center">
                {logoUrl ? (
                  <div className="border rounded-md p-2 w-40 h-40 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Organization Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="border rounded-md p-4 w-40 h-40 flex items-center justify-center bg-muted">
                    <Building2 className="h-20 w-20 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <Button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploadLogoMutation.isPending}
                  className="flex items-center"
                >
                  {uploadLogoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="max-w-3xl">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Account</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Security</span>
              </TabsTrigger>
              {user?.role === 'camp_creator' && (
                <TabsTrigger value="organization" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Organization</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="account" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>View your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium">Username</h3>
                      <p className="text-sm text-muted-foreground">{user?.username}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium">Email</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium">Role</h3>
                      <p className="text-sm text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Enter your current password" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Enter your new password" 
                              />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 8 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                placeholder="Confirm your new password" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        className="w-full"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {user?.role === 'camp_creator' && (
              <TabsContent value="organization" className="space-y-4 mt-4">
                {renderOrganizationContent()}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;