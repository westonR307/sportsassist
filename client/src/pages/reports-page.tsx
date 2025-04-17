import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { CalendarIcon, BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

type DateRange = {
  from: Date;
  to: Date;
} | undefined;

type ReportTimeframe = "last7days" | "last30days" | "thisMonth" | "thisWeek" | "custom";

// Types for Reports
type RegistrationsReport = {
  total: number;
  paid: number;
  unpaid: number;
  waitlisted: number;
  revenue: number;
  byDay: { date: string; count: number; revenue: number }[];
  byCamp: { campId: number; campName: string; count: number; revenue: number }[];
};

type CampPerformanceReport = {
  totalCamps: number;
  activeCamps: number;
  upcomingCamps: number;
  completedCamps: number;
  canceledCamps: number;
  capacityUtilization: number;
  avgRegistrationsPerCamp: number;
  mostPopularCamps: { id: number; name: string; registrationCount: number; capacityPercentage: number }[];
};

type FinancialReport = {
  totalRevenue: number;
  paidRegistrations: number;
  unpaidRegistrations: number;
  averageRegistrationValue: number;
  revenueByDay: { date: string; revenue: number }[];
  revenueByCamp: { campId: number; campName: string; revenue: number }[];
  platformFees: number;
  netRevenue: number;
  subscriptionCosts: number;
};

type AttendanceReport = {
  totalSessions: number;
  totalAttendedSessions: number;
  attendanceRate: number;
  sessionsByStatus: Record<string, number>;
  attendanceByDay: { date: string; total: number; attended: number; rate: number }[];
  attendanceByCamp: { campId: number; campName: string; total: number; attended: number; rate: number }[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("registrations");
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("last30days");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Calculate date range based on timeframe selection
  const getDateRangeForTimeframe = (timeframe: ReportTimeframe): DateRange => {
    const today = new Date();
    
    switch (timeframe) {
      case "last7days":
        return {
          from: subDays(today, 7),
          to: today
        };
      case "last30days":
        return {
          from: subDays(today, 30),
          to: today
        };
      case "thisMonth":
        return {
          from: startOfMonth(today),
          to: endOfMonth(today)
        };
      case "thisWeek":
        return {
          from: startOfWeek(today),
          to: endOfWeek(today)
        };
      case "custom":
        return dateRange;
      default:
        return {
          from: subDays(today, 30),
          to: today
        };
    }
  };

  // Format date range for API requests
  const formatDateForApi = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  // Generate query parameters for API requests
  const getDateQueryParams = () => {
    const range = getDateRangeForTimeframe(timeframe);
    if (!range || !range.from || !range.to) return "";
    
    return `?startDate=${formatDateForApi(range.from)}&endDate=${formatDateForApi(range.to)}`;
  };

  // Query for registrations report
  const registrationsReportQuery = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'reports/registrations', timeframe, dateRange],
    queryFn: async () => {
      if (!user?.organizationId) throw new Error("Organization ID is required");
      
      const response = await fetch(
        `/api/organizations/${user.organizationId}/reports/registrations${getDateQueryParams()}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch registration report");
      }
      
      return response.json() as Promise<RegistrationsReport>;
    },
    enabled: !!user?.organizationId
  });

  // Query for camp performance report
  const campPerformanceReportQuery = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'reports/camps', timeframe, dateRange],
    queryFn: async () => {
      if (!user?.organizationId) throw new Error("Organization ID is required");
      
      const response = await fetch(
        `/api/organizations/${user.organizationId}/reports/camps${getDateQueryParams()}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch camp performance report");
      }
      
      return response.json() as Promise<CampPerformanceReport>;
    },
    enabled: !!user?.organizationId && activeTab === "camps"
  });

  // Query for financial report
  const financialReportQuery = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'reports/financials', timeframe, dateRange],
    queryFn: async () => {
      if (!user?.organizationId) throw new Error("Organization ID is required");
      
      const response = await fetch(
        `/api/organizations/${user.organizationId}/reports/financials${getDateQueryParams()}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch financial report");
      }
      
      return response.json() as Promise<FinancialReport>;
    },
    enabled: !!user?.organizationId && activeTab === "financials"
  });

  // Query for attendance report
  const attendanceReportQuery = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'reports/attendance', timeframe, dateRange],
    queryFn: async () => {
      if (!user?.organizationId) throw new Error("Organization ID is required");
      
      const response = await fetch(
        `/api/organizations/${user.organizationId}/reports/attendance${getDateQueryParams()}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch attendance report");
      }
      
      return response.json() as Promise<AttendanceReport>;
    },
    enabled: !!user?.organizationId && activeTab === "attendance"
  });

  // Handle timeframe changes
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as ReportTimeframe);
  };

  // Handle date range changes when using custom timeframe
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    if (timeframe !== "custom") {
      setTimeframe("custom");
    }
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d");
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Timeframe</SelectLabel>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="thisWeek">This week</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {timeframe === "custom" && (
            <DatePickerWithRange 
              className="w-full sm:w-auto" 
              date={dateRange} 
              onSelect={handleDateRangeChange} 
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="registrations" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="registrations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Registrations</span>
          </TabsTrigger>
          <TabsTrigger value="camps" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Camp Performance</span>
          </TabsTrigger>
          <TabsTrigger value="financials" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Financials</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
        </TabsList>

        {/* Registrations Report Tab */}
        <TabsContent value="registrations" className="space-y-6">
          {registrationsReportQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[120px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-[100px] mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : registrationsReportQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">
                  <p>Error loading registration data</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => registrationsReportQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Registrations</CardTitle>
                    <CardDescription>All registration submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {registrationsReportQuery.data?.total || 0}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-green-600">
                        {registrationsReportQuery.data?.paid || 0} paid
                      </span>
                      {" / "}
                      <span className="font-medium text-yellow-600">
                        {registrationsReportQuery.data?.unpaid || 0} unpaid
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue</CardTitle>
                    <CardDescription>From paid registrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(registrationsReportQuery.data?.revenue || 0)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      For the selected time period
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Waitlisted</CardTitle>
                    <CardDescription>Registrations on waitlist</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {registrationsReportQuery.data?.waitlisted || 0}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {registrationsReportQuery.data?.waitlisted 
                        ? `${((registrationsReportQuery.data?.waitlisted / registrationsReportQuery.data?.total) * 100).toFixed(1)}% of total`
                        : 'No waitlisted registrations'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Registrations by Day</CardTitle>
                    <CardDescription>Number of registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={registrationsReportQuery.data?.byDay || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === "revenue") return [formatCurrency(value), "Revenue"];
                              return [value, "Registrations"];
                            }}
                            labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="count" name="Registrations" fill="#8884d8" />
                          <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Top Camps by Registration</CardTitle>
                    <CardDescription>Camps with the most registrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Camp Name</th>
                            <th className="pb-2 text-right">Registrations</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(registrationsReportQuery.data?.byCamp || [])
                            .sort((a, b) => b.count - a.count)
                            .map((camp) => (
                              <tr key={camp.campId} className="border-b last:border-0">
                                <td className="py-2 truncate max-w-[200px]">
                                  {camp.campName}
                                </td>
                                <td className="py-2 text-right">{camp.count}</td>
                                <td className="py-2 text-right">
                                  {formatCurrency(camp.revenue)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Camp Performance Report Tab */}
        <TabsContent value="camps" className="space-y-6">
          {campPerformanceReportQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[120px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-[100px] mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : campPerformanceReportQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">
                  <p>Error loading camp performance data</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => campPerformanceReportQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Camps</CardTitle>
                    <CardDescription>All camps in the period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {campPerformanceReportQuery.data?.totalCamps || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Camps</CardTitle>
                    <CardDescription>Currently running</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {campPerformanceReportQuery.data?.activeCamps || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming</CardTitle>
                    <CardDescription>Scheduled to start</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {campPerformanceReportQuery.data?.upcomingCamps || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completed</CardTitle>
                    <CardDescription>Finished camps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-600">
                      {campPerformanceReportQuery.data?.completedCamps || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Capacity Utilization</CardTitle>
                    <CardDescription>How filled your camps are</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-60">
                      <div className="text-6xl font-bold mb-2">
                        {formatPercentage(campPerformanceReportQuery.data?.capacityUtilization || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Average across all camps
                      </div>
                      <div className="mt-4 text-sm">
                        <span className="font-medium">
                          {campPerformanceReportQuery.data?.avgRegistrationsPerCamp.toFixed(1) || "0"}
                        </span> registrations per camp on average
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Most Popular Camps</CardTitle>
                    <CardDescription>By registration count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Camp Name</th>
                            <th className="pb-2 text-right">Registrations</th>
                            <th className="pb-2 text-right">Capacity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(campPerformanceReportQuery.data?.mostPopularCamps || []).map((camp) => (
                            <tr key={camp.id} className="border-b last:border-0">
                              <td className="py-2 truncate max-w-[200px]">
                                {camp.name}
                              </td>
                              <td className="py-2 text-right">{camp.registrationCount}</td>
                              <td className="py-2 text-right">
                                {formatPercentage(camp.capacityPercentage)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Financial Report Tab */}
        <TabsContent value="financials" className="space-y-6">
          {financialReportQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[120px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-[100px] mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : financialReportQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">
                  <p>Error loading financial data</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => financialReportQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gross Revenue</CardTitle>
                    <CardDescription>Total revenue collected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(financialReportQuery.data?.totalRevenue || 0)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      From {financialReportQuery.data?.paidRegistrations || 0} paid registrations
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Net Revenue</CardTitle>
                    <CardDescription>After platform fees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(financialReportQuery.data?.netRevenue || 0)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Platform fees: {formatCurrency(financialReportQuery.data?.platformFees || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Value</CardTitle>
                    <CardDescription>Per registration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(financialReportQuery.data?.averageRegistrationValue || 0)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Based on {financialReportQuery.data?.paidRegistrations || 0} paid registrations
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Daily Revenue</CardTitle>
                    <CardDescription>Revenue over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={financialReportQuery.data?.revenueByDay || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis 
                            tickFormatter={(value) => `$${value}`} 
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                            labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenue" 
                            stroke="#8884d8" 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Revenue by Camp</CardTitle>
                    <CardDescription>Top revenue generating camps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Camp Name</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(financialReportQuery.data?.revenueByCamp || [])
                            .sort((a, b) => b.revenue - a.revenue)
                            .map((camp) => (
                              <tr key={camp.campId} className="border-b last:border-0">
                                <td className="py-2 truncate max-w-[240px]">
                                  {camp.campName}
                                </td>
                                <td className="py-2 text-right">
                                  {formatCurrency(camp.revenue)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Attendance Report Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {attendanceReportQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[120px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-[100px] mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : attendanceReportQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">
                  <p>Error loading attendance data</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => attendanceReportQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Sessions</CardTitle>
                    <CardDescription>All scheduled sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {attendanceReportQuery.data?.totalSessions || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Rate</CardTitle>
                    <CardDescription>Overall attendance percentage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatPercentage(attendanceReportQuery.data?.attendanceRate || 0)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {attendanceReportQuery.data?.totalAttendedSessions || 0} attendances recorded
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Session Status</CardTitle>
                    <CardDescription>Session breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(attendanceReportQuery.data?.sessionsByStatus || {}).map(
                              ([status, count], index) => ({
                                name: status.charAt(0).toUpperCase() + status.slice(1),
                                value: count
                              })
                            )}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {Object.entries(attendanceReportQuery.data?.sessionsByStatus || {}).map(
                              ([_, count], index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              )
                            )}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Attendance by Day</CardTitle>
                    <CardDescription>Attendance rate over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={attendanceReportQuery.data?.attendanceByDay || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 100]} />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === "rate") return [`${value.toFixed(1)}%`, "Attendance Rate"];
                              return [value, name === "total" ? "Total Sessions" : "Attended"];
                            }}
                            labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="total" name="Total Sessions" fill="#8884d8" />
                          <Bar yAxisId="left" dataKey="attended" name="Attended" fill="#82ca9d" />
                          <Line yAxisId="right" type="monotone" dataKey="rate" name="Attendance Rate" stroke="#ff7300" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Attendance by Camp</CardTitle>
                    <CardDescription>Camps with highest attendance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Camp Name</th>
                            <th className="pb-2 text-right">Sessions</th>
                            <th className="pb-2 text-right">Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(attendanceReportQuery.data?.attendanceByCamp || [])
                            .sort((a, b) => b.rate - a.rate)
                            .map((camp) => (
                              <tr key={camp.campId} className="border-b last:border-0">
                                <td className="py-2 truncate max-w-[200px]">
                                  {camp.campName}
                                </td>
                                <td className="py-2 text-right">{camp.total}</td>
                                <td className="py-2 text-right">
                                  {formatPercentage(camp.rate)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
