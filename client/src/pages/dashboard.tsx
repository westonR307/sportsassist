import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlipCard } from "@/components/ui/flip-card";
import { CampScheduleSummary } from "@/components/camp-schedule";
import {
  Plus,
  Settings,
  Users,
  BarChart3,
  Calendar,
  LogOut,
  CreditCard,
  Loader2,
  Menu,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Clock,
  DollarSign,
  Users2,
  CalendarRange,
  Tag,
  CalendarDays,
  Info,
  RefreshCw,
  Phone,
  Mail,
  FileText,
  Award,
  ClipboardList,
  Clipboard,
  X,
  MessageSquare,
  User,
} from "lucide-react";
import { GiBaseballBat } from "react-icons/gi";
import { useLocation as useWouterLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";
import DashboardCalendar from "@/components/dashboard-calendar";
import DashboardSummaryCards from "@/components/dashboard-summary-cards";
import { CreatorLayout } from "@/components/creator-layout";


// Organization interface
interface Organization {
  id: number;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  stripeAccountId?: string | null;
  createdAt?: Date;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useWouterLocation();
  const { user, logoutMutation } = useAuth();
  // Initialize sidebar closed by default (safer for mobile)
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  // Initialize settings menu as collapsed
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  
  // Load organization data if the user has an organizationId
  const { data: organization } = useQuery<Organization>({
    queryKey: [`/api/organizations/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });
  
  // Set sidebar state based on screen size on initial load
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 1024; // 1024px is the lg breakpoint in Tailwind
    setSidebarOpen(isDesktop);
    
    // Also close sidebar when navigation happens (for mobile)
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    // Listen for location changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  const wouterLocation = useWouterLocation()[0];

  // Parent and athlete users don't have organizationId
  const isParentOrAthlete = user?.role === 'parent' || user?.role === 'athlete';
  
  // Only check for organizationId for non-parent/athlete roles
  if (!isParentOrAthlete && !user?.organizationId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button - Hidden when sidebar is open */}
      <div className={`lg:hidden fixed top-0 left-0 m-4 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 h-screen bg-white border-r 
        transition-all duration-300 ease-in-out z-40
        ${sidebarOpen ? "w-64" : "w-0 lg:w-16"} 
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        overflow-hidden
      `}
      >
        <div className="p-4 border-b whitespace-nowrap relative">
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold text-lg ${!sidebarOpen && "lg:opacity-0"}`}>
              {organization?.name || "Sports Camp Manager"}
            </h2>
            {/* Close button for mobile */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden absolute right-2 top-3"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {organization?.name && sidebarOpen && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Sports Camp Management
            </p>
          )}
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => {
              navigate("/dashboard");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard" ? "bg-gray-100" : ""
            }`}
          >
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Dashboard</span>
          </button>
          <button
            onClick={() => {
              navigate("/dashboard/camps");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/camps" ? "bg-gray-100" : ""
            }`}
          >
            <GiBaseballBat className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Camps</span>
          </button>
          <button
            onClick={() => {
              navigate("/dashboard/reports");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/reports" ? "bg-gray-100" : ""
            }`}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Reports</span>
          </button>
          <button
            onClick={() => {
              navigate("/dashboard/team");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/team" ? "bg-gray-100" : ""
            }`}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Team</span>
          </button>
          {/* Settings dropdown with toggle */}
          <div className="relative">
            {/* Settings Header with toggle */}
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
              }}
              className={`flex justify-between w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                wouterLocation.startsWith("/dashboard/settings") || 
                wouterLocation === "/dashboard/permissions" || 
                wouterLocation === "/custom-fields" || 
                wouterLocation === "/dashboard/organization-profile" || 
                wouterLocation === "/dashboard/stripe-connect" || 
                wouterLocation === "/dashboard/subscription-plans" ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Settings</span>
              </div>
              {sidebarOpen && (
                <div className="flex items-center text-gray-400">
                  {settingsExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  )}
                </div>
              )}
            </button>
            
            {/* Settings Sub-items */}
            {sidebarOpen && settingsExpanded && (
              <div className="pl-6 mt-1 space-y-1">
                {/* Account Settings Link */}
                <button
                  onClick={() => {
                    navigate("/dashboard/settings");
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                    wouterLocation === "/dashboard/settings" ? "bg-gray-100" : ""
                  }`}
                >
                  <User className="h-5 w-5 flex-shrink-0" />
                  <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Account Settings</span>
                </button>
              
                {/* Permission Management Link - Only visible to camp creators */}
                {user?.role === "camp_creator" && (
                  <button
                    onClick={() => {
                      navigate("/dashboard/permissions");
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                      wouterLocation === "/dashboard/permissions" ? "bg-gray-100" : ""
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                    <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Permissions</span>
                  </button>
                )}
                
                {/* Custom Fields Link */}
                {(user?.role === "camp_creator" || user?.role === "manager") && (
                  <button
                    onClick={() => {
                      navigate("/custom-fields");
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                      wouterLocation === "/custom-fields" ? "bg-gray-100" : ""
                    }`}
                  >
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Custom Fields</span>
                  </button>
                )}
                
                {/* Organization Profile Link */}
                {(user?.role === "camp_creator" || user?.role === "manager") && (
                  <button
                    onClick={() => {
                      navigate("/dashboard/organization-profile");
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                      wouterLocation === "/dashboard/organization-profile" ? "bg-gray-100" : ""
                    }`}
                  >
                    <Users2 className="h-5 w-5 flex-shrink-0" />
                    <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Organization Profile</span>
                  </button>
                )}
                
                {/* Stripe Connect Link - Only visible to camp creators */}
                {user?.role === "camp_creator" && (
                  <button
                    onClick={() => {
                      navigate("/dashboard/stripe-connect");
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                      wouterLocation === "/dashboard/stripe-connect" ? "bg-gray-100" : ""
                    }`}
                  >
                    <DollarSign className="h-5 w-5 flex-shrink-0" />
                    <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Stripe Connect</span>
                  </button>
                )}
                
                {/* Subscription Plans Link - Only visible to camp creators */}
                {user?.role === "camp_creator" && (
                  <button
                    onClick={() => {
                      navigate("/dashboard/subscription-plans");
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                      wouterLocation === "/dashboard/subscription-plans" ? "bg-gray-100" : ""
                    }`}
                  >
                    <CreditCard className="h-5 w-5 flex-shrink-0" />
                    <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Subscription Plans</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Documents Link */}
          {user?.role === "camp_creator" || user?.role === "manager" ? (
            <button
              onClick={() => {
                navigate("/documents");
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                wouterLocation === "/documents" || wouterLocation.startsWith("/documents/") ? "bg-gray-100" : ""
              }`}
            >
              <ClipboardList className="h-5 w-5 flex-shrink-0" />
              <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Documents</span>
            </button>
          ) : null}
          
          {/* Messages Link */}
          {user?.role === "camp_creator" || user?.role === "manager" ? (
            <button
              onClick={() => {
                navigate("/dashboard/messages");
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                wouterLocation === "/dashboard/messages" ? "bg-gray-100" : ""
              }`}
            >
              <MessageSquare className="h-5 w-5 flex-shrink-0" />
              <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Messages</span>
            </button>
          ) : null}
          

          <Button
            variant="ghost"
            className="w-full justify-start whitespace-nowrap"
            onClick={() => {
              logoutMutation.mutate();
              // Close sidebar on mobile
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
          >
            <LogOut className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Logout</span>
          </Button>
        </nav>
      </div>

      {/* Organization Logo in Top Center */}
      {organization?.logoUrl && (
        <div className="fixed top-0 left-0 right-0 z-30 flex justify-center items-center h-16 pointer-events-none">
          <div className="bg-white p-2 rounded-b-lg shadow-sm">
            <img 
              src={organization.logoUrl} 
              alt={`${organization.name} logo`} 
              className="h-10 max-w-[200px] object-contain" 
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`
        fixed top-0 right-0 bottom-0 overflow-auto
        transition-all duration-300 ease-in-out
        w-full ${sidebarOpen ? "lg:w-[calc(100%-16rem)]" : "lg:w-[calc(100%-4rem)]"}
        pt-16 lg:pt-4
      `}
      >
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Extended camp type to include permissions from the server
interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  };
  schedules?: any[]; // Add schedules property for the CampScheduleSummary component
}

function CampsDashboard() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { user } = useAuth();
  
  // Make the setShowAddCampDialog function available globally for quick links
  React.useEffect(() => {
    // Expose the function to the window object
    (window as any).setShowAddCampDialog = setShowAddCampDialog;
    
    // Clean up when component unmounts
    return () => {
      delete (window as any).setShowAddCampDialog;
    };
  }, []);
  
  const { data: camps = [], isLoading } = useQuery<CampWithPermissions[], Error, CampWithPermissions[]>({
    queryKey: ["/api/camps"],
    staleTime: 5000, // Only refetch after 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const [location, navigate] = useWouterLocation();
  
  // Check if user is a camp creator or manager who can create camps
  const canCreateCamps = user && ['camp_creator', 'manager'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Camps</h1>
        {canCreateCamps ? (
          <Button onClick={() => setShowAddCampDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Camp
          </Button>
        ) : (
          <div className="flex items-center text-muted-foreground text-sm">
            <ShieldAlert className="h-4 w-4 mr-2" />
            <span>View only mode</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !camps || camps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No camps {canCreateCamps ? 'created yet' : 'available'}</p>
            {canCreateCamps ? (
              <Button onClick={() => setShowAddCampDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first camp
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground max-w-md text-center">
                <p>You don't have permission to create camps.</p>
                <p className="mt-2">Contact an organization admin if you need to create a new camp.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {camps.map((camp) => {
            // Check if user can manage this specific camp
            const canManageCamp = camp.permissions?.canManage || false;
            
            // Calculate date ranges and format for better display
            const now = new Date();
            const startDate = new Date(camp.startDate);
            const endDate = new Date(camp.endDate);
            const regStartDate = new Date(camp.registrationStartDate);
            const regEndDate = new Date(camp.registrationEndDate);
            
            // Calculate if registration is open, upcoming, or past
            const regStatus = now < regStartDate 
              ? "upcoming" 
              : now > regEndDate 
                ? "closed" 
                : "open";
                
            // Calculate if camp is active, upcoming, or past
            const campStatus = now < startDate 
              ? "upcoming" 
              : now > endDate 
                ? "completed" 
                : "active";
                
            // Format duration in days
            const campDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Format a more user-friendly display of the camp type
            const formatCampType = (type: string) => {
              const types: Record<string, string> = {
                'one_on_one': 'One-on-One',
                'group': 'Group',
                'team': 'Team',
                'virtual': 'Virtual'
              };
              return types[type] || type;
            };
           
            // We'll create two cards - one for the front and one for the back of the flip card
            const frontCard = (
              <Card className="h-full border-0 shadow-none">
                <div className={`h-2 w-full ${campStatus === 'active' ? 'bg-green-500' : campStatus === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                
                <CardHeader className="p-3 pb-1">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base truncate">{camp.name}</CardTitle>
                      {canManageCamp ? (
                        <Badge className="h-5 text-xs bg-green-100 text-green-800 hover:bg-green-200">
                          Manager
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="line-clamp-1 text-xs">
                      {camp.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3 pt-0 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{campDays} day{campDays !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{camp.capacity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{camp.city}, {camp.state}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">Click card to see schedule</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge 
                      className={
                        regStatus === 'open'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 h-5 text-xs'
                          : regStatus === 'upcoming'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 h-5 text-xs'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 h-5 text-xs'
                      }
                    >
                      {regStatus === 'open' ? 'Registration Open' : regStatus === 'upcoming' ? 'Opening Soon' : 'Closed'}
                    </Badge>
                    <span className="text-xs">${camp.price}</span>
                  </div>
                </CardContent>
                
                <div className="absolute bottom-2 right-2 text-muted-foreground text-xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                </div>
              </Card>
            );
            
            const backCard = (
              <Card className="h-full border-0 shadow-none overflow-y-auto">
                <div className={`h-2 w-full ${campStatus === 'active' ? 'bg-green-500' : campStatus === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                
                <CardHeader className="p-3 pb-1">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{camp.name}</CardTitle>
                    <Badge 
                      variant={camp.visibility === 'public' ? 'default' : 'outline'}
                      className="capitalize h-5 text-xs"
                    >
                      {camp.visibility}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3 text-xs space-y-3">
                  <p className="text-muted-foreground">{camp.description}</p>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Camp Period</span>
                    </div>
                    <div className="ml-5 flex justify-between">
                      <span>{startDate.toLocaleDateString()}</span>
                      <span>to</span>
                      <span>{endDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Registration</span>
                    </div>
                    <div className="ml-5 flex justify-between">
                      <span>{regStartDate.toLocaleDateString()}</span>
                      <span>to</span>
                      <span>{regEndDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Camp Schedule Summary */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Schedule</span>
                    </div>
                    <div className="ml-5 text-xs">
                      <div className="flex items-center gap-2">
                        {/* Using our newly enhanced component - we don't have enhanced schedule data here, so it falls back to default */}
                        <CampScheduleSummary 
                          schedules={camp.schedules || []} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">Location</span>
                      </div>
                      <div className="ml-5 text-muted-foreground">
                        {camp.isVirtual ? (
                          <div>Virtual</div>
                        ) : (
                          <>
                            <div>{camp.streetAddress}</div>
                            <div>{camp.city}, {camp.state} {camp.zipCode}</div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">Details</span>
                      </div>
                      <div className="ml-5 space-y-0.5 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{formatCampType(camp.type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ages:</span>
                          <span>{camp.minAge}-{camp.maxAge}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>${camp.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="p-3 pt-0 flex justify-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(camp.slug 
                        ? `/dashboard/camps/slug/${camp.slug}` 
                        : `/dashboard/camps/${camp.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            );
            
            // Return the FlipCard component with front and back cards
            return (
              <div key={camp.id} className="h-[220px]">
                <FlipCard
                  front={frontCard}
                  back={backCard}
                  className={`rounded-md overflow-hidden transition-all duration-200 h-full ${!canManageCamp ? "opacity-90" : ""}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {showAddCampDialog && (
        <AddCampDialog
          open={showAddCampDialog}
          onOpenChange={setShowAddCampDialog}
        />
      )}
    </div>
  );
}

/**
 * Main Dashboard component for all user types
 */
function Dashboard() {
  const { user } = useAuth();
  const [showCalendar, setShowCalendar] = React.useState(true);

  // Loading state while user info is being fetched
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  /**
   * Dashboard content shared across layouts
   */
  const DashboardContent = () => {
    return (
      <>
        {/* Display the DashboardSummaryCards and DashboardCalendar only for users with organizationId */}
        {user.organizationId ? (
          <>
            {/* Import directly from the components */}
            <React.Suspense fallback={<div className="p-4 text-center">Loading summary cards...</div>}>
              <DashboardSummaryCards />
            </React.Suspense>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <React.Suspense fallback={<div className="p-4 text-center">Loading calendar...</div>}>
                  <DashboardCalendar />
                </React.Suspense>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        // Navigate to the camps page and trigger create camp dialog
                        const setShowAddCampDialogFn = (window as any).setShowAddCampDialog;
                        if (typeof setShowAddCampDialogFn === 'function') {
                          setShowAddCampDialogFn(true);
                        } else {
                          // Fallback: Navigate to camps page where they can click the Create Camp button
                          window.location.href = '/dashboard/camps';
                        }
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Camp
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/dashboard/reports'}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Reports
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/dashboard/team'}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Team
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
        
        <CampsDashboard />
      </>
    );
  };

  // For camp creators and managers, just render the content without any layout
  // The layout will be provided by the ProtectedRoute component
  if (user.role === 'camp_creator' || user.role === 'manager') {
    return <DashboardContent />;
  }

  // For other roles, use the existing sidebar layout
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

export { DashboardLayout };
export default Dashboard;
