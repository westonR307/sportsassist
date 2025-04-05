import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  UsersRound, 
  AlertOctagon, 
  Activity,
  UserCheck,
  CreditCard,
  Database,
  FileBarChart,
  MessageSquare,
  Calendar,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// Admin dashboard navigation items
const adminNavItems = [
  {
    title: "Platform Overview",
    href: "/admin",
    icon: <Activity className="h-4 w-4 mr-2" />
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: <UserCheck className="h-4 w-4 mr-2" />
  },
  {
    title: "Technical Monitoring",
    href: "/admin/monitoring",
    icon: <AlertOctagon className="h-4 w-4 mr-2" />
  },
  {
    title: "Business Intelligence",
    href: "/admin/business",
    icon: <FileBarChart className="h-4 w-4 mr-2" />
  },
  {
    title: "Support Console",
    href: "/admin/support",
    icon: <MessageSquare className="h-4 w-4 mr-2" />
  },
  {
    title: "Configuration Center",
    href: "/admin/config",
    icon: <Settings className="h-4 w-4 mr-2" />
  }
];

// Placeholder summary metrics for the admin dashboard
const summaryMetrics = [
  { 
    title: "Active Users", 
    value: 1254, 
    change: "+12.4%", 
    icon: <UsersRound className="h-8 w-8 text-blue-500" />,
    trend: "up"
  },
  { 
    title: "Active Camps", 
    value: 138, 
    change: "+5.2%", 
    icon: <Calendar className="h-8 w-8 text-green-500" />,
    trend: "up"
  },
  { 
    title: "Revenue (MTD)", 
    value: "$12,450", 
    change: "+18.7%", 
    icon: <CreditCard className="h-8 w-8 text-emerald-500" />,
    trend: "up"
  },
  { 
    title: "System Health", 
    value: "98.2%", 
    change: "-0.3%", 
    icon: <Database className="h-8 w-8 text-purple-500" />,
    trend: "down"
  }
];

