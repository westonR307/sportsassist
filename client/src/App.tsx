import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Import pages
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ParentDashboard from "@/pages/parent-dashboard";
import ParentOnboardingPage from "@/pages/parent-onboarding";
import ParentSettingsPage from "@/pages/parent-settings-page";
import ReportsPage from "@/pages/reports-page";
import TeamPage from "@/pages/team-page";
import SettingsPage from "@/pages/settings-page";
import CampViewPage from "@/pages/camp-view-page";
import CustomFieldsPage from "@/pages/custom-fields-page";
import MyAthletesPage from "@/pages/my-athletes-page";
import RegistrationsPage from "@/pages/registrations-page";
import AvailableCampsPage from "@/pages/available-camps-page";
import { ProtectedRoute } from "./lib/protected-route";

// Component to handle dashboard routing based on user role
function DashboardRouter() {
  const { user } = useAuth();
  
  // Check if user is a parent who needs to complete onboarding
  if (user?.role === "parent" && user?.onboarding_completed === false) {
    return <Redirect to="/parent-onboarding" />;
  }
  
  if (user?.role === "parent") {
    return <ParentDashboard />;
  }

  if (user?.role === "athlete") {
    return <Redirect to="/athlete-dashboard" />;
  }
  
  return <Dashboard />;
}

// Component to handle parent dashboard with check for onboarding completion
function ParentDashboardRouter() {
  const { user } = useAuth();
  
  if (user?.onboarding_completed === false) {
    return <Redirect to="/parent-onboarding" />;
  }
  
  return <ParentDashboard />;
}

function Router() {
  const { user, isLoading } = useAuth();
  
  return (
    <Switch>
      {/* Public route for homepage - show dashboard if logged in, home page if not */}
      <Route path="/" component={() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        return user ? <Redirect to="/dashboard" /> : <HomePage />;
      }} />
      
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={DashboardRouter} />
      <ProtectedRoute path="/dashboard/my-athletes" component={MyAthletesPage} />
      <ProtectedRoute path="/dashboard/registrations" component={RegistrationsPage} />
      <ProtectedRoute path="/dashboard/camps" component={AvailableCampsPage} />
      <ProtectedRoute path="/dashboard/camps/:id" component={CampViewPage} />
      <ProtectedRoute path="/dashboard/reports" component={ReportsPage} />
      <ProtectedRoute path="/dashboard/team" component={TeamPage} />
      <ProtectedRoute 
        path="/dashboard/settings" 
        component={user?.role === "parent" ? ParentSettingsPage : SettingsPage} 
      />
      <ProtectedRoute path="/custom-fields" component={CustomFieldsPage} />
      <ProtectedRoute path="/parent-dashboard" component={ParentDashboardRouter} />
      <ProtectedRoute path="/parent-onboarding" component={ParentOnboardingPage} />
      <ProtectedRoute 
        path="/athlete-dashboard" 
        component={Dashboard} // Temporarily use the regular dashboard - we'll create a dedicated page later
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;