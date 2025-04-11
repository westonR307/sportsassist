import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CampSchedule, ScheduleException, CampSession, RecurrencePattern } from '@shared/schema';
import { Loader2, Clock, CalendarPlus, AlertTriangle, Pencil, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScheduleExceptionDialog } from './schedule-exception-dialog';
import { format, parseISO, parse, isSameDay, isValid } from 'date-fns';
import { useLocation } from 'wouter';

import { DAYS_OF_WEEK } from "@/pages/constants";

// Parses a date string safely, handling various formats from the backend
// with special timezone handling to ensure dates don't shift days
const parseDate = (dateString: string | Date): Date => {
  if (dateString instanceof Date) {
    return dateString;
  }
  
  try {
    // Special handling for ISO-8601 strings to avoid timezone issues
    // If it has a T format like "2025-04-28T00:00:00.000Z"
    if (dateString.includes('T')) {
      // Extract the year-month-day part only
      const datePart = dateString.split('T')[0];
      if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = datePart.split('-').map(Number);
        // Create date using local components (noon time to avoid any timezone issues)
        return new Date(year, month - 1, day, 12, 0, 0);
      }
      
      // Fallback to standard parsing but risk timezone issues
      return parseISO(dateString);
    }
    
    // Try parsing direct YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      // Use noon time to avoid timezone-related date shifts
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    
    // Standard parsing as fallback
    const parsedDate = new Date(dateString);
    if (isValid(parsedDate)) {
      return parsedDate;
    }
    
    console.warn(`Unable to parse date string: ${dateString}, using current date as fallback`);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return new Date();
  }
};

