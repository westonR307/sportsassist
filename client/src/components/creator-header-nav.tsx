import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  Calendar,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  Users,
  ClipboardList,
  FileText,
  BarChart3,
  CreditCard,
  DollarSign,
  Users2,
  ShieldCheck,
  GraduationCap,
  X
} from "lucide-react";
import { GiBaseballBat } from "react-icons/gi";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationBell } from "@/components/notification-bell";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function CreatorHeaderNav() {
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
      path: "/dashboard",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      name: "Camps",
      path: "/dashboard/camps",
      icon: <GiBaseballBat className="h-4 w-4" />,
    },
    {
      name: "Reports",
      path: "/dashboard/reports",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      name: "Team",
      path: "/dashboard/team",
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: "Messages",
      path: "/dashboard/messages",
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
            <DrawerContent className="h-[90%]">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-lg">Camp Creator Portal</h2>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-4 w-4" />
                    </Button>
                  </DrawerClose>
                </div>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-3 pr-4">
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
                    
                    {/* Settings submenu in mobile dropdown */}
                    <div className="pt-4">
                      <h3 className="font-medium text-muted-foreground mb-2 pl-2">Settings</h3>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full justify-start gap-2 py-6"
                        onClick={() => {
                          navigate("/dashboard/settings");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>Account Settings</span>
                      </Button>
                      
                      {user?.role === "camp_creator" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full justify-start gap-2 py-6"
                          onClick={() => {
                            navigate("/dashboard/permissions");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Permissions</span>
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full justify-start gap-2 py-6"
                        onClick={() => {
                          navigate("/custom-fields");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>Custom Fields</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full justify-start gap-2 py-6"
                        onClick={() => {
                          navigate("/dashboard/organization-profile");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Users2 className="h-4 w-4" />
                        <span>Organization Profile</span>
                      </Button>
                      
                      {user?.role === "camp_creator" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full justify-start gap-2 py-6"
                          onClick={() => {
                            navigate("/dashboard/stripe-connect");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Stripe Connect</span>
                        </Button>
                      )}
                      
                      {user?.role === "camp_creator" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full justify-start gap-2 py-6"
                          onClick={() => {
                            navigate("/dashboard/subscription-plans");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Subscription Plans</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex w-full justify-start gap-2 py-6"
                        onClick={() => {
                          navigate("/documents");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span>Documents</span>
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-full justify-start gap-2 py-6 mt-6"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </ScrollArea>
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[calc(100vh-200px)] max-h-[400px]">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard/permissions")}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>Permissions</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate("/custom-fields")}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Custom Fields</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate("/dashboard/organization-profile")}>
                    <Users2 className="mr-2 h-4 w-4" />
                    <span>Organization Profile</span>
                  </DropdownMenuItem>
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard/stripe-connect")}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      <span>Stripe Connect</span>
                    </DropdownMenuItem>
                  )}
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard/subscription-plans")}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Subscription Plans</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate("/documents")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Documents</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}