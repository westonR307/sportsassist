import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "./dashboard";
import { AlertTriangle, CheckCircle, Share2, Edit, Trash2, Copy, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

interface CampViewPageProps {
  id?: string;
  slug?: string;
}

function CampViewPage(props: CampViewPageProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const [isParent, setIsParent] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [hasPermission, setHasPermission] = useState(false);
  const [camp, setCamp] = useState<any>({});
  const [registrations, setRegistrations] = useState([]);

  // Check if user is a parent
  useEffect(() => {
    if (user && user.role === "parent") {
      setIsParent(true);
    }
  }, [user]);

  // Use props first if available, otherwise try to extract from URL path
  let paramValue = props.id || props.slug;
  const isSlugRoute = props.slug || location.includes('/slug/');

  // If we don't have props, try to extract from URL path as fallback
  if (!paramValue) {
    const urlParts = location.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    paramValue = lastPart;
  }

  // Construct the proper API endpoint based on whether we're using a slug or ID
  const apiEndpoint = isSlugRoute 
    ? `/api/camps/slug/${paramValue}` 
    : `/api/camps/${paramValue}`;

  // Fetch camp data
  const { 
    isLoading,
    isError, 
    error,
    data: campData
  } = useQuery({
    queryKey: [apiEndpoint],
    enabled: !!paramValue
  });

  // Process camp data when it changes
  useEffect(() => {
    if (campData) {
      setCamp(campData);
      setHasPermission(campData.permissions?.canManage || false);
    }
  }, [campData]);

  // Construct registrations endpoint
  const registrationsEndpoint = isSlugRoute 
    ? `/api/camps/slug/${paramValue}/registrations` 
    : `/api/camps/${paramValue}/registrations`;

  // Fetch registrations with useQuery
  const { data: registrationsData } = useQuery({
    queryKey: [registrationsEndpoint],
    enabled: !!paramValue
  });

  // Process registrations data when it changes
  useEffect(() => {
    if (registrationsData) {
      setRegistrations(Array.isArray(registrationsData.registrations) ? registrationsData.registrations : []);
    }
  }, [registrationsData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading camp details...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="mx-auto my-8 max-w-md">
        <CardHeader>
          <CardTitle>Error Loading Camp</CardTitle>
          <CardDescription>We encountered a problem loading this camp.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error?.message || "Unknown error occurred"}</p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render content function
  const renderContent = () => {
    return (
      <div className="space-y-6 pt-4">
        <div className="container mx-auto p-6 max-w-5xl mb-6 mt-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {camp.name || "Camp Details"}
          </h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="registrations">Registrations</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Camp Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Description:</strong> {camp.description || "No description available"}</p>
                    <p><strong>Dates:</strong> {camp.startDate && new Date(camp.startDate).toLocaleDateString()} - {camp.endDate && new Date(camp.endDate).toLocaleDateString()}</p>
                    <p><strong>Price:</strong> ${camp.price || "0"}</p>
                    <p><strong>Capacity:</strong> {camp.capacity || "0"} athletes</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 mt-0.5" />
                      <div>
                        {camp.isVirtual ? (
                          <p>Virtual Camp</p>
                        ) : (
                          <>
                            <p>{camp.streetAddress}</p>
                            <p>{camp.city}, {camp.state} {camp.zipCode}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasPermission && (
                    <div className="mt-4 flex gap-2">
                      <Button>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Camp
                      </Button>
                      <Button variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="registrations">
              <Card>
                <CardHeader>
                  <CardTitle>Registrations</CardTitle>
                  <CardDescription>
                    {registrations.length} {registrations.length === 1 ? "athlete" : "athletes"} registered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {registrations.length === 0 ? (
                    <p className="text-muted-foreground">No registrations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {registrations.map((reg: any, idx: number) => (
                        <div key={idx} className="p-2 border rounded">
                          {reg.childName || "Athlete"}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };

  // For parent users, use a simple layout
  if (isParent) {
    return renderContent();
  }

  // For camp creators and admins, use the dashboard layout
  return <DashboardLayout>{renderContent()}</DashboardLayout>;
}

export default CampViewPage;