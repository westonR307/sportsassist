import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { Role } from "@shared/types";

interface ProtectedRouteProps {
  path: string;
  component: (params?: any) => React.JSX.Element;
  requiredRoles?: Role[];
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
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
        console.log("Protected route params:", params);
        return <Component {...params} />;
      }}
    </Route>
  );
}