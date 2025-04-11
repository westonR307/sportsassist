import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addMinutes, isAfter } from "date-fns";
import { CalendarIcon, Clock, Users, Edit, Trash2, Plus, PlusCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilitySlotManager } from "./availability-slot-manager";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
};

interface AvailabilitySlotAdminPanelProps {
  campId: number;
  startDate: Date;
  endDate: Date;
}

export function AvailabilitySlotAdminPanel({ campId, startDate, endDate }: AvailabilitySlotAdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM d, yyyy");
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, "h:mm a");
  };

  // Calculate duration between start and end time
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

  // Format duration for display
  const formatDuration = (minutes: number) => {
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
  
  // Query to fetch all slots (both available and booked)
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['/api/camps', campId, 'availability-slots'],
    queryFn: async () => {
      const response = await fetch(`/api/camps/${campId}/availability-slots`);
      if (!response.ok) {
        throw new Error("Failed to fetch availability slots");
      }
      return response.json();
    }
  });

  // Create a new slot
  const createSlotMutation = useMutation({
    mutationFn: (newSlot: Omit<AvailabilitySlot, "id" | "campId" | "currentBookings" | "status">) => {
      return apiRequest(`/api/camps/${campId}/availability-slots`, {
        method: 'POST',
        body: JSON.stringify(newSlot),
      });
    },
    onSuccess: () => {
      toast({
        title: "Slot created",
        description: "The new availability slot has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'availability-slots'] });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating slot",
        description: error.message || "An error occurred while creating the availability slot.",
        variant: "destructive",
      });
    },
  });

  // Update an existing slot
  const updateSlotMutation = useMutation({
    mutationFn: (updatedSlot: Partial<AvailabilitySlot> & { id: number }) => {
      return apiRequest(`/api/camps/${campId}/availability-slots/${updatedSlot.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedSlot),
      });
    },
    onSuccess: () => {
      toast({
        title: "Slot updated",
        description: "The availability slot has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'availability-slots'] });
      setIsEditDialogOpen(false);
      setSelectedSlot(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating slot",
        description: error.message || "An error occurred while updating the availability slot.",
        variant: "destructive",
      });
    },
  });

  // Delete a slot
  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: number) => {
      return apiRequest(`/api/camps/${campId}/availability-slots/${slotId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Slot deleted",
        description: "The availability slot has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'availability-slots'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting slot",
        description: error.message || "An error occurred while deleting the availability slot.",
        variant: "destructive",
      });
    },
  });

  // Handle opening the edit dialog
  const handleEditSlot = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setIsEditDialogOpen(true);
  };
  
  // Filter slots into separate categories
  const availableSlots = slots.filter((slot: AvailabilitySlot) => slot.status === 'available');
  const bookedSlots = slots.filter((slot: AvailabilitySlot) => slot.status === 'booked');
  const unavailableSlots = slots.filter((slot: AvailabilitySlot) => slot.status === 'unavailable');
  
  // Sort slots by date and time
  const sortedSlots = [...slots].sort((a: AvailabilitySlot, b: AvailabilitySlot) => {
    // First sort by date
    const dateA = new Date(a.slotDate);
    const dateB = new Date(b.slotDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // If same date, sort by start time
    const [hoursA, minutesA] = a.startTime.split(':').map(p => parseInt(p, 10));
    const [hoursB, minutesB] = b.startTime.split(':').map(p => parseInt(p, 10));
    
    if (hoursA !== hoursB) {
      return hoursA - hoursB;
    }
    
    return minutesA - minutesB;
  });

  const handleCreateSlot = (slot: any) => {
    createSlotMutation.mutate({
      slotDate: format(slot.date, "yyyy-MM-dd"),
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxBookings: slot.capacity,
      notes: "",
      bufferBefore: 0,
      bufferAfter: 0
    });
  };

  // Render the list of slots for a specific status
  const renderSlotsList = (filteredSlots: AvailabilitySlot[]) => {
    if (filteredSlots.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No slots in this category
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredSlots.map((slot) => (
          <Card key={slot.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="p-4 flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{formatDate(slot.slotDate)}</p>
                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)} 
                          ({formatDuration(calculateDuration(slot.startTime, slot.endTime))})
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-sm">
                        <Users className="h-3 w-3 mr-1" />
                        <span>
                          {slot.currentBookings} / {slot.maxBookings} booked
                        </span>
                      </div>
                      {slot.notes && (
                        <p className="text-sm mt-1 text-muted-foreground">{slot.notes}</p>
                      )}
                    </div>
                    <div>
                      <Badge 
                        variant={
                          slot.status === 'available' ? 'outline' : 
                          slot.status === 'booked' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="bg-accent p-3 flex sm:flex-col justify-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditSlot(slot)}
                    disabled={slot.status === 'booked' && slot.currentBookings > 0}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={slot.status === 'booked' && slot.currentBookings > 0}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {slot.status === 'booked' ? 
                            "This slot has bookings. Deleting it will cancel all associated bookings." :
                            "This action cannot be undone."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteSlotMutation.mutate(slot.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // For the slot dialog
  const [tempSlot, setTempSlot] = useState<Partial<AvailabilitySlot> & { id?: number }>({
    maxBookings: 1,
    notes: ""
  });

  const handleSelectSlotForEdit = (slot: AvailabilitySlot) => {
    setTempSlot({
      id: slot.id,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxBookings: slot.maxBookings,
      notes: slot.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSlot = () => {
    if (!tempSlot.id) return;
    
    updateSlotMutation.mutate({
      id: tempSlot.id,
      slotDate: tempSlot.slotDate,
      startTime: tempSlot.startTime,
      endTime: tempSlot.endTime,
      maxBookings: tempSlot.maxBookings as number,
      notes: tempSlot.notes
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Manage Availability Slots</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Slots
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Availability Slots</DialogTitle>
              <DialogDescription>
                Create one or more availability slots for this camp.
              </DialogDescription>
            </DialogHeader>
            
            <AvailabilitySlotManager 
              campStartDate={startDate}
              campEndDate={endDate}
              slots={[]}
              onSlotsChange={(slots) => {
                // Create each slot
                slots.forEach(slot => {
                  handleCreateSlot(slot);
                });
              }}
            />
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({slots.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableSlots.length})</TabsTrigger>
          <TabsTrigger value="booked">Booked ({bookedSlots.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading slots...</div>
          ) : sortedSlots.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No availability slots have been created yet.
            </div>
          ) : (
            renderSlotsList(sortedSlots)
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading slots...</div>
          ) : (
            renderSlotsList(availableSlots)
          )}
        </TabsContent>
        
        <TabsContent value="booked" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading slots...</div>
          ) : (
            renderSlotsList(bookedSlots)
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability Slot</DialogTitle>
            <DialogDescription>
              Update the details for this availability slot.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={tempSlot.slotDate ? format(new Date(tempSlot.slotDate), "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value;
                  setTempSlot({
                    ...tempSlot,
                    slotDate: date,
                  });
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-time">Start Time</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={tempSlot.startTime}
                  onChange={(e) => {
                    setTempSlot({
                      ...tempSlot,
                      startTime: e.target.value,
                    });
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-end-time">End Time</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={tempSlot.endTime}
                  onChange={(e) => {
                    setTempSlot({
                      ...tempSlot,
                      endTime: e.target.value,
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-max-bookings">Maximum Bookings</Label>
              <Input
                id="edit-max-bookings"
                type="number"
                min="1"
                value={tempSlot.maxBookings}
                onChange={(e) => {
                  setTempSlot({
                    ...tempSlot,
                    maxBookings: parseInt(e.target.value, 10) || 1,
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Input
                id="edit-notes"
                value={tempSlot.notes}
                onChange={(e) => {
                  setTempSlot({
                    ...tempSlot,
                    notes: e.target.value,
                  });
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSlot}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}