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
  Menu,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Camp } from "@shared/schema";
import { AddCampDialog } from "@/components/add-camp-dialog";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  if (!user?.organizationId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 m-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-screen bg-white border-r 
        transition-all duration-300 ease-in-out z-40
        ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'} 
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-hidden
      `}>
        <div className="p-4 border-b whitespace-nowrap">
          <h2 className={`font-semibold text-lg ${!sidebarOpen && 'lg:opacity-0'}`}>
            Sports Camp Manager
          </h2>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink href="/dashboard" icon={Calendar}>Camps</NavLink>
          <NavLink href="/dashboard/reports" icon={BarChart3}>Reports</NavLink>
          <NavLink href="/dashboard/team" icon={Users}>Team</NavLink>
          <NavLink href="/dashboard/settings" icon={Settings}>Settings</NavLink>
          <Button
            variant="ghost"
            className="w-full justify-start whitespace-nowrap"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className={!sidebarOpen ? 'lg:opacity-0' : ''}>Logout</span>
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}
        pt-16 lg:pt-0
      `}>
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function NavLink({ href, children, icon: Icon, end = false }: { href: string; children: React.ReactNode; icon: any; end?: boolean }) {
  const [isActive] = useRoute(end ? href : href + "*");
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary text-left",
        isActive ? "bg-muted text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{children}</span>
    </button>
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
              <Link href={`/dashboard/camps/${camp.id}`}>
                <a className="block hover:opacity-80">
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
                </a>
              </Link>
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