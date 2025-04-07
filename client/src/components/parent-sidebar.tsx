import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sheet,
  SheetClose,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SidebarLink({ to, icon, children, className }: SidebarLinkProps) {
  const [location] = useLocation();
  const active = location === to;

  return (
    <Link href={to}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground",
          className
        )}
      >
        {icon}
        <span>{children}</span>
        {active && <ChevronRight size={16} className="ml-auto" />}
      </div>
    </Link>
  );
}

export function ParentSidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Check if on mobile and update state
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Close sheet when changing routes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  }, [location, isMobile]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold">
          SportsAssist
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        <nav className="grid items-start px-2 text-sm font-medium">
          {isMobile ? (
            <>
              <div onClick={() => setIsSheetOpen(false)}>
                <SidebarLink to="/dashboard" icon={<Home size={20} />}>
                  Dashboard
                </SidebarLink>
              </div>
              <div onClick={() => setIsSheetOpen(false)}>
                <SidebarLink to="/dashboard/my-athletes" icon={<UserPlus size={20} />}>
                  My Athletes
                </SidebarLink>
              </div>
              <div onClick={() => setIsSheetOpen(false)}>
                <SidebarLink to="/dashboard/registrations" icon={<Calendar size={20} />}>
                  Registrations
                </SidebarLink>
              </div>
              <div onClick={() => setIsSheetOpen(false)}>
                <SidebarLink to="/find-camps" icon={<Archive size={20} />}>
                  Available Camps
                </SidebarLink>
              </div>
              <div onClick={() => setIsSheetOpen(false)}>
                <SidebarLink to="/dashboard/settings" icon={<Settings size={20} />}>
                  Profile Settings
                </SidebarLink>
              </div>
            </>
          ) : (
            <>
              <SidebarLink to="/dashboard" icon={<Home size={20} />}>
                Dashboard
              </SidebarLink>
              <SidebarLink to="/dashboard/my-athletes" icon={<UserPlus size={20} />}>
                My Athletes
              </SidebarLink>
              <SidebarLink to="/dashboard/registrations" icon={<Calendar size={20} />}>
                Registrations
              </SidebarLink>
              <SidebarLink to="/find-camps" icon={<Archive size={20} />}>
                Available Camps
              </SidebarLink>
              <SidebarLink to="/dashboard/settings" icon={<Settings size={20} />}>
                Profile Settings
              </SidebarLink>
            </>
          )}
        </nav>
      </div>
      <div className="mt-auto p-2">
        <div className="flex items-center justify-between p-2 rounded-md bg-muted">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut size={20} />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // For desktop
  if (!isMobile) {
    return (
      <div className="hidden md:flex h-screen w-60 flex-col border-r">
        {sidebarContent}
      </div>
    );
  }

  // For mobile
  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-2 left-2 z-50"
        >
          <Menu />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60">
        {sidebarContent}
      </SheetContent>
    </Sheet>
  );
}