import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "./dashboard";
import { ParentSidebar } from "@/components/parent-sidebar";
import { BackButton } from "@/components/back-button";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
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
  User,
  Trash2,
  CheckSquare,
  ClipboardCheck,
  Download,
  Eye,
  FileEdit,
  Save,
  Settings,
  UsersRound,
  ChevronDown,
  Table as TableIcon
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { type Camp, type Child } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { EditCampDialog } from "@/components/edit-camp-dialog";
import { CampScheduleDisplay } from "@/components/camp-schedule";
import { EnhancedScheduleEditor } from "@/components/enhanced-schedule-editor";
import { ScheduleEditorDialog } from "@/components/schedule-editor-dialog-fixed";
import { EditCampCustomFields } from "@/components/edit-camp-custom-fields";
import { ExportParticipantsDialog } from "@/components/export-participants-dialog";
import { CampFormFieldsDialog } from "@/components/camp-form-fields-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


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

// Custom hook to fetch camp data
const useCampData = (id: string | undefined) => {
  const queryClient = useQueryClient();
  const { data: camp, isLoading, error: campError } = useQuery<CampWithPermissions>({
    queryKey: ['camp', id],
    queryFn: async () => {
      if (!id) throw new Error('No camp ID provided');
      console.log("Fetching camp with ID:", id);

      // Make sure ID is properly handled - we might get "undefined" as a string
      if (id === 'undefined' || id === 'null') {
        throw new Error('Invalid camp ID: ' + id);
      }

      const url = `/api/camps/${id}`;
      console.log("Full API URL:", url);
      console.log("URL params check - id type:", typeof id, "value:", id);

      try {
        const response = await fetch(url);
        console.log("API Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch camp:", errorText);
          throw new Error(errorText || 'Failed to fetch camp');
        }

        const data = await response.json();
        console.log("Received camp data:", JSON.stringify(data, null, 2));
        return data;
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }
    },
    enabled: !!id && id !== 'undefined' && id !== 'null',
    retry: 1,
    onError: (error) => {
      console.error("Error fetching camp details:", error);
      // toast is not available here, needs to be handled elsewhere.
    }
  });
  return { isLoading, camp, campError };
};


function CampViewPage(props: { id?: string }) {
  const params = useParams();
  const idFromParams = params.id;
  const id = props.id || idFromParams;
  console.log("CampViewPage - id from props:", props.id);
  console.log("CampViewPage - id from params:", idFromParams);
  console.log("CampViewPage - final id being used:", id);

  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if URL contains schedule-editor hash and open dialog if it does
    if (window.location.hash === '#schedule-editor') {
      console.log("Schedule editor hash detected, opening dialog");
      setScheduleEditorOpen(true);
    }
    
    // Add event listener for hash changes
    const handleHashChange = () => {
      if (window.location.hash === '#schedule-editor') {
        console.log("Hash change detected to #schedule-editor");
        setScheduleEditorOpen(true);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [id]); // Re-run when id changes to ensure dialog opens when navigating between camps

  const isParent = user?.role === 'parent';
  const { isLoading, camp, campError } = useCampData(id);


  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery<RegistrationsResponse>({
    queryKey: [`/api/camps/${id}/registrations`],
    enabled: !!id,
  });

  const registrations = registrationsData?.registrations || [];
  const canManage = camp?.permissions?.canManage || false;

  const getRegistrationStatus = () => {
    if (!camp) return 'unknown';

    const now = new Date();
    const regStartDate = new Date(camp.registrationStartDate);
    const regEndDate = new Date(camp.registrationEndDate);
    const campStartDate = new Date(camp.startDate);

    if (now > regEndDate) return 'closed';
    if (now > campStartDate) return 'in_progress';
    if (now < regStartDate) return 'not_open';

    const registeredCount = registrations.length;
    if (registeredCount >= camp.capacity) {
      return camp.waitlistEnabled ? 'waitlist' : 'full';
    }

    return 'open';
  };

  const registrationStatus = camp ? getRegistrationStatus() : 'unknown';

  const isUserRegistered = () => {
    if (!user || !registrations || !isParent) return false;
    return registrations.some((reg: any) => reg.parentId === user.id);
  };

  const { data: children = [], isLoading: isLoadingChildren } = useQuery<Child[]>({
    queryKey: ['/api/parent/children'],
    enabled: isParent && !!user,
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [showChildSelectionDialog, setShowChildSelectionDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [showFormFieldsDialog, setShowFormFieldsDialog] = useState(false);

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

  const registerMutation = useMutation({
    mutationFn: async () => {
      setRegistering(true);
      try {
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

  const deleteCampMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest('POST', `/api/camps/${id}/delete`, {});
        return await response.json();
      } catch (error) {
        console.error("Error deleting camp:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Camp deleted",
        description: "The camp has been successfully deleted.",
      });

      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error("Delete camp error:", error);

      if (error.message && error.message.includes("registration has started")) {
        toast({
          title: "Cannot delete camp",
          description: "This camp cannot be deleted because registration has already started. Please use the cancel option instead.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Delete failed",
          description: error.message || "There was an error deleting the camp.",
          variant: "destructive"
        });
      }
    }
  });

  const cancelCampMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest('POST', `/api/camps/${id}/cancel`, {
          reason: cancelReason
        });
        return await response.json();
      } catch (error) {
        console.error("Error cancelling camp:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Camp cancelled",
        description: "The camp has been cancelled and all registered participants will be notified.",
      });

      queryClient.invalidateQueries({ queryKey: ['camp', id] });
      setShowCancelDialog(false);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Cancel failed",
        description: error.message || "There was an error cancelling the camp.",
        variant: "destructive"
      });
    }
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
    }

    if (!camp) {
      console.log("Camp data is null or undefined", {
        id,
        isLoading,
        campError,
        routeParams: params
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
      <div className="space-y-6 pt-4">
        <div className="flex flex-col w-full mb-6 mt-2">
          <div className="flex w-full mb-3">
            <BackButton
              to={isParent ? "/find-camps" : "/dashboard"}
              label={isParent ? "Back to Camps" : "Back to Dashboard"}
              className="self-start"
            />
          </div>

          <div className="flex flex-col mb-4 w-full">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words max-w-full">
              {camp.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {camp.type === "virtual" ? "Virtual Camp" : `${camp.city}, ${camp.state}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {canManage ? (
              <div className="flex flex-wrap gap-2 items-center justify-center">
                <div className="flex gap-2">
                  <Button onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Camp
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
                {registrationStatus === 'not_open' ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => setShowCancelDialog(true)}
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            ) : isParent ? (
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
              <div className="flex items-center text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mr-2" />
                <span className="text-sm">View only</span>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className={`grid w-full max-w-md ${canManage ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            {canManage && (
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Camp Information</CardTitle>
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

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Camp Sessions</CardTitle>
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Update URL hash to trigger the schedule editor
                          window.location.hash = 'schedule-editor';
                          // This will be picked up by the useEffect hook that monitors hash changes
                        }}
                        className="h-8"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Camp Sessions
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

          <TabsContent value="registrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Registered Athletes
                  {canManage ? '' : ' (Limited View)'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <Button variant="outline" size="sm" className="h-8">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Athletes
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setExportFormat("pdf");
                            setShowExportDialog(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setExportFormat("csv");
                            setShowExportDialog(true);
                          }}>
                            <TableIcon className="h-4 w-4 mr-2" />
                            Export as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
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

                    <div className="space-y-2">
                      {registrations.map((registration: any) => (
                        <div
                          key={registration.id}
                          className="p-3 border rounded-md flex justify-between items-center"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {registration.child?.fullName ? registration.child.fullName.charAt(0) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {registration.child?.fullName || `Athlete ID: ${registration.childId}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Registered: {new Date(registration.registeredAt).toLocaleDateString()}
                              </p>
                            </div>
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


          {canManage && (
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Attendance Tracking
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      className="w-40"
                      placeholder="Filter by date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          console.log("Filter attendance by date:", e.target.value);
                        }
                      }}
                    />
                    <div className="flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setExportFormat("pdf");
                            setShowExportDialog(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            <span>PDF Format</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setExportFormat("csv");
                            setShowExportDialog(true);
                          }}>
                            <TableIcon className="h-4 w-4 mr-2" />
                            <span>CSV Format</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingRegistrations ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !registrations || registrations.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="flex flex-col items-center gap-2">
                        <UsersRound className="h-8 w-8 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium">No Athletes Registered</h3>
                        <p className="text-muted-foreground">
                          When athletes register for this camp, you'll be able to track their attendance here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">ID</TableHead>
                              <TableHead>Athlete</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-center">Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {registrations.map((registration: any) => (
                              <TableRow key={registration.id}>
                                <TableCell className="font-medium">{registration.childId}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>
                                        {registration.child?.fullName ? registration.child.fullName.charAt(0) : '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {registration.child?.fullName || `Athlete #${registration.childId}`}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Registered on {new Date(registration.registeredAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Select defaultValue="not_recorded">
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="not_recorded">Not Recorded</SelectItem>
                                      <SelectItem value="present">Present</SelectItem>
                                      <SelectItem value="absent">Absent</SelectItem>
                                      <SelectItem value="late">Late</SelectItem>
                                      <SelectItem value="excused">Excused</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {new Date().toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              toast({
                                                title: "Edit Athlete Attendance",
                                                description: `Editing attendance for Athlete #${registration.childId}`,
                                                variant: "default"
                                              });
                                            }}
                                          >
                                            <FileEdit className="h-4 w-4" />
                                            <span className="sr-only">Edit</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit attendance</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              toast({
                                                title: "View Athlete Details",
                                                description: `Viewing details for Athlete #${registration.childId}`,
                                                variant: "default"
                                              });
                                            }}
                                          >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View athlete details</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Showing {registrations.length} athletes
                        </p>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Attendance Saved",
                                description: `Saved attendance records for ${registrations.length} athletes.`,
                                variant: "default"
                              });
                            }}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Attendance
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Marked All as Present",
                                description: `All ${registrations.length} athletes have been marked as present.`,
                                variant: "default"
                              });
                            }}
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Mark All Present
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {camp && (
          <>
            <EditCampDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              camp={camp}
            />
            <Dialog open={scheduleEditorOpen} onOpenChange={setScheduleEditorOpen}>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Camp Schedule</DialogTitle>
                  <DialogDescription>
                    Manage your camp schedule with our enhanced calendar view
                  </DialogDescription>
                </DialogHeader>
                {camp && (
                  <EnhancedScheduleEditor
                    campId={camp.id}
                    startDate={camp.startDate}
                    endDate={camp.endDate}
                    onSave={() => setScheduleEditorOpen(false)}
                    editable={true}
                  />
                )}
              </DialogContent>
            </Dialog>

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

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Camp</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this camp? This action cannot be undone.
                    <br />
                    <br />
                    <strong>Note:</strong> Deleting a camp is only possible before registration has started.
                    Once registration has begun, you should cancel the camp instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCampMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteCampMutation.isPending}
                  >
                    {deleteCampMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Camp
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Camp</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this camp? The camp will remain visible but marked as cancelled.
                    <br /><br />
                    Please provide a reason for cancellation. This information will be shared with registered participants.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Reason for cancellation (required)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelCampMutation.mutate()}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    disabled={cancelCampMutation.isPending || !cancelReason.trim()}
                  >
                    {cancelCampMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Cancel Camp
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {camp && (
          <Dialog open={showFormFieldsDialog} onOpenChange={setShowFormFieldsDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Registration Form Fields
                </DialogTitle>
                <DialogDescription>
                  Customize the registration form fields for this camp.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto">
                <EditCampCustomFields camp={camp} />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {camp && (
          <ExportParticipantsDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            campId={parseInt(id)}
            campName={camp.name}
            registrations={registrations || []}
            exportFormat={exportFormat}
          />
        )}

        {camp && (
          <CampFormFieldsDialog
            camp={camp}
            open={showFormFieldsDialog}
            onOpenChange={setShowFormFieldsDialog}
          />
        )}

        {camp && (
          <ScheduleEditorDialog
            campId={parseInt(id)}
            open={scheduleEditorOpen}
            onOpenChange={(open) => {
              setScheduleEditorOpen(open);
              // Clear the hash when closing
              if (!open) {
                navigate(window.location.pathname);
              }
            }}
          />
        )}
      </div>
    );
  };

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