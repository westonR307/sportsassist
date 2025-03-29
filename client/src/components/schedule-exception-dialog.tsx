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
import { CampSchedule } from "@shared/schema";
import { format } from "date-fns";

interface ScheduleExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: number;
  regularSchedules: CampSchedule[];
}

// Define the form schema
const scheduleExceptionSchema = z.object({
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
  regularSchedules 
}: ScheduleExceptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current date in YYYY-MM-DD format for default value
  const currentDate = new Date();
  const formattedDate = format(currentDate, "yyyy-MM-dd");
  
  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleExceptionSchema),
    defaultValues: {
      campId,
      exceptionDate: formattedDate,
      dayOfWeek: currentDate.getDay(), // 0-6, where 0 is Sunday
      startTime: "09:00",
      endTime: "17:00",
      status: "active",
      reason: "",
    },
  });
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'schedule-exceptions'] });
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
  
  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };
  
  // Handle the day of week change when date is selected
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    form.setValue("dayOfWeek", date.getDay());
  };
  
  // When selecting a regular schedule, populate the form with its values
  const handleScheduleSelection = (scheduleId: string) => {
    if (scheduleId === "none") {
      // Reset to default values
      const date = new Date(form.getValues().exceptionDate);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Schedule Exception</DialogTitle>
          <DialogDescription>
            Add a one-time change to the regular camp schedule.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Regular schedule selection */}
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
                      {DAYS_OF_WEEK[schedule.dayOfWeek]} ({schedule.startTime} - {schedule.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Exception"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}