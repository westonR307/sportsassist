import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { Role } from "@shared/types";
import { AppLayout } from "@/components/app-layout";
import { CreatorLayout } from "@/components/creator-layout";

// Helper function to determine page title based on route path
function getPageTitleFromPath(path: string): string {
  const pathToTitleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/camps': 'Camps',
    '/dashboard/reports': 'Reports',
    '/dashboard/team': 'Team Management',
    '/dashboard/messages': 'Messages',
    '/dashboard/settings': 'Account Settings',
    '/dashboard/permissions': 'Permissions',
    '/custom-fields': 'Custom Fields',
    '/dashboard/organization-profile': 'Organization Profile',
    '/dashboard/stripe-connect': 'Stripe Connect',
    '/dashboard/subscription-plans': 'Subscription Plans',
    '/documents': 'Document Templates',
  };
  
  // Try direct lookup first
  if (path in pathToTitleMap) {
    return pathToTitleMap[path];
  }
  
  // Check for paths with wildcards
  if (path.startsWith('/documents/')) {
    return 'Document Editor';
  }
  
  // Default title if no match
  return 'Dashboard';
}

interface ProtectedRouteProps {
  path: string;
  component: (params?: any) => React.JSX.Element;
  requiredRoles?: Role[];
  showBackButton?: boolean;
  showNavigation?: boolean;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles,
  showBackButton = false,
  showNavigation = true,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
        // Ensure params is an object and includes the path params
        // Don't override existing property if it exists (like 'slug')
        const routeParams = {
          ...params,
          id: params?.id || params?.["*"],
          // Ensure slug is preserved if it exists
          slug: params?.slug || params?.id
        };
        console.log("Full route params:", routeParams);
        
        // Early return for loading state
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        // Check if user is authenticated
        if (!user) {
          return <Redirect to="/auth" />;
        }

        // Check if user has the required role(s)
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.includes(user.role as Role);
          if (!hasRequiredRole) {
            return (
              <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-gray-500 mb-6">
                  You don't have permission to access this page. 
                  This area requires {requiredRoles.join(" or ")} role.
                </p>
                <Button onClick={() => window.location.href = "/dashboard"}>
                  Return to Dashboard
                </Button>
              </div>
            );
          }
        }

        // Pass route params to the component
        console.log("Protected route params:", routeParams);
        console.log("Protected route path:", path);
        
        // Parent routes
        if (user.role === 'parent') {
          // For parent dashboard & similar routes, never use AppLayout (they have their own sidebar)
          const isParentDashboardRoute = path === '/parent-dashboard' || 
                                        path === '/dashboard/my-athletes' || 
                                        path === '/dashboard/registrations' ||
                                        path === '/parent/messages' ||
                                        path === '/dashboard/available-camps' ||
                                        (path === '/dashboard/settings' && user?.role === 'parent') ||
                                        (path === '/dashboard/notifications' && user?.role === 'parent');
          
          if (isParentDashboardRoute) {
            // Never wrap parent dashboard with AppLayout - it has its own layout
            return <Component {...routeParams} />;
          } else {
            // Camp view and other pages - render directly with no layout
            return <Component {...routeParams} />;
          }
        } 
        // Camp creator/manager routes
        else if (user.role === 'camp_creator' || user.role === 'manager') {
          // Check if this is a dashboard-type route to use CreatorLayout
          const isCreatorDashboardRoute = path === '/dashboard' || 
                                        path === '/dashboard/camps' || 
                                        path === '/dashboard/reports' ||
                                        path === '/dashboard/team' ||
                                        path === '/dashboard/messages' ||
                                        path === '/dashboard/settings' ||
                                        path === '/dashboard/permissions' ||
                                        path === '/custom-fields' ||
                                        path === '/dashboard/organization-profile' ||
                                        path === '/dashboard/stripe-connect' ||
                                        path === '/dashboard/subscription-plans' ||
                                        path === '/documents' ||
                                        path === '/documents/*';
          
          if (showNavigation && isCreatorDashboardRoute) {
            // Use the CreatorLayout for dashboard-type routes
            const pageTitle = getPageTitleFromPath(path);
            return (
              <CreatorLayout title={pageTitle}>
                <Component id={routeParams.id} {...routeParams} />
              </CreatorLayout>
            );
          } else if (showNavigation) {
            // Use AppLayout for non-dashboard routes
            return (
              <AppLayout showBackButton={showBackButton}>
                <Component id={routeParams.id} {...routeParams} />
              </AppLayout>
            );
          } else {
            // No layout for routes that don't need navigation
            return <Component id={routeParams.id} {...routeParams} />;
          }
        }
        // Platform admin routes and others
        else {
          if (showNavigation) {
            return (
              <AppLayout showBackButton={showBackButton}>
                <Component id={routeParams.id} {...routeParams} />
              </AppLayout>
            );
          } else {
            return <Component id={routeParams.id} {...routeParams} />;
          }
        }
      }}
    </Route>
  );
}