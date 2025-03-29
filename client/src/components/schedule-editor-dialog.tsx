import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduleCalendar } from "./schedule-calendar";
import { Loader2, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Camp, CampSchedule } from "@shared/schema";
import { DAYS_OF_WEEK } from "@/pages/constants";
import { apiRequest } from "@/lib/queryClient";

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp: Camp;
}

export function ScheduleEditorDialog({ open, onOpenChange, camp }: ScheduleEditorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the camp's schedules
  const { data: scheduleData } = useQuery({
    queryKey: ['/api/camps', camp.id, 'schedules'],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/camps/${camp.id}/schedules`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedules');
      }
      return res.json();
    }
  });

  // Initialize schedules state when data is loaded
  useEffect(() => {
    if (scheduleData && scheduleData.schedules) {
      setSchedules(
        scheduleData.schedules.map((schedule: CampSchedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime.substring(0, 5), // Convert from HH:MM:SS to HH:MM
          endTime: schedule.endTime.substring(0, 5),
        }))
      );
      setIsLoading(false);
    }
  }, [scheduleData]);

  // Functions to manage schedules
  const addSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof Schedule, value: string | number) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const saveSchedulesMutation = useMutation({
    mutationFn: async () => {
      // Update the schedules
      const response = await apiRequest("PUT", `/api/camps/${camp.id}/schedules`, {
        schedules: schedules.map(schedule => ({
          ...schedule,
          campId: camp.id
        }))
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedules updated",
        description: "Your camp schedules have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", camp.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", camp.id, "schedules"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update schedules: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Schedule validation
    if (schedules.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one schedule",
        variant: "destructive",
      });
      return;
    }

    // Validate schedule times
    for (const schedule of schedules) {
      if (!schedule.startTime || !schedule.endTime) {
        toast({
          title: "Error",
          description: "Schedule times cannot be empty",
          variant: "destructive",
        });
        return;
      }

      const start = new Date(`1970-01-01T${schedule.startTime}`);
      const end = new Date(`1970-01-01T${schedule.endTime}`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({
          title: "Error",
          description: "Invalid time format",
          variant: "destructive",
        });
        return;
      }

      if (end <= start) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        return;
      }
    }
    
    saveSchedulesMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Camp Schedule</DialogTitle>
          <DialogDescription>
            Update the regular schedule for your camp.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Camp Schedule Calendar</h3>
            </div>
            
            {/* Calendar-based schedule interface */}
            <ScheduleCalendar
              startDate={new Date(camp.startDate)}
              endDate={new Date(camp.endDate)}
              schedules={schedules.map(s => ({
                id: Math.floor(Math.random() * 1000000), // Temporary ID for display purposes
                campId: camp.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime + ':00',
                endTime: s.endTime + ':00'
              }))}
              onSchedulesChange={(newSchedules) => {
                setSchedules(newSchedules.map(s => ({
                  dayOfWeek: s.dayOfWeek,
                  startTime: s.startTime.substring(0, 5),
                  endTime: s.endTime.substring(0, 5)
                })));
              }}
              campId={camp.id}
            />

            {/* Legacy schedule interface (as backup) */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Manual Schedule Entry</h3>
                <Button type="button" onClick={addSchedule} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You can also manually add schedule items below. Changes here will be reflected in the calendar above.
              </p>

              {schedules.length === 0 ? (
                <div className="text-center py-8 border rounded-lg text-muted-foreground">
                  No schedules added yet. Add one using the button above or the calendar.
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-4 border rounded-lg relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeSchedule(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="flex-1 space-y-4">
                        <div>
                          <Label>Day of Week</Label>
                          <select
                            value={schedule.dayOfWeek}
                            onChange={(e) =>
                              updateSchedule(index, "dayOfWeek", parseInt(e.target.value))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            {DAYS_OF_WEEK.map((day, i) => (
                              <option key={i} value={i}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) =>
                                updateSchedule(index, "startTime", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) =>
                                updateSchedule(index, "endTime", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={saveSchedulesMutation.isPending || isLoading}
          >
            {saveSchedulesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}