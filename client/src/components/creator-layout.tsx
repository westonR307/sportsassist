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
    queryKey: ['organization', user?.organizationId || 'none'],
    queryFn: async () => {
      if (!user?.organizationId) return null;
      const response = await fetch(`/api/organizations/${user.organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json();
    },
    enabled: !!user?.organizationId,
    staleTime: 300000, // 5 minutes cache
  });
  
  // Helper function to convert hex to hsl for CSS Variables
  const hexToHSL = (hex: string): string => {
    // Remove the # if present
    hex = hex.replace(/^#/, '');
    
    // Parse the hex values
    let r = parseInt(hex.slice(0, 2), 16) / 255;
    let g = parseInt(hex.slice(2, 4), 16) / 255;
    let b = parseInt(hex.slice(4, 6), 16) / 255;
    
    // Find min and max values for lightness calculation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Calculate lightness
    let lightness = (max + min) / 2;
    
    // Calculate saturation
    let saturation = 0;
    if (max !== min) {
      saturation = lightness > 0.5 
        ? (max - min) / (2.0 - max - min) 
        : (max - min) / (max + min);
    }
    
    // Calculate hue
    let hue = 0;
    if (max !== min) {
      if (max === r) {
        hue = (g - b) / (max - min) + (g < b ? 6 : 0);
      } else if (max === g) {
        hue = (b - r) / (max - min) + 2;
      } else {
        hue = (r - g) / (max - min) + 4;
      }
      hue *= 60;
    }
    
    // Convert to integers (degrees, percentage, percentage)
    hue = Math.round(hue);
    saturation = Math.round(saturation * 100);
    lightness = Math.round(lightness * 100);
    
    return `${hue} ${saturation}% ${lightness}%`;
  };
  
  // Apply organization colors when data is loaded
  useEffect(() => {
    if (organization && organization.primaryColor) {
      try {
        // Convert hex color to HSL format for CSS Variables
        const primaryHSL = hexToHSL(organization.primaryColor);
        const secondaryHSL = organization.secondaryColor 
          ? hexToHSL(organization.secondaryColor) 
          : primaryHSL;
        
        console.log("Organization colors:", {
          primaryColor: organization.primaryColor,
          primaryHSL,
          secondaryColor: organization.secondaryColor,
          secondaryHSL
        });
        
        // Apply the styles using CSS variables with HSL values
        document.documentElement.style.setProperty('--primary', primaryHSL);
        document.documentElement.style.setProperty('--secondary', secondaryHSL);
        document.documentElement.style.setProperty('--border', primaryHSL);
        document.documentElement.style.setProperty('--ring', primaryHSL);
      } catch (error) {
        console.error("Error applying organization colors:", error);
      }
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