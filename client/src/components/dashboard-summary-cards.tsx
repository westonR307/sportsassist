import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  CalendarDays, 
  Calendar, 
  Users,
  BookOpen,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { format, isSameDay } from "date-fns";

// Types for the data
interface CampSession {
  id: number;
  campId: number;
  startTime: string;
  endTime: string;
  sessionDate: Date;
  status: string;
  camp: {
    id: number;
    name: string;
    type: string;
  };
}

interface CampStats {
  status: string;
  count: number;
}

function DashboardSummaryCards() {
  // Fetch today's sessions
  const { data: todaySessions, isLoading: todayLoading } = useQuery<CampSession[]>({
    queryKey: ["/api/dashboard/today-sessions"],
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Fetch camp statistics
  const { data: campStats, isLoading: statsLoading } = useQuery<CampStats[]>({
    queryKey: ["/api/dashboard/camp-stats"],
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Fetch total registrations count
  const { data: registrationsData, isLoading: registrationsLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/dashboard/registrations-count"],
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Fetch recent registrations (last 48 hours)
  const { data: recentRegistrations, isLoading: recentLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/recent-registrations"],
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Log received data for debugging
  React.useEffect(() => {
    console.log('Dashboard cards - Today Sessions:', todaySessions);
    console.log('Dashboard cards - Camp Stats:', campStats);
    console.log('Dashboard cards - Registrations Data:', registrationsData);
    console.log('Dashboard cards - Recent Registrations:', recentRegistrations);
  }, [todaySessions, campStats, registrationsData, recentRegistrations]);
  
  // Get active camps count
  const activeCampsCount = React.useMemo(() => {
    if (!campStats) return 0;
    const active = campStats.find(stat => stat.status === 'active');
    return active ? active.count : 0;
  }, [campStats]);
  
  // Get registration open camps count
  const openRegistrationCount = React.useMemo(() => {
    if (!campStats) return 0;
    const open = campStats.find(stat => stat.status === 'registrationOpen');
    return open ? open.count : 0;
  }, [campStats]);
  
  // Format the time in 12-hour format
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? '12' : String(hour % 12);
    return `${formattedHour}:${minutes} ${period}`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Today's Sessions Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <CalendarDays className="h-4 w-4 mr-2 text-primary" />
            Today's Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !todaySessions || todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-2xl font-bold">{todaySessions.length}</p>
              <div className="max-h-[100px] overflow-y-auto space-y-1">
                {todaySessions.map((session) => (
                  <Link 
                    key={session.id} 
                    href={`/camps/${session.campId}`}
                    className="block text-xs hover:underline text-primary truncate"
                  >
                    {formatTime(session.startTime)} - {session.camp.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Active Camps Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            Active Camps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">{activeCampsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {openRegistrationCount} camps with open registration
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Participant Count Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary" />
            Total Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">{registrationsData?.count || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all camps
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Registrations Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-primary" />
            Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !recentRegistrations || recentRegistrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent registrations in the last 48 hours.</p>
          ) : (
            <>
              <p className="text-2xl font-bold">{recentRegistrations.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                New registrations in the last 48 hours
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardSummaryCards;