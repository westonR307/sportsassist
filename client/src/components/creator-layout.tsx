import React from "react";
import { CreatorHeaderNav } from "@/components/creator-header-nav";

interface CreatorLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * A shared layout component for all camp creator pages
 * Includes the header navigation and consistent styling
 */
export function CreatorLayout({ children, title }: CreatorLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
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