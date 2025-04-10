import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation as useWouterLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Settings,
  Users,
  BarChart3,
  Calendar,
  LogOut,
  CreditCard,
  Menu,
  ShieldCheck,
  DollarSign,
  Users2,
  FileText,
  ClipboardList,
  MessageSquare,
  User,
  X,
  ArrowLeft,
  Home,
} from "lucide-react";
import { GiBaseballBat } from "react-icons/gi";
import { Button } from "@/components/ui/button";

// Organization interface
interface Organization {
  id: number;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  stripeAccountId?: string | null;
  createdAt?: Date;
}

interface AppLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  showNavigation?: boolean;
}

export function AppLayout({ children, showBackButton = false, showNavigation = true }: AppLayoutProps) {
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

  // If user is not authenticated, don't show the layout, just render children
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button - Hidden when sidebar is open or navigation is disabled */}
      {showNavigation && (
        <div className={`lg:hidden fixed top-0 left-0 m-4 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back Button (if enabled) */}
      {showBackButton && (
        <div className={`fixed top-0 ${showNavigation ? 'right-0' : 'left-0'} m-4 z-50`}>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      )}

      {/* Sidebar - Only shown when navigation is enabled */}
      {showNavigation && (
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
          {/* Home Link for all users */}
          <button
            onClick={() => {
              navigate("/");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/" ? "bg-gray-100" : ""
            }`}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Home</span>
          </button>

          {/* Dashboard Link - Different path for parent users */}
          <button
            onClick={() => {
              navigate(isParentOrAthlete ? "/parent-dashboard" : "/dashboard");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              (wouterLocation === "/dashboard" || wouterLocation === "/parent-dashboard") ? "bg-gray-100" : ""
            }`}
          >
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Dashboard</span>
          </button>

          {/* Camp Creator and Platform Admin Routes */}
          {(user?.role === "camp_creator" || user?.role === "platform_admin" || user?.role === "manager") && (
            <>
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
            </>
          )}

          {/* Parent-specific routes */}
          {user?.role === "parent" && (
            <>
              <button
                onClick={() => {
                  navigate("/dashboard/my-athletes");
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                  wouterLocation === "/dashboard/my-athletes" ? "bg-gray-100" : ""
                }`}
              >
                <Users className="h-5 w-5 flex-shrink-0" />
                <span className={!sidebarOpen ? "lg:opacity-0" : ""}>My Athletes</span>
              </button>
              <button
                onClick={() => {
                  navigate("/dashboard/registrations");
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                  wouterLocation === "/dashboard/registrations" ? "bg-gray-100" : ""
                }`}
              >
                <ClipboardList className="h-5 w-5 flex-shrink-0" />
                <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Registrations</span>
              </button>
              <button
                onClick={() => {
                  navigate("/parent/messages");
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                  wouterLocation === "/parent/messages" ? "bg-gray-100" : ""
                }`}
              >
                <MessageSquare className="h-5 w-5 flex-shrink-0" />
                <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Messages</span>
              </button>
            </>
          )}

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
          {(user?.role === "camp_creator" || user?.role === "manager") && (
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
          )}
          
          {/* Messages Link for Organization Staff */}
          {(user?.role === "camp_creator" || user?.role === "manager") && (
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
          )}
          
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
      )}

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
        transition-all duration-300 ease-in-out flex-1
        ${showNavigation ? (sidebarOpen ? "lg:ml-64" : "lg:ml-16") : ""}
        pt-16 lg:pt-4 overflow-x-hidden
      `}
      >
        <main className="px-4 py-6 max-w-full">{children}</main>
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