// Component for displaying the platform overview metrics
const PlatformOverview = ({ metrics, isLoading }: any) => {
  if (isLoading || !metrics) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <CardDescription>Loading platform metrics...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>Key metrics across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.totalUsers}</p>
              <div className="mt-1 text-xs text-green-500">
                +{metrics.newUsersToday} today
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.activeUsers}</p>
              <div className="mt-1 text-xs text-gray-500">
                {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}% of total
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Camp Creators</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.usersByRole.camp_creator}</p>
              <div className="mt-1 text-xs text-gray-500">
                {((metrics.usersByRole.camp_creator / metrics.totalUsers) * 100).toFixed(1)}% of total
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Admins</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.usersByRole.platform_admin}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">User Distribution by Role</h3>
            <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {/* Placeholder for chart - in a real app, you would use a charting library */}
              <div className="h-full flex items-center justify-center text-gray-500">
                User role distribution chart would appear here
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder component for user management
const UserManagement = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage all platform users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400">User management interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder component for technical monitoring
const TechnicalMonitoring = ({ systemMetrics, alerts }: any) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Real-time system metrics and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {systemMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Uptime</h3>
                <p className="mt-2 text-3xl font-bold">{systemMetrics.uptime}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">API Latency</h3>
                <p className="mt-2 text-3xl font-bold">{systemMetrics.apiLatency} ms</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Error Rate</h3>
                <p className="mt-2 text-3xl font-bold">{systemMetrics.errorRate}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Connections</h3>
                <p className="mt-2 text-3xl font-bold">{systemMetrics.activeConnections}</p>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          <h3 className="text-lg font-medium mb-4">System Alerts</h3>
          
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg ${
                    alert.type === "error" 
                      ? "bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20" 
                      : alert.type === "warning"
                      ? "bg-yellow-50 border-l-4 border-yellow-500 dark:bg-yellow-900/20"
                      : "bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-medium ${
                        alert.type === "error" 
                          ? "text-red-800 dark:text-red-400" 
                          : alert.type === "warning"
                          ? "text-yellow-800 dark:text-yellow-400"
                          : "text-blue-800 dark:text-blue-400"
                      }`}>
                        {alert.message}
                      </p>
                      <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">{alert.details}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                          alert.status === "investigating" 
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300" 
                            : alert.status === "resolved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">No system alerts at this time</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder component for business intelligence
const BusinessIntelligence = ({ financialMetrics }: any) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Revenue and financial metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {financialMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">MTD Revenue</h3>
                <p className="mt-2 text-3xl font-bold">${financialMetrics.mtdRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">YTD Revenue</h3>
                <p className="mt-2 text-3xl font-bold">${financialMetrics.ytdRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription Revenue</h3>
                <p className="mt-2 text-3xl font-bold">${financialMetrics.subscriptionRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Revenue</h3>
                <p className="mt-2 text-3xl font-bold">${financialMetrics.transactionRevenue.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Revenue Breakdown</h3>
            <div className="h-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {/* Placeholder for chart */}
              <div className="h-full flex items-center justify-center text-gray-500">
                Revenue breakdown chart would appear here
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder component for support console
const SupportConsole = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Support Console</CardTitle>
          <CardDescription>Customer support tools and issue tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400">Support console interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Placeholder component for configuration center
const ConfigurationCenter = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuration Center</CardTitle>
          <CardDescription>Platform settings and global configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400">Configuration interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// System alerts for the admin dashboard
const systemAlerts = [
  {
    id: 1,
    type: "error",
    message: "Payment processing service degradation",
    timestamp: "2025-04-05T09:32:14Z",
    details: "The payment processing service is experiencing intermittent failures.",
    status: "investigating"
  },
  {
    id: 2,
    type: "warning",
    message: "High database load detected",
    timestamp: "2025-04-05T08:15:42Z",
    details: "Database load spiked to 82% for 15 minutes before returning to normal.",
    status: "resolved"
  },
  {
    id: 3,
    type: "info",
    message: "System maintenance scheduled",
    timestamp: "2025-04-05T07:00:00Z",
    details: "Scheduled maintenance will occur on April 10th at 02:00 UTC.",
    status: "scheduled"
  }
];

function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Define admin metrics types for TypeScript
  interface PlatformMetrics {
    userMetrics: {
      totalUsers: number;
      activeUsers: number;
      newUsersToday: number;
      usersByRole: {
        platform_admin: number;
        camp_creator: number;
        manager: number;
        coach: number;
        volunteer: number;
        parent: number;
        athlete: number;
      }
    };
    organizationMetrics: {
      totalOrganizations: number;
      activeSubscriptions: number;
      trialAccounts: number;
    };
    financialMetrics: {
      mtdRevenue: number;
      ytdRevenue: number;
      subscriptionRevenue: number;
      transactionRevenue: number;
    };
    systemMetrics: {
      uptime: number;
      apiLatency: number;
      errorRate: number;
      activeConnections: number;
    };
  }

  // Placeholder query for platform metrics
  const { data: metrics, isLoading } = useQuery<PlatformMetrics>({
    queryKey: ['/api/admin/metrics'],
    retry: false,
    // This is a placeholder until we implement the actual API endpoint
    queryFn: async () => {
      // For demo purposes, we'll just return some mock data
      return new Promise<PlatformMetrics>(resolve => setTimeout(() => resolve({
        userMetrics: {
          totalUsers: 2375,
          activeUsers: 1254,
          newUsersToday: 28,
          usersByRole: {
            platform_admin: 3,
            camp_creator: 142,
            manager: 231,
            coach: 456,
            volunteer: 189,
            parent: 1125,
            athlete: 230
          }
        },
        organizationMetrics: {
          totalOrganizations: 142,
          activeSubscriptions: 98,
          trialAccounts: 44
        },
        financialMetrics: {
          mtdRevenue: 12450,
          ytdRevenue: 87250,
          subscriptionRevenue: 7830,
          transactionRevenue: 4620
        },
        systemMetrics: {
          uptime: 99.95,
          apiLatency: 342, // ms
          errorRate: 0.18,
          activeConnections: 156
        }
      }), 1000));
    }
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Map tab to URL
    const navItem = adminNavItems.find(item => {
      if (tab === "overview" && item.href === "/admin") return true;
      if (tab === "users" && item.href === "/admin/users") return true;
      if (tab === "monitoring" && item.href === "/admin/monitoring") return true;
      if (tab === "business" && item.href === "/admin/business") return true;
      if (tab === "support" && item.href === "/admin/support") return true;
      if (tab === "config" && item.href === "/admin/config") return true;
      return false;
    });
    
    if (navItem) {
      setLocation(navItem.href);
    }
  };

  // Determine the active tab based on the current location
  React.useEffect(() => {
    if (location === "/admin") {
      setActiveTab("overview");
    } else if (location === "/admin/users") {
      setActiveTab("users");
    } else if (location === "/admin/monitoring") {
      setActiveTab("monitoring");
    } else if (location === "/admin/business") {
      setActiveTab("business");
    } else if (location === "/admin/support") {
      setActiveTab("support");
    } else if (location === "/admin/config") {
      setActiveTab("config");
    }
  }, [location]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container flex items-center justify-between h-16 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline">
                Return to App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {summaryMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </p>
                    <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
                    <p className={`text-xs mt-1 flex items-center ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.trend === 'up' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {metric.change}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                    {metric.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Navigation</CardTitle>
              <CardDescription>Manage platform, users, and system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-4">
                  <TabsTrigger value="overview" className="flex items-center">
                    <Activity className="h-4 w-4 mr-2" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center">
                    <UsersRound className="h-4 w-4 mr-2" /> Users
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="flex items-center">
                    <AlertOctagon className="h-4 w-4 mr-2" /> Monitoring
                  </TabsTrigger>
                  <TabsTrigger value="business" className="flex items-center">
                    <BarChart className="h-4 w-4 mr-2" /> Business
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" /> Support
                  </TabsTrigger>
                  <TabsTrigger value="config" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" /> Config
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <PlatformOverview metrics={metrics?.userMetrics} isLoading={isLoading} />
                </TabsContent>
                
                <TabsContent value="users">
                  <UserManagement />
                </TabsContent>
                
                <TabsContent value="monitoring">
                  <TechnicalMonitoring systemMetrics={metrics?.systemMetrics} alerts={systemAlerts} />
                </TabsContent>
                
                <TabsContent value="business">
                  <BusinessIntelligence financialMetrics={metrics?.financialMetrics} />
                </TabsContent>
                
                <TabsContent value="support">
                  <SupportConsole />
                </TabsContent>
                
                <TabsContent value="config">
                  <ConfigurationCenter />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;