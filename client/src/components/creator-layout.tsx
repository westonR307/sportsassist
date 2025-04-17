import React, { useEffect, useState } from "react";
import { CreatorHeaderNav } from "@/components/creator-header-nav";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface CreatorLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * A shared layout component for all camp creator pages
 * Includes the header navigation and consistent styling
 * Applies organization branding colors from the user's organization
 */
export function CreatorLayout({ children, title }: CreatorLayoutProps) {
  const { user } = useAuth();
  const [orgStyles, setOrgStyles] = useState<React.CSSProperties>({});
  
  // Fetch organization details if user belongs to an organization
  const { data: organization } = useQuery({
    queryKey: user?.organizationId ? [`/api/organizations/${user.organizationId}`] : null,
    enabled: !!user?.organizationId,
    staleTime: 300000, // 5 minutes cache
  });
  
  // Apply organization colors when data is loaded
  useEffect(() => {
    if (organization) {
      setOrgStyles({
        '--primary': organization.primaryColor || 'hsl(216 90% 45%)',
        '--primary-foreground': '#ffffff',
        '--secondary': organization.secondaryColor || 'hsl(var(--secondary))',
        '--border': organization.primaryColor || 'hsl(var(--primary))',
        '--ring': organization.primaryColor || 'hsl(var(--primary))',
      } as React.CSSProperties);
    }
  }, [organization]);

  return (
    <div className="flex flex-col min-h-screen" style={orgStyles}>
      {/* Header navigation */}
      <CreatorHeaderNav />
      
      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        {title && (
          <h1 className="text-3xl font-bold mb-6">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
}