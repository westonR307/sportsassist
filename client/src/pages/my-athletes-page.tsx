import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Child } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditAthleteDialog } from "@/components/edit-athlete-dialog";
import { ViewAthleteDialog } from "@/components/view-athlete-dialog";
import { Card, CardContent } from "@/components/ui/card";
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
import { getSportName } from "@shared/sports-utils";

export default function MyAthletesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: children = [], isLoading } = useQuery<Child[]>({
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

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Athletes</h1>
              <p className="text-muted-foreground mt-1">
                Manage your athletes and their profiles
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedChild(null);
                setIsEditDialogOpen(true);
              }}
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
                <Card key={child.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {child.profilePhoto ? (
                              <img 
                                src={child.profilePhoto} 
                                alt={child.fullName} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserPlus className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{child.fullName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {child.currentGrade && child.schoolName ? 
                                `${child.currentGrade}, ${child.schoolName}` : 
                                "No school information"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div>
                          <p className="text-sm font-medium">Age</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()} years
                          </p>
                        </div>
                        {child.childSports && child.childSports.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Sports</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {child.childSports.map((sport) => (
                                <div
                                  key={sport.id}
                                  className="text-xs px-2 py-1 rounded-full bg-muted"
                                >
                                  {getSportName(sport.sportId)} ({sport.skillLevel})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedChild(child);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                          onClick={() => {
                            setSelectedChild(child);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
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
                                This will permanently delete {child.fullName}'s profile
                                and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAthlete(child.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                onClick={() => {
                  setSelectedChild(null);
                  setIsEditDialogOpen(true);
                }}
                size="lg"
                className="flex items-center gap-2"
              >
                <PlusCircle size={18} />
                <span>Add Your First Athlete</span>
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Athlete Dialog */}
      {selectedChild && (
        <EditAthleteDialog
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
    </div>
  );
}