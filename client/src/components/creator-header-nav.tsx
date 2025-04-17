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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
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
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Function to prevent default behavior for touch events to fix scrolling issues
  const handleScroll = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    // Don't call preventDefault here as it would prevent scrolling
  };
  
  // Effect to handle menu closing on touch outside
  React.useEffect(() => {
    // Only add handlers when either menu is open
    const preventClosing = (e: TouchEvent) => {
      // Check if the target is within a scroll area
      const target = e.target as HTMLElement;
      if (target.closest('.scroll-area') || target.closest('[data-radix-scroll-area-viewport]')) {
        // Prevent touch events from closing dropdown only in scroll areas
        e.stopPropagation();
      }
    };
    
    if (mobileMenuOpen) {
      document.addEventListener('touchmove', preventClosing, { passive: false });
      document.addEventListener('touchstart', preventClosing, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', preventClosing);
        document.removeEventListener('touchstart', preventClosing);
      };
    }
  }, [mobileMenuOpen]);

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  // Define Organization type
  interface Organization {
    id: number;
    name: string;
    description?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  // Fetch organization data if user is logged in and has an organization
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery<Organization>({
    queryKey: [`/api/organizations/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });
  
  // Debug organization data
  console.log("Organization data:", organization);
  console.log("Organization loading:", orgLoading);
  console.log("Organization error:", orgError);

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
          <Link to="/dashboard" className="flex items-center gap-2">
            {organization?.logoUrl ? (
              <div className="h-8 w-8 overflow-hidden rounded-md">
                <img 
                  src={organization.logoUrl.startsWith('http') ? organization.logoUrl : `${window.location.origin}${organization.logoUrl}`} 
                  alt={`${organization?.name || 'Organization'} logo`} 
                  className="h-full w-full object-contain" 
                />
              </div>
            ) : (
              <GiBaseballBat className="h-6 w-6 text-primary" />
            )}
            <span className="text-lg font-bold">SportsAssist.io</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="mx-6 hidden gap-4 md:flex">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium ${
                location === item.path 
                ? "bg-primary text-primary-foreground" 
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = item.path;
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
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
            <DrawerContent className="h-[90%]" onTouchMove={(e) => e.stopPropagation()}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    {organization?.logoUrl ? (
                      <div className="h-7 w-7 overflow-hidden rounded-md">
                        <img 
                          src={organization.logoUrl.startsWith('http') ? organization.logoUrl : `${window.location.origin}${organization.logoUrl}`} 
                          alt={`${organization?.name || 'Organization'} logo`} 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                    ) : (
                      <GiBaseballBat className="h-5 w-5 text-primary" />
                    )}
                    <h2 className="font-semibold text-lg">SportsAssist.io</h2>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-4 w-4" />
                    </Button>
                  </DrawerClose>
                </div>
                <ScrollArea 
                  className="h-[calc(100vh-90px)] scroll-area" 
                  onMouseDown={handleScroll} 
                  onTouchStart={(e) => {
                    handleScroll(e);
                    setIsScrolling(true);
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    setIsScrolling(true);
                  }}
                  onTouchEnd={() => {
                    // Small delay to ensure the click handler doesn't fire immediately
                    setTimeout(() => setIsScrolling(false), 100);
                  }}
                >
                  <div className="space-y-3 pr-4">
                    {navItems.map((item) => (
                      <a
                        key={item.path}
                        href={item.path}
                        className={`flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium ${
                          location === item.path 
                            ? "bg-primary text-primary-foreground" 
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isScrolling) {
                            window.location.href = item.path;
                            setMobileMenuOpen(false);
                          }
                        }}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </a>
                    ))}
                    
                    {/* Settings submenu in mobile dropdown */}
                    <div className="pt-4">
                      <h3 className="font-medium text-muted-foreground mb-2 pl-2">Settings</h3>
                      
                      <a
                        href="/dashboard/settings"
                        className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          window.location.href = "/dashboard/settings";
                          setMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>Account Settings</span>
                      </a>
                      
                      {user?.role === "camp_creator" && (
                        <a
                          href="/dashboard/permissions"
                          className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            window.location.href = "/dashboard/permissions";
                            setMobileMenuOpen(false);
                          }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Permissions</span>
                        </a>
                      )}
                      
                      <a
                        href="/custom-fields"
                        className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          window.location.href = "/custom-fields";
                          setMobileMenuOpen(false);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>Custom Fields</span>
                      </a>
                      
                      <a
                        href="/dashboard/organization-profile"
                        className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          window.location.href = "/dashboard/organization-profile";
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Users2 className="h-4 w-4" />
                        <span>Organization Profile</span>
                      </a>
                      
                      {user?.role === "camp_creator" && (
                        <a
                          href="/dashboard/stripe-connect"
                          className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            window.location.href = "/dashboard/stripe-connect";
                            setMobileMenuOpen(false);
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Stripe Connect</span>
                        </a>
                      )}
                      
                      {user?.role === "camp_creator" && (
                        <a
                          href="/dashboard/subscription-plans"
                          className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            window.location.href = "/dashboard/subscription-plans";
                            setMobileMenuOpen(false);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Subscription Plans</span>
                        </a>
                      )}

                      <a
                        href="/documents"
                        className="flex w-full justify-start items-center gap-2 py-3 px-3 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          window.location.href = "/documents";
                          setMobileMenuOpen(false);
                        }}
                      >
                        <ClipboardList className="h-4 w-4" />
                        <span>Documents</span>
                      </a>
                    </div>
                    
                    <button
                      className="flex w-full justify-start items-center gap-2 py-3 px-3 mt-6 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        handleLogout();
                      }}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
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
            <DropdownMenuContent 
              align="end" 
              className="w-56" 
              sideOffset={5} 
              collisionPadding={10}
              forceMount
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea 
                className="max-h-[300px] scroll-area" 
                onMouseDown={handleScroll} 
                onTouchStart={(e) => {
                  handleScroll(e);
                  setIsScrolling(true);
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  setIsScrolling(true);
                }}
                onTouchEnd={() => {
                  // Small delay to ensure the click handler doesn't fire immediately
                  setTimeout(() => setIsScrolling(false), 100);
                }}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <a 
                      href="/dashboard/settings"
                      onClick={() => {
                        window.location.href = "/dashboard/settings";
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </a>
                  </DropdownMenuItem>
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem asChild>
                      <a 
                        href="/dashboard/permissions"
                        onClick={() => {
                          window.location.href = "/dashboard/permissions";
                        }}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Permissions</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem asChild>
                    <a 
                      href="/custom-fields"
                      onClick={() => {
                        window.location.href = "/custom-fields";
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Custom Fields</span>
                    </a>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <a 
                      href="/dashboard/organization-profile"
                      onClick={() => {
                        window.location.href = "/dashboard/organization-profile";
                      }}
                    >
                      <Users2 className="mr-2 h-4 w-4" />
                      <span>Organization Profile</span>
                    </a>
                  </DropdownMenuItem>
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem asChild>
                      <a 
                        href="/dashboard/stripe-connect"
                        onClick={() => {
                          window.location.href = "/dashboard/stripe-connect";
                        }}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Stripe Connect</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  
                  {user?.role === "camp_creator" && (
                    <DropdownMenuItem asChild>
                      <a 
                        href="/dashboard/subscription-plans"
                        onClick={() => {
                          window.location.href = "/dashboard/subscription-plans";
                        }}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Subscription Plans</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem asChild>
                    <a 
                      href="/documents"
                      onClick={() => {
                        window.location.href = "/documents";
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>Documents</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    className="flex w-full justify-start items-center"
                    onClick={() => {
                      handleLogout();
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </DropdownMenuItem>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}