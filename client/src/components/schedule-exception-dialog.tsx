import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DAYS_OF_WEEK } from "@/pages/constants";
import { CampSchedule, ScheduleException } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface ScheduleExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: number;
  regularSchedules: CampSchedule[];
  exception?: ScheduleException; // Pass existing exception for editing mode
}

// Define the form schema
export const scheduleExceptionSchema = z.object({
  campId: z.number(),
  originalScheduleId: z.number().optional(),
  exceptionDate: z.string().min(1, "Date is required"),
  dayOfWeek: z.number(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"),
  status: z.enum(["active", "cancelled", "rescheduled"]),
  reason: z.string().min(1, "Reason is required")
});

type FormValues = z.infer<typeof scheduleExceptionSchema>;

export function ScheduleExceptionDialog({ 
  open, 
  onOpenChange, 
  campId,
  regularSchedules,
  exception
}: ScheduleExceptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!exception;
  
  // Get current date in YYYY-MM-DD format for default value
  const currentDate = new Date();
  const formattedDate = format(currentDate, "yyyy-MM-dd");
  
  // Set up default values based on whether we're editing or creating
  const defaultValues = React.useMemo(() => {
    if (isEditMode && exception) {
      // Format the date from ISO to YYYY-MM-DD
      const exceptionDate = exception.exceptionDate instanceof Date 
        ? format(exception.exceptionDate, "yyyy-MM-dd")
        : typeof exception.exceptionDate === 'string'
          ? format(parseISO(exception.exceptionDate), "yyyy-MM-dd")
          : formattedDate;
          
      return {
        campId,
        originalScheduleId: exception.originalScheduleId,
        exceptionDate,
        dayOfWeek: exception.dayOfWeek,
        // Format time strings to HH:MM
        startTime: exception.startTime?.substring(0, 5) || "09:00",
        endTime: exception.endTime?.substring(0, 5) || "17:00",
        status: exception.status || "active",
        reason: exception.reason || "",
      };
    } else {
      // Default values for creating a new exception
      // Calculate day of week at noon to avoid timezone issues
      const dateAtNoon = new Date(`${formattedDate}T12:00:00`);
      return {
        campId,
        exceptionDate: formattedDate,
        dayOfWeek: dateAtNoon.getDay(), // 0-6, where 0 is Sunday
        startTime: "09:00",
        endTime: "17:00",
        status: "active" as const,
        reason: "",
      };
    }
  }, [campId, exception, isEditMode, formattedDate]);
  
  // Initialize form with the appropriate values
  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleExceptionSchema),
    defaultValues
  });

  React.useEffect(() => {
    // Reset form when mode changes or exception changes
    if (open) {
      form.reset(defaultValues);
    }
  }, [form, defaultValues, open]);
  
  // Mutation for creating a schedule exception
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", `/api/camps/${campId}/schedule-exceptions`, values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule exception created",
        description: "The schedule exception has been created successfully.",
      });
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedule-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'recurrence-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/today-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/camp-stats'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create schedule exception",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating an existing schedule exception
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!exception) throw new Error("No exception to update");
      
      const res = await apiRequest(
        "PUT", 
        `/api/camps/${campId}/schedule-exceptions/${exception.id}`, 
        values
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule exception updated",
        description: "The schedule exception has been updated successfully.",
      });
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedule-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'recurrence-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/today-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/camp-stats'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update schedule exception",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting a schedule exception
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!exception) throw new Error("No exception to delete");
      
      const res = await apiRequest(
        "DELETE", 
        `/api/camps/${campId}/schedule-exceptions/${exception.id}`
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule exception deleted",
        description: "The schedule exception has been deleted successfully.",
      });
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedule-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'recurrence-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/today-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/camp-stats'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete schedule exception",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };
  
  // Handle the day of week change when date is selected
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Create a date at noon to avoid timezone issues
    const dateString = e.target.value + "T12:00:00";
    const date = new Date(dateString);
    form.setValue("dayOfWeek", date.getDay());
    console.log(`Date selected: ${e.target.value}, day of week: ${date.getDay()}, date object:`, date);
  };
  
  // When selecting a regular schedule, populate the form with its values
  const handleScheduleSelection = (scheduleId: string) => {
    if (scheduleId === "none") {
      // Reset to default values
      // Create a date at noon to avoid timezone issues
      const dateString = form.getValues().exceptionDate + "T12:00:00";
      const date = new Date(dateString);
      form.setValue("originalScheduleId", undefined);
      form.setValue("dayOfWeek", date.getDay());
      form.setValue("startTime", "09:00");
      form.setValue("endTime", "17:00");
      return;
    }
    
    if (scheduleId) {
      const id = parseInt(scheduleId);
      const schedule = regularSchedules.find(s => s.id === id);
      if (schedule) {
        form.setValue("originalScheduleId", schedule.id);
        form.setValue("dayOfWeek", schedule.dayOfWeek);
        form.setValue("startTime", schedule.startTime.substring(0, 5));
        form.setValue("endTime", schedule.endTime.substring(0, 5));
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this schedule exception? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "Create"} Schedule Exception</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modify" : "Add"} a one-time change to the regular camp schedule.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Regular schedule selection - only show for new exceptions */}
            {!isEditMode && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">
                  Base on Regular Schedule (optional)
                </label>
                <Select 
                  onValueChange={handleScheduleSelection}
                  defaultValue="none"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a regular schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Create from scratch)</SelectItem>
                    {regularSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        {DAYS_OF_WEEK[schedule.dayOfWeek]} ({schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Exception date */}
            <FormField
              control={form.control}
              name="exceptionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exception Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleDateChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Day of Week (auto-calculated from date) */}
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <FormControl>
                    <Select
                      disabled
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Rescheduled)</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain why this session is being changed or cancelled" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-between">
              {isEditMode ? (
                <Button 
                  variant="destructive" 
                  type="button" 
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Exception"}
                </Button>
              ) : (
                <div></div>
              )}
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                >
                  {isPending && !deleteMutation.isPending
                    ? (isEditMode ? "Updating..." : "Creating...") 
                    : (isEditMode ? "Update Exception" : "Create Exception")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}