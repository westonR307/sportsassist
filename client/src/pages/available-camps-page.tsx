import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, User, ArrowRight, Clock, MapPin, Search, Filter, 
  Laptop, Calendar as CalendarIcon, Banknote, Map, Calendar as CalIcon, 
  Users, ChevronDown, ChevronUp, Plus, DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Camp as BaseCamp, CampSport } from "@shared/schema";
import { skillLevelNames, getSportName } from "@shared/sports-utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extended camp type with additional properties returned from API
interface ExtendedCamp extends BaseCamp {
  campSports?: CampSport[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  location?: string;
}

export default function AvailableCampsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("all_sports");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("any_level");
  const [selectedType, setSelectedType] = useState<string>("any_type");
  const [selectedCity, setSelectedCity] = useState<string>("any_city");
  const [selectedState, setSelectedState] = useState<string>("any_state");
  const [showVirtualOnly, setShowVirtualOnly] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([5, 18]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  
  // Available states and cities from current camps
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  
  // Min-max prices from available camps
  const [priceMinMax, setPriceMinMax] = useState<[number, number]>([0, 1000]);

  const { data: camps = [], isLoading } = useQuery<ExtendedCamp[]>({
    queryKey: ["/api/camps"],
    enabled: !!user,
  });

  // Get today's date
  const now = new Date();
  
  // Filter out past camps (end date before today)
  const availableCamps = camps.filter(camp => 
    new Date(camp.endDate) >= now && 
    (camp.visibility === "public" || camp.organizationId === user?.organizationId)
  );
  
  // Initialize filter options from available camps 
  useEffect(() => {
    if (availableCamps.length > 0) {
      // Extract unique cities and states
      const cities = Array.from(new Set(availableCamps.map(camp => camp.city)));
      const states = Array.from(new Set(availableCamps.map(camp => camp.state)));
      
      // Calculate min and max prices
      const prices = availableCamps.map(camp => camp.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      setAvailableCities(cities);
      setAvailableStates(states);
      setPriceMinMax([minPrice, maxPrice]);
      setPriceRange([minPrice, maxPrice]);
    }
  }, [availableCamps]);

  // Apply search and filters
  const filteredCamps = availableCamps.filter(camp => {
    // Search query filter
    const matchesSearch = searchQuery === "" || 
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Sport filter
    const hasSport = selectedSport === "" || selectedSport === "all_sports" || 
      (camp.campSports && camp.campSports.some((cs: CampSport) => cs.sportId && cs.sportId.toString() === selectedSport));
    
    // Skill level filter
    const hasSkillLevel = selectedSkillLevel === "" || selectedSkillLevel === "any_level" || 
      (camp.campSports && camp.campSports.some((cs: CampSport) => cs.skillLevel === selectedSkillLevel));
    
    // Camp type filter
    const matchesType = selectedType === "" || selectedType === "any_type" || camp.type === selectedType;
    
    // City filter
    const matchesCity = selectedCity === "any_city" || camp.city === selectedCity;
    
    // State filter
    const matchesState = selectedState === "any_state" || camp.state === selectedState;
    
    // Age range filter
    const matchesAgeRange = 
      (camp.minAge <= ageRange[1] && camp.maxAge >= ageRange[0]);
    
    // Price range filter
    const matchesPrice = 
      (camp.price >= priceRange[0] && camp.price <= priceRange[1]);
    
    // Date range filter
    const matchesDateRange = 
      (!dateRange.startDate || new Date(camp.endDate) >= dateRange.startDate) &&
      (!dateRange.endDate || new Date(camp.startDate) <= dateRange.endDate);
      
    // Virtual only filter
    const matchesVirtual = !showVirtualOnly || camp.isVirtual;
    
    return matchesSearch && hasSport && hasSkillLevel && matchesType && 
           matchesCity && matchesState && matchesAgeRange && 
           matchesPrice && matchesDateRange && matchesVirtual;
  });

  // Get unique sports from available camps
  const availableSports = Array.from(
    new Set(
      availableCamps
        .flatMap(camp => camp.campSports || [])
        .map((cs: CampSport) => cs.sportId)
    )
  );
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(price);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Available Camps</h1>
            <p className="text-muted-foreground mt-1">
              Browse and register for upcoming sports camps
            </p>
          </div>

          <Separator />

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search camps..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap gap-2">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_sports">All Sports</SelectItem>
                  {availableSports.filter(sportId => sportId !== null).map(sportId => (
                    <SelectItem key={sportId} value={sportId.toString()}>
                      {getSportName(sportId as number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Skill Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_level">Any Level</SelectItem>
                  <SelectItem value="beginner">{skillLevelNames.beginner}</SelectItem>
                  <SelectItem value="intermediate">{skillLevelNames.intermediate}</SelectItem>
                  <SelectItem value="advanced">{skillLevelNames.advanced}</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    <span>More Filters</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="grid gap-4">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="camp-type">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Camp Type</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            <Select value={selectedType} onValueChange={setSelectedType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Any Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any_type">Any Type</SelectItem>
                                <SelectItem value="one_on_one">One-on-One</SelectItem>
                                <SelectItem value="group">Group</SelectItem>
                                <SelectItem value="team">Team</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <div className="flex items-center space-x-2 mt-3">
                              <Checkbox 
                                id="virtual-only" 
                                checked={showVirtualOnly}
                                onCheckedChange={(checked) => setShowVirtualOnly(checked === true)}
                              />
                              <Label htmlFor="virtual-only" className="flex items-center">
                                <Laptop className="mr-2 h-4 w-4" />
                                Virtual Camps Only
                              </Label>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="location">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Map className="h-4 w-4" />
                            <span>Location</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-3 pt-2">
                            <div className="space-y-1">
                              <Label>State</Label>
                              <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any State" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any_state">Any State</SelectItem>
                                  {availableStates.map(state => (
                                    <SelectItem key={state} value={state}>
                                      {state}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <Label>City</Label>
                              <Select value={selectedCity} onValueChange={setSelectedCity}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any City" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any_city">Any City</SelectItem>
                                  {availableCities.map(city => (
                                    <SelectItem key={city} value={city}>
                                      {city}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="age">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Age Range</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-4 px-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">{ageRange[0]} years</span>
                              <span className="text-sm">{ageRange[1]} years</span>
                            </div>
                            <Slider 
                              defaultValue={[5, 18]} 
                              value={ageRange}
                              onValueChange={(value) => setAgeRange(value as [number, number])}
                              min={3} 
                              max={21} 
                              step={1}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="price">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <span>Price Range</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-4 px-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">{formatPrice(priceRange[0])}</span>
                              <span className="text-sm">{formatPrice(priceRange[1])}</span>
                            </div>
                            <Slider 
                              defaultValue={priceMinMax} 
                              value={priceRange}
                              onValueChange={(value) => setPriceRange(value as [number, number])}
                              min={priceMinMax[0]} 
                              max={priceMinMax[1]} 
                              step={5}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading available camps...</p>
              </div>
            </div>
          ) : filteredCamps.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredCamps.map((camp) => (
                <CompactCampCard key={camp.id} camp={camp} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8 mt-6">
              <CalendarIcon size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No matching camps found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {searchQuery || selectedSport !== "all_sports" || selectedSkillLevel !== "any_level" || selectedType !== "any_type" || showVirtualOnly
                  ? "Try adjusting your filters to find more camps."
                  : "There are no upcoming camps available at this time. Check back later for new opportunities."}
              </p>
              {(searchQuery || selectedSport !== "all_sports" || selectedSkillLevel !== "any_level" || selectedType !== "any_type" || showVirtualOnly) && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSport("all_sports");
                    setSelectedSkillLevel("any_level");
                    setSelectedType("any_type");
                    setShowVirtualOnly(false);
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface CampCardProps {
  camp: ExtendedCamp;
}

function CompactCampCard({ camp }: CampCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const isVirtual = camp.isVirtual;
  const now = new Date();
  const startDate = new Date(camp.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const showStartingSoon = daysUntilStart <= 7 && daysUntilStart > 0;
  
  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (campId: number) => {
      const res = await apiRequest("POST", `/api/camps/${campId}/register`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Successfully registered",
        description: "You have been registered for this camp",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register for this camp",
        variant: "destructive",
      });
    },
  });
  
  // Format dates
  const formatDateRange = () => {
    return `${format(new Date(camp.startDate), "MMM d")} - ${format(new Date(camp.endDate), "MMM d, yyyy")}`;
  };
  
  // Format time
  const formatTimeRange = () => {
    if (!camp.defaultStartTime && !camp.defaultEndTime) return "Schedule varies";
    
    return `${camp.defaultStartTime 
      ? format(new Date(`2000-01-01T${camp.defaultStartTime}`), "h:mm a") 
      : "TBD"} - 
    ${camp.defaultEndTime 
      ? format(new Date(`2000-01-01T${camp.defaultEndTime}`), "h:mm a") 
      : "TBD"}`;
  };
  
  // Handle registration
  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    registerMutation.mutate(camp.id);
  };
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full border rounded-md overflow-hidden bg-background shadow-sm hover:shadow transition-shadow"
    >
      <div className="p-4 cursor-pointer flex items-center" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
            <div className="flex-1">
              <div className="flex items-start">
                <h3 className="font-medium text-lg">{camp.name}</h3>
                {showStartingSoon && (
                  <Badge variant="destructive" className="ml-2 text-[10px] h-5">
                    Starting Soon
                  </Badge>
                )}
                {isVirtual && (
                  <Badge variant="outline" className="ml-2 flex items-center gap-1 h-5">
                    <Laptop className="h-3 w-3" />
                    <span>Virtual</span>
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap mt-1 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <span>{formatDateRange()}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(camp.price)}</span>
                </div>
                {!isVirtual && camp.location && (
                  <div className="flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    <span>{camp.city}, {camp.state}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {registerMutation.isPending ? 'Registering...' : 'Register'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Register for this camp</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          {/* Sport badges - visible even when collapsed */}
          {camp.campSports && camp.campSports.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {camp.campSports.map((sport: CampSport, index: number) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="text-xs"
                >
                  {sport.sportId ? getSportName(sport.sportId as number) : "Unknown"} ({skillLevelNames[sport.skillLevel]})
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
        
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2 border-t">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Camp Details</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Time</span>
                    <span className="text-xs text-muted-foreground">{formatTimeRange()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Type</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {camp.type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Age Range</span>
                    <span className="text-xs text-muted-foreground">
                      {camp.minAge} - {camp.maxAge} years old
                    </span>
                  </div>
                </div>
                
                {!isVirtual && camp.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">Location</span>
                      <span className="text-xs text-muted-foreground">{camp.location}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              {camp.description ? (
                <>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-xs text-muted-foreground">{camp.description}</p>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground italic">No additional information available</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" asChild>
              <a href={camp.slug ? `/dashboard/camps/slug/${camp.slug}` : `/dashboard/camps/${String(camp.id)}`} className="flex items-center gap-1">
                <span>View Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CampCard({ camp }: CampCardProps) {  
  const isVirtual = camp.isVirtual;
  const now = new Date();
  const startDate = new Date(camp.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Show "Starting soon" badge if camp starts within 7 days
  const showStartingSoon = daysUntilStart <= 7 && daysUntilStart > 0;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle className="flex-1">{camp.name}</CardTitle>
          {isVirtual && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Laptop className="h-3 w-3" />
              <span>Virtual</span>
            </Badge>
          )}
        </div>
        
        {/* Sport badges */}
        {camp.campSports && camp.campSports.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {camp.campSports.map((sport: CampSport, index: number) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="text-xs"
              >
                {sport.sportId ? getSportName(sport.sportId as number) : "Unknown"} ({skillLevelNames[sport.skillLevel]})
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Dates</span>
                {showStartingSoon && (
                  <Badge variant="destructive" className="text-[10px] h-5">Starting Soon</Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Time</span>
              <span className="text-sm text-muted-foreground">
                {camp.defaultStartTime 
                  ? format(new Date(`2000-01-01T${camp.defaultStartTime}`), "h:mm a") 
                  : "TBD"} - 
                {camp.defaultEndTime 
                  ? format(new Date(`2000-01-01T${camp.defaultEndTime}`), "h:mm a") 
                  : "TBD"}
              </span>
            </div>
          </div>
          
          {!isVirtual && camp.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Location</span>
                <span className="text-sm text-muted-foreground">{camp.location}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Type</span>
              <span className="text-sm text-muted-foreground capitalize">
                {camp.type.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          
          {camp.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
              {camp.description}
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button variant="default" className="w-full flex items-center gap-2" asChild>
          <a href={camp.slug ? `/dashboard/camps/slug/${camp.slug}` : `/dashboard/camps/${String(camp.id)}`}>
            <span>View Details</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}