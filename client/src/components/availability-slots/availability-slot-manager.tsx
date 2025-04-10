import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, Calendar, Clock } from "lucide-react";
import { format, addDays, setHours, setMinutes, parseISO } from "date-fns";

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

export function AvailabilitySlotManager({
  campStartDate,
  campEndDate,
  slots,
  onSlotsChange
}: AvailabilitySlotManagerProps) {
  const [newDate, setNewDate] = useState<string>(format(new Date(campStartDate), "yyyy-MM-dd"));
  const [newStartTime, setNewStartTime] = useState<string>("09:00");
  const [newEndTime, setNewEndTime] = useState<string>("10:00");
  const [newCapacity, setNewCapacity] = useState<number>(1);

  const addSlot = () => {
    const newSlot: AvailabilitySlot = {
      date: parseISO(newDate),
      startTime: newStartTime,
      endTime: newEndTime,
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
    let currentDate = new Date(campStartDate);
    const endDate = new Date(campEndDate);

    while (currentDate <= endDate) {
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
                <Clock className="text-muted-foreground h-4 w-4" />
                <Label htmlFor="end-time">End Time</Label>
              </div>
              <Select value={newEndTime} onValueChange={setNewEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="End time" />
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
            disabled={!newDate || !newStartTime || !newEndTime || newCapacity < 1}
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
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)} | Capacity: {slot.capacity}
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