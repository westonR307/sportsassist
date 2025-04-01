import React from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
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
  
  // Debug log
  React.useEffect(() => {
    console.log('Dashboard calendar - All Sessions:', allSessions);
  }, [allSessions]);
  
  // Calculate dates that have sessions
  const sessionDays = React.useMemo(() => {
    if (!allSessions) return new Set<string>();
    
    const dates = new Set<string>();
    allSessions.forEach(session => {
      const date = new Date(session.sessionDate);
      dates.add(date.toISOString().split('T')[0]);
    });
    
    return dates;
  }, [allSessions]);
  
  // Get the sessions for the selected date
  const selectedDateSessions = React.useMemo(() => {
    if (!allSessions || !selectedDate) return [];
    
    return allSessions.filter(session => 
      isSameDay(new Date(session.sessionDate), selectedDate)
    ).sort((a, b) => {
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
    const dayStr = day.toISOString().split('T')[0];
    const hasSession = sessionDays.has(dayStr);
    
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