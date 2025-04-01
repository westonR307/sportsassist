import React from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, isSameDay } from "date-fns";

// Type for the camp session data
interface CampSession {
  id: number;
  campId: number;
  startTime: string;
  endTime: string;
  sessionDate: Date;
  status: string;
  notes: string | null;
  camp: {
    id: number;
    name: string;
    type: string;
    // Add other camp fields as needed
  };
}

function DashboardCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = React.useState(true);
  
  // Fetch all sessions for the organization
  const { data: allSessions, isLoading: sessionsLoading } = useQuery<CampSession[]>({
    queryKey: ["/api/dashboard/sessions"],
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Debug log and fetch state
  React.useEffect(() => {
    console.log('Dashboard calendar - All Sessions:', allSessions);
    console.log('Dashboard calendar - Loading state:', sessionsLoading);
    
    // Only try to refetch if not already loading and we got null (not an empty array)
    if (!sessionsLoading && allSessions === null) {
      const retry = async () => {
        try {
          await queryClient.refetchQueries({ queryKey: ["/api/dashboard/sessions"] });
          console.log("Forced dashboard sessions refetch");
        } catch (error) {
          console.error("Error refetching dashboard sessions:", error);
        }
      };
      
      // Only retry once
      const timer = setTimeout(retry, 1000);
      return () => clearTimeout(timer);
    }
  }, [allSessions, sessionsLoading]);
  
  // Function to normalize date with specific adjustment for Mountain Time (UTC-7)
  const normalizeDate = (date: Date | string): string => {
    let d: Date;
    
    if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    
    // Adjust for Mountain Time by adding 7 hours to the UTC time
    // This ensures dates are aligned with the server's interpretation
    // For proper Mountain Time (GMT-7) adjustment
    const mountainTimeDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    
    // Format the adjusted date as YYYY-MM-DD
    return `${mountainTimeDate.getUTCFullYear()}-${String(mountainTimeDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mountainTimeDate.getUTCDate()).padStart(2, '0')}`;
  };
  
  // Calculate dates that have sessions
  const sessionDays = React.useMemo(() => {
    if (!allSessions || allSessions.length === 0) return new Set<string>();
    
    const dates = new Set<string>();
    allSessions.forEach(session => {
      try {
        // Handle different date formats
        if (session.sessionDate) {
          const normalizedDate = normalizeDate(session.sessionDate);
          dates.add(normalizedDate);
          
          // Debug log
          console.log(`Adding normalized date: ${normalizedDate} from session date: ${session.sessionDate}`);
        } else {
          console.warn("Invalid session date format:", session.sessionDate);
        }
      } catch (error) {
        console.error("Error parsing date:", error, session);
      }
    });
    
    return dates;
  }, [allSessions]);
  
  // Get the sessions for the selected date
  const selectedDateSessions = React.useMemo(() => {
    if (!allSessions || !selectedDate) return [];
    
    // Normalize the selected date for comparison
    const normalizedSelectedDate = normalizeDate(selectedDate);
    console.log(`Finding sessions for normalized selected date: ${normalizedSelectedDate}`);
    
    return allSessions.filter(session => {
      try {
        // Normalize the session date
        const normalizedSessionDate = normalizeDate(session.sessionDate);
        
        // Debug logging
        console.log(`Comparing session date ${normalizedSessionDate} with selected date ${normalizedSelectedDate}`);
        
        // Compare normalized dates as strings
        return normalizedSessionDate === normalizedSelectedDate;
      } catch (error) {
        console.error("Error comparing dates:", error, session);
        return false;
      }
    }).sort((a, b) => {
      // Sort by start time
      return a.startTime.localeCompare(b.startTime);
    });
  }, [allSessions, selectedDate]);
  
  // Function to format the time in 12-hour format
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? '12' : String(hour % 12);
    return `${formattedHour}:${minutes} ${period}`;
  };
  
  // Function to render the calendar cell, adding dots for days with sessions
  const renderCalendarCell = (day: Date) => {
    // Normalize the date to match our format in the sessionDays Set
    const normalizedDayStr = normalizeDate(day);
    const hasSession = sessionDays.has(normalizedDayStr);
    
    // Debug logging
    if (hasSession) {
      console.log(`Cell date ${normalizedDayStr} has a session`);
    }
    
    return (
      <div className="relative">
        <div>{day.getDate()}</div>
        {hasSession && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Schedule</CardTitle>
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          {calendarOpen ? "Hide Calendar" : "Show Calendar"}
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        {calendarOpen && (
          <div className="mb-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              components={{
                DayContent: ({ date }) => renderCalendarCell(date),
              }}
            />
          </div>
        )}
        
        {selectedDate && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">
              {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            
            {selectedDateSessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sessions scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDateSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{session.camp.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </p>
                      </div>
                      <Badge 
                        className={
                          session.status === 'active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : session.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    
                    {session.notes && (
                      <p className="text-sm mt-2 text-muted-foreground">{session.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardCalendar;