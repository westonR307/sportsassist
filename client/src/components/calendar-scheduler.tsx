import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarX, Trash2, Clock, Info } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define a simplified CampSession interface to avoid type conflicts
interface SimpleCampSession {
  id?: number;
  campId: number;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
  status?: string;
  notes?: string | null;
  recurrenceGroupId?: number | null;
}

// Define custom handlers interface for testing and camp creation flow
interface CustomHandlers {
  addSession?: (sessionData: any) => Promise<any>;
  deleteSession?: (sessionId: any) => Promise<boolean>;
}

interface CalendarSchedulerProps {
  campId: number;
  startDate: Date;
  endDate: Date;
  sessions: SimpleCampSession[];
  onSave: () => void;
  canManage: boolean;
  customHandlers?: CustomHandlers;
}

export function CalendarScheduler({ 
  campId, 
  startDate, 
  endDate, 
  sessions: initialSessions = [], 
  onSave,
  canManage = true,
  customHandlers
}: CalendarSchedulerProps) {
  // Keep our own local state of sessions to avoid depending on parent refreshes
  const [sessions, setSessions] = useState<SimpleCampSession[]>(initialSessions);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateSessions, setSelectedDateSessions] = useState<SimpleCampSession[]>([]);

  // Format dates properly
  const campStartDate = startDate instanceof Date ? startDate : new Date(startDate);
  const campEndDate = endDate instanceof Date ? endDate : new Date(endDate);

  // Sync with initialSessions when they change (from parent)
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Debug timezone info
  React.useEffect(() => {
    const now = new Date();
    console.log("User timezone information:");
    console.log("- Browser timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("- Timezone offset:", now.getTimezoneOffset(), "minutes");
    console.log("- Current date/time:", now.toString());
    console.log("- UTC date/time:", now.toUTCString());
    console.log("- ISO date/time:", now.toISOString());
  }, []);

  // Function to normalize dates to YYYY-MM-DD format consistently in local timezone
  const normalizeDate = (date: Date | string): string => {
    try {
      let d: Date;

      // If already in YYYY-MM-DD format, return as is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }

      // Convert to Date object if string
      d = typeof date === 'string' ? new Date(date) : date;

      // Use local date values to avoid timezone shifts
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error normalizing date:', error);
      return '';
    }
  };

  // Update selected date sessions when date or sessions change
  useEffect(() => {
    if (selectedDate && sessions.length > 0) {
      // Instead of using isSameDay which can have timezone issues,
      // normalize both dates to YYYY-MM-DD strings and compare
      const selectedDateStr = normalizeDate(selectedDate);

      const sessionsOnSelectedDate = sessions.filter(session => {
        const sessionDateStr = normalizeDate(session.sessionDate);
        return sessionDateStr === selectedDateStr;
      });

      setSelectedDateSessions(sessionsOnSelectedDate);
    } else {
      setSelectedDateSessions([]);
    }
  }, [selectedDate, sessions]);

  // Add a session on the selected date with the current start and end times
  const addSession = async () => {
    if (!selectedDate) {
      toast({
        title: "Select a date first",
        description: "Please select a date on the calendar to add a session.",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be later than start time.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Use our enhanced normalization function for consistent date formatting
      const formattedDate = normalizeDate(selectedDate);

      console.log(`[AddSession] Creating session with normalized date: ${formattedDate}`);
      console.log(`[AddSession] Original selected date: ${selectedDate.toString()}`);
      console.log(`[AddSession] Selected date timezone info:`, {
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate(),
        hours: selectedDate.getHours(),
        minutes: selectedDate.getMinutes(),
        timezoneOffset: selectedDate.getTimezoneOffset()
      });

      // Format the date as YYYY-MM-DD with no time component to avoid timezone issues
      const sessionData = {
        campId: campId,
        sessionDate: formattedDate,
        startTime,
        endTime,
        status: "active",
      };

      let createdSession;

      // Use custom handler if provided, otherwise use fetch
      if (customHandlers?.addSession) {
        console.log("Using custom handler to add session");
        createdSession = await customHandlers.addSession(sessionData);
      } else {
        // Default implementation using fetch
        const response = await fetch(`/api/camps/${campId}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
          throw new Error("Failed to create session");
        }

        createdSession = await response.json();
      }

      // Optimistically update the UI by adding the new session to our local state
      // This gives immediate feedback without waiting for the query cache to refresh
      const newSession: SimpleCampSession = {
        ...createdSession,
        sessionDate: selectedDate
      };

      // Update the local sessions list to include the new session
      const updatedSessions = [...sessions, newSession];
      setSessions(updatedSessions);

      // Also update the selected date sessions to show in the right panel immediately
      setSelectedDateSessions(prev => [...prev, newSession]);

      // Still invalidate the query cache for background refresh (only if not using custom handlers)
      if (!customHandlers?.addSession) {
        queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'sessions'] });
      }

      // Call onSave to notify parent component (in case they need to update state)
      if (onSave) {
        onSave();
      }

      toast({
        title: "Session added",
        description: `Session added on ${format(selectedDate, "MMMM d, yyyy")} from ${formatTimeForDisplay(startTime)} to ${formatTimeForDisplay(endTime)}`,
      });
    } catch (error) {
      console.error("Error adding session:", error);
      toast({
        title: "Failed to add session",
        description: "There was an error adding the session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a session
  const deleteSession = async (sessionId?: number) => {
    if (!sessionId) return;
    try {
      setIsLoading(true);

      let success = false;

      // Use custom handler if provided, otherwise use fetch
      if (customHandlers?.deleteSession) {
        console.log("Using custom handler to delete session");
        success = await customHandlers.deleteSession(sessionId);
        if (!success) {
          throw new Error("Failed to delete session using custom handler");
        }
      } else {
        // Default implementation using fetch
        const response = await fetch(`/api/camps/${campId}/sessions/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete session");
        }

        success = true;
      }

      // Immediately update the UI by removing the deleted session from local state
      setSelectedDateSessions(prev => prev.filter(session => session.id !== sessionId));

      // Also update the full sessions list
      setSessions(prev => prev.filter(session => session.id !== sessionId));

      // Only invalidate query cache if we're not using custom handlers
      if (!customHandlers?.deleteSession) {
        queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'sessions'] });
      }

      // Call onSave to notify parent component (in case they need to update state)
      if (onSave) {
        onSave();
      }

      toast({
        title: "Session deleted",
        description: "The session has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Failed to delete session",
        description: "There was an error deleting the session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format time for display (e.g., "09:00" to "9:00 AM")
  const formatTimeForDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch (e) {
      return time;
    }
  };

  // Function to render the cell content with session indicators
  const renderDayContent = (day: Date) => {
    // Use our normalized date approach for consistent date comparison
    const dayStr = normalizeDate(day);

    const sessionsOnDay = sessions.filter(session => {
      const sessionDateStr = normalizeDate(session.sessionDate);
      return sessionDateStr === dayStr;
    });

    if (sessionsOnDay.length > 0) {
      return (
        <div className="relative w-full h-full">
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className="h-1 w-4/5 bg-primary rounded-full"></div>
          </div>
          {sessionsOnDay.length > 1 && (
            <div className="absolute top-0 right-1">
              <Badge variant="outline" className="h-4 min-w-4 text-[8px] px-1 py-0 flex items-center justify-center">
                {sessionsOnDay.length}
              </Badge>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-4">
      {/* Calendar section */}
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={[
              { before: campStartDate },
              { after: campEndDate }
            ]}
            captionLayout="dropdown-buttons"
            fromYear={campStartDate.getFullYear()}
            toYear={campEndDate.getFullYear()}
            components={{
              DayContent: ({ date }) => (
                <div className="relative w-full h-full flex justify-center items-center">
                  <div>{date.getDate()}</div>
                  {renderDayContent(date)}
                </div>
              )
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Session configuration section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="font-medium mb-2">
              {selectedDate
                ? `Sessions on ${format(selectedDate, "MMMM d, yyyy")}`
                : "Select a date"}
            </h3>

            {canManage && selectedDate && (
              <div className="grid gap-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={addSession}
                  disabled={isLoading}
                  className="w-full"
                >
                  Add Session at Selected Times
                </Button>
              </div>
            )}

            <Separator className="my-2" />

            {selectedDateSessions.length > 0 ? (
              <div className="space-y-2">
                {selectedDateSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatTimeForDisplay(session.startTime as string)} - {formatTimeForDisplay(session.endTime as string)}
                      </span>
                    </div>

                    {canManage && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                              onClick={() => session.id !== undefined ? deleteSession(session.id) : undefined}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete session</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarX className="h-8 w-8 mx-auto mb-2" />
                <p>No sessions scheduled for this date</p>
                {canManage && (
                  <p className="text-sm">Set the times above and click "Add Session" to schedule one</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Select a date on the calendar to view or add sessions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}