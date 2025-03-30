import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "./dashboard";
import { ParentSidebar } from "@/components/parent-sidebar";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, 
  Edit, 
  MessageSquare, 
  Users, 
  ShieldAlert, 
  CalendarDays, 
  Calendar, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  Clock,
  DollarSign,
  Users2,
  AlertCircle,
  XCircle,
  ClipboardList,
  Ban,
  ListChecks,
  User
} from "lucide-react";
import { type Camp, type Child } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EditCampDialog } from "@/components/edit-camp-dialog";
import { CampScheduleDisplay } from "@/components/camp-schedule";
// Using the fixed schedule editor dialog
import { ScheduleEditorDialog } from "@/components/schedule-editor-dialog-fixed";
import { EditCampCustomFields } from "@/components/edit-camp-custom-fields";

// Extended camp type to include permissions from the server
interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  }
}

// Extended registrations response from the server
interface RegistrationsResponse {
  registrations: any[];
  permissions: {
    canManage: boolean;
  }
}

function CampViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Check if user is a parent
  const isParent = user?.role === 'parent';

  // Updated to use the extended type with permissions
  const { data: camp, isLoading, error: campError } = useQuery<CampWithPermissions>({
    queryKey: ['camp', id],
    queryFn: async () => {
      if (!id) throw new Error('No camp ID provided');
      const response = await fetch(`/api/camps/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch camp');
      }
      return response.json();
    },
    enabled: !!id,
    onError: (error) => {
      console.error("Error fetching camp details:", error);
      toast({
        title: "Error loading camp details",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Updated to use the response type that includes permissions
  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery<RegistrationsResponse>({
    queryKey: [`/api/camps/${id}/registrations`],
    enabled: !!id,
  });

  // Extract the registrations array from the response
  const registrations = registrationsData?.registrations || [];
  
  // Check if the user has permission to manage this camp
  const canManage = camp?.permissions?.canManage || false;

  // Calculate registration status
  const getRegistrationStatus = () => {
    if (!camp) return 'unknown';
    
    const now = new Date();
    const regStartDate = new Date(camp.registrationStartDate);
    const regEndDate = new Date(camp.registrationEndDate);
    const campStartDate = new Date(camp.startDate);
    
    // Check if registration period has ended
    if (now > regEndDate) return 'closed';
    
    // Check if camp has already started
    if (now > campStartDate) return 'in_progress';
    
    // Check if registration hasn't opened yet
    if (now < regStartDate) return 'not_open';
    
    // Check if camp is at capacity
    const registeredCount = registrations.length;
    if (registeredCount >= camp.capacity) {
      return camp.waitlistEnabled ? 'waitlist' : 'full';
    }
    
    // Default case: Registration is open
    return 'open';
  };
  
  const registrationStatus = camp ? getRegistrationStatus() : 'unknown';
  
  // Check if the current user's child is already registered
  const isUserRegistered = () => {
    if (!user || !registrations || !isParent) return false;
    
    // In a real app, we would check if any of the parent's children are registered
    // For now, we'll use a simplified version
    return registrations.some((reg: any) => reg.parentId === user.id);
  };
  
  // Get parent's children
  const { data: children = [], isLoading: isLoadingChildren } = useQuery<Child[]>({
    queryKey: ['/api/parent/children'],
    enabled: isParent && !!user,
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [showChildSelectionDialog, setShowChildSelectionDialog] = useState(false);

  // Dialog to select a child for registration
  const ChildSelectionDialog = () => {
    if (isLoadingChildren) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!children.length) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-2">You don't have any athletes registered yet.</p>
          <p className="text-sm text-muted-foreground">
            Please add an athlete profile before registering for a camp.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setShowChildSelectionDialog(false);
              navigate('/parent-dashboard');
            }}
          >
            Go to Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Please select which athlete you would like to register for this camp:
        </p>
        <div className="grid gap-3">
          {children.map((child) => (
            <Card 
              key={child.id}
              className={`cursor-pointer transition-colors ${selectedChildId === child.id ? 'border-primary' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedChildId(child.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-full h-10 w-10 flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{child.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(child.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedChildId === child.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setShowChildSelectionDialog(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (selectedChildId) {
                registerMutation.mutate();
                setShowChildSelectionDialog(false);
              }
            }}
            disabled={!selectedChildId || registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirm Registration
          </Button>
        </div>
      </div>
    );
  };

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      setRegistering(true);
      try {
        // Use the selected child ID for registration
        const response = await apiRequest('POST', `/api/camps/${id}/register`, {
          campId: parseInt(id),
          childId: selectedChildId,
        });
        
        return await response.json();
      } finally {
        setRegistering(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "You have successfully registered for this camp.",
      });
      
      // Refresh registration data
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${id}/registrations`] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was an error processing your registration.",
        variant: "destructive"
      });
    }
  });

  // Render appropriate content for parent vs organization user
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
    }

    if (!camp) {
      // Add more detailed debugging information for when camp is null
      console.log("Camp data is null or undefined", {
        id,
        isLoading,
        campError,
        routeParams: useParams()
      });
      
      return <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-center">Camp Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-center text-muted-foreground mb-4">
              We couldn't find the camp you're looking for.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/camps/${id}`] })}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          {isParent ? (
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/find-camps')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">{camp.name}</h1>
            </div>
          ) : (
            <h1 className="text-2xl font-bold">{camp.name}</h1>
          )}
          
          <div className="flex gap-2">
            {canManage ? (
              // Only show management buttons if user has permission
              <>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Athletes
                </Button>
                <Button onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Camp
                </Button>
              </>
            ) : isParent ? (
              // For parents show the appropriate registration button based on status
              isUserRegistered() ? (
                <Button variant="outline" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Already Registered
                </Button>
              ) : registrationStatus === 'open' ? (
                <Button 
                  onClick={() => setShowChildSelectionDialog(true)}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Register Now
                </Button>
              ) : registrationStatus === 'waitlist' ? (
                <Button variant="secondary">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Join Waitlist
                </Button>
              ) : registrationStatus === 'closed' ? (
                <Button variant="outline" disabled>
                  <Ban className="h-4 w-4 mr-2" />
                  Registration Closed
                </Button>
              ) : registrationStatus === 'full' ? (
                <Button variant="outline" disabled>
                  <Users2 className="h-4 w-4 mr-2" />
                  Camp Full
                </Button>
              ) : registrationStatus === 'not_open' ? (
                <Button variant="outline" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Registration Opens {new Date(camp.registrationStartDate).toLocaleDateString()}
                </Button>
              ) : registrationStatus === 'in_progress' ? (
                <Button variant="outline" disabled>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Camp In Progress
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <XCircle className="h-4 w-4 mr-2" />
                  Registration Unavailable
                </Button>
              )
            ) : (
              // Show a message for other non-organizers
              <div className="flex items-center text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mr-2" />
                <span className="text-sm">View only</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            {canManage && (
              <TabsTrigger value="form-fields">Form Fields</TabsTrigger>
            )}
          </TabsList>
          
          {/* Camp Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Camp Information</CardTitle>
                      {/* Registration status badge */}
                      {registrationStatus === 'open' && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Registration Open
                        </Badge>
                      )}
                      {registrationStatus === 'not_open' && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Opens Soon
                        </Badge>
                      )}
                      {registrationStatus === 'closed' && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Ban className="h-3 w-3 mr-1" />
                          Closed
                        </Badge>
                      )}
                      {registrationStatus === 'full' && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Users2 className="h-3 w-3 mr-1" />
                          Full
                        </Badge>
                      )}
                      {registrationStatus === 'waitlist' && (
                        <Badge variant="secondary">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Waitlist Available
                        </Badge>
                      )}
                      {registrationStatus === 'in_progress' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          <Calendar className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {registrationStatus === 'open' && (
                        <span className="text-green-600 flex items-center">
                          <span className="inline-block h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                          {camp.capacity - registrations.length} spots remaining
                        </span>
                      )}
                      {registrationStatus === 'waitlist' && (
                        <span className="text-amber-600 flex items-center">
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-600 mr-2"></span>
                          At capacity • Waitlist available
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium">Description</h3>
                      <p className="text-muted-foreground">{camp.description}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p className="text-muted-foreground">
                        {camp.streetAddress}<br />
                        {camp.city}, {camp.state} {camp.zipCode}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Dates</h3>
                      <p className="text-muted-foreground">
                        {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Registration Period</h3>
                      <p className="text-muted-foreground">
                        {new Date(camp.registrationStartDate).toLocaleDateString()} - {new Date(camp.registrationEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">Price</h3>
                        <p className="text-muted-foreground">${camp.price}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Capacity</h3>
                        <p className="text-muted-foreground">{camp.capacity} athletes</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Type</h3>
                        <p className="text-muted-foreground capitalize">{camp.type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Camp Schedule Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Camp Schedule</CardTitle>
                    {canManage && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setScheduleEditorOpen(true)}
                        className="h-8"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Edit Schedule
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CampScheduleDisplay campId={parseInt(id)} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Registrations Tab */}
          <TabsContent value="registrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Registered Athletes
                  {canManage ? '' : ' (Limited View)'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <Button variant="outline" size="sm" className="h-8">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Athletes
                    </Button>
                  )}
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRegistrations ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !registrations || registrations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      No athletes registered yet
                    </p>
                    {canManage && (
                      <Button variant="outline" size="sm" className="mt-4">
                        Add Registration
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Note explaining the view permissions */}
                    {!canManage && (
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mb-4">
                        <p className="flex items-center">
                          <ShieldAlert className="h-4 w-4 mr-2 text-orange-500" />
                          You are viewing this camp as {user?.role === 'parent' ? 'a parent' : 'a guest'}.
                          {user?.role === 'parent' ? 
                            ' You can only see registrations for your own children.' : 
                            ' You need to be part of the organization to view detailed registration information.'}
                        </p>
                      </div>
                    )}
                    
                    {/* Registration list */}
                    <div className="space-y-2">
                      {registrations.map((registration: any) => (
                        <div 
                          key={registration.id} 
                          className="p-3 border rounded-md flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">Athlete ID: {registration.childId}</p>
                            <p className="text-sm text-muted-foreground">
                              Registered: {new Date(registration.registeredAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${registration.paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {registration.paid ? 'Paid' : 'Unpaid'}
                            </span>
                            
                            {canManage && (
                              <Button variant="ghost" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Custom Form Fields Tab - Only for managers */}
          {canManage && (
            <TabsContent value="form-fields">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Registration Form Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EditCampCustomFields camp={camp} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
        
        {/* Edit Camp Dialog */}
        {camp && (
          <>
            <EditCampDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              camp={camp}
            />
            <ScheduleEditorDialog
              open={scheduleEditorOpen}
              onOpenChange={setScheduleEditorOpen}
              camp={camp}
            />
            
            {/* Child Selection Dialog */}
            <Dialog open={showChildSelectionDialog} onOpenChange={setShowChildSelectionDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Athlete to Register</DialogTitle>
                  <DialogDescription>
                    Choose which athlete you would like to register for {camp.name}.
                  </DialogDescription>
                </DialogHeader>
                <ChildSelectionDialog />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    );
  };

  // Render content with appropriate layout
  if (isParent) {
    return (
      <div className="flex min-h-screen bg-background">
        <ParentSidebar />
        <main className="flex-1 p-6 md:p-8">
          {renderContent()}
        </main>
      </div>
    );
  } else {
    return <DashboardLayout>{renderContent()}</DashboardLayout>;
  }
}

export default CampViewPage;