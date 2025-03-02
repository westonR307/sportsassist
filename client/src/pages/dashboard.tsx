import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

function Dashboard() {
  try {
    const { user, logoutMutation } = useAuth();

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

    // Return appropriate dashboard based on role
    switch (user.role) {
      case "camp_creator":
        return <CampCreatorDashboard />;
      default:
        return (
          <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Dashboard</CardTitle>
                    <Button variant="outline" onClick={() => logoutMutation.mutate()}>
                      Logout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>Welcome, {user.username}</p>
                  <p className="text-sm text-gray-500 mt-2">Role: {user.role}</p>
                  <p className="mt-4">Dashboard features for {user.role} coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  } catch (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

function CampCreatorDashboard() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Camp Creator Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.username}</p>
            </div>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Camps Management Card */}
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
              <div className="text-center text-gray-500">
                No camps created yet. Click "Add Camp" to create your first camp.
              </div>
            </CardContent>
          </Card>

          {/* Organization Management Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Organization</CardTitle>
                <Button variant="outline">
                  Manage Team
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Manage your organization's team members and settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;