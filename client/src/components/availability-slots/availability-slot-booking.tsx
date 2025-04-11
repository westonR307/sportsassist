import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Clock, Users, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

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

type Child = {
  id: number;
  firstName: string;
  lastName: string;
};

interface AvailabilitySlotBookingProps {
  campId: number;
  isParent?: boolean;
  children?: Child[];
}

export function AvailabilitySlotBooking({ campId, isParent = false, children = [] }: AvailabilitySlotBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Query to fetch available slots
  const { data: slots = [], isLoading, error } = useQuery({
    queryKey: ['/api/camps', campId, 'availability-slots'],
    queryFn: async () => {
      const response = await fetch(`/api/camps/${campId}/availability-slots`);
      if (!response.ok) {
        throw new Error("Failed to fetch availability slots");
      }
      return response.json();
    }
  });

  // Book a slot mutation
  const bookSlotMutation = useMutation({
    mutationFn: async ({ slotId, childId, notes }: { slotId: number, childId: number, notes: string }) => {
      return apiRequest('POST', `/api/camps/${campId}/availability-slots/${slotId}/book`, { 
        childId, 
        notes 
      });
    },
    onSuccess: () => {
      toast({
        title: "Slot booked successfully",
        description: "You've successfully booked this time slot.",
      });
      setIsBookingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/camps', campId, 'availability-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parent/bookings'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to book slot",
        description: error instanceof Error ? error.message : "An error occurred while booking the slot.",
        variant: "destructive",
      });
    }
  });

  const handleBookSlot = (slotId: number) => {
    if (!isParent) {
      toast({
        title: "Unable to book",
        description: "You need to be logged in as a parent to book slots.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSlotId(slotId);
    setIsBookingDialogOpen(true);
  };

  const confirmBooking = () => {
    if (!selectedSlotId || !selectedChildId) {
      toast({
        title: "Missing information",
        description: "Please select a child to book this slot.",
        variant: "destructive",
      });
      return;
    }

    bookSlotMutation.mutate({
      slotId: selectedSlotId,
      childId: selectedChildId,
      notes: bookingNotes
    });
  };

  // Group slots by date
  const slotsByDate = slots.reduce((acc: Record<string, AvailabilitySlot[]>, slot: AvailabilitySlot) => {
    const dateStr = new Date(slot.slotDate).toISOString().split('T')[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(slot);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort();

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading available slots...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading availability slots</div>;
  }

  if (slots.length === 0) {
    return <div className="text-center p-8 text-muted-foreground">No availability slots have been added for this camp yet.</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Available Time Slots</h3>
      
      {sortedDates.map((dateStr) => (
        <div key={dateStr} className="space-y-3">
          <h4 className="flex items-center text-sm font-medium mb-2">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(new Date(dateStr), "EEEE, MMMM d, yyyy")}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotsByDate[dateStr].map((slot) => (
              <Card key={slot.id} className={slot.status !== "available" ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(`2000-01-01T${slot.startTime}`), "h:mm a")} - 
                        {format(new Date(`2000-01-01T${slot.endTime}`), "h:mm a")}
                      </CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <Users className="h-3 w-3 mr-1" />
                        {slot.currentBookings} / {slot.maxBookings} booked
                      </CardDescription>
                    </div>
                    <Badge variant={slot.status === "available" ? "default" : "outline"}>
                      {slot.status === "available" ? "Available" : slot.status === "booked" ? "Full" : "Unavailable"}
                    </Badge>
                  </div>
                </CardHeader>
                
                {slot.notes && (
                  <CardContent className="pb-2 pt-0">
                    <p className="text-sm text-muted-foreground">{slot.notes}</p>
                  </CardContent>
                )}
                
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={slot.status !== "available"} 
                    onClick={() => handleBookSlot(slot.id)}
                  >
                    {slot.status === "available" ? "Book This Slot" : "Unavailable"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <Separator className="my-4" />
        </div>
      ))}

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Time Slot</DialogTitle>
            <DialogDescription>
              Select which child will attend this slot.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="child" className="text-sm font-medium">Select an athlete</label>
              
              {children.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  You need to add children to your profile before booking.
                </p>
              ) : (
                <div className="grid gap-3 mt-2">
                  {children.map((child) => (
                    <Card
                      key={child.id}
                      className={`cursor-pointer transition-colors ${selectedChildId === child.id ? 'border-primary' : 'hover:border-primary/50'}`}
                      onClick={() => setSelectedChildId(child.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted rounded-full h-10 w-10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{child.firstName} {child.lastName}</p>
                          </div>
                        </div>
                        {selectedChildId === child.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">Notes (optional)</label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any special requests or information"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmBooking} 
              disabled={!selectedChildId || bookSlotMutation.isPending}
            >
              {bookSlotMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}