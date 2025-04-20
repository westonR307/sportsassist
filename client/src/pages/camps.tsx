import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useRoute, useLocation as useWouterLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Loader2, 
  ShieldAlert, 
  Calendar, 
  Users, 
  CalendarOff, 
  ListChecks, 
  RefreshCw, 
  Trash2, 
  Edit,
  Clock,
  Map,
  User,
  ChevronDown
} from 'lucide-react';
import { GiBaseballBat } from 'react-icons/gi';
import { Camp } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { FlipCard } from '@/components/ui/flip-card';
import { AddCampDialog } from '@/components/add-camp-dialog';
import { CampsFilter, CampFilterValues } from '@/components/camps-filter';
import { CampScheduleSummary } from '@/components/camp-schedule';
import { formatCurrency } from '@/lib/utils';
import { SkillLevelBadge } from '@/components/skill-level-badge';
import { format } from 'date-fns';

interface CampWithPermissions extends Camp {
  permissions?: {
    canManage: boolean;
  }
  schedules?: any[]; // Add schedules property for the CampScheduleSummary component
}

export default function CampsPage() {
  // Check URL for showAddDialog parameter
  const [, params] = useRoute('/dashboard/camps');
  const urlParams = new URLSearchParams(window.location.search);
  const shouldShowDialog = urlParams.get('showAddDialog') === 'true';
  const [location, navigate] = useWouterLocation();

  const [showAddCampDialog, setShowAddCampDialog] = React.useState(shouldShowDialog);

  // Set up filter state
  const [filters, setFilters] = React.useState<CampFilterValues>({
    search: '',
    status: '',
    type: '',
    includeDeleted: false
  });

  // Count active filters to show in the filter UI
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.type) count++;
    if (filters.includeDeleted) count++;
    return count;
  }, [filters]);

  // Effect to clear the URL parameter after the dialog is shown
  React.useEffect(() => {
    if (shouldShowDialog) {
      // Clear the URL parameter
      navigate('/dashboard/camps', { replace: true });
    }
  }, [shouldShowDialog, navigate]);

  const { user } = useAuth();

  // Get organization data for the logged-in user
  const { data: organizationData } = useQuery<{
    id: number;
    name: string;
    primary_color?: string;
    primaryColor?: string;
    secondary_color?: string;
    secondaryColor?: string;
  }>({
    queryKey: [`/api/organizations/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });

  // Extract organization colors, preferring snake_case but falling back to camelCase
  const primaryColor = organizationData?.primary_color || organizationData?.primaryColor || '#000000';
  const secondaryColor = organizationData?.secondary_color || organizationData?.secondaryColor || '#c89b63';

  // Build the query URL with filter parameters
  const queryUrl = React.useMemo(() => {
    const url = new URL("/api/camps", window.location.origin);
    
    if (filters.search) url.searchParams.append('search', filters.search);
    if (filters.status) url.searchParams.append('status', filters.status);
    if (filters.type) url.searchParams.append('type', filters.type);
    if (filters.includeDeleted) url.searchParams.append('includeDeleted', 'true');

    return url.pathname + url.search;
  }, [filters]);

  // Update the query key when filters change
  const { data: camps, isLoading } = useQuery<CampWithPermissions[]>({
    queryKey: [queryUrl],
    staleTime: 5000, // Only refetch after 5 seconds
    refetchOnWindowFocus: false,
  });

  // Check if user is a camp creator or manager who can create camps
  const canCreateCamps = user && ['camp_creator', 'manager'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <GiBaseballBat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Camps</h1>
        </div>
        {canCreateCamps ? (
          <Button onClick={() => setShowAddCampDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Camp
          </Button>
        ) : (
          <div className="flex items-center text-muted-foreground text-sm">
            <ShieldAlert className="h-4 w-4 mr-2" />
            <span>View only mode</span>
          </div>
        )}
      </div>

      {/* Camp filters */}
      <CampsFilter 
        filters={filters}
        onFilterChange={setFilters}
        activeFilterCount={activeFilterCount}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !camps || camps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No camps {canCreateCamps ? 'created yet' : 'available'}</p>
            {canCreateCamps ? (
              <Button onClick={() => setShowAddCampDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first camp
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground max-w-md text-center">
                <p>You don't have permission to create camps.</p>
                <p className="mt-2">Contact an organization admin if you need to create a new camp.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {camps.map((camp, index) => {
            // Check if user can manage this specific camp
            const canManageCamp = camp.permissions?.canManage || false;
            
            // Calculate date ranges and format for better display
            const now = new Date();
            const startDate = new Date(camp.startDate);
            const endDate = new Date(camp.endDate);
            const regStartDate = new Date(camp.registrationStartDate);
            const regEndDate = new Date(camp.registrationEndDate);
            
            // Check camp status
            const isActive = startDate <= now && endDate >= now;
            const isUpcoming = startDate > now;
            const isPast = endDate < now;
            const isRegOpen = regStartDate <= now && regEndDate >= now;
            
            // Determine the status badge text and color
            let statusBadge;
            if (camp.deleted) {
              statusBadge = <Badge variant="destructive">Deleted</Badge>;
            } else if (isActive) {
              statusBadge = <Badge variant="default">Active</Badge>;
            } else if (isUpcoming) {
              statusBadge = <Badge variant="secondary">Upcoming</Badge>;
            } else if (isPast) {
              statusBadge = <Badge variant="outline">Past</Badge>;
            }
            
            // Registration status badge
            const registrationBadge = isRegOpen ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                Registration Open
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Registration {regStartDate > now ? 'Opens Soon' : 'Closed'}
              </Badge>
            );
            
            // Create the card front with improved design
            const frontCard = (
              <Card className="h-full overflow-hidden" data-camp-id={camp.id}>
                {/* Card header with colored band based on camp status */}
                <div 
                  className="h-1.5" 
                  style={{ 
                    backgroundColor: isActive ? primaryColor : 
                                    isUpcoming ? primaryColor : 
                                    '#94a3b8'
                  }}
                ></div>
                
                <CardContent className="p-3 pt-3 h-full flex flex-col">
                  <div className="mb-2 flex justify-between items-start">
                    <h3 className="font-semibold line-clamp-2 flex-1">{camp.name}</h3>
                    
                    {/* Display virtual badge next to camp name if applicable */}
                    {camp.isVirtual && (
                      <Badge variant="outline" className="ml-1 text-xs flex items-center gap-1">
                        <span className="hidden sm:inline">Virtual</span>
                      </Badge>
                    )}
                  </div>
                  
                  {/* Camp schedule type and registration status badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {statusBadge}
                    <Badge 
                      variant="outline" 
                      className="text-xs flex items-center gap-1"
                    >
                      {camp.schedulingType === "fixed" ? (
                        <>
                          <Calendar className="h-3 w-3" />
                          <span>Fixed Schedule</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>Availability-based</span>
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="mt-1 space-y-1.5 text-sm flex-1">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      <span>
                        {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-muted-foreground">
                      <Map className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      <span className="truncate">
                        {camp.isVirtual ? 'Online' : (camp.city && camp.state ? `${camp.city}, ${camp.state}` : 'Location TBD')}
                      </span>
                    </div>
                    
                    {/* Improved capacity display showing spots taken vs total */}
                    <div className="flex items-center">
                      <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${(camp.registeredCount || 0) >= camp.capacity ? 'text-red-600' : 'text-green-600'}`}>
                          {camp.registeredCount || 0}/{camp.capacity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(camp.registeredCount || 0) >= camp.capacity ? 'Full' : 'Spots'}
                        </span>
                        
                        {/* Show capacity progress bar */}
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full ml-1">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${Math.min(((camp.registeredCount || 0) / camp.capacity) * 100, 100)}%`,
                              backgroundColor: (camp.registeredCount || 0) >= camp.capacity ? '#dc2626' : '#16a34a'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <SkillLevelBadge level={camp.skillLevel} />
                    <span className="font-bold">{formatCurrency(camp.price)}</span>
                  </div>
                  
                  <div className="mt-2">
                    <Button 
                      className="w-full text-xs h-8"
                      onClick={() => navigate(camp.slug 
                        ? `/dashboard/camps/slug/${camp.slug}` 
                        : `/dashboard/camps/${camp.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            
            // Create the card back with more detailed information
            const backCard = (
              <Card className="h-full overflow-hidden" data-camp-id={camp.id}>
                {/* Card header with colored band based on camp status */}
                <div 
                  className="h-1.5" 
                  style={{ 
                    backgroundColor: isActive ? primaryColor : 
                                    isUpcoming ? primaryColor : 
                                    '#94a3b8'
                  }}
                ></div>
                
                <CardContent className="p-3 pt-3 flex flex-col h-full">
                  <div className="mb-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold mb-1 line-clamp-1">{camp.name}</h3>
                      {camp.isVirtual && (
                        <Badge variant="outline" className="ml-1 text-xs">Virtual</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1 mb-2">
                      {statusBadge}
                      {registrationBadge}
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-1.5 flex-1 overflow-hidden">
                    {/* Show camp description if available */}
                    {camp.description && (
                      <p className="text-muted-foreground overflow-hidden line-clamp-2 mb-2">
                        {camp.description}
                      </p>
                    )}
                    
                    {/* Registration capacity */}
                    <div className="flex items-center mt-1.5">
                      <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
                      <div className="w-full">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>Registration capacity</span>
                          <span className="font-medium">{camp.registeredCount || 0}/{camp.capacity}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full">
                          <div 
                            className="h-full rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${Math.min(((camp.registeredCount || 0) / camp.capacity) * 100, 100)}%`,
                              backgroundColor: (camp.registeredCount || 0) >= camp.capacity ? '#dc2626' : '#16a34a'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Camp type info */}
                    <div className="flex items-center justify-between mt-1.5 text-muted-foreground">
                      <div className="flex items-center">
                        <Map className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span>
                          {camp.isVirtual ? 'Online' : (camp.city && camp.state ? `${camp.city}, ${camp.state}` : 'Location TBD')}
                        </span>
                      </div>
                      <span className="font-medium">{formatCurrency(camp.price)}</span>
                    </div>
                    
                    {/* Show upcoming sessions if available */}
                    {camp.schedules && camp.schedules.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-gray-100">
                        <p className="font-medium text-xs mb-1 flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          Schedule:
                        </p>
                        <CampScheduleSummary 
                          camp={camp} 
                          maxSessions={2} 
                          className="text-muted-foreground" 
                        />
                      </div>
                    )}
                    
                    {/* Show scheduling type if no sessions */}
                    {(!camp.schedules || camp.schedules.length === 0) && (
                      <div className="mt-2 pt-1.5 border-t border-gray-100">
                        <p className="font-medium text-xs mb-1 flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          Scheduling: {camp.schedulingType === "fixed" ? "Fixed schedule" : "Availability-based"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                    {/* Edit Camp Button (only for camps user can manage) */}
                    {canManageCamp && (
                      <Button 
                        variant="outline" 
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/camps/${camp.id}/edit`);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    {/* View Details Button */}
                    <Button 
                      className={`text-xs h-7 ${canManageCamp ? '' : 'col-span-2'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(camp.slug 
                          ? `/dashboard/camps/slug/${camp.slug}` 
                          : `/dashboard/camps/${camp.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            
            // Return the flip card with both sides defined
            return (
              <div key={`camp-${camp.id}`} className="h-[240px]">
                <FlipCard
                  front={frontCard}
                  back={backCard}
                  className={`rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 h-full ${!canManageCamp ? "opacity-90" : ""}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add Camp Dialog Component */}
      <AddCampDialog
        open={showAddCampDialog}
        onOpenChange={setShowAddCampDialog}
      />
    </div>
  );
}