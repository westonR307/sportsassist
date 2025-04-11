import { useQuery } from "@tanstack/react-query";
import { AvailabilitySlotBooking } from "./availability-slots/availability-slot-booking";
import { AvailabilitySlotAdminPanel } from "./availability-slots/availability-slot-admin-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";

interface CampAvailabilityTabProps {
  campId: number;
  startDate?: Date;
  endDate?: Date;
}

export function CampAvailabilityTab({ campId, startDate, endDate }: CampAvailabilityTabProps) {
  const { user, isLoading: isUserLoading } = useUser();
  
  // Fetch camp details to get dates if not provided
  const { data: camp, isLoading: isCampLoading } = useQuery({
    queryKey: [`/api/camps/${campId}`],
    queryFn: async () => {
      if (startDate && endDate) return null; // Skip if dates are provided
      
      const response = await fetch(`/api/camps/${campId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch camp details");
      }
      return response.json();
    },
    enabled: !startDate || !endDate
  });
  
  // Use provided dates or fallback to fetched camp dates
  const effectiveStartDate = startDate || (camp ? new Date(camp.startDate) : new Date());
  const effectiveEndDate = endDate || (camp ? new Date(camp.endDate) : new Date());
  
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
  
  if (isUserLoading || (isCampLoading && (!startDate || !endDate))) {
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
  const isAdmin = user?.role === 'admin' || user?.role === 'camp_creator';
  
  return (
    <Tabs defaultValue={isAdmin ? "manage" : "available"}>
      <TabsList className="mb-4 w-full grid grid-cols-2 md:flex md:flex-row gap-1 p-1">
        {isAdmin && <TabsTrigger value="manage" className="text-xs sm:text-sm whitespace-nowrap">Manage Slots</TabsTrigger>}
        <TabsTrigger value="available" className="text-xs sm:text-sm whitespace-nowrap">Available Slots</TabsTrigger>
        {isParent && <TabsTrigger value="booked" className="text-xs sm:text-sm whitespace-nowrap">My Bookings ({campBookings.length})</TabsTrigger>}
      </TabsList>
      
      {isAdmin && (
        <TabsContent value="manage">
          <AvailabilitySlotAdminPanel 
            campId={campId} 
            startDate={effectiveStartDate}
            endDate={effectiveEndDate}
          />
        </TabsContent>
      )}
      
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
                        {booking.child?.fullName}
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