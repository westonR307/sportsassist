import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Camp } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";

function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  switch (user.role) {
    case "camp_creator":
      return <CampCreatorDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardHeader>
                <CardTitle>Welcome {user.username}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Role: {user.role}</p>
                <p className="mt-4 text-sm text-gray-500">Dashboard for {user.role} coming soon...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
  }
}

function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: camps, isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Camp Creator Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your Camps</CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Camp
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !camps?.length ? (
              <div className="text-center p-4 text-gray-500">
                No camps created yet. Click "Add Camp" to create your first camp.
              </div>
            ) : (
              <div className="grid gap-4">
                {camps.map((camp) => (
                  <Card key={camp.id}>
                    <CardHeader>
                      <CardTitle>{camp.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-2">{camp.description}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm">{camp.location}</p>
                          <p className="text-sm">Capacity: {camp.capacity}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Dashboard;