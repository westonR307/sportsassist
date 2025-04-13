import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, User, CalendarDays, ListChecks, Medal, Award, Info, LogOut, Users, Archive, Clock, TrendingUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ParentLayout } from "@/components/parent-layout";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  sportsById,
  getSportName,
  sportsList,
  sportsMap,
  skillLevels,
  skillLevelNames 
} from "@shared/sports-utils";
import { DashboardCalendar } from "@/components/dashboard-calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ViewAthleteDialog } from "@/components/view-athlete-dialog";
import { SimpleEditAthleteDialog } from "@/components/simple-edit-athlete-dialog";
import { AddAthleteForm } from "@/components/add-athlete-dialog";

export default function ParentDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedAthlete, setSelectedAthlete] = useState<ExtendedChild | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addChildDialogOpen, setAddChildDialogOpen] = useState(false);

  // Query to fetch children data
  const {
    data: children,
    isLoading: childrenLoading,
    error: childrenError
  } = useQuery<ExtendedChild[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!user && user.role === "parent",
  });

  // Query to fetch upcoming registrations
  const {
    data: upcomingRegistrations,
    isLoading: registrationsLoading
  } = useQuery({
    queryKey: ["/api/parent/registrations/upcoming"],
    enabled: !!user && user.role === "parent",
  });

  // Quick stats
  const stats = {
    totalAthletes: children?.length || 0,
    activeRegistrations: upcomingRegistrations?.length || 0,
    upcomingSessions: 0, // You can implement this based on your data structure
    completedCamps: 0 // You can implement this based on your data structure
  };

  return (
    <ParentLayout title="Parent Dashboard">
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Athletes</p>
                  <h2 className="text-2xl font-bold">{stats.totalAthletes}</h2>
                </div>
                <Users className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Registrations</p>
                  <h2 className="text-2xl font-bold">{stats.activeRegistrations}</h2>
                </div>
                <ListChecks className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Sessions</p>
                  <h2 className="text-2xl font-bold">{stats.upcomingSessions}</h2>
                </div>
                <Clock className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Camps</p>
                  <h2 className="text-2xl font-bold">{stats.completedCamps}</h2>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Athletes Section */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-3 gap-6'}`}>
          {/* Calendar */}
          <Card className={isMobile ? '' : 'col-span-2'}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upcoming Sessions</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/find-camps">Find Camps</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCalendar />
            </CardContent>
          </Card>

          {/* Athletes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>My Athletes</span>
                <Button
                  size="sm"
                  onClick={() => setAddChildDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {childrenLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : childrenError ? (
                <div className="text-center p-4 text-muted-foreground">
                  Failed to load athletes
                </div>
              ) : !children?.length ? (
                <div className="text-center p-4 text-muted-foreground">
                  No athletes added yet
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedAthlete(child);
                          setViewDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {child.profilePhoto ? (
                              <img
                                src={child.profilePhoto}
                                alt={child.fullName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{child.fullName}</p>
                            <div className="flex gap-1">
                              {child.sportsInterests?.map((sport, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {getSportName(sport.sportId)}
                                </Badge>
                              )).slice(0, 2)}
                              {(child.sportsInterests?.length || 0) > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(child.sportsInterests?.length || 0) - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {selectedAthlete && (
        <>
          <ViewAthleteDialog
            athlete={selectedAthlete}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            onEdit={() => {
              setViewDialogOpen(false);
              setEditDialogOpen(true);
            }}
          />
          <SimpleEditAthleteDialog
            athlete={selectedAthlete}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </>
      )}

      {/* Add Athlete Dialog */}
      <Dialog open={addChildDialogOpen} onOpenChange={setAddChildDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add an Athlete</DialogTitle>
            <DialogDescription>
              Create a profile for your athlete to register for camps
            </DialogDescription>
          </DialogHeader>
          <AddAthleteForm onOpenChange={setAddChildDialogOpen} />
        </DialogContent>
      </Dialog>
    </ParentLayout>
  );
}