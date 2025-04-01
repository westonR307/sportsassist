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
  RefreshCw,
  Phone,
  Mail,
  FileText,
  Award,
  X,
  ClipboardList,
  Clipboard,
} from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";

// Organization interface
interface Organization {
  id: number;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  stripeAccountId?: string | null;
  createdAt?: Date;
}

// Sidebar component for dashboard layout
function DashboardSidebar() {
  const { user, logout } = useAuth();
  const [location, navigate] = useWouterLocation();
  
  const isActive = (path: string) => {
    return location.startsWith(path) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground";
  };
  
  return (
    <div className="w-64 border-r h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">SportsAssist.io</h2>
        <div className="text-sm text-muted-foreground mt-1">
          {user?.organization?.name || "Organization"}
        </div>
      </div>
      
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          <Button
            variant="ghost"
            className={`w-full justify-start ${isActive("/dashboard")}`}
            onClick={() => navigate("/dashboard")}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <Button
            variant="ghost"
            className={`w-full justify-start ${isActive("/dashboard/schedule")}`}
            onClick={() => navigate("/dashboard/schedule")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          
          <Button
            variant="ghost"
            className={`w-full justify-start ${isActive("/dashboard/camps")}`}
            onClick={() => navigate("/dashboard/camps")}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Manage Camps
          </Button>
          
          <Button
            variant="ghost"
            className={`w-full justify-start ${isActive("/dashboard/participants")}`}
            onClick={() => navigate("/dashboard/participants")}
          >
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>
          
          {["admin", "manager"].includes(user?.role || "") && (
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/dashboard/organization")}`}
              onClick={() => navigate("/dashboard/organization")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Organization
            </Button>
          )}
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center mb-4">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-2">
            {user?.first_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="text-sm font-medium">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {user?.role.replace('_', ' ')}
            </div>
          </div>
        </div>
        
        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

// Layout component
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Extend Camp type to include permissions
interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  }
}

// Dashboard component for displaying camps and stats
function CampsDashboard() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { user } = useAuth();
  
  const { data: camps, isLoading } = useQuery<CampWithPermissions[]>({
    queryKey: ["/api/camps"],
    staleTime: 5000, // Only refetch after 5 seconds
    refetchOnMount: false, // Changed from "if-stale" to fix type issue
    refetchOnWindowFocus: false,
  });
  
  // Define the dashboard summary data type
  interface DashboardSummary {
    campCounts: {
      total: number;
      active: number;
      upcoming: number;
      completed: number;
      registrationOpen: number;
    };
    todaySessions: Array<{
      id: number;
      campId: number;
      campName: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      status: string;
    }>;
    totalRegistrations: number;
    recentRegistrations: number;
    sessionsByDate: Record<string, { 
      campIds: number[]; 
      sessionCount: number;
    }>;
  }

  // Fetch the dashboard summary data for the calendar and stats cards
  const { data: dashboardSummary, isLoading: isDashboardLoading } = useQuery<DashboardSummary>({
    queryKey: [`/api/organizations/${user?.organizationId}/dashboard-summary`],
    staleTime: 60000, // Cache for 1 minute
    refetchOnMount: false, // Changed from "if-stale" to fix type issue
    refetchOnWindowFocus: false,
    // Only fetch if user is logged in and has an organization
    enabled: !!user && !!user.organizationId,
  });
  
  const [location, navigate] = useWouterLocation();
  
  // Check if user is a camp creator or manager who can create camps
  const canCreateCamps = user && ['camp_creator', 'manager'].includes(user.role);
  
  // Date selection state for the calendar
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  
  // Get the current month's days for the calendar view
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());

  // Create an array of dates for the current month (to show the calendar)
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    
    // Add empty slots for the days before the 1st of the month
    const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  };
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  
  // Format date as YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Navigate to previous month
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // Navigate to next month
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Get month name
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Format time to 12-hour format (e.g., "09:00:00" to "9:00 AM")
  const formatTimeFor12Hour = (timeStr: string): string => {
    try {
      const timePart = timeStr.split(':');
      const hoursNum = parseInt(timePart[0], 10);
      const suffix = hoursNum >= 12 ? "PM" : "AM";
      const hours12 = hoursNum % 12 === 0 ? 12 : hoursNum % 12;
      return `${hours12}:${timePart[1]} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
      
      {isLoading || isDashboardLoading ? (
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
        <div className="space-y-6">
          {/* Summary Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Sessions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Today's Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardSummary?.todaySessions?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Sessions scheduled for today
                </div>
                
                {dashboardSummary?.todaySessions && dashboardSummary.todaySessions.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-2">
                    {dashboardSummary.todaySessions.map((session, index) => (
                      <div key={index} className="text-xs flex justify-between border-b pb-1">
                        <div className="font-medium">{session.campName}</div>
                        <div>{formatTimeFor12Hour(session.startTime)}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto mt-2" 
                  onClick={() => navigate("/dashboard/schedule")}
                >
                  View schedule
                </Button>
              </CardContent>
            </Card>
            
            {/* Upcoming Camps Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  Upcoming Camps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardSummary?.campCounts?.upcoming || 0}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">
                  <div className="flex items-center gap-1">
                    <Badge className="h-2 w-2 rounded-full bg-green-500 p-0" />
                    <span className="text-muted-foreground">Active: {dashboardSummary?.campCounts?.active || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="h-2 w-2 rounded-full bg-blue-500 p-0" />
                    <span className="text-muted-foreground">Registration: {dashboardSummary?.campCounts?.registrationOpen || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="h-2 w-2 rounded-full bg-amber-500 p-0" />
                    <span className="text-muted-foreground">Upcoming: {dashboardSummary?.campCounts?.upcoming || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="h-2 w-2 rounded-full bg-gray-300 p-0" />
                    <span className="text-muted-foreground">Completed: {dashboardSummary?.campCounts?.completed || 0}</span>
                  </div>
                </div>
                
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto mt-2" 
                  onClick={() => navigate("/dashboard")}
                >
                  View all camps
                </Button>
              </CardContent>
            </Card>
            
            {/* Participants Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardSummary?.totalRegistrations || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total registrations across all camps
                </div>
                
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto mt-2" 
                  onClick={() => navigate("/dashboard/participants")}
                >
                  Manage participants
                </Button>
              </CardContent>
            </Card>
            
            {/* New Registrations Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  New Signups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {dashboardSummary?.recentRegistrations || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  New registrations in the past 48 hours
                </div>
                
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto mt-2" 
                  onClick={() => navigate("/dashboard/registrations")}
                >
                  View registrations
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Calendar View */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Camp Calendar</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={prevMonth}
                  >
                    <X className="h-4 w-4 rotate-45" />
                  </Button>
                  <span className="font-medium">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={nextMonth}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Days of week header */}
              <div className="grid grid-cols-7 text-center font-medium mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day, index) => {
                  if (day === null) {
                    // Empty cell for days before the 1st of the month
                    return <div key={`empty-${index}`} className="aspect-square p-1"></div>;
                  }
                  
                  const dateKey = formatDateKey(day);
                  const isToday = day.toDateString() === today.toDateString();
                  const hasSession = dashboardSummary?.sessionsByDate && dashboardSummary.sessionsByDate[dateKey];
                  const sessionData = hasSession ? dashboardSummary.sessionsByDate[dateKey] : null;
                  const campCount = sessionData ? sessionData.campIds.length : 0;
                  
                  return (
                    <div 
                      key={dateKey}
                      className={`aspect-square p-1 flex flex-col items-center border rounded-md relative
                        ${isToday ? 'border-primary' : 'border-transparent hover:border-gray-200'} 
                        ${hasSession ? 'cursor-pointer hover:bg-gray-50' : ''}
                      `}
                      onClick={() => hasSession && setSelectedDate(day)}
                    >
                      <div className={`h-6 w-6 flex items-center justify-center rounded-full text-sm
                        ${isToday ? 'bg-primary text-primary-foreground font-medium' : ''}
                      `}>
                        {day.getDate()}
                      </div>
                      
                      {/* Show little dots for each unique camp that has a session this day */}
                      {campCount > 0 && (
                        <div className="mt-1 flex justify-center gap-1">
                          {[...Array(Math.min(campCount, 3))].map((_, i) => (
                            <div 
                              key={`dot-${i}`} 
                              className="h-1.5 w-1.5 rounded-full bg-primary"
                            ></div>
                          ))}
                          {campCount > 3 && (
                            <div className="text-xs text-muted-foreground mt-[-2px]">+{campCount - 3}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Show session count */}
                      {hasSession && sessionData && (
                        <div className="absolute bottom-1 right-1 text-[8px] text-muted-foreground">
                          {sessionData.sessionCount}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Selected date session details */}
              {selectedDate && dashboardSummary?.sessionsByDate && dashboardSummary.sessionsByDate[formatDateKey(selectedDate)] && (
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Sessions on {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => setSelectedDate(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {camps && camps
                      .filter(camp => dashboardSummary.sessionsByDate[formatDateKey(selectedDate)].campIds.includes(camp.id))
                      .map(camp => (
                        <div key={camp.id} className="flex justify-between text-sm py-1 border-b">
                          <div className="font-medium">{camp.name}</div>
                          <Badge 
                            variant="outline"
                            className="text-xs"
                          >
                            {dashboardSummary.sessionsByDate[formatDateKey(selectedDate)].sessionCount} sessions
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Camp Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {camps && camps.map((camp) => {
              // Check if user can manage this specific camp
              const canManageCamp = camp.permissions?.canManage || false;
              
              // Calculate date ranges and format for better display
              const now = new Date();
              const startDate = new Date(camp.startDate);
              const endDate = new Date(camp.endDate);
              const regStartDate = new Date(camp.registrationStartDate);
              const regEndDate = new Date(camp.registrationEndDate);
              
              const isActive = startDate <= now && endDate >= now;
              const isUpcoming = startDate > now;
              const isCompleted = endDate < now;
              const isRegOpen = regStartDate <= now && regEndDate >= now;
              
              // Create status indicator
              let statusColor = "bg-gray-300"; // default/completed
              if (isActive) statusColor = "bg-green-500"; // active
              else if (isUpcoming) statusColor = "bg-amber-500"; // upcoming
              if (isRegOpen) statusColor = "bg-blue-500"; // registration open
              
              // Create the front card (summary view)
              const frontCard = (
                <Card className="h-full">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{camp.name}</CardTitle>
                      <Badge className={`${statusColor} h-2 w-2 rounded-full`} />
                    </div>
                    <CardDescription className="text-xs">
                      {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-3 pt-1 text-xs">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <MapPin className="h-3 w-3 mr-1" /> 
                      {camp.city}, {camp.state}
                    </div>
                    
                    {camp.price !== null && (
                      <div className="flex items-center text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3 mr-1" /> 
                        {typeof camp.price === 'number' ? `$${camp.price.toFixed(2)}` : 'Free'}
                      </div>
                    )}
                    
                    <div className="mt-2 line-clamp-3 text-muted-foreground">
                      {camp.description}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="p-3 pt-0 flex justify-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full text-xs h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/camps/${camp.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
              
              // Create the back card (details view)
              const backCard = (
                <Card className="h-full">
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Info className="h-3 w-3 mr-1 text-muted-foreground" />
                      Camp Details
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-3 text-xs space-y-2">
                    <div>
                      <div className="text-muted-foreground mb-1 font-medium">Registration</div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={isRegOpen ? "default" : "outline"} className="text-[10px] h-5">
                          {isRegOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Period:</span>
                        <span>{regStartDate.toLocaleDateString()} - {regEndDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1 font-medium">Location</div>
                      <div>{camp.streetAddress}</div>
                      <div>{camp.city}, {camp.state} {camp.zipCode}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1 font-medium">Sessions</div>
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span>{camp.maxParticipants}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Schedule:</span>
                        <span>
                          <CampScheduleSummary campId={camp.id} />
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={isActive ? "default" : "outline"} className="text-[10px] h-5">
                          {isActive ? "Active" : isUpcoming ? "Upcoming" : "Completed"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
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