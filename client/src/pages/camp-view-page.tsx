import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "./dashboard";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Edit, MessageSquare, Users } from "lucide-react";
import { type Camp } from "@shared/schema";
import { apiRequest } from "@/lib/api";

function CampViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();


  const { data: camp, isLoading } = useQuery<Camp>({
    queryKey: [`/api/camps/${id}`],
    enabled: !!id,
  });

  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: [`/api/camps/${id}/registrations`],
    enabled: !!id,
  });

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
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Athletes
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Camp
            </Button>
          </div>
        </div>

        {/* Camp Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Registrations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registered Athletes</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingRegistrations ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : registrations?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No athletes registered yet
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Registration list will go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default CampViewPage;