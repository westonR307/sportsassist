import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
  const params = useParams();
  const [location] = useLocation();
  const { user } = useAuth();
  
  console.log("CampViewPage - Props:", props);

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
  // Check if props have the id or slug
  let paramValue = props.id || props.slug;
  const isSlugRoute = props.slug || location.includes('/slug/');
  
  // If we don't have props, try to extract from URL path as fallback
  if (!paramValue) {
    // Manual URL parsing as a fallback since useParams() appears to be empty
    const urlParts = location.split('/');
    const slugIndex = urlParts.indexOf('slug');
    
    if (slugIndex !== -1 && slugIndex + 1 < urlParts.length) {
      // This is a slug route, get the slug
      paramValue = urlParts[slugIndex + 1];
      console.log("Extracted slug from URL:", paramValue);
    } else {
      // This is probably an ID route, get the last part of the URL
      paramValue = urlParts[urlParts.length - 1];
      console.log("Extracted ID from URL:", paramValue);
    }
  }
  
  console.log("Final param value:", paramValue);

  // Construct the proper API endpoint based on whether we're using a slug or ID
  const apiEndpoint = isSlugRoute 
    ? `/api/camps/slug/${paramValue}` 
    : `/api/camps/${paramValue}`;

  // Fetch camp data
  const { isLoading, isError, error } = useQuery({
    queryKey: [apiEndpoint],
    enabled: !!paramValue,
    onSuccess: (data) => {
      if (data) {
        setCamp(data);
        setHasPermission(data.permissions?.canManage || false);
      }
    },
    onError: (err) => {
      console.error("Error fetching camp data:", err);
    }
  });

  // Fetch registrations
  useEffect(() => {
    if (paramValue) {
      const registrationsEndpoint = isSlugRoute 
        ? `/api/camps/slug/${paramValue}/registrations` 
        : `/api/camps/${paramValue}/registrations`;

      fetch(registrationsEndpoint)
        .then(res => res.json())
        .then(data => {
          setRegistrations(data.registrations || []);
        })
        .catch(err => console.error("Failed to fetch registrations", err));
    }
  }, [paramValue, isSlugRoute]);

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