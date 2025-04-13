import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ParentLayout } from "@/components/parent-layout";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Calendar, User, ArrowRight, Clock, MapPin, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Camp, Registration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

interface RegistrationWithCamp extends Registration {
  camp: Camp & {
    slug?: string;
    location?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
  };
  child: {
    id: number;
    fullName: string;
    profilePhoto: string | null;
  };
}

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("upcoming");

  const { data: registrations = [], isLoading } = useQuery<RegistrationWithCamp[]>({
    queryKey: ["/api/parent/registrations"],
    enabled: !!user,
  });

  const now = new Date();
  const upcomingRegistrations = registrations.filter(
    (reg) => new Date(reg.camp.startDate) > now
  );
  const pastRegistrations = registrations.filter(
    (reg) => new Date(reg.camp.endDate) < now
  );
  const activeRegistrations = registrations.filter(
    (reg) => 
      new Date(reg.camp.startDate) <= now && 
      new Date(reg.camp.endDate) >= now
  );

  return (
    <ParentLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Registrations</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your camp registrations
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="upcoming" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="upcoming" className="flex gap-2 items-center">
              <Calendar className="h-4 w-4" />
              <span>Upcoming</span>
              {upcomingRegistrations.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {upcomingRegistrations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex gap-2 items-center">
              <CalendarClock className="h-4 w-4" />
              <span>Active</span>
              {activeRegistrations.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeRegistrations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex gap-2 items-center">
              <Clock className="h-4 w-4" />
              <span>Past</span>
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading registrations...</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="upcoming">
                {upcomingRegistrations.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingRegistrations.map((registration) => (
                      <RegistrationCard 
                        key={registration.id} 
                        registration={registration} 
                        status="upcoming" 
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    title="No upcoming registrations"
                    description="You don't have any upcoming camp registrations. Browse available camps to register."
                    actionText="Browse Camps"
                    actionLink="/find-camps"
                  />
                )}
              </TabsContent>

              <TabsContent value="active">
                {activeRegistrations.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeRegistrations.map((registration) => (
                      <RegistrationCard 
                        key={registration.id} 
                        registration={registration} 
                        status="active" 
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    title="No active registrations"
                    description="You don't have any active camp registrations right now."
                    actionText="Browse Camps"
                    actionLink="/find-camps"
                  />
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastRegistrations.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pastRegistrations.map((registration) => (
                      <RegistrationCard 
                        key={registration.id} 
                        registration={registration} 
                        status="past" 
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    title="No past registrations"
                    description="You don't have any past camp registrations."
                    actionText="Browse Camps"
                    actionLink="/find-camps"
                  />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </ParentLayout>
  );
}

interface RegistrationCardProps {
  registration: RegistrationWithCamp;
  status: "upcoming" | "active" | "past";
}

function RegistrationCard({ registration, status }: RegistrationCardProps) {
  const { camp, child } = registration;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  let statusBadge;
  if (status === "upcoming") {
    statusBadge = <Badge className="bg-blue-500">Upcoming</Badge>;
  } else if (status === "active") {
    statusBadge = <Badge className="bg-green-500">Active</Badge>;
  } else {
    statusBadge = <Badge variant="outline">Completed</Badge>;
  }

  // Add deregistration mutation
  const deregisterMutation = useMutation({
    mutationFn: async () => {
      console.log(`Attempting to delete registration with ID: ${registration.id}`);
      
      try {
        const response = await fetch(`/api/registrations/${registration.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('DELETE request status:', response.status);
        
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (!response.ok) {
          let errorMsg = "Failed to deregister";
          try {
            // Try parsing as JSON if possible
            if (responseText) {
              const errorData = JSON.parse(responseText);
              errorMsg = errorData.message || errorMsg;
            }
          } catch (e) {
            console.error('Error parsing response:', e);
          }
          throw new Error(`${errorMsg} (Status: ${response.status})`);
        }
        
        let result = {};
        if (responseText) {
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            console.log('Response was not JSON, using empty object');
          }
        }
        
        return result;
      } catch (error) {
        console.error('Error in deregister mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${child.fullName} has been removed from ${camp.name}.`,
        variant: "default",
      });
      // Invalidate and refetch parent registrations
      queryClient.invalidateQueries({ queryKey: ["/api/parent/registrations"] });
    },
    onError: (error) => {
      console.error("Error deregistering:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem removing the registration. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Don't allow deregistration for past camps
  const canDeregister = status !== "past";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-start">
          <div>
            <span className="text-lg font-semibold">
              {camp.name}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {statusBadge}
              <span className="text-xs text-muted-foreground">
                Registered on {format(new Date(registration.registeredAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Athlete</span>
              <span className="text-sm text-muted-foreground">{child.fullName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Date</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Time</span>
              <span className="text-sm text-muted-foreground">
                {camp.defaultStartTime ? format(new Date(`2000-01-01T${camp.defaultStartTime}`), "h:mm a") : "N/A"} - 
                {camp.defaultEndTime ? format(new Date(`2000-01-01T${camp.defaultEndTime}`), "h:mm a") : "N/A"}
              </span>
            </div>
          </div>
          
          {camp.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Location</span>
                <span className="text-sm text-muted-foreground">{camp.location}</span>
              </div>
            </div>
          )}
          
          <div className="pt-3 space-y-2">
            <Button variant="outline" className="w-full flex items-center gap-2" asChild>
              <a href={`/camp/${camp.slug || camp.id}`}>
                <span>View Camp Details</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            
            {canDeregister && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>Deregister from Camp</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {child.fullName} from {camp.name}. This action cannot be undone.
                      {status === "active" && (
                        <p className="mt-2 font-semibold text-destructive">
                          Warning: This camp is currently active. Deregistering during an active camp may result in loss of camp access.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        deregisterMutation.mutate();
                      }}
                      disabled={deregisterMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deregisterMutation.isPending ? "Removing..." : "Yes, Deregister"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
}

function EmptyState({ title, description, actionText, actionLink }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8 mt-6">
      <AlertCircle size={48} className="text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {description}
      </p>
      <Button asChild>
        <a href={actionLink}>{actionText}</a>
      </Button>
    </div>
  );
}