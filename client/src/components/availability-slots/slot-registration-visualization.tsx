import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { 
  Calendar, 
  Users, 
  Clock, 
  BarChart4, 
  Info,
  CheckCircle,
  XCircle,
  CalendarClock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AvailabilitySlot = {
  id: number;
  campId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  status: "available" | "booked" | "unavailable";
  notes?: string;
  bookings?: any[];
};

interface SlotRegistrationVisualizationProps {
  slots: AvailabilitySlot[];
  isLoading?: boolean;
}

export function SlotRegistrationVisualization({ slots, isLoading = false }: SlotRegistrationVisualizationProps) {
  const [selectedView, setSelectedView] = useState<"calendar" | "statistics">("calendar");

  // Group slots by date
  const slotsByDate = useMemo(() => {
    return slots.reduce((acc: Record<string, AvailabilitySlot[]>, slot: AvailabilitySlot) => {
      const dateStr = new Date(slot.slotDate).toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(slot);
      return acc;
    }, {});
  }, [slots]);

  // Sort dates
  const sortedDates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate]);

  // Calculate overview statistics
  const statistics = useMemo(() => {
    if (!slots.length) return { 
      totalSlots: 0, 
      totalCapacity: 0, 
      totalBooked: 0, 
      utilization: 0,
      fullyBookedSlots: 0,
      emptySlots: 0,
      partiallyBookedSlots: 0
    };

    const totalSlots = slots.length;
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.maxBookings, 0);
    const totalBooked = slots.reduce((sum, slot) => sum + slot.currentBookings, 0);
    const utilization = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
    
    const fullyBookedSlots = slots.filter(slot => slot.currentBookings >= slot.maxBookings).length;
    const emptySlots = slots.filter(slot => slot.currentBookings === 0).length;
    const partiallyBookedSlots = totalSlots - fullyBookedSlots - emptySlots;

    return {
      totalSlots,
      totalCapacity,
      totalBooked,
      utilization,
      fullyBookedSlots,
      emptySlots,
      partiallyBookedSlots
    };
  }, [slots]);

  // Format time
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, "h:mm a");
  };

  // Determine color based on utilization percentage
  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500 text-white";
    if (percent >= 70) return "bg-orange-500 text-white";
    if (percent >= 50) return "bg-yellow-500 text-black";
    if (percent > 0) return "bg-green-500 text-white";
    return "bg-gray-200 text-black";
  };

  // Get calendar view
  const renderCalendarView = () => {
    if (!sortedDates.length) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          No availability slots found for this camp.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {sortedDates.map((dateStr) => (
          <Card key={dateStr} className="overflow-hidden">
            <CardHeader className="bg-muted pb-2">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(dateStr), "EEEE, MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>
                {slotsByDate[dateStr].length} slots available on this day
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {slotsByDate[dateStr].map((slot) => {
                  const utilizationPercent = (slot.currentBookings / slot.maxBookings) * 100;
                  const utilizationColor = getUtilizationColor(utilizationPercent);
                  const isFullyBooked = slot.currentBookings >= slot.maxBookings;
                  const isEmpty = slot.currentBookings === 0;
                  
                  return (
                    <Accordion type="single" collapsible key={slot.id}>
                      <AccordionItem value={`slot-${slot.id}`} className="border rounded-md">
                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={
                                  isFullyBooked ? "destructive" : 
                                  isEmpty ? "outline" : 
                                  "default"
                                }
                              >
                                {slot.currentBookings}/{slot.maxBookings} Booked
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-2 pb-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-1">Capacity Utilization</p>
                              <div className="flex items-center space-x-2">
                                <Progress
                                  value={utilizationPercent}
                                  className="h-2"
                                />
                                <span className="text-sm">{Math.round(utilizationPercent)}%</span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium mb-1">Booking Status</p>
                              <div className="p-2 bg-muted rounded-md">
                                {slot.bookings && slot.bookings.length > 0 ? (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Users className="h-3 w-3 text-primary" />
                                      </div>
                                      <span className="text-sm font-medium">
                                        {slot.currentBookings} bookings
                                      </span>
                                    </div>
                                    <div>
                                      <Badge variant={slot.currentBookings >= slot.maxBookings ? "destructive" : "outline"}>
                                        {Math.round((slot.currentBookings / slot.maxBookings) * 100)}% Full
                                      </Badge>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground py-1">
                                    No bookings for this time slot yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Get statistics view
  const renderStatisticsView = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{statistics.totalSlots}</div>
                <CalendarClock className="h-8 w-8 text-primary/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{statistics.totalCapacity}</div>
                <Users className="h-8 w-8 text-primary/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{statistics.totalBooked}</div>
                <CheckCircle className="h-8 w-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{Math.round(statistics.utilization)}%</div>
                <BarChart4 className="h-8 w-8 text-primary/40" />
              </div>
              <Progress
                value={statistics.utilization}
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fully Booked Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {statistics.fullyBookedSlots}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({statistics.totalSlots > 0 ? Math.round((statistics.fullyBookedSlots / statistics.totalSlots) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Partially Booked Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {statistics.partiallyBookedSlots}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({statistics.totalSlots > 0 ? Math.round((statistics.partiallyBookedSlots / statistics.totalSlots) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Empty Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {statistics.emptySlots}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({statistics.totalSlots > 0 ? Math.round((statistics.emptySlots / statistics.totalSlots) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Daily Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Registration Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedDates.map((dateStr) => {
                const daySlots = slotsByDate[dateStr];
                const dayCapacity = daySlots.reduce((sum, slot) => sum + slot.maxBookings, 0);
                const dayBooked = daySlots.reduce((sum, slot) => sum + slot.currentBookings, 0);
                const dayUtilization = dayCapacity > 0 ? (dayBooked / dayCapacity) * 100 : 0;
                
                return (
                  <div key={dateStr} className="border-b pb-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">
                        {format(new Date(dateStr), "EEE, MMM d")}
                      </h4>
                      <div className="text-sm">
                        <span className="font-medium">{dayBooked}/{dayCapacity}</span> slots filled
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={dayUtilization}
                        className="h-2"
                      />
                      <span className="text-sm">{Math.round(dayUtilization)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading slot registration data...</div>;
  }

  if (!slots || slots.length === 0) {
    return <div className="text-center p-8 text-muted-foreground">No availability slots found for this camp.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Registration Visualization</h3>
        <Tabs 
          value={selectedView} 
          onValueChange={(value) => setSelectedView(value as "calendar" | "statistics")}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-card border rounded-lg p-4">
        {selectedView === "calendar" ? renderCalendarView() : renderStatisticsView()}
      </div>
    </div>
  );
}