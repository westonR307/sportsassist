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
  status?: 'active' | 'upcoming' | 'past' | 'cancelled' | null;
  type?: 'one_on_one' | 'group' | 'team' | 'virtual' | null;
  includeDeleted?: boolean;
}

interface CampsFilterProps {
  filters: CampFilterValues;
  onFilterChange: (filters: CampFilterValues) => void;
  className?: string;
}

export function CampsFilter({ 
  filters, 
  onFilterChange, 
  className
}: CampsFilterProps) {
  const [tempFilters, setTempFilters] = React.useState<CampFilterValues>(filters);
  const [open, setOpen] = React.useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...filters, search: e.target.value };
    onFilterChange(newFilters);
  };

  React.useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const handleTempFilterChange = (key: keyof CampFilterValues, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters: CampFilterValues = {
      search: '',
      status: null,
      type: null,
      includeDeleted: false
    };
    setTempFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setOpen(false);
  };

  const clearFilter = (key: keyof CampFilterValues) => {
    const newFilters = { ...filters };
    if (key === 'search') {
      newFilters.search = '';
    } else if (key === 'status') {
      newFilters.status = null;
    } else if (key === 'type') {
      newFilters.type = null;
    } else if (key === 'includeDeleted') {
      newFilters.includeDeleted = false;
    }
    onFilterChange(newFilters);
  };

  const formatFilterType = (type: string): string => {
    const types: Record<string, string> = {
      'one_on_one': 'One-on-One',
      'group': 'Group',
      'team': 'Team',
      'virtual': 'Virtual'
    };
    return types[type] || type;
  };

  // Count active filters to show in the filter UI
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search && filters.search.trim() !== '') count++;
    if (filters.status && filters.status !== 'all' && filters.status !== null) count++;
    if (filters.type && filters.type !== 'any' && filters.type !== null) count++;
    if (filters.includeDeleted === true) count++;
    return count;
  }, [filters]);

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center space-x-2">
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

              <div className="space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Label htmlFor="status-filter">Status</Label>
                </div>
                <Select
                  value={tempFilters.status || ""}
                  onValueChange={(value) => handleTempFilterChange('status', value || null)}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Label htmlFor="type-filter">Type</Label>
                </div>
                <Select
                  value={tempFilters.type || ""}
                  onValueChange={(value) => handleTempFilterChange('type', value || null)}
                >
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="one_on_one">One-on-One</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
    </div>
  );
}