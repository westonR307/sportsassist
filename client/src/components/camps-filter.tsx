import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  X, 
  Filter, 
  Calendar,
  Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CampFilterValues {
  search?: string;
  status?: 'active' | 'upcoming' | 'past' | 'cancelled' | 'all';
  type?: 'one_on_one' | 'group' | 'team' | 'virtual' | 'all' | 'any';
  includeDeleted?: boolean;
}

interface CampsFilterProps {
  filters: CampFilterValues;
  onFilterChange: (filters: CampFilterValues) => void;
  activeFilterCount: number;
  className?: string;
}

export function CampsFilter({ 
  filters, 
  onFilterChange, 
  activeFilterCount,
  className
}: CampsFilterProps) {
  // Create a temporary state for filters within the popover
  const [tempFilters, setTempFilters] = React.useState<CampFilterValues>(filters);
  
  // Track popover open state
  const [open, setOpen] = React.useState(false);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...filters, search: e.target.value };
    onFilterChange(newFilters);
  };
  
  // Update temp filters when main filters change
  React.useEffect(() => {
    setTempFilters(filters);
  }, [filters]);
  
  // Handle temp filter changes
  const handleTempFilterChange = (key: keyof CampFilterValues, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Apply filters from popover
  const applyFilters = () => {
    onFilterChange(tempFilters);
    setOpen(false);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const emptyFilters: CampFilterValues = {
      search: '',
      status: 'all',
      type: 'any',
      includeDeleted: false
    };
    setTempFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setOpen(false);
  };
  
  // Clear a specific filter
  const clearFilter = (key: keyof CampFilterValues) => {
    const newFilters = { ...filters };
    if (key === 'search') {
      newFilters.search = '';
    } else if (key === 'status') {
      newFilters.status = 'all';
    } else if (key === 'type') {
      newFilters.type = 'any';
    } else if (key === 'includeDeleted') {
      newFilters.includeDeleted = false;
    }
    onFilterChange(newFilters);
  };
  
  // Format the filter type for display
  const formatFilterType = (type: string): string => {
    const types: Record<string, string> = {
      'one_on_one': 'One-on-One',
      'group': 'Group',
      'team': 'Team',
      'virtual': 'Virtual'
    };
    return types[type] || type;
  };
  
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center space-x-2">
        {/* Search input */}
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search camps..."
            className="pl-9"
            value={filters.search || ''}
            onChange={handleSearchChange}
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1.5 h-6 w-6 p-0"
              onClick={() => clearFilter('search')}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        
        {/* Filter button/popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filter Camps</h4>
              
              {/* Status filter */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Label htmlFor="status-filter">Status</Label>
                </div>
                <Select
                  value={tempFilters.status || 'all'}
                  onValueChange={(value) => handleTempFilterChange('status', value)}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Type filter */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Label htmlFor="type-filter">Type</Label>
                </div>
                <Select
                  value={tempFilters.type || 'any'}
                  onValueChange={(value) => handleTempFilterChange('type', value)}
                >
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All types</SelectItem>
                    <SelectItem value="one_on_one">One-on-One</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Include deleted switch */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox" 
                  id="include-deleted"
                  checked={tempFilters.includeDeleted || false}
                  onChange={(e) => handleTempFilterChange('includeDeleted', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="include-deleted">Show deleted camps</Label>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset All
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Active filter badges */}
    </div>
  );
}