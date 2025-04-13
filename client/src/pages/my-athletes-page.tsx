import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { useAuth } from "@/hooks/use-auth";
import { ParentLayout } from "@/components/parent-layout";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  UserPlus, 
  User, 
  Upload, 
  Loader2, 
  CalendarDays, 
  ListChecks, 
  Medal, 
  Award, 
  Info 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditAthleteDialog } from "@/components/edit-athlete-dialog";
import { SimpleEditAthleteDialog } from "@/components/simple-edit-athlete-dialog";
import { ViewAthleteDialog } from "@/components/view-athlete-dialog";
import { AddAthleteDialog } from "@/components/add-athlete-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { getSportName, skillLevelNames } from "@shared/sports-utils";

export default function MyAthletesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChild, setSelectedChild] = useState<ExtendedChild | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Calculate age based on date of birth (more accurate than just year difference)
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

  const { data: children = [], isLoading } = useQuery<ExtendedChild[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!user,
  });

  const handleDeleteAthlete = async (childId: number) => {
    try {
      await apiRequest("DELETE", `/api/parent/children/${childId}`);

      toast({
        title: "Athlete deleted",
        description: "The athlete profile has been successfully deleted",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete athlete profile",
        variant: "destructive",
      });
    }
  };

  // Athlete Card component for this page
  function AthleteCard({ child }: { child: ExtendedChild }) {
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(child.profilePhoto || "");
    const [uploading, setUploading] = useState(false);

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
        updateProfilePhotoMutation.mutate(data.url);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload profile photo",
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
                    {sportName} ({skillLevelNames[sport.skillLevel]?.split(' - ')[0] || sport.skillLevel})
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
          {/* Added placeholder for camp information */}
          {child.camps && child.camps.map(camp => (
            <div key={camp.id} className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-primary/70" />
              <span>Camp Location: {camp.isVirtual ? "Virtual" : `${camp.city}, ${camp.state}`}</span>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t flex justify-between gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedChild(child);
              setIsViewDialogOpen(true);
            }}
          >
            View Profile
          </Button>
          <Button 
            size="sm"
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => {
              setSelectedChild(child);
              setIsEditDialogOpen(true);
            }}
          >
            Edit Profile
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete {child.fullName}'s profile. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteAthlete(child.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    );
  }

  return (
    <ParentLayout title="My Athletes">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-muted-foreground mt-1">
            Manage your athletes and their profiles
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle size={18} />
            <span>Add Athlete</span>
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading athletes...</p>
            </div>
          </div>
        ) : children.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <AthleteCard key={child.id} child={child} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8">
            <UserPlus size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No athletes yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't added any athletes yet. Create an athlete profile to register for sports camps.
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              size="lg"
              className="flex items-center gap-2"
            >
              <PlusCircle size={18} />
              <span>Add Your First Athlete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Edit Athlete Dialog */}
      {selectedChild && (
        <SimpleEditAthleteDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          athlete={selectedChild}
        />
      )}

      {/* View Athlete Dialog */}
      {selectedChild && (
        <ViewAthleteDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          athlete={selectedChild}
          onEdit={() => {
            setIsViewDialogOpen(false);
            setIsEditDialogOpen(true);
          }}
        />
      )}

      {/* Add Athlete Dialog */}
      <AddAthleteDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </ParentLayout>
  );
}