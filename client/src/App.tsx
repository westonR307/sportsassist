import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Import pages
import HomePage from "@/pages/simplified-home-page";
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
import InvitationAcceptPage from "@/pages/invitation-accept-page";
import CustomFieldsPage from "@/pages/custom-fields-page";
import MyAthletesPage from "@/pages/my-athletes-page";
import RegistrationsPage from "@/pages/registrations-page";
import AvailableCampsPage from "@/pages/available-camps-page";
import CampsPage from "@/pages/camps";
import FindCampsPage from "@/pages/find-camps-page";
import DocumentsPage from "@/pages/documents-page";
import DocumentViewPage from "@/pages/document-view-page";
import DocumentEditPage from "@/pages/document-edit-page";
import SignaturePage from "@/pages/signature-page";
import OrganizationProfilePage from "@/pages/organization-profile";
import OrganizationPublicPage from "@/pages/organization";
import OrganizationViewPage from "@/pages/organization-view-page";
import { PermissionManagementPage } from "@/pages/permission-management";
import StripeConnectManagement from "@/pages/stripe-connect-management";
import SubscriptionPlans from "@/pages/subscription-plans";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import UserSwitcherPage from "@/pages/user-switcher-page";
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
      <Route path="/login" component={() => <Redirect to="/auth" />} />
      <Route path="/find-camps" component={FindCampsPage} />
      <Route path="/organization/:slugOrName" component={OrganizationViewPage} />
      <Route path="/org/:slug" component={OrganizationPublicPage} />
      <Route path="/invitations/:token/accept" component={InvitationAcceptPage} />
      <ProtectedRoute path="/dashboard" component={DashboardRouter} />
      <ProtectedRoute 
        path="/dashboard/my-athletes" 
        component={MyAthletesPage}
        requiredRoles={["parent" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/registrations" 
        component={RegistrationsPage}
      />
      <ProtectedRoute 
        path="/dashboard/camps" 
        component={CampsPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/camps/:id" 
        component={CampViewPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/camps/slug/:id" 
        component={CampViewPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute path="/camp/:id" component={CampViewPage} />
      <ProtectedRoute path="/camp/slug/:id" component={CampViewPage} />
      <ProtectedRoute 
        path="/dashboard/reports" 
        component={ReportsPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/team" 
        component={TeamPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/settings" 
        component={user?.role === "parent" ? ParentSettingsPage : SettingsPage} 
      />
      <ProtectedRoute 
        path="/dashboard/organization-profile" 
        component={OrganizationProfilePage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/permissions" 
        component={PermissionManagementPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/stripe-connect" 
        component={StripeConnectManagement}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/dashboard/subscription-plans" 
        component={() => <SubscriptionPlans />}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/permission-management" 
        component={PermissionManagementPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute 
        path="/custom-fields" 
        component={CustomFieldsPage}
        requiredRoles={["camp_creator" as const, "platform_admin" as const]} 
      />
      <ProtectedRoute path="/user-switcher" component={UserSwitcherPage} />
      <ProtectedRoute path="/parent-dashboard" component={ParentDashboardRouter} />
      <ProtectedRoute path="/parent-onboarding" component={ParentOnboardingPage} />
      <ProtectedRoute 
        path="/athlete-dashboard" 
        component={Dashboard} // Temporarily use the regular dashboard - we'll create a dedicated page later
      />
      {/* Document-related routes */}
      <ProtectedRoute path="/documents" component={DocumentsPage} />
      <ProtectedRoute path="/documents/view/:id" component={DocumentViewPage} />
      <ProtectedRoute path="/documents/:id" component={DocumentViewPage} />
      <ProtectedRoute path="/documents/:id/edit" component={DocumentEditPage} />
      <Route path="/sign/:token" component={SignaturePage} />
      
      {/* Admin routes - protected for platform_admin role only */}
      <ProtectedRoute 
        path="/admin" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
      />
      <ProtectedRoute 
        path="/admin/users" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
      />
      <ProtectedRoute 
        path="/admin/monitoring" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
      />
      <ProtectedRoute 
        path="/admin/business" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
      />
      <ProtectedRoute 
        path="/admin/support" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
      />
      <ProtectedRoute 
        path="/admin/config" 
        component={AdminDashboard}
        requiredRoles={["platform_admin" as const]}
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