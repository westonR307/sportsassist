import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Schema for the invitation data from the server
interface InvitationData {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
  valid: boolean;
  invitedBy?: string;
}

// Form schema that requires first and last name
const acceptInvitationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AcceptInvitationData = z.infer<typeof acceptInvitationSchema>;

export default function InvitationAcceptPage() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { loginMutation } = useAuth();
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  
  // Form setup with Zod validation
  const form = useForm<AcceptInvitationData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Fetch invitation data on component mount
  useEffect(() => {
    const fetchInvitationData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await apiRequest("GET", `/api/invitations/${token}`);
        
        setInvitationData(data);
      } catch (error) {
        console.error("Failed to fetch invitation:", error);
        setError("The invitation link is invalid or has expired.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (token) {
      fetchInvitationData();
    } else {
      setError("Invalid invitation link.");
      setIsLoading(false);
    }
  }, [token]);

  // Handle form submission
  const onSubmit = async (data: AcceptInvitationData) => {
    if (!token) return;
    
    try {
      // Make API call to accept invitation with names and password
      const response = await apiRequest("POST", `/api/invitations/${token}/accept`, {
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
      
      // Show success message
      toast({
        title: "Invitation accepted",
        description: "You've successfully joined the organization.",
      });
      
      setAcceptSuccess(true);
      
      // Check if auto-login was successful on the backend
      if (response.autoLoginSuccess) {
        console.log("Auto-login successful from the backend");
        // User was automatically logged in by the server, update the client
        queryClient.setQueryData(["/api/user"], response.user);
        
        // Redirect to dashboard after a brief delay to show success message
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      } else {
        // If server-side auto-login failed, try client-side login
        console.log("Server auto-login not successful, trying client-side login");
        setTimeout(() => {
          if (invitationData?.email) {
            loginMutation.mutate({
              email: invitationData.email,
              password: data.password,
            }, {
              onSuccess: () => {
                setLocation("/dashboard");
              },
              onError: (error) => {
                console.error("Auto-login failed:", error);
                // Still redirect to login page if auto-login fails
                setLocation("/auth");
              }
            });
          } else {
            setLocation("/auth");
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invitation",
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Show error message
  if (error || !invitationData || !invitationData.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-destructive" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {error || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setLocation("/")}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show success message
  if (acceptSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Check className="mx-auto mb-2 h-10 w-10 text-green-500" />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              You have successfully joined {invitationData.organizationName}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show acceptance form
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join {invitationData.organizationName} as a {invitationData.role}.
            Please complete your profile to accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-sm text-muted-foreground">
          <p>Invitation sent to: {invitationData.email}</p>
          {invitationData.invitedBy && (
            <p className="mt-1">Invited by: {invitationData.invitedBy}</p>
          )}
          <p className="mt-1">
            Expires: {new Date(invitationData.expiresAt).toLocaleDateString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}