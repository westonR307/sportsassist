import React, { useState, useEffect } from "react";
import { useLocation as useWouterLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SimpleLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
}

export function SimpleLayout({ children, showBackButton = true }: SimpleLayoutProps) {
  // Track if user is scrolling to prevent accidental navigation
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = React.useRef<number | null>(null);

  // Handle touch events for mobile scrolling
  useEffect(() => {
    const handleTouchStart = () => {
      // Clear any existing timeout
      if (scrollTimeout.current !== null) {
        window.clearTimeout(scrollTimeout.current);
      }
      setIsScrolling(false);
    };

    const handleTouchMove = () => {
      setIsScrolling(true);
      // Clear any existing timeout
      if (scrollTimeout.current !== null) {
        window.clearTimeout(scrollTimeout.current);
      }
    };

    const handleTouchEnd = () => {
      // Set a timeout to reset isScrolling state after scrolling stops
      if (scrollTimeout.current !== null) {
        window.clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 150); // Delay to ensure scroll has actually stopped
    };
    
    // Listen for touch events
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      
      // Clean up any remaining timeout
      if (scrollTimeout.current !== null) {
        window.clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Back Button (if enabled) - Positioned in the top left corner */}
      {showBackButton && (
        <div className="fixed top-0 left-0 m-4 z-50">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              if (!isScrolling) {
                window.history.back();
              }
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      )}

      {/* Main Content - No sidenavs or complex structures */}
      <div className="min-h-screen">
        {children}
      </div>
    </div>
  );
}