import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  Users,
  ClipboardList,
  Archive,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function ParentHeaderNav() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/parent-dashboard",
      icon: <Home className="h-4 w-4" />,
    },
    {
      name: "My Athletes",
      path: "/dashboard/my-athletes",
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: "Registrations",
      path: "/dashboard/registrations",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      name: "Available Camps",
      path: "/find-camps",
      icon: <Archive className="h-4 w-4" />,
    },
    {
      name: "Messages",
      path: "/parent/messages",
      icon: <MessageSquare className="h-4 w-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        {/* Logo/Brand */}
        <div className="mr-4 flex items-center">
          <span className="text-lg font-bold">SportsAssist.io</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="mx-6 hidden gap-4 md:flex">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={location === item.path ? "default" : "ghost"}
              size="sm"
              className="flex gap-1"
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.name}</span>
            </Button>
          ))}
        </nav>

        {/* Mobile Menu Trigger (visible on small screens) */}
        <div className="ml-auto flex items-center gap-4 md:hidden">
          <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[80%]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-lg">Sports Parent Portal</h2>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-4 w-4" />
                    </Button>
                  </DrawerClose>
                </div>
                <div className="space-y-3">
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant={location === item.path ? "default" : "ghost"}
                      size="sm"
                      className="flex w-full justify-start gap-2 py-6"
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex w-full justify-start gap-2 py-6"
                    onClick={() => {
                      navigate("/dashboard/settings");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Account Settings</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex w-full justify-start gap-2 py-6"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Right side items (desktop) */}
        <div className="ml-auto hidden md:flex items-center gap-4">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span>{user?.first_name} {user?.last_name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}