import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, User, CalendarDays, ListChecks, Medal, Award, Info, LogOut, Trash, Upload } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { 
  sportsById,
  getSportName,
  sportsList,
  sportsMap,
  skillLevels,
  skillLevelNames 
} from "@shared/sports-utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChildSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ViewAthleteDialog } from "@/components/view-athlete-dialog";
import { SimpleEditAthleteDialog } from "@/components/simple-edit-athlete-dialog";
import { ProfilePhotoUploader } from "@/components/profile-photo-uploader";

// All sport-related constants are now imported from shared/sports-utils.ts

// Schema for adding a child athlete
const addChildSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Please enter a valid date",
  }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  currentGrade: z.string().optional(),
  schoolName: z.string().optional(),
  sportsHistory: z.string().optional(),
  emergencyContact: z.string().min(10, { message: "Emergency contact should be at least 10 characters" }),
  emergencyPhone: z.string().min(10, { message: "Phone number should be at least 10 digits" }),
  medicalInformation: z.string().optional(),
  specialNeeds: z.string().optional(),
  jerseySize: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  profilePhoto: z.string().optional(), // Add profile photo field
  // Sports interests
  sportsInterests: z.array(z.object({
    sportId: z.number(),
    skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
    preferredPositions: z.array(z.string()).optional(),
    currentTeam: z.string().optional(),
  })).optional(),
  // Default values for required fields in DB schema
  preferredContact: z.enum(["email", "sms", "app"]).default("email"),
  communicationOptIn: z.boolean().default(true),
});

type AddChildFormValues = z.infer<typeof addChildSchema>;

// Parent Dashboard Layout component
interface ParentDashboardLayoutProps {
  children: React.ReactNode;
}

import { NotificationBell } from "@/components/notification-bell";

function ParentDashboardLayout({ children }: ParentDashboardLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Always render a single consistent layout for all parent pages
  return (
    <div className="flex min-h-screen">
      <ParentSidebar />
      {/* Add left padding to accommodate the sidebar in both expanded and collapsed states */}
      <div className="flex-1 flex flex-col pl-0 lg:pl-16">
        <header className="border-b sticky top-0 z-30 bg-background">
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 lg:hidden"></div> {/* Space for sidebar toggle button on mobile only */}
              <h1 className="text-xl font-semibold">Parent Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <div className="text-sm text-right hidden md:block">
                  <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-muted-foreground">Parent</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { user, logoutMutation } = useAuth();
  const [addChildDialogOpen, setAddChildDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<ExtendedChild | null>(null);
  
  // Query to fetch children data for this parent
  const {
    data: children,
    isLoading,
    error,
  } = useQuery<ExtendedChild[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!user && user.role === "parent",
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <ParentDashboardLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary-900/10 via-primary-800/5 to-background rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">My Athletes</h1>
              <p className="text-muted-foreground">
                Manage your athletes' profiles and registrations in one place
              </p>
            </div>
            <div className="flex gap-3 self-end md:self-auto">
              <Button 
                onClick={() => {
                  console.log("Add Athlete button clicked");
                  // Try to manually click the Dialog trigger first
                  const dialogTrigger = document.getElementById('add-athlete-dialog-trigger');
                  if (dialogTrigger) {
                    console.log("Dialog trigger found, clicking it");
                    dialogTrigger.click();
                  } else {
                    console.log("Dialog trigger not found, using state");
                    setAddChildDialogOpen(true);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Athlete
              </Button>
            </div>
          </div>
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
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl overflow-hidden">
              <div className="px-6 py-12 md:py-16 md:px-10 flex flex-col md:flex-row items-center justify-between">
                <div className="space-y-4 text-center md:text-left mb-6 md:mb-0">
                  <h2 className="text-2xl font-bold">Welcome to Your Parent Dashboard!</h2>
                  <p className="text-muted-foreground max-w-md">
                    Get started by adding your athlete's profile. This will help us personalize 
                    their sports camp experience and make registration easier.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => {
                      console.log("Add First Athlete button clicked");
                      // Try to manually click the Dialog trigger first
                      const dialogTrigger = document.getElementById('add-athlete-dialog-trigger');
                      if (dialogTrigger) {
                        console.log("Dialog trigger found, clicking it");
                        dialogTrigger.click();
                      } else {
                        console.log("Dialog trigger not found, using state");
                        setAddChildDialogOpen(true);
                      }
                    }} 
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Athlete
                  </Button>
                </div>
                <div className="flex items-center justify-center">
                  <div className="rounded-lg p-1 bg-white/20 backdrop-blur-sm">
                    <div className="w-64 h-64 flex items-center justify-center overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-primary opacity-90">
                        <circle cx="50" cy="30" r="20" className="fill-current opacity-80" />
                        <rect x="30" y="50" width="40" height="40" rx="5" className="fill-current opacity-60" />
                        <circle cx="30" cy="65" r="8" className="fill-background" />
                        <circle cx="70" cy="65" r="8" className="fill-background" />
                        <path d="M 40 80 Q 50 85 60 80" className="stroke-background stroke-2 fill-none" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="overflow-hidden">
                <div className="h-2 bg-blue-500 w-full" />
                <CardHeader>
                  <div className="mb-2 flex items-center justify-center bg-blue-100 w-12 h-12 rounded-full">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Create Profiles</CardTitle>
                  <CardDescription>Add complete profiles for each of your athletes</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Build detailed athlete profiles with sports interests, experience levels, and important information.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <div className="h-2 bg-green-500 w-full" />
                <CardHeader>
                  <div className="mb-2 flex items-center justify-center bg-green-100 w-12 h-12 rounded-full">
                    <CalendarDays className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Register for Camps</CardTitle>
                  <CardDescription>Find and register for upcoming sports camps</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Browse through upcoming camps, register your athletes, and manage their schedules all in one place.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/find-camps">
                        Browse Available Camps
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <div className="h-2 bg-amber-500 w-full" />
                <CardHeader>
                  <div className="mb-2 flex items-center justify-center bg-amber-100 w-12 h-12 rounded-full">
                    <Medal className="h-6 w-6 text-amber-600" />
                  </div>
                  <CardTitle>Track Progress</CardTitle>
                  <CardDescription>Monitor your athletes' activities and achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Keep track of completed camps, sports development, and skill progress over time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <AthleteCard 
                key={child.id} 
                child={child} 
                onView={(athlete) => {
                  setSelectedAthlete(athlete);
                  setViewDialogOpen(true);
                }}
                onEdit={(athlete) => {
                  setSelectedAthlete(athlete);
                  setEditDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Athlete Dialog */}
      <Dialog open={addChildDialogOpen} onOpenChange={setAddChildDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="athlete-dialog-description">
          <DialogHeader>
            <DialogTitle>Add an Athlete</DialogTitle>
            <DialogDescription id="athlete-dialog-description">
              Create a profile for your athlete to register for camps.
            </DialogDescription>
          </DialogHeader>
          
          {/* Form section - separate from photo upload */}
          <AddAthleteForm 
            onOpenChange={setAddChildDialogOpen} 
          />
        </DialogContent>
      </Dialog>

      {/* View Athlete Dialog */}
      {selectedAthlete && (
        <ViewAthleteDialog
          athlete={selectedAthlete}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onEdit={() => {
            setViewDialogOpen(false);
            setEditDialogOpen(true);
          }}
        />
      )}

      {/* Edit Athlete Dialog */}
      {selectedAthlete && (
        <SimpleEditAthleteDialog
          athlete={selectedAthlete}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </ParentDashboardLayout>
  );
}

function AthleteCard({ 
  child,
  onView,
  onEdit
}: { 
  child: ExtendedChild;
  onView: (athlete: ExtendedChild) => void;
  onEdit: (athlete: ExtendedChild) => void;
}) {
  const { toast } = useToast();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(child.profilePhoto || "");
  const [uploading, setUploading] = useState(false);

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
  
  // Mutation to update athlete profile photo
  const updateProfilePhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      const res = await apiRequest("PUT", `/api/parent/children/${child.id}`, {
        profilePhoto: photoUrl
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      toast({
        title: "Profile photo updated",
        description: "The athlete's profile photo has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Photo upload handler
  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile photo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // File type validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile photo');
      }

      const data = await response.json();
      setProfilePhotoUrl(data.url);
      
      // After successful upload, update the athlete profile
      updateProfilePhotoMutation.mutate(data.url);
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300">
      <div className="h-2 bg-gradient-to-r from-primary to-primary/70 w-full" />
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Profile photo with upload capability */}
          <div className="relative group">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm border-2 border-background">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={child.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            
            {/* Upload overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => document.getElementById(`athlete-photo-${child.id}`)?.click()}
            >
              <div className="bg-primary/80 rounded-full p-1.5 shadow-md">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 text-white" />
                )}
              </div>
            </div>
            <input
              id={`athlete-photo-${child.id}`}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className="hidden"
            />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg tracking-tight">{child.fullName}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {calculateAge(child.dateOfBirth)} years old
                  </span>
                  {child.currentGrade && (
                    <span className="text-xs bg-muted/80 px-2 py-0.5 rounded-full">
                      Grade: {child.currentGrade}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sports interests badges */}
        {child.sportsInterests && child.sportsInterests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {child.sportsInterests.map((sport, index) => {
              const sportName = getSportName(sport.sportId);
              const colors = {
                beginner: "bg-blue-50 text-blue-600 border-blue-200",
                intermediate: "bg-green-50 text-green-600 border-green-200",
                advanced: "bg-amber-50 text-amber-600 border-amber-200"
              };
              const colorClass = colors[sport.skillLevel] || "bg-gray-50 text-gray-600 border-gray-200";
              
              return (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={`flex items-center gap-1 py-1 border ${colorClass}`}
                >
                  <Award className="h-3.5 w-3.5" />
                  {sportName} ({skillLevelNames[sport.skillLevel]})
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 bg-muted/10 flex-grow space-y-2.5">
        {child.schoolName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary/70" />
            <span>School: {child.schoolName}</span>
          </div>
        )}
        {child.sportsHistory && (
          <div className="flex items-start gap-2 text-sm">
            <Medal className="h-4 w-4 text-primary/70 mt-0.5" />
            <div>
              <span className="font-medium">Sports History:</span>
              <p className="text-muted-foreground">
                {child.sportsHistory.length > 60 
                  ? `${child.sportsHistory.substring(0, 60)}...` 
                  : child.sportsHistory}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-primary/70" />
          <span>Upcoming Registrations: <span className="font-medium">0</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-primary/70" />
          <span>Completed Camps: <span className="font-medium">0</span></span>
        </div>
        {child.jerseySize && (
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary/70" />
            <span>Jersey/T-Shirt Size: <span className="font-medium">{child.jerseySize}</span></span>
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 border-t flex justify-between gap-3">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1"
          onClick={() => onView(child)}
        >
          View Profile
        </Button>
        <Button 
          size="sm"
          className="flex-1 bg-primary hover:bg-primary/90"
          onClick={() => onEdit(child)}
        >
          Edit Profile
        </Button>
      </div>
    </Card>
  );
}

function AddAthleteForm({ 
  onOpenChange 
}: { 
  onOpenChange: (open: boolean) => void;
}) {
  console.log("AddAthleteForm rendering");
  
  const { toast } = useToast();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      currentGrade: "",
      schoolName: "",
      sportsHistory: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalInformation: "",
      specialNeeds: "",
      jerseySize: "",
      height: "",
      weight: "",
      profilePhoto: "",
      sportsInterests: [], // Initialize empty sports interests array
    },
  });
  
  // Add useFieldArray for managing dynamic sports entries
  const { fields, append, remove } = useFieldArray({
    name: "sportsInterests",
    control: form.control,
  });

  const addChildMutation = useMutation({
    mutationFn: async (values: AddChildFormValues) => {
      // The profile photo field will already be set by the ProfilePhotoUploader
      const res = await apiRequest("POST", "/api/parent/children", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      onOpenChange(false);
      form.reset();
      setProfilePhotoUrl(""); // Clear the profile photo URL state
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="currentGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Grade</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 8th Grade" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Current school name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 5 feet 8 inches" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 150 lbs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-md">Sports Experience</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => 
                    append({
                      sportId: 0,
                      skillLevel: "beginner",
                      preferredPositions: [],
                      currentTeam: ""
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sport
                </Button>
              </div>
              
              <FormField
                control={form.control}
                name="sportsHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sports History</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief sports background and experience" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fields.length > 0 && (
                <div className="space-y-4 rounded-md border p-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Sport #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`sportsInterests.${index}.sportId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sport</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                >
                                  <option value="">Select a sport</option>
                                  {sportsList.map((sport) => (
                                    <option key={sport.id} value={sport.id}>
                                      {sport.name}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`sportsInterests.${index}.skillLevel`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Skill Level</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                >
                                  {skillLevels.map(level => (
                                    <option key={level} value={level}>
                                      {skillLevelNames[level]}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4 rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground mb-2">No sports added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => 
                      append({
                        sportId: 0,
                        skillLevel: "beginner",
                        preferredPositions: [],
                        currentTeam: ""
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sport
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jerseySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey/T-Shirt Size</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="">Select size</option>
                        <option value="YS">Youth Small</option>
                        <option value="YM">Youth Medium</option>
                        <option value="YL">Youth Large</option>
                        <option value="YXL">Youth XL</option>
                        <option value="AS">Adult Small</option>
                        <option value="AM">Adult Medium</option>
                        <option value="AL">Adult Large</option>
                        <option value="AXL">Adult XL</option>
                        <option value="A2XL">Adult 2XL</option>
                      </select>
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
  );
}