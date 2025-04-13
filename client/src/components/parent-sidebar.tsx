import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  User,
  Home,
  Calendar,
  Archive,
  LogOut,
  Settings,
  ChevronRight,
  UserPlus,
  MessageSquare,
  ClipboardList,
  X,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function ParentSidebar() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  // Initialize sidebar open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Initialize settings menu as collapsed
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  // Set sidebar state based on screen size on initial load
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024; // 1024px is the lg breakpoint in Tailwind
    setSidebarOpen(isDesktop);
    
    // Also close sidebar when navigation happens (for mobile)
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    // Listen for location changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  // For mobile devices
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

  return (
    <>
      {/* Mobile Menu Button - Hidden when sidebar is open */}
      <div className={`lg:hidden fixed top-0 left-0 m-4 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-screen bg-white border-r 
          transition-all duration-300 ease-in-out z-40
          ${sidebarOpen ? "w-64" : "w-0 lg:w-16"} 
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          overflow-hidden
        `}
      >
        <div className="p-4 border-b whitespace-nowrap relative">
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold text-lg ${!sidebarOpen && "lg:opacity-0"}`}>
              Sports Parent Portal
            </h2>
            {/* Close button for mobile */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden absolute right-2 top-3"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {sidebarOpen && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Parent Dashboard
            </p>
          )}
        </div>
        
        <nav className="p-4 space-y-2">
          {/* Dashboard Link */}
          <button
            onClick={() => {
              navigate("/parent-dashboard");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              location === "/parent-dashboard" ? "bg-gray-100" : ""
            }`}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Dashboard</span>
          </button>
          
          {/* My Athletes Link */}
          <button
            onClick={() => {
              navigate("/dashboard/my-athletes");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              location === "/dashboard/my-athletes" ? "bg-gray-100" : ""
            }`}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>My Athletes</span>
          </button>
          
          {/* Registrations Link */}
          <button
            onClick={() => {
              navigate("/dashboard/registrations");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              location === "/dashboard/registrations" ? "bg-gray-100" : ""
            }`}
          >
            <ClipboardList className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Registrations</span>
          </button>
          
          {/* Available Camps Link */}
          <button
            onClick={() => {
              navigate("/find-camps");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              location === "/find-camps" ? "bg-gray-100" : ""
            }`}
          >
            <Archive className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Available Camps</span>
          </button>
          
          {/* Messages Link */}
          <button
            onClick={() => {
              navigate("/parent/messages");
              // Close sidebar on mobile after navigation
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
              location === "/parent/messages" ? "bg-gray-100" : ""
            }`}
          >
            <MessageSquare className="h-5 w-5 flex-shrink-0" />
            <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Messages</span>
          </button>
          
          {/* Settings dropdown with toggle */}
          <div className="relative">
            {/* Settings Header with toggle */}
            <button
              onClick={() => {
                setSettingsExpanded(!settingsExpanded);
              }}
              className={`flex justify-between w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                location.startsWith("/dashboard/settings") ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className={!sidebarOpen ? "lg:opacity-0" : ""}>Settings</span>
              </div>
              {sidebarOpen && (
                <div className="flex items-center text-gray-400">
                  {settingsExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  )}
                </div>
              )}
            </button>
            
            {/* Settings Sub-items */}
            {sidebarOpen && settingsExpanded && (
              <div className="pl-6 mt-1 space-y-1">
                {/* Account Settings Link */}
                <button
                  onClick={() => {
                    navigate("/dashboard/settings");
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 p-2 rounded-lg hover:bg-gray-100 whitespace-nowrap text-left ${
                    location === "/dashboard/settings" ? "bg-gray-100" : ""
                  }`}
                >
                  <User className="h-5 w-5 flex-shrink-0" />
                  <span>Account Settings</span>
                </button>
              </div>
            )}
          </div>
        </nav>
        
        {/* User info and logout at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className={!sidebarOpen ? "lg:mx-auto" : ""}
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}