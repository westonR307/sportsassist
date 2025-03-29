import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "./dashboard";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Edit, MessageSquare, Users, ShieldAlert, CalendarDays, Calendar } from "lucide-react";
import { type Camp } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { EditCampDialog } from "@/components/edit-camp-dialog";
import { CampScheduleDisplay } from "@/components/camp-schedule";
import { ScheduleEditorDialog } from "@/components/schedule-editor-dialog";

// Extended camp type to include permissions from the server
interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  }
}

// Extended registrations response from the server
interface RegistrationsResponse {
  registrations: any[];
  permissions: {
    canManage: boolean;
  }
}

function CampViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);

  // Updated to use the extended type with permissions
  const { data: camp, isLoading } = useQuery<CampWithPermissions>({
    queryKey: [`/api/camps/${id}`],
    enabled: !!id,
  });

  // Updated to use the response type that includes permissions
  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery<RegistrationsResponse>({
    queryKey: [`/api/camps/${id}/registrations`],
    enabled: !!id,
  });

  // Extract the registrations array from the response
  const registrations = registrationsData?.registrations || [];
  
  // Check if the user has permission to manage this camp
  const canManage = camp?.permissions?.canManage || false;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!camp) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-[400px]">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Camp not found
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{camp.name}</h1>
          <div className="flex gap-2">
            {canManage ? (
              // Only show management buttons if user has permission
              <>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Athletes
                </Button>
                <Button onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Camp
                </Button>
              </>
            ) : (
              // Show a message for non-organizers
              <div className="flex items-center text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mr-2" />
                <span className="text-sm">View only</span>
              </div>
            )}
          </div>
        </div>

        {/* Camp Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Camp Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-muted-foreground">{camp.description}</p>
                </div>
                <div>
                  <h3 className="font-medium">Location</h3>
                  <p className="text-muted-foreground">
                    {camp.streetAddress}<br />
                    {camp.city}, {camp.state} {camp.zipCode}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Dates</h3>
                  <p className="text-muted-foreground">
                    {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Registration Period</h3>
                  <p className="text-muted-foreground">
                    {new Date(camp.registrationStartDate).toLocaleDateString()} - {new Date(camp.registrationEndDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">Price</h3>
                    <p className="text-muted-foreground">${camp.price}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Capacity</h3>
                    <p className="text-muted-foreground">{camp.capacity} athletes</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Type</h3>
                    <p className="text-muted-foreground capitalize">{camp.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Camp Schedule Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Camp Schedule</CardTitle>
                {canManage && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setScheduleEditorOpen(true)}
                    className="h-8"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Edit Schedule
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <CampScheduleDisplay campId={parseInt(id)} />
              </CardContent>
            </Card>
          </div>

          {/* Registrations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Registered Athletes
                {canManage ? '' : ' (Limited View)'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {canManage && (
                  <Button variant="outline" size="sm" className="h-8">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Athletes
                  </Button>
                )}
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRegistrations ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !registrations || registrations.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    No athletes registered yet
                  </p>
                  {canManage && (
                    <Button variant="outline" size="sm" className="mt-4">
                      Add Registration
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Note explaining the view permissions */}
                  {!canManage && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mb-4">
                      <p className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-2 text-orange-500" />
                        You are viewing this camp as {user?.role === 'parent' ? 'a parent' : 'a guest'}.
                        {user?.role === 'parent' ? 
                          ' You can only see registrations for your own children.' : 
                          ' You need to be part of the organization to view detailed registration information.'}
                      </p>
                    </div>
                  )}
                  
                  {/* Registration list */}
                  <div className="space-y-2">
                    {registrations.map((registration: any) => (
                      <div 
                        key={registration.id} 
                        className="p-3 border rounded-md flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">Athlete ID: {registration.childId}</p>
                          <p className="text-sm text-muted-foreground">
                            Registered: {new Date(registration.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${registration.paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {registration.paid ? 'Paid' : 'Unpaid'}
                          </span>
                          
                          {canManage && (
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Camp Dialog */}
      {camp && (
        <>
          <EditCampDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            camp={camp}
          />
          <ScheduleEditorDialog
            open={scheduleEditorOpen}
            onOpenChange={setScheduleEditorOpen}
            camp={camp}
          />
        </>
      )}
    </DashboardLayout>
  );
}

export default CampViewPage;