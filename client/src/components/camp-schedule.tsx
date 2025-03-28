import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CampSchedule } from '@shared/schema';
import { Loader2, Clock } from 'lucide-react';

// Array of days of the week
const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

export function CampScheduleDisplay({ campId }: CampScheduleProps) {
  const { data: schedules, isLoading, error } = useQuery<CampSchedule[]>({
    queryKey: ['/api/camps', campId, 'schedules'],
    refetchOnWindowFocus: false,
  });

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2" /> 
          Camp Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(schedulesByDay).map(([day, daySchedules]) => (
            <div key={day} className="border rounded-md p-3">
              <h4 className="font-medium mb-2">{daysOfWeek[parseInt(day)]}</h4>
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
      const dayName = daysOfWeek[parseInt(day)].substring(0, 3);
      return count > 1 ? `${dayName} (${count})` : dayName;
    })
    .join(', ');

  return <span>{summary}</span>;
}