import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { DAYS_OF_WEEK } from "@/pages/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CampSchedule } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: number;
}

export function ScheduleEditorDialog({ open, onOpenChange, campId }: ScheduleEditorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Simplified query with better options
  const { data, isLoading } = useQuery({
    queryKey: ['/api/camps', campId, 'schedules'],
    enabled: open && !!campId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Clear effect for handling open/close states
  useEffect(() => {
    if (open && data) {
      console.log("Processing data:", data);
      if (data && typeof data === 'object') {
        // Handle the data properly even if the structure is unknown
        const schedulesList = 
          data.schedules && Array.isArray(data.schedules) 
            ? data.schedules 
            : [];
        
        console.log("Found schedules:", schedulesList);
        
        // Map the schedule data to our format
        const formattedSchedules = schedulesList.map((schedule: any) => ({
          dayOfWeek: typeof schedule.dayOfWeek === 'number' ? schedule.dayOfWeek : 0,
          startTime: typeof schedule.startTime === 'string' 
            ? schedule.startTime.substring(0, 5) // Convert from HH:MM:SS to HH:MM
            : "09:00",
          endTime: typeof schedule.endTime === 'string'
            ? schedule.endTime.substring(0, 5)
            : "17:00",
        }));
        
        console.log("Formatted schedules:", formattedSchedules);
        setSchedules(formattedSchedules);
      }
      setIsLocalLoading(false);
    } else if (!open) {
      // Reset state when dialog closes
      setSchedules([]);
      setIsLocalLoading(true);
    }
  }, [open, data]);

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
      const response = await apiRequest("PUT", `/api/camps/${campId}/schedules`, {
        schedules: schedules.map(schedule => ({
          ...schedule,
          campId: campId
        }))
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedules updated",
        description: "Your camp schedules have been successfully updated.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", campId] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps", campId, "schedules"] });
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

  // Show loading indicator when data is loading
  const showLoading = isLoading || isLocalLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Camp Schedule</DialogTitle>
          <DialogDescription>
            Update the regular schedule for your camp.
          </DialogDescription>
        </DialogHeader>

        {showLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Manual schedule interface only for simplicity */}
            <div className="mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Current Schedule</h3>
                <Button type="button" onClick={addSchedule} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </div>
              
              {schedules.length === 0 ? (
                <div className="text-center py-8 border rounded-lg mt-4 text-muted-foreground">
                  No schedules added yet. Add one using the button above.
                </div>
              ) : (
                <div className="space-y-3 mt-4">
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
            disabled={saveSchedulesMutation.isPending || showLoading}
          >
            {saveSchedulesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}