import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlipCard } from "@/components/ui/flip-card";
import { CampScheduleSummary } from "@/components/camp-schedule";
import {
  Plus,
  Loader2,
  ShieldAlert,
  MapPin,
  Clock,
  Users2,
  CalendarRange,
  Tag,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { GiBaseballBat } from "react-icons/gi";
import { useLocation as useWouterLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";
import { DashboardLayout } from "@/pages/dashboard";

// Extended camp type to include permissions from the server
interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  }
  schedules?: any[]; // Add schedules property for the CampScheduleSummary component
}

export default function CampsPage() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { user } = useAuth();
  const { data: camps, isLoading } = useQuery<CampWithPermissions[]>({
    queryKey: ["/api/camps"],
    staleTime: 5000, // Only refetch after 5 seconds
    refetchOnWindowFocus: false,
  });
  const [location, navigate] = useWouterLocation();
  
  // Check if user is a camp creator or manager who can create camps
  const canCreateCamps = user && ['camp_creator', 'manager'].includes(user.role);

  const campsContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <GiBaseballBat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Camps</h1>
        </div>
        {canCreateCamps ? (
          <Button onClick={() => setShowAddCampDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Camp
          </Button>
        ) : (
          <div className="flex items-center text-muted-foreground text-sm">
            <ShieldAlert className="h-4 w-4 mr-2" />
            <span>View only mode</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !camps || camps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No camps {canCreateCamps ? 'created yet' : 'available'}</p>
            {canCreateCamps ? (
              <Button onClick={() => setShowAddCampDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first camp
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground max-w-md text-center">
                <p>You don't have permission to create camps.</p>
                <p className="mt-2">Contact an organization admin if you need to create a new camp.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {camps.map((camp) => {
            // Check if user can manage this specific camp
            const canManageCamp = camp.permissions?.canManage || false;
            
            // Calculate date ranges and format for better display
            const now = new Date();
            const startDate = new Date(camp.startDate);
            const endDate = new Date(camp.endDate);
            const regStartDate = new Date(camp.registrationStartDate);
            const regEndDate = new Date(camp.registrationEndDate);
            
            // Calculate if registration is open, upcoming, or past
            const regStatus = now < regStartDate 
              ? "upcoming" 
              : now > regEndDate 
                ? "closed" 
                : "open";
                
            // Calculate if camp is active, upcoming, or past
            const campStatus = now < startDate 
              ? "upcoming" 
              : now > endDate 
                ? "completed" 
                : "active";
                
            // Format duration in days
            const campDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Format a more user-friendly display of the camp type
            const formatCampType = (type: string) => {
              const types: Record<string, string> = {
                'one_on_one': 'One-on-One',
                'group': 'Group',
                'team': 'Team',
                'virtual': 'Virtual'
              };
              return types[type] || type;
            };
           
            // We'll create two cards - one for the front and one for the back of the flip card
            const frontCard = (
              <Card className="h-full border hover:border-primary/50 transition-colors duration-300">
                <div className={`h-2 w-full ${campStatus === 'active' ? 'bg-green-500' : campStatus === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                
                <CardHeader className="p-4 pb-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate">{camp.name}</CardTitle>
                      {canManageCamp ? (
                        <Badge className="h-5 text-xs bg-green-100 text-green-800 hover:bg-green-200">
                          Manager
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="line-clamp-2 text-sm">
                      {camp.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 pt-0 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <CalendarRange className="h-4 w-4 text-muted-foreground" />
                      <span>{campDays} day{campDays !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users2 className="h-4 w-4 text-muted-foreground" />
                      <span>{camp.capacity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{camp.city}, {camp.state}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">Click card to see schedule</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <Badge 
                      className={
                        regStatus === 'open'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 h-5 text-xs'
                          : regStatus === 'upcoming'
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 h-5 text-xs'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 h-5 text-xs'
                      }
                    >
                      {regStatus === 'open' ? 'Registration Open' : regStatus === 'upcoming' ? 'Opening Soon' : 'Closed'}
                    </Badge>
                    <span className="text-sm font-medium">${camp.price}</span>
                  </div>
                </CardContent>
                
                <div className="absolute bottom-2 right-2 text-muted-foreground text-xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                </div>
              </Card>
            );
            
            const backCard = (
              <Card className="h-full border hover:border-primary/50 transition-colors duration-300 overflow-y-auto">
                <div className={`h-2 w-full ${campStatus === 'active' ? 'bg-green-500' : campStatus === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{camp.name}</CardTitle>
                    <Badge 
                      variant={camp.visibility === 'public' ? 'default' : 'outline'}
                      className="capitalize h-5 text-xs"
                    >
                      {camp.visibility}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 text-sm space-y-4">
                  <p className="text-muted-foreground">{camp.description}</p>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>Camp Period</span>
                    </div>
                    <div className="ml-5 flex justify-between">
                      <span>{startDate.toLocaleDateString()}</span>
                      <span>to</span>
                      <span>{endDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Registration</span>
                    </div>
                    <div className="ml-5 flex justify-between">
                      <span>{regStartDate.toLocaleDateString()}</span>
                      <span>to</span>
                      <span>{regEndDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Camp Schedule Summary */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>Schedule</span>
                    </div>
                    <div className="ml-5 text-sm">
                      <div className="flex items-center gap-2">
                        <CampScheduleSummary 
                          schedules={camp.schedules || []} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Location</span>
                      </div>
                      <div className="ml-5 text-muted-foreground">
                        <div>{camp.streetAddress}</div>
                        <div>{camp.city}, {camp.state} {camp.zipCode}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Details</span>
                      </div>
                      <div className="ml-5 space-y-0.5 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{formatCampType(camp.type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span>{camp.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>${camp.price}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* View Camp Button */}
                    <div className="col-span-2 mt-2">
                      <Button 
                        className="w-full"
                        onClick={() => navigate(`/dashboard/camps/${camp.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            
            // Return the flip card with both sides defined
            return (
              <FlipCard 
                key={camp.id}
                front={frontCard}
                back={backCard}
                className="h-full"
              />
            );
          })}
        </div>
      )}
      
      {/* Add Camp Dialog Component */}
      <AddCampDialog
        open={showAddCampDialog}
        onOpenChange={setShowAddCampDialog}
      />
    </div>
  );
  
  return (
    <DashboardLayout>
      {campsContent}
    </DashboardLayout>
  );
}