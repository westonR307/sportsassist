import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

import { InsertUser } from "@shared/schema";

// Create a custom register schema instead of using pick on insertUserSchema
const registerSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["parent", "camp_creator", "athlete"]),
  organizationName: z.string().optional(),
  organizationDescription: z.string().optional(),
}).superRefine((data, ctx) => {
  // Only validate organization fields if role is camp_creator
  if (data.role === 'camp_creator') {
    if (!data.organizationName || data.organizationName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required for camp creators",
        path: ["organizationName"]
      });
    }
  }
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Initialize forms before any conditional returns
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "parent",
      organizationName: "",
      organizationDescription: "",
    },
  });

  // Handle redirection in useEffect to avoid state updates during render
  useEffect(() => {
    if (user) {
      if (user.role === "parent" && !user.onboarding_completed) {
        setLocation("/parent-onboarding");
      } else if (user.role === "parent") {
        setLocation("/parent-dashboard");
      } else if (user.role === "athlete") {
        setLocation("/athlete-dashboard"); // Will create this route later
      } else {
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Return null immediately if user is authenticated - redirects handled above
  if (user) {
    return null;
  }

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Manually validate organization name for camp creators
    if (data.role === 'camp_creator' && (!data.organizationName || data.organizationName.trim() === '')) {
      registerForm.setError('organizationName', {
        type: 'manual',
        message: 'Organization name is required for camp creators'
      });
      return;
    }

    // Generate a random username that will always work
    // This is handled server-side now, but we provide a username 
    // to ensure consistency in the registration process
    const randomSuffix = String(Math.floor(Math.random() * 10000000));
    let username = 'user' + randomSuffix;
    
    console.log("Generated random username:", username);

    // Extra validation to ensure username is a string
    if (typeof username !== 'string') {
      console.error("Username not generated as a string:", username);
      registerForm.setError('email', {
        type: 'manual',
        message: 'Error generating username from email. Please try again.'
      });
      return;
    }

    // Combine data with derived username (already lowercase and sanitized)
    const fullData = {
      ...data,
      username: username
    };

    console.log("Submitting registration data:", {
      ...fullData,
      password: "[REDACTED]"
    });

    registerMutation.mutate(fullData);
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Left side: Forms */}
      <div className="flex items-center justify-center w-full p-6 md:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="mb-6 text-3xl font-bold text-center">SportsAssist</h1>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <span className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in...
                          </span>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      className="font-medium underline text-primary"
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Fill in your details to get started with SportsAssist
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a strong password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I am a</FormLabel>
                            <div className="grid grid-cols-3 gap-3">
                              <Button
                                type="button"
                                variant={field.value === "parent" ? "default" : "outline"}
                                className="w-full"
                                onClick={() => {
                                  // Clear organization fields when changing away from camp_creator
                                  if (field.value === "camp_creator") {
                                    registerForm.setValue("organizationName", "");
                                    registerForm.setValue("organizationDescription", "");
                                  }
                                  registerForm.setValue("role", "parent");
                                }}
                              >
                                Parent
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "camp_creator" ? "default" : "outline"}
                                className="w-full"
                                onClick={() => registerForm.setValue("role", "camp_creator")}
                              >
                                Camp Organizer
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "athlete" ? "default" : "outline"}
                                className="w-full"
                                onClick={() => {
                                  // Clear organization fields when changing away from camp_creator
                                  if (field.value === "camp_creator") {
                                    registerForm.setValue("organizationName", "");
                                    registerForm.setValue("organizationDescription", "");
                                  }
                                  registerForm.setValue("role", "athlete");
                                }}
                              >
                                Athlete (16+)
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Organization fields are always rendered but conditionally displayed */}
                      <div className={`space-y-4 border p-4 rounded-md border-primary/20 bg-primary/5 ${registerForm.watch("role") === "camp_creator" ? "block" : "hidden"}`}>
                        <h3 className="text-md font-medium">Organization Information</h3>
                        <FormField
                          control={registerForm.control}
                          name="organizationName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your organization name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="organizationDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Description</FormLabel>
                              <FormControl>
                                <textarea 
                                  {...field}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[100px]"
                                  placeholder="Tell us about your organization"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <span className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...
                          </span>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button 
                      type="button"
                      className="font-medium underline text-primary"
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side: Hero section */}
      <div className="hidden w-1/2 bg-primary md:block">
        <div className="flex flex-col items-center justify-center h-full p-12 text-primary-foreground">
          <div className="max-w-lg space-y-6">
            <h2 className="text-4xl font-bold">Manage sports camps with ease</h2>
            <p className="text-xl">
              SportsAssist is the all-in-one platform that helps you create, manage, and grow your sports camps.
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 mr-4 bg-primary-foreground/10 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Streamlined Registration</h3>
                  <p>Effortlessly manage camp registrations and participant information</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-2 mr-4 bg-primary-foreground/10 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M3 9h18"></path>
                    <path d="M9 21V9"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Intelligent Scheduling</h3>
                  <p>Create and manage camp schedules with our intuitive calendar interface</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-2 mr-4 bg-primary-foreground/10 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Team Collaboration</h3>
                  <p>Invite staff, assign roles, and collaborate seamlessly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;