import React from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, isSameDay } from "date-fns";
import { useLocation } from "wouter";
import { Eye } from "lucide-react";

// Type for the camp session data
interface CampSession {
  id: number;
  campId: number;
  startTime: string;
  endTime: string;
  sessionDate: string | Date; // Allow either string or Date type for flexibility
  status: string;
  notes: string | null;
  camp: {
    id: number;
    name: string;
    type: string;
    slug: string;
    // Add other camp fields as needed
  };
}

function DashboardCalendar() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = React.useState(true);
  const [, navigate] = useLocation();

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

    // Add detailed logging for camp slugs
    if (allSessions && allSessions.length > 0) {
      allSessions.forEach(session => {
        console.log(`Session ID: ${session.id}, Camp ID: ${session.campId}, Camp Name: ${session.camp.name}, Camp Slug: ${session.camp.slug}`);
      });
    }

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

  // Function to convert any date to a consistent string representation based on user's local timezone
  const normalizeDate = (date: Date | string): string => {
    if (!date) {
      console.warn("Received empty date in normalizeDate");
      return "";
    }

    let d: Date;

    try {
      if (typeof date === 'string') {
        // Handle PostgreSQL timestamp format (e.g., "2025-04-15T14:30:00.000Z")
        // Or simple date format (e.g., "2025-04-15")
        d = new Date(date);

        // Check if valid date was created
        if (isNaN(d.getTime())) {
          console.warn(`Invalid date string received: "${date}"`);
          return "";
        }
      } else if (date instanceof Date) {
        d = date;

        // Check if valid date was provided
        if (isNaN(d.getTime())) {
          console.warn("Invalid Date object received");
          return "";
        }
      } else {
        console.warn(`Unexpected date type: ${typeof date}`);
        return "";
      }

      // Convert to user's local timezone by using their local date methods
      // This ensures dates are displayed correctly regardless of user location
      const localYear = d.getFullYear();
      const localMonth = d.getMonth() + 1; // getMonth() is 0-indexed
      const localDay = d.getDate();

      // Format the date as YYYY-MM-DD in the user's local timezone
      return `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;
    } catch (error) {
      console.error("Error in normalizeDate:", error);
      return "";
    }
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
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            // The session data already includes the camp data with the slug
                            const campSlug = session.camp.slug;

                            if (campSlug) {
                              console.log(`Navigating to camp with slug: ${campSlug}`);
                              navigate(`/camp/slug/${campSlug}`); // UPDATED NAVIGATION ROUTE
                            } else {
                              // Fallback to id-based URL if no slug
                              console.log(`Navigating to camp with ID: ${session.camp.id}`);
                              navigate(`/camp/id/${session.camp.id}`); // UPDATED NAVIGATION ROUTE
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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