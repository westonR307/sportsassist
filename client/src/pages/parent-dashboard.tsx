import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, User, CalendarDays, ListChecks, Medal, Award, Info, LogOut, Trash, Upload } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { EditAthleteDialog } from "@/components/edit-athlete-dialog";
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

function ParentDashboardLayout({ children }: ParentDashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <ParentSidebar />
      <div className="flex-1 p-6 md:p-8">{children}</div>
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Athletes</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="hidden md:flex"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <Button onClick={() => setAddChildDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Athlete
            </Button>
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
      <AddAthleteDialog 
        open={addChildDialogOpen} 
        onOpenChange={setAddChildDialogOpen} 
      />

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
        <EditAthleteDialog
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
    <Card className="overflow-hidden flex flex-col">
      <div className="h-2 bg-primary w-full" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {/* Profile photo with upload capability */}
            <div className="relative group">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={child.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              {/* Upload overlay */}
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => document.getElementById(`athlete-photo-${child.id}`)?.click()}
              >
                <div className="bg-primary/70 rounded-full p-1">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-white" />
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
            
            <CardTitle className="text-lg">{child.fullName}</CardTitle>
          </div>
          
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {calculateAge(child.dateOfBirth)} years old
          </span>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>{new Date(child.dateOfBirth).toLocaleDateString()}</span>
          {child.currentGrade && (
            <span className="text-xs bg-muted px-2 py-1 rounded">
              Grade: {child.currentGrade}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow">
        {child.schoolName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>School: {child.schoolName}</span>
          </div>
        )}
        {child.sportsHistory && (
          <div className="flex items-center gap-2 text-sm">
            <Medal className="h-4 w-4 text-muted-foreground" />
            <span title={child.sportsHistory}>
              Sports History: {child.sportsHistory.length > 30 
                ? `${child.sportsHistory.substring(0, 30)}...` 
                : child.sportsHistory}
            </span>
          </div>
        )}
        {child.sportsInterests && child.sportsInterests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {child.sportsInterests.map((sport, index) => {
              // Get sport name from ID using the shared utility
              const sportName = getSportName(sport.sportId);
              
              return (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {sportName} ({sport.skillLevel})
                </Badge>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>Upcoming Registrations: 0</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span>Completed Camps: 0</span>
        </div>
        {child.jerseySize && (
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>Jersey/T-Shirt Size: {child.jerseySize}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onView(child)}
        >
          View Profile
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit(child)}
        >
          Edit Profile
        </Button>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add an Athlete</DialogTitle>
          <DialogDescription>
            Create a profile for your athlete to register for camps.
          </DialogDescription>
        </DialogHeader>
        
        {/* Form section - separate from photo upload */}
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
                                    <option key={sport} value={sportsMap[sport] || 0}>
                                      {sport}
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
      </DialogContent>
    </Dialog>
  );
}