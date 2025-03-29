import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, addDays, isSameDay, isWithinInterval } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { TimeSlotPicker } from './time-slot-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DAYS_OF_WEEK } from '@/pages/constants';
import { CampSchedule } from '@shared/schema';

type ScheduleCalendarProps = {
  startDate: Date;
  endDate: Date;
  schedules: CampSchedule[];
  onSchedulesChange: (schedules: CampSchedule[]) => void;
  campId?: number;
};

type DaySchedule = {
  date: Date;
  slots: { startTime: string; endTime: string }[];
};

export function ScheduleCalendar({
  startDate,
  endDate,
  schedules,
  onSchedulesChange,
  campId
}: ScheduleCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [currentSlots, setCurrentSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  
  // Convert day of week based schedules to date-specific schedules for visualization
  useEffect(() => {
    const dateSchedules: DaySchedule[] = [];
    if (startDate && endDate) {
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // For each date in the range, find any existing weekly schedules for that day of week
        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Convert Sunday from 0 to 7
        const matchingSchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
        
        if (matchingSchedules.length > 0) {
          dateSchedules.push({
            date: new Date(currentDate),
            slots: matchingSchedules.map(s => ({
              startTime: s.startTime.substring(0, 5), // Format HH:MM
              endTime: s.endTime.substring(0, 5)
            }))
          });
        }
        
        currentDate = addDays(currentDate, 1);
      }
    }
    
    setDaySchedules(dateSchedules);
  }, [startDate, endDate, schedules]);
  
  // Handle day selection
  const handleDayClick = (day: Date) => {
    if (!isWithinInterval(day, { start: startDate, end: endDate })) {
      return;
    }
    
    setSelectedDay(day);
    
    // Find existing schedules for this day of week
    const dayOfWeek = day.getDay() === 0 ? 7 : day.getDay();
    const existingSchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
    
    if (existingSchedules.length > 0) {
      setCurrentSlots(existingSchedules.map(s => ({
        startTime: s.startTime.substring(0, 5),
        endTime: s.endTime.substring(0, 5)
      })));
    } else {
      setCurrentSlots([{ startTime: '09:00', endTime: '10:00' }]);
    }
    
    setIsTimeDialogOpen(true);
  };
  
  // Save time slots for the selected day
  const saveTimeSlots = () => {
    if (!selectedDay) return;
    
    const dayOfWeek = selectedDay.getDay() === 0 ? 7 : selectedDay.getDay();
    
    // Remove existing schedules for this day of week
    const filteredSchedules = schedules.filter(s => s.dayOfWeek !== dayOfWeek);
    
    // Add new schedules
    const newSchedules = [
      ...filteredSchedules,
      ...currentSlots.map(slot => ({
        id: Math.floor(Math.random() * 1000000), // Temporary ID for new schedules
        campId: campId || 0,
        dayOfWeek,
        startTime: slot.startTime + ':00',
        endTime: slot.endTime + ':00'
      }))
    ];
    
    onSchedulesChange(newSchedules);
    setIsTimeDialogOpen(false);
  };
  
  // Apply the first week's schedule to all subsequent weeks
  const repeatFirstWeek = () => {
    if (!startDate || !endDate) return;
    
    // Get the first week's schedules
    const firstWeekEnd = addDays(startDate, 6);
    const firstWeekSchedules: CampSchedule[] = [];
    
    // Gather all unique days of week in the first week
    const daysOfWeekSeen = new Set<number>();
    
    for (let i = 0; i <= 6; i++) {
      const date = addDays(startDate, i);
      if (date > endDate) break;
      
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
      daysOfWeekSeen.add(dayOfWeek);
    }
    
    // Find schedules for those days
    daysOfWeekSeen.forEach(dayOfWeek => {
      const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
      firstWeekSchedules.push(...daySchedules);
    });
    
    // Create a map to store unique day of week schedules
    const newScheduleMap = new Map<number, { startTime: string, endTime: string }[]>();
    
    // For each day of week, store time slots
    firstWeekSchedules.forEach(schedule => {
      if (!newScheduleMap.has(schedule.dayOfWeek)) {
        newScheduleMap.set(schedule.dayOfWeek, []);
      }
      newScheduleMap.get(schedule.dayOfWeek)!.push({
        startTime: schedule.startTime,
        endTime: schedule.endTime
      });
    });
    
    // Create new schedules for all weeks
    const newSchedules: CampSchedule[] = [];
    
    newScheduleMap.forEach((slots, dayOfWeek) => {
      slots.forEach(slot => {
        newSchedules.push({
          id: Math.floor(Math.random() * 1000000),
          campId: campId || 0,
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      });
    });
    
    onSchedulesChange(newSchedules);
  };
  
  // Day content for the calendar
  const renderDayContent = (day: Date) => {
    const schedulesForDay = daySchedules.find(ds => isSameDay(ds.date, day));
    
    if (schedulesForDay && schedulesForDay.slots.length > 0) {
      return (
        <div className="text-xs">
          <div className="h-1.5 bg-green-500 rounded-sm mb-0.5" />
          {schedulesForDay.slots.length > 1 && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3">
              {schedulesForDay.slots.length} slots
            </Badge>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Camp Schedule Calendar</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={repeatFirstWeek}
          disabled={!schedules.length}
        >
          Repeat First Week Pattern
        </Button>
      </div>
      
      <div className="border rounded-md p-4 bg-card">
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={(day) => day && handleDayClick(day)}
          disabled={[
            { before: startDate },
            { after: endDate }
          ]}
          modifiers={{
            hasSchedule: daySchedules.map(ds => ds.date)
          }}
          modifiersStyles={{
            hasSchedule: { 
              fontWeight: 'bold',
              color: 'var(--primary)'
            }
          }}
          components={{
            DayContent: ({ date }) => (
              <div className="flex flex-col items-center">
                <div>{format(date, 'd')}</div>
                {renderDayContent(date)}
              </div>
            )
          }}
          footer={
            <div className="text-sm text-muted-foreground mt-2">
              Click on a day to schedule time slots
            </div>
          }
        />
      </div>
      
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Schedule for {selectedDay && format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Add time slots for this day.
            </DialogDescription>
          </DialogHeader>
          
          <TimeSlotPicker 
            slots={currentSlots} 
            onChange={setCurrentSlots} 
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTimeSlots}>
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Current Schedule:</h4>
        <ScrollArea className="h-60 border rounded-md p-4">
          {schedules.length > 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                const daySchedules = schedules.filter(s => s.dayOfWeek === day);
                if (daySchedules.length === 0) return null;
                
                return (
                  <div key={day} className="pb-2 border-b last:border-b-0">
                    <h5 className="font-medium">{DAYS_OF_WEEK[day - 1]}</h5>
                    <div className="space-y-1 mt-1">
                      {daySchedules.map((schedule, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No schedule set. Click on days in the calendar to add time slots.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}