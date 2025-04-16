import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "./dashboard";
import { AlertTriangle, CheckCircle, Share2, Edit, Trash2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

function CampViewPage() {
  const { id } = useParams();
  const [location] = useLocation();
  const { user } = useAuth();
  const [isParent, setIsParent] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [hasPermission, setHasPermission] = useState(false);
  const [camp, setCamp] = useState({});
  const [registrations, setRegistrations] = useState([]);

  // Check if user is a parent
  useEffect(() => {
    if (user && user.role === "parent") {
      setIsParent(true);
    }
  }, [user]);

  // Fetch camp data
  const { isLoading, isError, error } = useQuery({
    queryKey: [`/api/camps/${id}`],
    onSuccess: (data) => {
      console.log("Camp data received:", data);
      setCamp(data);
      setHasPermission(data.permissions?.canManage || false);
    },
    onError: (err) => {
      console.error("Error fetching camp data:", err);
    }
  });

  // Fetch registrations
  useEffect(() => {
    if (id) {
      fetch(`/api/camps/${id}/registrations`)
        .then(res => res.json())
        .then(data => {
          setRegistrations(data.registrations || []);
        })
        .catch(err => console.error("Failed to fetch registrations", err));
    }
  }, [id]);

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
                    <p><strong>Location:</strong> {camp.isVirtual ? "Virtual Camp" : `${camp.city || ""}, ${camp.state || ""}`}</p>
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
                      {registrations.map((reg, idx) => (
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

  // Simple conditional to determine layout based on user role
  if (isParent) {
    // Parent users get a simple layout
    return (
      <div className="p-4 md:p-6">
        {renderContent()}
      </div>
    );
  } 
  
  // For camp creators and admins, use the dashboard layout
  return <DashboardLayout>{renderContent()}</DashboardLayout>;
}

export default CampViewPage;