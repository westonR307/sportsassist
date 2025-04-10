import { useQuery } from "@tanstack/react-query";
import { AvailabilitySlotBooking } from "./availability-slots/availability-slot-booking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";

interface CampAvailabilityTabProps {
  campId: number;
}

export function CampAvailabilityTab({ campId }: CampAvailabilityTabProps) {
  const { user, isLoading: isUserLoading } = useUser();
  
  // Fetch children for parents
  const { data: children = [], isLoading: isChildrenLoading } = useQuery({
    queryKey: ['/api/parent/children'],
    queryFn: async () => {
      if (user?.role !== 'parent') return [];
      
      const response = await fetch('/api/parent/children');
      if (!response.ok) {
        throw new Error("Failed to fetch children");
      }
      return response.json();
    },
    enabled: !isUserLoading && user?.role === 'parent'
  });
  
  // Fetch the parent's existing bookings
  const { data: bookings = [], isLoading: isBookingsLoading } = useQuery({
    queryKey: ['/api/parent/bookings'],
    queryFn: async () => {
      if (user?.role !== 'parent') return [];
      
      const response = await fetch('/api/parent/bookings');
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      return response.json();
    },
    enabled: !isUserLoading && user?.role === 'parent'
  });
  
  // Filter bookings for this camp
  const campBookings = bookings.filter((booking: any) => 
    booking.slot && booking.slot.campId === campId
  );
  
  if (isUserLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-[300px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  const isParent = user?.role === 'parent';
  
  return (
    <Tabs defaultValue="available">
      <TabsList className="mb-4">
        <TabsTrigger value="available">Available Slots</TabsTrigger>
        {isParent && <TabsTrigger value="booked">My Bookings ({campBookings.length})</TabsTrigger>}
      </TabsList>
      
      <TabsContent value="available">
        <AvailabilitySlotBooking 
          campId={campId} 
          isParent={isParent}
          children={children}
        />
      </TabsContent>
      
      {isParent && (
        <TabsContent value="booked">
          {isBookingsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : campBookings.length > 0 ? (
            <div className="space-y-4">
              {campBookings.map((booking: any) => (
                <div key={booking.id} className="border rounded-md p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">
                        {booking.child?.firstName} {booking.child?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.slot.slotDate).toLocaleDateString()} • 
                        {new Date(`2000-01-01T${booking.slot.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                        {new Date(`2000-01-01T${booking.slot.endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {booking.notes && (
                        <p className="text-sm mt-2">{booking.notes}</p>
                      )}
                    </div>
                    <div className="text-sm">
                      {booking.status === 'confirmed' ? (
                        <span className="text-green-600">Confirmed</span>
                      ) : booking.status === 'cancelled' ? (
                        <span className="text-red-600">Cancelled</span>
                      ) : (
                        <span>{booking.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              You don't have any bookings for this camp yet.
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}