// Formats a date consistently 
const formatDate = (dateString: string | Date, formatString = 'EEEE, MMMM d, yyyy'): string => {
  try {
    const date = parseDate(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return 'Invalid date';
  }
};

// Helper function to format time from database format (HH:MM:SS) to AM/PM format
const formatTime = (time: string) => {
  if (!time) return '';
  
  try {
    // Handle different time formats
    const timeStr = time.includes('T') ? time.split('T')[1].substring(0, 5) : time.substring(0, 5);
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error(`Error formatting time: ${time}`, error);
    return time || '';
  }
};

// Sort schedules by day of week
const sortByDayOfWeek = (a: CampSchedule, b: CampSchedule) => {
  return a.dayOfWeek - b.dayOfWeek;
};

interface CampScheduleProps {
  campId: number;
}

interface ScheduleExceptionWithPermissions {
  exceptions: ScheduleException[];
  permissions: {
    canManage: boolean;
  };
}

export function CampScheduleDisplay({ campId }: CampScheduleProps) {
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("enhanced");
  const [selectedException, setSelectedException] = useState<ScheduleException | undefined>(undefined);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [, navigate] = useLocation();

  // Query camp data to determine if it's an availability-based camp
  const { data: campData, isLoading: isLoadingCamp } = useQuery({
    queryKey: ['/api/camps', campId],
    enabled: !!campId,
    staleTime: 5000,
  });
  
  // For availability-based camps, fetch availability slots
  const { 
    data: availabilitySlots = [], 
    isLoading: isLoadingSlots 
  } = useQuery({
    queryKey: ['/api/camps', campId, 'availability-slots'],
    enabled: !!campId && campData?.schedulingType === 'availability',
    staleTime: 5000,
  });

  // Query regular schedules with explicit fetcher
  const { 
    data: scheduleData, 
    isLoading: schedulesLoading, 
    error: schedulesError 
  } = useQuery({
    queryKey: ['/api/camps', campId, 'schedules'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Short stale time of 5 seconds
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/schedules`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedules');
      }
      return res.json();
    }
  });

  // Query schedule exceptions with explicit fetcher
  const { 
    data: exceptionsData, 
    isLoading: exceptionsLoading, 
    error: exceptionsError 
  } = useQuery({
    queryKey: ['/api/camps', campId, 'schedule-exceptions'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Short stale time of 5 seconds
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/schedule-exceptions`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedule exceptions');
      }
      return res.json();
    }
  });

  // Query enhanced scheduling recurrence patterns
  const {
    data: patternsData,
    isLoading: patternsLoading,
    error: patternsError
  } = useQuery({
    queryKey: ['/api/camps', campId, 'recurrence-patterns'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Short stale time of 5 seconds
    queryFn: async () => {
      try {
        const res = await fetch(`/api/camps/${campId}/recurrence-patterns`);
        if (!res.ok) {
          return { patterns: [] };
        }
        return res.json();
      } catch (error) {
        console.log("Error fetching recurrence patterns:", error);
        return { patterns: [] };
      }
    }
  });

  // Query enhanced scheduling sessions
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError
  } = useQuery({
    queryKey: ['/api/camps', campId, 'sessions'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Short stale time of 5 seconds
    queryFn: async () => {
      try {
        const res = await fetch(`/api/camps/${campId}/sessions`);
        if (!res.ok) {
          return { sessions: [] };
        }
        return res.json();
      } catch (error) {
        console.log("Error fetching camp sessions:", error);
        return { sessions: [] };
      }
    }
  });

  // Enhanced debug logs
  console.log("Camp ID:", campId);
  console.log("Schedule Data:", scheduleData);
  console.log("Exceptions Data:", exceptionsData);
  console.log("Patterns Data:", patternsData);
  console.log("Sessions Data:", sessionsData);
  console.log("Schedule Errors:", schedulesError);
  console.log("Exception Errors:", exceptionsError);

  const isLoading = schedulesLoading || exceptionsLoading || patternsLoading || sessionsLoading;
  const error = schedulesError || exceptionsError || patternsError || sessionsError;
  
  // Fixed data extraction with strict type checks
  const canManage = scheduleData && scheduleData.permissions ? scheduleData.permissions.canManage : false;
  const schedules = scheduleData && Array.isArray(scheduleData.schedules) ? scheduleData.schedules : [];
  const exceptions = exceptionsData && Array.isArray(exceptionsData.exceptions) ? exceptionsData.exceptions : [];
  const patterns = patternsData && Array.isArray(patternsData.patterns) ? patternsData.patterns : [];
  const sessions = sessionsData && Array.isArray(sessionsData.sessions) ? sessionsData.sessions : [];

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load camp schedules. Please try again.
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        No schedule information available for this camp.
      </div>
    );
  }

  // Group schedules by day of week
  const schedulesByDay = schedules
    .sort(sortByDayOfWeek)
    .reduce<Record<number, CampSchedule[]>>((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {});
    
  // Sort exceptions by date (most recent first)
  const sortedExceptions = [...exceptions].sort((a, b) => 
    parseDate(b.exceptionDate).getTime() - parseDate(a.exceptionDate).getTime()
  );
  
  // Find upcoming exceptions (today or in the future)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingExceptions = sortedExceptions.filter(
    exception => parseDate(exception.exceptionDate) >= today
  );
  
  const hasUpcomingExceptions = upcomingExceptions.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" /> 
            Camp Schedule
          </div>
          {hasUpcomingExceptions && (
            <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Upcoming Changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mx-4 mb-2">
          <TabsTrigger value="enhanced">
            <Calendar className="h-4 w-4 mr-1" />
            Calendar Schedule
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="relative">
            Session Changes
            {hasUpcomingExceptions && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>
        

        
        <TabsContent value="enhanced" className="m-0">
          <CardContent>
            {patterns.length > 0 || sessions.length > 0 ? (
              <div className="space-y-6">
                {patterns.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Recurrence Patterns</h3>
                    <div className="space-y-4">
                      {patterns.map((pattern) => (
                        <div key={pattern.id} className="border rounded-md p-3">
                          <h4 className="font-medium">{pattern.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(pattern.startDate, 'MMM d, yyyy')} - {formatDate(pattern.endDate, 'MMM d, yyyy')}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="bg-primary/10">
                              {formatTime(pattern.startTime)} - {formatTime(pattern.endTime)}
                            </Badge>
                            <Badge variant="outline">
                              {pattern.repeatType.charAt(0).toUpperCase() + pattern.repeatType.slice(1)}
                            </Badge>
                            {pattern.daysOfWeek && (
                              <Badge variant="outline" className="bg-muted/50">
                                {pattern.daysOfWeek.map(day => DAYS_OF_WEEK[day].substring(0, 3)).join(', ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {sessions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Upcoming Sessions</h3>
                    <div className="space-y-3">
                      {(() => {
                        // Get upcoming sessions
                        const upcomingSessions = sessions
                          .filter(session => parseDate(session.sessionDate) >= today)
                          .sort((a, b) => parseDate(a.sessionDate).getTime() - parseDate(b.sessionDate).getTime());
                          
                        // Determine if we need to show the "show more" button
                        const hasMoreSessions = upcomingSessions.length > 5;
                        
                        // Display either all sessions or just the first 5
                        const displaySessions = showAllSessions 
                          ? upcomingSessions 
                          : upcomingSessions.slice(0, 5);
                        
                        return (
                          <>
                            {displaySessions.map((session) => (
                              <div key={session.id} className="border rounded-md p-3">
                                <h4 className="font-medium">{formatDate(session.sessionDate)}</h4>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-sm">
                                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                  </p>
                                  {session.status !== 'active' && (
                                    <Badge variant={session.status === 'cancelled' ? 'destructive' : 'outline'}>
                                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                    </Badge>
                                  )}
                                </div>
                                {session.status === 'rescheduled' && (
                                  <div className="mt-2 border-t pt-2">
                                    <div className="flex justify-between items-center">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Rescheduled to:
                                      </p>
                                      <Badge variant="secondary" className="text-xs">
                                        {session.rescheduledStatus === 'confirmed' ? 'Confirmed' : 'TBD'}
                                      </Badge>
                                    </div>
                                    {session.rescheduledStatus === 'confirmed' && session.rescheduledDate && (
                                      <>
                                        <p className="text-sm font-medium mt-1">
                                          {formatDate(session.rescheduledDate)}
                                        </p>
                                        <p className="text-sm">
                                          {formatTime(session.rescheduledStartTime || '')} - {formatTime(session.rescheduledEndTime || '')}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                )}
                                {session.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
                                )}
                              </div>
                            ))}
                            
                            {/* Show More / Show Less Button */}
                            {hasMoreSessions && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full mt-2 text-sm text-muted-foreground hover:text-primary"
                                onClick={() => setShowAllSessions(!showAllSessions)}
                              >
                                {showAllSessions 
                                  ? 'Show fewer sessions' 
                                  : `+ Show ${upcomingSessions.length - 5} more sessions`}
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Full Calendar button completely removed as requested */}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No enhanced scheduling data available.</p>
                {/* "Set Up Schedule" button removed as requested */}
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="exceptions" className="m-0">
          <CardContent>
            {exceptions.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No schedule exceptions found
              </div>
            ) : (
              <div className="space-y-4">
                {sortedExceptions.map((exception) => {
                  const exceptionDate = parseDate(exception.exceptionDate);
                  const isPast = exceptionDate < today;
                  
                  return (
                    <div 
                      key={exception.id} 
                      className={`border rounded-md p-3 ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">
                            {formatDate(exception.exceptionDate)}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(exception.startTime)} to {formatTime(exception.endTime)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage && !isPast && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => {
                                setSelectedException(exception);
                                setShowExceptionDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Badge 
                            variant={
                              exception.status === "active" ? "default" :
                              exception.status === "cancelled" ? "destructive" : 
                              "outline"
                            }
                          >
                            {exception.status === "active" ? "Rescheduled" : 
                             exception.status === "cancelled" ? "Cancelled" : 
                             "Modified"}
                          </Badge>
                        </div>
                      </div>
                      {exception.reason && (
                        <div className="mt-2 text-sm border-t pt-2">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Reason:</p>
                          <p>{exception.reason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          
          {canManage && (
            <CardFooter className="pt-0 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setShowExceptionDialog(true)}
              >
                <CalendarPlus className="h-4 w-4" />
                Add Exception
              </Button>
            </CardFooter>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Schedule Exception Dialog */}
      {canManage && (
        <ScheduleExceptionDialog
          open={showExceptionDialog}
          onOpenChange={(open) => {
            setShowExceptionDialog(open);
            if (!open) {
              setSelectedException(undefined);
            }
          }}
          campId={campId}
          regularSchedules={schedules}
          exception={selectedException}
        />
      )}
    </Card>
  );
}

export function CampScheduleSummary({ 
  schedules, 
  patterns, 
  sessions 
}: { 
  schedules: CampSchedule[],
  patterns?: RecurrencePattern[],
  sessions?: CampSession[]
}) {
  // If we have enhanced scheduling data, prefer to show that
  if ((patterns && patterns.length > 0) || (sessions && sessions.length > 0)) {
    // Show the recurrence pattern types if available
    if (patterns && patterns.length > 0) {
      const patternTypes = Array.from(new Set(patterns.map(p => p.repeatType)));
      const patternSummary = patternTypes.map(type => 
        type.charAt(0).toUpperCase() + type.slice(1)
      ).join(', ');
      
      return (
        <span className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          <span>{patternSummary} Schedule</span>
        </span>
      );
    }
    
    // If no patterns but there are sessions, show session count
    if (sessions && sessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingSessions = sessions.filter(s => parseDate(s.sessionDate) >= today);
      return (
        <span className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          <span>{upcomingSessions.length} upcoming sessions</span>
        </span>
      );
    }
  }

  // Fall back to traditional schedule display
  if (!schedules || schedules.length === 0) {
    return <span className="text-muted-foreground">No schedule information</span>;
  }

  // Group by day of week and count
  const dayCount = schedules.reduce<Record<number, number>>((acc, schedule) => {
    acc[schedule.dayOfWeek] = (acc[schedule.dayOfWeek] || 0) + 1;
    return acc;
  }, {});

  // Create a summary like "Mon, Wed, Fri" or "Mon (2), Wed (1)"
  const summary = Object.entries(dayCount)
    .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB))
    .map(([day, count]) => {
      const dayName = DAYS_OF_WEEK[parseInt(day)].substring(0, 3);
      return count > 1 ? `${dayName} (${count})` : dayName;
    })
    .join(', ');

  return <span>{summary}</span>;
}