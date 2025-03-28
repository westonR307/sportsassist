import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Users,
  BarChart3,
  Calendar,
  LogOut,
  Loader2,
  Menu,
  ShieldAlert,
  MapPin,
  Clock,
  DollarSign,
  Users2,
  CalendarRange,
  Tag,
  CalendarDays,
  Info,
} from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";


function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useWouterLocation();
  const { user, logoutMutation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const wouterLocation = useWouterLocation()[0];

  if (!user?.organizationId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 m-4 z-50">
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
        <div className="p-4 border-b whitespace-nowrap">
          <h2 className={`font-semibold text-lg ${!sidebarOpen && "lg:opacity-0"}`}>
            Sports Camp Manager
          </h2>
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigate("/dashboard")}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard" ? "bg-gray-100" : ""
            }`}
          >
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Camps</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/reports")}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/reports" ? "bg-gray-100" : ""
            }`}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Reports</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/team")}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/team" ? "bg-gray-100" : ""
            }`}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Team</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/settings")}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              wouterLocation === "/dashboard/settings" ? "bg-gray-100" : ""
            }`}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Settings</span>
          </button>
          <Button
            variant="ghost"
            className="w-full justify-start whitespace-nowrap"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Logout</span>
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "lg:pl-64" : "lg:pl-16"}
        pt-16 lg:pt-0
      `}
      >
        <main className="container mx-auto px-6 py-8">{children}</main>
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
  }
}

function CampsDashboard() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { user } = useAuth();
  const { data: camps, isLoading } = useQuery<CampWithPermissions[]>({
    queryKey: ["/api/camps"],
    staleTime: 5000, // Only refetch after 5 seconds
    refetchOnMount: "if-stale",
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            
            return (
              <Card 
                key={camp.id} 
                className={`overflow-hidden transition-all duration-200 hover:shadow-md ${!canManageCamp ? "border-gray-200" : "border-primary/20"}`}
              >
                <button
                  onClick={() => navigate(`/dashboard/camps/${camp.id}`)}
                  className="block w-full text-left h-full"
                >
                  <div className={`h-2 w-full ${campStatus === 'active' ? 'bg-green-500' : campStatus === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg">{camp.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {camp.description}
                        </CardDescription>
                      </div>
                      
                      {canManageCamp ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          Manager
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                          View Only
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-3 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{campDays} day{campDays !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{formatCampType(camp.type)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">${camp.price}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{camp.capacity} spots</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Camp Period</span>
                      </div>
                      <div className="ml-6 text-sm text-gray-600">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Registration</span>
                      </div>
                      <div className="ml-6 text-sm text-gray-600 flex items-center justify-between">
                        <span>{regStartDate.toLocaleDateString()} - {regEndDate.toLocaleDateString()}</span>
                        <Badge 
                          className={
                            regStatus === 'open'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : regStatus === 'upcoming'
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }
                        >
                          {regStatus === 'open' ? 'Open' : regStatus === 'upcoming' ? 'Opening Soon' : 'Closed'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="border-t pt-3 pb-3">
                    <div className="flex items-center gap-1.5 w-full">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-gray-600 truncate">
                        {camp.city}, {camp.state}
                      </span>
                      
                      <div className="flex-grow"></div>
                      
                      <Badge 
                        variant={camp.visibility === 'public' ? 'default' : 'outline'}
                        className="ml-auto capitalize"
                      >
                        {camp.visibility}
                      </Badge>
                    </div>
                  </CardFooter>
                </button>
              </Card>
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

function Dashboard() {
  const { user } = useAuth();

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

  // All user types can see the dashboard, with appropriate permissions
  return (
    <DashboardLayout>
      <CampsDashboard />
    </DashboardLayout>
  );
}

export { DashboardLayout };
export default Dashboard;
