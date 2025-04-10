import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, Calendar, Clock, Timer } from "lucide-react";
import { format, addDays, setHours, setMinutes, parseISO, addMinutes } from "date-fns";

interface AvailabilitySlot {
  id?: number;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface AvailabilitySlotManagerProps {
  campStartDate: Date;
  campEndDate: Date;
  slots: AvailabilitySlot[];
  onSlotsChange: (slots: AvailabilitySlot[]) => void;
}

// Duration options in 15-minute increments (in minutes)
const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 75, label: "1 hour 15 minutes" },
  { value: 90, label: "1 hour 30 minutes" },
  { value: 105, label: "1 hour 45 minutes" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2 hours 30 minutes" },
  { value: 180, label: "3 hours" },
  { value: 210, label: "3 hours 30 minutes" },
  { value: 240, label: "4 hours" },
];

export function AvailabilitySlotManager({
  campStartDate,
  campEndDate,
  slots,
  onSlotsChange
}: AvailabilitySlotManagerProps) {
  // Set initial date with noon time to avoid timezone issues
  const initialDate = new Date(campStartDate);
  initialDate.setHours(12, 0, 0, 0);
  const [newDate, setNewDate] = useState<string>(format(initialDate, "yyyy-MM-dd"));
  const [newStartTime, setNewStartTime] = useState<string>("09:00");
  const [newDuration, setNewDuration] = useState<number>(60); // Default to 1 hour
  const [newCapacity, setNewCapacity] = useState<number>(1);

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(part => parseInt(part, 10));
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, "HH:mm");
  };

  const addSlot = () => {
    const endTime = calculateEndTime(newStartTime, newDuration);
    
    const newSlot: AvailabilitySlot = {
      date: parseISO(newDate),
      startTime: newStartTime,
      endTime: endTime,
      capacity: newCapacity
    };

    onSlotsChange([...slots, newSlot]);
  };

  const removeSlot = (index: number) => {
    const updatedSlots = [...slots];
    updatedSlots.splice(index, 1);
    onSlotsChange(updatedSlots);
  };

  // Generate date options between camp start and end dates
  const generateDateOptions = () => {
    const dateOptions = [];
    
    // Create dates with time set to noon to avoid timezone issues
    const startDateWithoutTime = new Date(campStartDate);
    startDateWithoutTime.setHours(12, 0, 0, 0);
    
    const endDateWithoutTime = new Date(campEndDate);
    endDateWithoutTime.setHours(12, 0, 0, 0);
    
    let currentDate = startDateWithoutTime;

    while (currentDate <= endDateWithoutTime) {
      dateOptions.push({
        value: format(currentDate, "yyyy-MM-dd"),
        label: format(currentDate, "MMM dd, yyyy (EEEE)")
      });
      currentDate = addDays(currentDate, 1);
    }

    return dateOptions;
  };

  // Generate time options from 6am to 10pm in 15-minute intervals
  const generateTimeOptions = () => {
    const timeOptions = [];
    let baseDate = new Date();
    baseDate = setHours(baseDate, 6);
    baseDate = setMinutes(baseDate, 0);

    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const date = new Date(baseDate);
        date.setHours(hour, minute);
        timeOptions.push({
          value: format(date, "HH:mm"),
          label: format(date, "h:mm a")
        });
      }
    }

    return timeOptions;
  };

  const dateOptions = generateDateOptions();
  const timeOptions = generateTimeOptions();

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, "h:mm a");
  };

  // Calculate the duration between start and end time in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(part => parseInt(part, 10));
    const [endHours, endMinutes] = endTime.split(':').map(part => parseInt(part, 10));
    
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    // If end time is earlier than start time, assume it's the next day
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / (1000 * 60)); // Convert ms to minutes
  };

  // Format a duration in minutes to a human-readable string
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return hours === 1 ? `${hours} hour` : `${hours} hours`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Availability Slot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <Label htmlFor="date-select">Date</Label>
          </div>
          <Select value={newDate} onValueChange={setNewDate}>
            <SelectTrigger>
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <Label htmlFor="start-time">Start Time</Label>
              </div>
              <Select value={newStartTime} onValueChange={setNewStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Timer className="text-muted-foreground h-4 w-4" />
                <Label htmlFor="duration">Duration</Label>
              </div>
              <Select 
                value={newDuration.toString()} 
                onValueChange={(value) => setNewDuration(parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                End time: {formatTime(calculateEndTime(newStartTime, newDuration))}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={newCapacity}
              onChange={(e) => setNewCapacity(parseInt(e.target.value, 10) || 1)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of participants who can book this time slot
            </p>
          </div>

          <Button 
            type="button" 
            onClick={addSlot} 
            className="w-full"
            disabled={!newDate || !newStartTime || newDuration < 15 || newCapacity < 1}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Slot
          </Button>
        </CardContent>
      </Card>

      {slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Availability Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {slots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {format(new Date(slot.date), "MMM dd, yyyy (EEEE)")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)} 
                      <span className="ml-1">({formatDuration(calculateDuration(slot.startTime, slot.endTime))})</span> 
                      <span className="mx-1">|</span> 
                      <span>Capacity: {slot.capacity}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSlot(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}