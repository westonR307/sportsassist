import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CampSchedule, ScheduleException } from '@shared/schema';
import { Loader2, Clock, CalendarPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScheduleExceptionDialog } from './schedule-exception-dialog';
import { format } from 'date-fns';

import { DAYS_OF_WEEK } from "@/pages/constants";

// Helper function to format time from database format (HH:MM:SS) to AM/PM format
const formatTime = (time: string) => {
  if (!time) return '';
  
  // Handle different time formats
  const timeStr = time.includes('T') ? time.split('T')[1].substring(0, 5) : time.substring(0, 5);
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
  const [activeTab, setActiveTab] = useState("regular");

  // Query regular schedules
  const { 
    data: scheduleData, 
    isLoading: schedulesLoading, 
    error: schedulesError 
  } = useQuery({
    queryKey: ['/api/camps', campId, 'schedules'],
    refetchOnWindowFocus: false,
  });

  // Query schedule exceptions
  const { 
    data: exceptionsData, 
    isLoading: exceptionsLoading, 
    error: exceptionsError 
  } = useQuery({
    queryKey: ['/api/camps', campId, 'schedule-exceptions'],
    refetchOnWindowFocus: false,
  });

  // Debug logs
  console.log("Schedule Data:", scheduleData);
  console.log("Exceptions Data:", exceptionsData);

  const isLoading = schedulesLoading || exceptionsLoading;
  const error = schedulesError || exceptionsError;
  
  // Fixed data extraction
  const canManage = scheduleData?.permissions?.canManage || false;
  const schedules = scheduleData?.schedules || [];
  const exceptions = exceptionsData?.exceptions || [];

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
    new Date(b.exceptionDate).getTime() - new Date(a.exceptionDate).getTime()
  );
  
  // Find upcoming exceptions (today or in the future)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingExceptions = sortedExceptions.filter(
    exception => new Date(exception.exceptionDate) >= today
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
          <TabsTrigger value="regular">Regular Schedule</TabsTrigger>
          <TabsTrigger value="exceptions" className="relative">
            Exceptions
            {hasUpcomingExceptions && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular" className="m-0">
          <CardContent>
            <div className="space-y-4">
              {Object.entries(schedulesByDay).map(([day, daySchedules]) => (
                <div key={day} className="border rounded-md p-3">
                  <h4 className="font-medium mb-2">{DAYS_OF_WEEK[parseInt(day)]}</h4>
                  <div className="space-y-2">
                    {daySchedules.map((schedule, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{formatTime(schedule.startTime)}</span>
                        <span>to</span>
                        <span>{formatTime(schedule.endTime)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                  const exceptionDate = new Date(exception.exceptionDate);
                  const isPast = exceptionDate < today;
                  
                  return (
                    <div 
                      key={exception.id} 
                      className={`border rounded-md p-3 ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">
                            {format(new Date(exception.exceptionDate), "EEEE, MMMM d, yyyy")}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(exception.startTime)} to {formatTime(exception.endTime)}
                          </p>
                        </div>
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
          onOpenChange={setShowExceptionDialog}
          campId={campId}
          regularSchedules={schedules}
        />
      )}
    </Card>
  );
}

export function CampScheduleSummary({ schedules }: { schedules: CampSchedule[] }) {
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