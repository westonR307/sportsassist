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
import { format } from "date-fns";

interface CampSession {
  id: number;
  campId: number;
  startTime: string;
  endTime: string;
  sessionDate: string;
  status: string;
  camp: {
    id: number;
    name: string;
    type: string;
    slug: string;
  };
}

function DashboardSummaryCards() {
  // Fetch today's sessions
  const { data: todaySessions, isLoading: todayLoading } = useQuery({
    queryKey: ["/api/dashboard/today-sessions"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch active camps count
  const { data: activeCamps, isLoading: activeCampsLoading } = useQuery({
    queryKey: ["/api/dashboard/active-camps"],
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch upcoming sessions count
  const { data: upcomingSessions, isLoading: upcomingLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-sessions"],
    refetchInterval: 300000,
  });

  // Fetch registrations data
  const { data: registrationsData, isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/dashboard/registrations"],
    refetchInterval: 300000,
  });

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
          ) : (() => {
            // Make sure todaySessions is an array
            const sessions = Array.isArray(todaySessions) ? todaySessions : [];
            const sessionCount = sessions.length;
            
            if (sessionCount === 0) {
              return <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>;
            }
            
            return (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{sessionCount}</p>
                <div className="max-h-[100px] overflow-y-auto space-y-1">
                  {sessions.map((session: CampSession) => (
                    <Link 
                      key={session.id} 
                      href={`/dashboard/camps/${session.camp.slug}`}
                      className="block text-xs hover:underline text-primary truncate"
                    >
                      {formatTime(session.startTime)} - {session.camp.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
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
          {activeCampsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">{
                typeof activeCamps === 'object' && activeCamps !== null && 'count' in activeCamps 
                  ? activeCamps.count 
                  : 0
              }</p>
              <p className="text-xs text-muted-foreground mt-1">
                Currently running camps
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">{
                typeof upcomingSessions === 'object' && upcomingSessions !== null && 'count' in upcomingSessions 
                  ? upcomingSessions.count 
                  : 0
              }</p>
              <p className="text-xs text-muted-foreground mt-1">
                Next 7 days
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
          {registrationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold">{
                typeof registrationsData === 'object' && registrationsData !== null && 'recent' in registrationsData
                  ? registrationsData.recent 
                  : 0
              }</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last 48 hours
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardSummaryCards;