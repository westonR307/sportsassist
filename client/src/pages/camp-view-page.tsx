import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "./dashboard";
import { ParentSidebar } from "@/components/parent-sidebar";
import { BackButton } from "@/components/back-button";
import { ShareCampDialog } from "@/components/share-camp-dialog";
import { CampMetaFieldsDisplay } from "@/components/camp-meta-fields-display";
import { DuplicateCampDialog } from "@/components/duplicate-camp-dialog";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampAvailabilityTab } from "@/components/camp-availability-tab";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CampMessagesTab } from "@/components/camp-messages-tab";
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
  Download,
  Eye,
  FileEdit,
  Save,
  Settings,
  UsersRound,
  ChevronDown,
  Table as TableIcon,
  Share2,
  Copy,
  Link,
  Facebook,
  Mail,
  Twitter,
  Search,
  ClipboardCheck,
  BadgeInfo,
  CalendarClock,
  CalendarRange,
  Check,
  CheckCheck,
  Info,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Video,
  X,
  ArrowRight
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
import { ParentCampMessagesTab } from "@/components/parent-camp-messages-tab"; // Import the new component
import { ViewAthleteDialog } from "@/components/view-athlete-dialog";
import { RegistrationCustomFields } from "@/components/registration-custom-fields";
import { ExtendedChild } from "@shared/child-types";


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
const useCampData = (idOrSlug: string | undefined) => {
  const queryClient = useQueryClient();
  const { data: camp, isLoading, error: campError } = useQuery<CampWithPermissions>({
    queryKey: ['camp', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) throw new Error('No camp identifier provided');
      console.log("Fetching camp with identifier:", idOrSlug);

      // Make sure identifier is properly handled - we might get "undefined" as a string
      if (idOrSlug === 'undefined' || idOrSlug === 'null') {
        throw new Error('Invalid camp identifier: ' + idOrSlug);
      }

      // Determine if we're dealing with a numeric ID or a slug
      const isNumericId = /^\d+$/.test(idOrSlug);

      // Construct the URL based on whether we have a numeric ID or a slug
      const url = isNumericId
        ? `/api/camps/${idOrSlug}`
        : `/api/camps/slug/${idOrSlug}`;

      console.log("Full API URL:", url);
      console.log("Using slug-based URL:", !isNumericId);

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
    enabled: !!idOrSlug && idOrSlug !== 'undefined' && idOrSlug !== 'null',
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
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [manageAvailabilityOpen, setManageAvailabilityOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // State to hold the organization's data for applying styling
  const [orgStyles, setOrgStyles] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (location.includes('#schedule-editor')) {
      setScheduleEditorOpen(true);
    }
  }, [location]);

  const isParent = user?.role === 'parent';
  const { isLoading, camp, campError } = useCampData(id);
  
  // Query to get organization details for styling
  const { data: organization } = useQuery({
    queryKey: ['/api/organizations', camp?.organizationId],
    enabled: !!camp?.organizationId,
  });
  
  // Debug log the organization data
  useEffect(() => {
    if (organization) {
      console.log("Organization data loaded:", organization);
    }
  }, [organization]);
  
  // Set organization styling when organization data is available
  useEffect(() => {
    if (organization) {
      // Check both camelCase and snake_case property versions for maximum compatibility
      // This handles API response format differences
      const primaryColor = organization.primary_color || organization.primaryColor || '#BA0C2F';
      const secondaryColor = organization.secondary_color || organization.secondaryColor || primaryColor;
      
      console.log("Setting organization colors:", {
        primary: primaryColor,
        secondary: secondaryColor
      });
      
      setOrgStyles({
        '--primary': primaryColor,
        '--primary-foreground': '#ffffff',
        '--secondary': secondaryColor,
        '--border': primaryColor,
        '--ring': primaryColor,
      } as React.CSSProperties);
    }
  }, [organization]);
  
  // Define hero background style based on organization colors
  const heroBgStyle = organization && (organization.banner_image_url || organization.bannerImageUrl)
    ? { 
        backgroundImage: `url(${organization.banner_image_url || organization.bannerImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } 
    : { 
        // Check both camelCase and snake_case property versions for maximum compatibility
        background: `linear-gradient(135deg, 
          ${organization?.primary_color || organization?.primaryColor || '#BA0C2F'}, 
          ${organization?.secondary_color || organization?.secondaryColor || 
            organization?.primary_color || organization?.primaryColor || '#cc0000'})`
      };


  // Only fetch registrations using the camp numeric ID (not the slug)
  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery<RegistrationsResponse>({
    queryKey: [`/api/camps/${camp?.id}/registrations`],
    enabled: !!camp?.id, // Only enable when we have the numeric camp ID from the camp data
  });

  // Define hasPermission before using it
  const hasPermission = camp?.permissions?.canManage || false;

  // Fetch slot bookings for availability-based camps
  const { data: slotBookingsData, isLoading: isLoadingSlotBookings } = useQuery({
    queryKey: [`/api/camps/${camp?.id}/bookings`],
    queryFn: async () => {
      console.log(`Fetching slot bookings for camp ID ${camp?.id}`);
      try {
        const response = await fetch(`/api/camps/${camp?.id}/bookings`);
        if (!response.ok) {
          console.error(`Error fetching slot bookings: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`Retrieved ${data.length} slot bookings:`, data);
        // Log the first slot with its bookings for debugging
        if (data.length > 0) {
          console.log("First slot details:", {
            id: data[0].id,
            date: data[0].slotDate,
            times: `${data[0].startTime} - ${data[0].endTime}`,
            bookings: data[0].bookings || []
          });
        }
        return data;
      } catch (error) {
        console.error("Error in slot bookings query:", error);
        return [];
      }
    },
    enabled: !!camp?.id && !!camp?.schedulingType && camp.schedulingType === 'availability' && hasPermission,
  });

  // Get all registrations from the API response
  const allRegistrations = registrationsData?.registrations || [];

  // Deduplicate registrations based on childId to prevent duplicate displays
  // This ensures we only show one entry per child, even if multiple registrations exist
  const uniqueChildIds = new Set();
  const registrations = allRegistrations.filter((registration: any) => {
    // If we haven't seen this childId before, keep this registration
    if (!uniqueChildIds.has(registration.childId)) {
      uniqueChildIds.add(registration.childId);
      return true;
    }
    // Skip duplicate registrations for the same child
    return false;
  });

  const slotBookings = slotBookingsData || [];
  const showMessagesTab = hasPermission || isParent;

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
    // Check if the user has any registrations (normal or waitlisted)
    return registrations.some((reg: any) => 
      (reg.parentId === user.id || (reg.parent && reg.parent.id === user.id))
    );
  };

  // Check if a specific child is already registered for this camp
  const isChildRegistered = (childId: number) => {
    // For availability-based camps, always allow children to be re-selected
    // so they can register for multiple different time slots
    if (camp?.schedulingType === 'availability') {
      return false;
    }

    // For fixed-schedule camps, prevent registering the same child multiple times
    if (!registrations) return false;
    return registrations.some((reg: any) => reg.childId === childId);
  };

  // Check if user is specifically on the waitlist
  const isUserWaitlisted = () => {
    if (!user || !registrations || !isParent) return false;
    // Check if the user has a waitlisted registration
    return registrations.some((reg: any) => 
      (reg.parentId === user.id || (reg.parent && reg.parent.id === user.id)) && 
      reg.status === "waitlisted"
    );
  };

  // Function to handle viewing an athlete
  const handleViewAthlete = (registration: any) => {
    // Get the custom field responses for this registration
    const registrationData = {
      id: registration.id,
      customFieldResponses: registration.customFieldResponses || []
    };

    // Get the athlete data
    const athleteData = {
      id: registration.childId,
      fullName: registration.child?.fullName || 'Unknown',
      dateOfBirth: registration.child?.dateOfBirth || new Date(),
      gender: registration.child?.gender || 'other',
      profilePhoto: registration.child?.profilePhoto || null,
      parentId: registration.parentId,
      emergencyContact: registration.child?.emergencyContact || '',
      emergencyPhone: registration.child?.emergencyPhone || '',
      medicalInformation: registration.child?.medicalInformation || '',
      specialNeeds: registration.child?.specialNeeds || '',
      sportsHistory: registration.child?.sportsHistory || '',
      sportsInterests: registration.child?.sportsInterests || [],
      height: registration.child?.height || '',
      weight: registration.child?.weight || '',
      jerseySize: registration.child?.jerseySize || ''
    };

    setSelectedAthlete(athleteData);
    setSelectedRegistration(registrationData);
    setViewAthleteDialogOpen(true);
  };

  const { data: children = [], isLoading: isLoadingChildren } = useQuery<Child[]>({
    queryKey: ['/api/parent/children'],
    enabled: isParent && !!user,
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  // For single slot selection
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  // For multiple slot selection
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  // Custom field responses for registration
  const [customFieldResponses, setCustomFieldResponses] = useState<Record<string, any>>({});
  const [showChildSelectionDialog, setShowChildSelectionDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [showFormFieldsDialog, setShowFormFieldsDialog] = useState(false);
  const [showAllAvailabilitySlots, setShowAllAvailabilitySlots] = useState(false);

  // State variables for the ViewAthleteDialog
  const [selectedAthlete, setSelectedAthlete] = useState<ExtendedChild | null>(null);
  const [viewAthleteDialogOpen, setViewAthleteDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);

  // Query to fetch availability slots for the camp if it's availability-based
  const { data: availabilitySlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: [`/api/camps/${camp?.id}/availability-slots`],
    enabled: !!camp?.id && camp?.schedulingType === 'availability',
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Add some debug logging
    onSuccess: (data) => {
      console.log("Availability slots fetch success:", data);
    },
    onError: (error) => {
      console.error("Availability slots fetch error:", error);
    }
  });

  const ChildSelectionDialog = () => {
    const isWaitlist = registrationStatus === 'waitlist';
    const isAvailabilityBased = camp?.schedulingType === 'availability';

    if (isLoadingChildren || (isAvailabilityBased && isLoadingSlots)) {
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
            Please add an athlete profile before {isWaitlist ? 'joining the waitlist' : 'registering for a camp'}.
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
          Please select which athlete you would like to {isWaitlist ? 'add to the waitlist' : 'register'} for this camp:
        </p>
        <div className="grid gap-3">
          {(() => {
            const availableChildren = children.filter(child => !isChildRegistered(child.id));

            if (availableChildren.length === 0) {
              return (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">All your athletes are already registered for this camp.</p>
                  <p className="text-sm text-muted-foreground">
                    To register a new athlete, please add them to your profile first.
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

            return availableChildren.map((child) => (
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
            ));
          })()}
        </div>
        {isWaitlist && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Waitlist Information</AlertTitle>
            <AlertDescription>
              This camp is currently at capacity. By joining the waitlist, you'll be notified if a spot becomes available.
            </AlertDescription>
          </Alert>
        )}

        {/* Custom registration fields if enabled for this camp */}
        {camp?.customRegistrationEnabled && selectedChildId && !isWaitlist && (
          <div className="mt-4">
            <RegistrationCustomFields 
              campId={camp.id} 
              onFieldsChange={setCustomFieldResponses} 
            />
          </div>
        )}

        {/* Slot selection for availability-based camps */}
        {isAvailabilityBased && !isWaitlist && selectedChildId && availabilitySlots.length > 0 && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="font-medium mb-3">Select Time Slots</h3>
            <p className="text-sm text-muted-foreground mb-3">You can select multiple time slots for your athlete.</p>
            <div className="space-y-3">
              {availabilitySlots
                .filter((slot: any) => {
                  console.log("Checking slot for slot selection:", slot);
                  return !slot.booked && slot.currentBookings < (slot.capacity || slot.maxBookings);
                })
                .map((slot: any) => {
                  console.log("Slot raw data:", slot); // Debug log to see the raw slot data
                  // Fix date formatting - slot might have slotDate or date property
                  const slotDateStr = slot.slotDate || slot.date;
                  const date = new Date(slotDateStr);
                  // Make sure the date is valid before trying to format the time
                  const dateISOString = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                  const startTime = new Date(`${dateISOString}T${slot.startTime}`);
                  const endTime = new Date(`${dateISOString}T${slot.endTime}`);
                  const formattedDate = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  const formattedStartTime = startTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                  const formattedEndTime = endTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

                  const isSelected = selectedSlotIds.includes(slot.id);

                  return (
                    <div 
                      key={slot.id}
                      className={`border rounded-md p-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        // Toggle slot selection
                        if (isSelected) {
                          setSelectedSlotIds(selectedSlotIds.filter(id => id !== slot.id));
                        } else {
                          setSelectedSlotIds([...selectedSlotIds, slot.id]);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{formattedDate}</p>
                          <p className="text-sm text-muted-foreground">
                            {formattedStartTime} - {formattedEndTime}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSlotIds([...selectedSlotIds, slot.id]);
                              }}
                            >
                              Select
                            </Button>
                          )}
                        </div>
                      </div>
                      {slot.description && (
                        <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{slot.description}</p>
                      )}
                    </div>
                  );
                })}

              {availabilitySlots.filter((slot: any) => !slot.booked && slot.currentBookings < (slot.capacity || slot.maxBookings)).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No available time slots found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowChildSelectionDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // For availability-based camps, require a slot selection
              const requiresSlotSelection = camp?.schedulingType === 'availability' && !isWaitlist;
              if (selectedChildId && (!requiresSlotSelection || (selectedSlotIds.length > 0 || selectedSlotId))) {
                registerMutation.mutate();
                setShowChildSelectionDialog(false);
              }
            }}
            disabled={
              !selectedChildId || 
              registerMutation.isPending || 
              (camp?.schedulingType === 'availability' && !isWaitlist && selectedSlotIds.length === 0 && !selectedSlotId)
            }
            variant={isWaitlist ? "secondary" : "default"}
          >
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isWaitlist ? (
              <ClipboardList className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isWaitlist ? 'Join Waitlist' : 'Confirm Registration'}
          </Button>
        </div>
      </div>
    );
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      setRegistering(true);
      try {
        // Make sure we use the numeric camp ID from the camp object, not the slug from the URL
        const campId = camp?.id;
        if (!campId) {
          throw new Error("Camp ID not available");
        }

        console.log("Registering for camp with ID:", campId);

        // Handle multiple slot selections for availability-based camps
        if (camp.schedulingType === 'availability' && selectedSlotIds.length > 0) {
          console.log("Registering for multiple slots:", selectedSlotIds);

          // Process each slot registration sequentially
          const results = [];
          for (const slotId of selectedSlotIds) {
            const requestBody: any = {
              campId: campId,
              childId: selectedChildId,
              slotId: slotId,
              customFieldResponses: Object.keys(customFieldResponses).length > 0 ? customFieldResponses : undefined,
            };

            console.log("Registration request with custom fields and slot:", requestBody);
            const response = await apiRequest('POST', `/api/camps/${campId}/register`, requestBody);
            const result = await response.json();
            results.push(result);

            // Add a small delay between requests to prevent race conditions
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          return { multipleRegistrations: true, results };
        } else {
          // Regular single registration
          const requestBody: any = {
            campId: campId,
            childId: selectedChildId,
            customFieldResponses: Object.keys(customFieldResponses).length > 0 ? customFieldResponses : undefined,
          };

          // If this is an availability-based camp and a slot was selected, include it
          if (camp.schedulingType === 'availability' && selectedSlotId) {
            requestBody.slotId = selectedSlotId;
          }

          console.log("Registration request with custom fields:", requestBody);
          const response = await apiRequest('POST', `/api/camps/${campId}/register`, requestBody);
          return await response.json();
        }
      } finally {
        setRegistering(false);
        // Reset selections
        setSelectedSlotIds([]);
        setSelectedSlotId(null);
      }
    },
    onSuccess: (data) => {
      // Handle multi-slot registrations 
      if (data.multipleRegistrations && data.results) {
        const successfulCount = data.results.filter((r: any) => !r.error).length;
        const totalCount = data.results.length;

        if (successfulCount === totalCount) {
          toast({
            title: "Multiple registrations successful",
            description: `Successfully registered for ${successfulCount} time slots.`,
          });
        } else if (successfulCount === 0) {
          toast({
            title: "Registration failed",
            description: "Failed to register for any of the selected time slots.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Partial registration successful",
            description: `Successfully registered for ${successfulCount} out of ${totalCount} selected time slots.`,
          });
        }
      } else if (data.isWaitlisted) {
        toast({
          title: "Added to waitlist",
          description: "You have been added to the waitlist for this camp. We'll notify you if a spot becomes available.",
        });
      } else {
        toast({
          title: "Registration successful",
          description: "You have successfully registered for this camp.",
        });
      }

      // Invalidate the camp registrations query with the camp ID
      if (camp?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/camps/${camp.id}/registrations`] });
      }
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
        // Check if we need to use the camp's numeric ID directly instead of the slug
        const actualCampId = camp?.id || id;
        console.log("Deleting camp with ID:", actualCampId);
        const response = await apiRequest('POST', `/api/camps/${actualCampId}/delete`, {});
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
        // Check if we need to use the camp's numeric ID directly instead of the slug
        const actualCampId = camp?.id || id;
        console.log("Cancelling camp with ID:", actualCampId);
        const response = await apiRequest('POST', `/api/camps/${actualCampId}/cancel`, {
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
      <div className="space-y-6">
        {/* Hero section with gradient background */}
        <div 
          className="relative w-full rounded-lg overflow-hidden shadow-lg"
          style={heroBgStyle}
        >
          <div className="absolute top-4 left-4 z-10">
            <BackButton
              to={isParent ? "/find-camps" : "/dashboard"}
              label={isParent ? "Back to Camps" : "Back to Dashboard"}
              className="bg-white/90 hover:bg-white shadow-md"
            />
          </div>
          
          <div className="relative z-0 p-6 pb-12 md:p-10 md:pb-16">
            <div className="pt-8 md:pt-10 text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight break-words max-w-full drop-shadow-md">
                {camp.name}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-4 text-white/95">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-base md:text-lg font-medium">
                    {camp.isVirtual ? "Virtual Camp" : `${camp.city}, ${camp.state}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  <span className="text-base md:text-lg font-medium">
                    {format(new Date(camp.startDate), 'MMM d')} - {format(new Date(camp.endDate), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  <span className="text-base md:text-lg font-medium">
                    {registrations.length} / {camp.capacity} athletes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col w-full px-1">

          <div className="flex flex-wrap gap-2 items-center">
            {hasPermission && (
              <div className="flex flex-wrap gap-2 items-center justify-center">
                <div className="flex gap-2">
                  <Button onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Camp
                  </Button>
                  <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={() => setShowDuplicateDialog(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
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
            )}

            {isParent && !hasPermission && (
              <div className="flex gap-2">
                {isUserRegistered() ? (
                  <Button variant="outline" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isUserWaitlisted() ? 'On Waitlist' : 'Already Registered'}
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
                  <Button
                    onClick={() => setShowChildSelectionDialog(true)}
                    variant="secondary"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardList className="h-4 w-4 mr-2" />
                    )}
                    Join Waitlist
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            )}

            {user && !hasPermission && !isParent && (
              <div className="flex gap-2">
                {isUserRegistered() ? (
                  <Button variant="outline" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isUserWaitlisted() ? 'On Waitlist' : 'Already Registered'}
                  </Button>
                ) : registrationStatus === 'waitlist' ? (
                  <Button 
                    variant="secondary"
                    onClick={() => setShowChildSelectionDialog(true)}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardList className="h-4 w-4 mr-2" />
                    )}
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
                )}
                <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            )}

            {!user && !hasPermission && !isParent && (
              <div className="flex items-center text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mr-2" />
                <span className="text-sm">View only</span>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" id="camp-tabs">
          <TabsList className="mb-4 w-full grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-1 p-1">
            <TabsTrigger value="details" className="text-xs sm:text-sm whitespace-nowrap">Details</TabsTrigger>
            <TabsTrigger value="registrations" className="text-xs sm:text-sm whitespace-nowrap">Registrations</TabsTrigger>
            {hasPermission && (
              <TabsTrigger value="attendance" className="text-xs sm:text-sm whitespace-nowrap">Attendance</TabsTrigger>
            )}
            {showMessagesTab && <TabsTrigger value="messages" className="text-xs sm:text-sm whitespace-nowrap">Messages</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="border-t-4 shadow-md" style={{borderTopColor: organization?.primary_color || organization?.primaryColor || 'hsl(var(--primary))'}}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Info className="h-5 w-5" style={{color: organization?.primary_color || organization?.primaryColor}} />
                        Camp Details
                      </CardTitle>
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
                  <CardContent className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" style={{color: organization?.primary_color || organization?.primaryColor}} />
                        Description
                      </h3>
                      <p className="text-muted-foreground">{camp.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" style={{color: organization?.primary_color || organization?.primaryColor}} />
                          Location
                        </h3>
                        <p className="text-muted-foreground">
                          {camp.isVirtual ? (
                            <span className="flex items-center">
                              <Video className="h-4 w-4 mr-2" />
                              Virtual
                            </span>
                          ) : (
                            <>
                              {camp.streetAddress}<br />
                              {camp.city}, {camp.state} {camp.zipCode}
                            </>
                          )}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{color: organization?.primary_color || organization?.primaryColor}} />
                          Camp Dates
                        </h3>
                        <p className="text-muted-foreground">
                          {new Date(camp.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(camp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <CalendarRange className="h-4 w-4" style={{color: organization?.primary_color || organization?.primaryColor}} />
                          Registration Period
                        </h3>
                        <p className="text-muted-foreground">
                          {new Date(camp.registrationStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(camp.registrationEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <h3 className="font-medium mb-1 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" style={{color: organization?.primary_color || organization?.primaryColor}} />
                              Price
                            </h3>
                            <p className="text-muted-foreground font-medium">${camp.price}</p>
                          </div>
                          <div>
                            <h3 className="font-medium mb-1 flex items-center gap-1">
                              <Users className="h-3 w-3" style={{color: organization?.primary_color || organization?.primaryColor}} />
                              Capacity
                            </h3>
                            <p className="text-muted-foreground">{camp.capacity}</p>
                          </div>
                          <div>
                            <h3 className="font-medium mb-1 flex items-center gap-1">
                              <BadgeInfo className="h-3 w-3" style={{color: organization?.primary_color || organization?.primaryColor}} />
                              Type
                            </h3>
                            <p className="text-muted-foreground capitalize">{camp.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Display availability slots directly on the details page if this is an availability-based camp */}
                    {camp.schedulingType === 'availability' && (
                      <div className="mt-6 pt-6 border-t">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Available Time Slots
                          </h3>

                          {/* Add a prominent "Manage Availability" button for camp creators */}
                          {hasPermission && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setManageAvailabilityOpen(true)}
                              className="flex items-center"
                            >
                              <Settings className="h-4 w-4 mr-1" /> Manage Availability
                            </Button>
                          )}
                        </div>

                        {isLoadingSlots ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : availabilitySlots && availabilitySlots.length > 0 ? (
                          <div className="space-y-3">
                            {console.log("Details Tab Slots:", availabilitySlots)}
                            {availabilitySlots
                              .filter((slot: any) => {
                                console.log("Slot:", slot);
                                return !slot.booked && slot.currentBookings < (slot.capacity || slot.maxBookings);
                              })
                              .slice(0, showAllAvailabilitySlots ? undefined : 5) // Show all or just 5 slots
                              .map((slot: any) => {
                                console.log("Processing slot:", slot); // Debug log
                                // Fix date formatting - slot might have slotDate or date property
                                const slotDateStr = slot.slotDate || slot.date;
                                const date = new Date(slotDateStr);
                                // Make sure the date is valid before trying to format the time
                                const dateISOString = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                                const startTime = new Date(`${dateISOString}T${slot.startTime}`);
                                const endTime = new Date(`${dateISOString}T${slot.endTime}`);
                                const formattedDate = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                                const formattedStartTime = startTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                                const formattedEndTime = endTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

                                return (
                                  <div 
                                    key={slot.id}
                                    className="border rounded-md p-3"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium">{formattedDate}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {formattedStartTime} - {formattedEndTime}
                                        </p>
                                      </div>
                                      <div>
                                        <Button 
                                          size="sm" 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (user?.role === 'parent') {
                                              setShowChildSelectionDialog(true);
                                            } else {
                                              toast({
                                                title: "Login required",
                                                description: "Please login as a parent to register for this camp."
                                              });
                                            }
                                          }}
                                          variant="outline"
                                        >
                                          Register
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            {availabilitySlots.filter((slot: any) => !slot.booked && slot.currentBookings < (slot.capacity || slot.maxBookings)).length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-muted-foreground">No available time slots found.</p>
                              </div>
                            ) : (
                              <div className="mt-2 text-center">
                                {/* Show different button based on state and permissions */}
                                {showAllAvailabilitySlots && !hasPermission ? (
                                  <Button 
                                    variant="link" 
                                    onClick={() => setShowAllAvailabilitySlots(false)}
                                  >
                                    Show fewer slots
                                  </Button>
                                ) : (
                                  availabilitySlots.filter((slot: any) => !slot.booked && slot.currentBookings < (slot.capacity || slot.maxBookings)).length > 5 && (
                                    <Button 
                                      variant="link" 
                                      onClick={() => {
                                        // Since we removed the availability tab, show management UI directly
                                        if (hasPermission) {
                                          setManageAvailabilityOpen(true);
                                        } else {
                                          // For non-admin users, just expand to show all slots
                                          setShowAllAvailabilitySlots(true);
                                        }
                                      }}
                                    >
                                      {hasPermission ? "Manage availability" : "View all available slots"}
                                    </Button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">No availability slots have been added yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Display custom meta fields */}
                <CampMetaFieldsDisplay 
                  campId={camp.id} 
                  canManage={camp.permissions?.canManage || false} 
                  className="mb-6"
                />

                {camp.schedulingType !== 'availability' && (
                  <Card className="border-t-4" style={{borderTopColor: organization?.secondary_color || organization?.secondaryColor || organization?.primary_color || organization?.primaryColor || 'hsl(var(--primary))'}}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <CalendarClock className="h-5 w-5 text-muted-foreground" />
                          Camp Schedule
                        </CardTitle>
                        <CardDescription>
                          Session dates and times for this camp
                        </CardDescription>
                      </div>
                      {hasPermission && (
                        <div className="flex">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScheduleEditorOpen(true)}
                            className="h-8 mr-2"
                            style={{
                              borderColor: organization?.primary_color || organization?.primaryColor,
                              color: organization?.primary_color || organization?.primaryColor
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Edit Schedule
                          </Button>

                          {camp.schedulingType === "availability" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setManageAvailabilityOpen(true)}
                              className="h-8"
                              style={{
                                borderColor: organization?.primary_color || organization?.primaryColor,
                                color: organization?.primary_color || organization?.primaryColor
                              }}
                            >
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Manage Availability
                            </Button>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <CampScheduleDisplay campId={camp.id} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="registrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Registered Athletes
                  {hasPermission ? '' : ' (Limited View)'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {hasPermission && (
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
                    {hasPermission && (
                      <Button variant="outline" size="sm" className="mt-4">
                        Add Registration
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!hasPermission && (
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
                      {registrations.map((registration: any) => {
                        // For availability-based camps, find slot bookings for this registration
                        let bookedSlots: any[] = [];

                        if (camp?.schedulingType === 'availability' && slotBookings?.length > 0) {
                          // Find slots this participant is registered for
                          bookedSlots = slotBookings.filter((slot: any) => {
                            console.log(`Checking slot ID ${slot.id} for childId ${registration.childId}`, 
                              `Bookings:`, JSON.stringify(slot.bookings, null, 2));

                            // Check if slot has bookings array and if any booking matches this child
                            return Array.isArray(slot.bookings) && slot.bookings.some((booking: any) => {
                              // Try different property names that might contain child ID
                              const bookingChildId = booking.childId || booking.child_id;
                              // If booking has a nested child object, check its ID
                              const childObjectId = booking.child?.id;
                              // Compare with registration's childId
                              const match = bookingChildId === registration.childId || childObjectId === registration.childId;

                              if (match) {
                                console.log(`Found match for child ${registration.childId} in slot ${slot.id}`);
                              }
                              return match;
                            });
                          });

                          console.log(`Found ${bookedSlots.length} booked slots for registration ${registration.id} (childId: ${registration.childId})`);
                        }

                        return (
                          <div
                            key={registration.id}
                            className="p-3 border rounded-md flex flex-col"
                          >
                            <div className="flex justify-between items-center">
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
                                <div className="flex items-center gap-2">
                                  {registration.status === 'waitlisted' && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                      Waitlist
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded-full text-xs ${registration.paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {registration.paid ? 'Paid' : 'Unpaid'}
                                  </span>
                                </div>

                                {hasPermission && (
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Display booked slots for availability-based camps */}
                            {camp?.schedulingType === 'availability' && hasPermission && bookedSlots.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium mb-1">Registered Time Slots:</p>
                                <div className="flex flex-wrap gap-1">
                                  {bookedSlots.map((slot: any) => {
                                    const slotDate = new Date(slot.slotDate);
                                    const formattedDate = slotDate.toLocaleDateString(undefined, {
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric'
                                    });

                                    const startTime = new Date(`${slotDate.toISOString().split('T')[0]}T${slot.startTime}`);
                                    const endTime = new Date(`${slotDate.toISOString().split('T')[0]}T${slot.endTime}`);

                                    const formattedTime = `${startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - 
                                      ${endTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;

                                    return (
                                      <span key={slot.id} className="px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                        {formattedDate} • {formattedTime}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {hasPermission && (
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
                                  {registration.status === 'waitlisted' ? (
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                      Waitlisted
                                    </Badge>
                                  ) : (
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
                                  )}
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
                                            onClick={() => handleViewAthlete(registration)}
                                          >
                                            <Search className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View Athlete Details</p>
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

          {showMessagesTab && (
            <TabsContent value="messages">
              <Card>
                <CardContent className="pt-6">
                  {isParent ? (
                    <ParentCampMessagesTab campId={camp.id} />
                  ) : (
                    <CampMessagesTab campId={camp.id} campName={camp.name} hasPermission={hasPermission} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {camp?.schedulingType === "availability" && (
            <Dialog open={manageAvailabilityOpen} onOpenChange={setManageAvailabilityOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Availability Slots</DialogTitle>
                  <DialogDescription>
                    Add, edit, or remove availability slots for this camp.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <CampAvailabilityTab 
                    campId={camp.id} 
                    startDate={new Date(camp.startDate)} 
                    endDate={new Date(camp.endDate)}
                    onClose={() => setManageAvailabilityOpen(false)} 
                  />
                </div>
              </DialogContent>
            </Dialog>
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
          <ShareCampDialog
            isOpen={showShareDialog}
            onClose={() => setShowShareDialog(false)}
            campName={camp.name}
            campSlug={camp.slug || String(camp.id)}
          />
        )}

        {camp && (
          <DuplicateCampDialog
            campId={camp.id}
            open={showDuplicateDialog}
            onOpenChange={setShowDuplicateDialog}
          />
        )}
      </div>
    );
  };

  // Determine the appropriate rendering approach based on user role and route
  // Most routes should be coming through Router in App.tsx with the appropriate layout

  if (isParent) {
    // For parent users, determine if we should use the parent dashboard layout
    if (location.includes('/dashboard/camp/') || location.includes('/dashboard/register/camp/')) {
      // If it's a dashboard route, use plain content as parent dashboard layout is already applied
      return renderContent();
    } else if (location.includes('/camp/') || location.includes('/register/camp/')) {
      // If coming through /camp/ routes, content is already wrapped in AppLayout
      // Just render content without additional wrapper
      return renderContent();
    } else {
      // Fallback for direct access - just simple padding, no parent dashboard or regular layout
      return (
        <div className="p-4 md:p-6">
          {renderContent()}
        </div>
      );
    }
  } else {
    // For camp creators and admins, we always use the dashboard layout
    return <DashboardLayout>{renderContent()}</DashboardLayout>;
  }
}

export default CampViewPage;