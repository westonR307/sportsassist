import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Settings,
  Users,
  BarChart3,
  Calendar,
  LogOut,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user?.organizationId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Sports Camp Manager</h2>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard">
            <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
              location === '/dashboard' ? 'bg-gray-100' : ''
            }`}>
              <Calendar className="h-5 w-5" />
              <span>Camps</span>
            </a>
          </Link>
          <Link href="/dashboard/reports">
            <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
              location === '/dashboard/reports' ? 'bg-gray-100' : ''
            }`}>
              <BarChart3 className="h-5 w-5" />
              <span>Reports</span>
            </a>
          </Link>
          <Link href="/dashboard/team">
            <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
              location === '/dashboard/team' ? 'bg-gray-100' : ''
            }`}>
              <Users className="h-5 w-5" />
              <span>Team</span>
            </a>
          </Link>
          <Link href="/dashboard/settings">
            <a className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 ${
              location === '/dashboard/settings' ? 'bg-gray-100' : ''
            }`}>
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </a>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
      <div className="pl-64">
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function CampsDashboard() {
  const [showAddCampDialog, setShowAddCampDialog] = React.useState(false);
  const { data: camps, isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Camps</h1>
        <Button onClick={() => setShowAddCampDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Camp
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !camps || camps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No camps created yet</p>
            <Button onClick={() => setShowAddCampDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first camp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {camps.map((camp) => (
            <Card key={camp.id}>
              <CardHeader>
                <CardTitle>{camp.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                      {camp.visibility}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Registration: {new Date(camp.registrationStartDate).toLocaleDateString()} - {new Date(camp.registrationEndDate).toLocaleDateString()}</p>
                    <p>Camp: {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddCampDialog && (
        <AddCampDialog
          open={showAddCampDialog}
          onOpenChange={setShowAddCampDialog}
        />
      )}
    </div>
  );
}

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

  return (
    <DashboardLayout>
      {user.role === "camp_creator" && <CampsDashboard />}
    </DashboardLayout>
  );
}

export { DashboardLayout };
export default Dashboard;