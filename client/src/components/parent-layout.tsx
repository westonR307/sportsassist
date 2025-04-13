import React from "react";
import { ParentHeaderNav } from "@/components/parent-header-nav";

interface ParentLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * A shared layout component for all parent pages
 * Includes the header navigation and consistent styling
 */
export function ParentLayout({ children, title }: ParentLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header navigation */}
      <ParentHeaderNav />
      
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