import React from "react";
import { useLocation as useWouterLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SimpleLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
}

export function SimpleLayout({ children, showBackButton = true }: SimpleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button (if enabled) - Positioned in the top left corner */}
      {showBackButton && (
        <div className="fixed top-0 left-0 m-4 z-50">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      )}

      {/* Main Content - No sidenavs or complex structures */}
      <div className="min-h-screen bg-gray-50 pt-16">
        {children}
      </div>
    </div>
  );
}