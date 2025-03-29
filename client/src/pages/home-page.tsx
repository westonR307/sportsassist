import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Camp, CampSport } from "@shared/schema";

// Extended Camp type with additional properties from the API
interface ExtendedCamp extends Camp {
  campSports?: CampSport[];
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  location?: string; // Computed property for display purposes
}
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowRight, 
  User, 
  ChevronRight, 
  Laptop,
  SlidersHorizontal,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { skillLevelNames } from "@shared/sports-utils";
import { getSportName } from "@shared/sports-utils";
import { sportsList, sportsMap } from "@shared/sports-utils";

export default function HomePage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading: isUserLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showVirtualOnly, setShowVirtualOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("startDate");
  const [isMobile, setIsMobile] = useState(false);

  // Check if on mobile on component mount
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Fetch all camps, even for unauthenticated users
  const { data: camps = [], isLoading } = useQuery<ExtendedCamp[]>({
    queryKey: ["/api/public/camps"],
  });

  // Get today's date
  const now = new Date();
  
  // Filter out past camps (end date before today)
  const availableCamps = camps.filter(camp => 
    new Date(camp.endDate) >= now && 
    (camp.visibility === "public" || (user && camp.organizationId === user.organizationId))
  );

  // Apply search and filters
  const filteredCamps = availableCamps.filter(camp => {
    // Search query filter
    const matchesSearch = searchQuery === "" || 
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Sport filter
    const hasSport = selectedSport === "" || selectedSport === "any" || 
      (camp.campSports && camp.campSports.some(cs => cs.sportId && cs.sportId.toString() === selectedSport));
    
    // Skill level filter
    const hasSkillLevel = selectedSkillLevel === "" || selectedSkillLevel === "any" || 
      (camp.campSports && camp.campSports.some(cs => cs.skillLevel === selectedSkillLevel));
    
    // State filter
    const matchesState = selectedState === "" || selectedState === "any" || camp.state === selectedState;
    
    // City filter
    const matchesCity = selectedCity === "" || selectedCity === "any" || camp.city.toLowerCase().includes(selectedCity.toLowerCase());
    
    // Camp type filter
    const matchesType = selectedType === "" || selectedType === "any" || camp.type === selectedType;
    
    // Age range filter
    const matchesAgeRange = selectedAgeRange === "" || selectedAgeRange === "any" || 
      (camp.minAge && camp.maxAge && ((
        // Handle different age bracket formats
        selectedAgeRange.includes("-") ? 
          // For ranges like "5-8"
          (() => {
            const [min, max] = selectedAgeRange.split("-").map(Number);
            return (camp.minAge <= max && camp.maxAge >= min);
          })() :
          // For ranges like "16+" (16 and above)
          (() => {
            const min = parseInt(selectedAgeRange);
            return !isNaN(min) && camp.minAge <= min;
          })()
      )));
    
    // Virtual only filter
    const matchesVirtual = !showVirtualOnly || camp.type === "virtual";
    
    return matchesSearch && hasSport && hasSkillLevel && matchesState && 
           matchesCity && matchesType && matchesAgeRange && matchesVirtual;
  });

  // Sort the camps
  const sortedCamps = [...filteredCamps].sort((a, b) => {
    if (sortBy === "startDate") {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "price") {
      // This would need actual price data
      return 0;
    }
    return 0;
  });

  // Get unique states from available camps
  const availableStates = Array.from(
    new Set(availableCamps.map(camp => camp.state))
  ).sort();

  // Get unique cities from filtered (by state) camps
  const availableCities = Array.from(
    new Set(
      availableCamps
        .filter(camp => selectedState === "" || camp.state === selectedState)
        .map(camp => camp.city)
    )
  ).sort();

  // Get unique sports from available camps
  const availableSports = Array.from(
    new Set(
      availableCamps
        .flatMap(camp => camp.campSports || [])
        .filter(cs => cs.sportId !== null)
        .map(cs => cs.sportId as number)
    )
  );

  const ageBrackets = [
    { value: "5-8", label: "5-8 years" },
    { value: "9-12", label: "9-12 years" },
    { value: "13-15", label: "13-15 years" },
    { value: "16-18", label: "16+ years" },
  ];

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedSport("");
    setSelectedSkillLevel("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedAgeRange("");
    setSelectedType("");
    setShowVirtualOnly(false);
  };

  const handleRegisterClick = (campId: number) => {
    if (!user) {
      // Redirect to auth page with return URL
      setLocation(`/auth?returnTo=/dashboard/camps/${campId}`);
    } else {
      // Directly go to camp details
      setLocation(`/dashboard/camps/${campId}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Find the Perfect Sports Camp for Your Athlete
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Browse hundreds of sports camps tailored to your athlete's interests, skill level, and location. From beginners to advanced players, we have options for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-semibold" asChild>
                <a href="#camps">Browse Camps</a>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="font-semibold" asChild>
                  <Link href="/auth">Sign Up</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section id="camps" className="container mx-auto px-4 py-12">
        <div className="flex flex-col">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Available Camps</h2>
          
          {/* Desktop Search & Filter Bar */}
          <div className="hidden md:flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search camps..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Sports</SelectItem>
                {availableSports.map(sportId => (
                  <SelectItem key={sportId} value={sportId.toString()}>
                    {sportId !== null ? getSportName(sportId) : "Unknown Sport"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All States</SelectItem>
                {availableStates.map(state => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>More Filters</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px]">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <h4 className="font-medium">Skill Level</h4>
                    <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Level</SelectItem>
                        <SelectItem value="beginner">{skillLevelNames.beginner}</SelectItem>
                        <SelectItem value="intermediate">{skillLevelNames.intermediate}</SelectItem>
                        <SelectItem value="advanced">{skillLevelNames.advanced}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedState && (
                    <div className="grid gap-2">
                      <h4 className="font-medium">City</h4>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any City</SelectItem>
                          {availableCities.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <h4 className="font-medium">Age Group</h4>
                    <Select value={selectedAgeRange} onValueChange={setSelectedAgeRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Age" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Age</SelectItem>
                        {ageBrackets.map(bracket => (
                          <SelectItem key={bracket.value} value={bracket.value}>
                            {bracket.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <h4 className="font-medium">Camp Type</h4>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
                        <SelectItem value="one_on_one">One-on-One</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
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
                  
                  <Button 
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Mobile Search & Filter UI */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search camps..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1 flex justify-between items-center">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Filters</span>
                    </div>
                    {(selectedSport || selectedSkillLevel || selectedState || 
                     selectedCity || selectedType || selectedAgeRange || showVirtualOnly) && (
                      <Badge variant="secondary" className="ml-2">
                        {[
                          selectedSport && "Sport",
                          selectedSkillLevel && "Level",
                          selectedState && "State",
                          selectedCity && "City",
                          selectedType && "Type",
                          selectedAgeRange && "Age",
                          showVirtualOnly && "Virtual"
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Filter Camps</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="sport">
                        <AccordionTrigger>Sport</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <Button 
                              variant={selectedSport === "" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSport("")}
                              className="justify-start"
                            >
                              All Sports
                            </Button>
                            {availableSports.map(sportId => (
                              <Button 
                                key={sportId}
                                variant={selectedSport === sportId.toString() ? "secondary" : "outline"} 
                                onClick={() => setSelectedSport(sportId.toString())}
                                className="justify-start"
                              >
                                {sportId !== null ? getSportName(sportId) : "Unknown Sport"}
                              </Button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="skill">
                        <AccordionTrigger>Skill Level</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <Button 
                              variant={selectedSkillLevel === "" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSkillLevel("")}
                              className="justify-start"
                            >
                              Any Level
                            </Button>
                            <Button 
                              variant={selectedSkillLevel === "beginner" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSkillLevel("beginner")}
                              className="justify-start"
                            >
                              {skillLevelNames.beginner}
                            </Button>
                            <Button 
                              variant={selectedSkillLevel === "intermediate" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSkillLevel("intermediate")}
                              className="justify-start"
                            >
                              {skillLevelNames.intermediate}
                            </Button>
                            <Button 
                              variant={selectedSkillLevel === "advanced" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSkillLevel("advanced")}
                              className="justify-start"
                            >
                              {skillLevelNames.advanced}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="location">
                        <AccordionTrigger>Location</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <h4 className="font-medium">State</h4>
                              <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any State" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Any State</SelectItem>
                                  {availableStates.map(state => (
                                    <SelectItem key={state} value={state}>
                                      {state}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {selectedState && (
                              <div className="space-y-2">
                                <h4 className="font-medium">City</h4>
                                <Select value={selectedCity} onValueChange={setSelectedCity}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Any City" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any City</SelectItem>
                                    {availableCities.map(city => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="type">
                        <AccordionTrigger>Camp Type</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <Button 
                              variant={selectedType === "" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("")}
                              className="justify-start"
                            >
                              Any Type
                            </Button>
                            <Button 
                              variant={selectedType === "one_on_one" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("one_on_one")}
                              className="justify-start"
                            >
                              One-on-One
                            </Button>
                            <Button 
                              variant={selectedType === "group" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("group")}
                              className="justify-start"
                            >
                              Group
                            </Button>
                            <Button 
                              variant={selectedType === "team" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("team")}
                              className="justify-start"
                            >
                              Team
                            </Button>
                            <Button 
                              variant={selectedType === "virtual" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("virtual")}
                              className="justify-start"
                            >
                              Virtual
                            </Button>
                          </div>
                          <div className="flex items-center mt-4 space-x-2">
                            <Checkbox 
                              id="mobile-virtual-only" 
                              checked={showVirtualOnly}
                              onCheckedChange={(checked) => setShowVirtualOnly(checked === true)}
                            />
                            <Label htmlFor="mobile-virtual-only" className="flex items-center">
                              <Laptop className="mr-2 h-4 w-4" />
                              Virtual Camps Only
                            </Label>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="age">
                        <AccordionTrigger>Age Group</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <Button 
                              variant={selectedAgeRange === "" ? "secondary" : "outline"} 
                              onClick={() => setSelectedAgeRange("")}
                              className="justify-start"
                            >
                              Any Age
                            </Button>
                            {ageBrackets.map(bracket => (
                              <Button 
                                key={bracket.value}
                                variant={selectedAgeRange === bracket.value ? "secondary" : "outline"} 
                                onClick={() => setSelectedAgeRange(bracket.value)}
                                className="justify-start"
                              >
                                {bracket.label}
                              </Button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="flex gap-2 mt-6">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </Button>
                      <SheetClose asChild>
                        <Button className="flex-1">Apply Filters</Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" defaultValue="startDate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startDate">Start Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Applied Filters Display (Desktop) */}
          {(selectedSport || selectedSkillLevel || selectedState || 
            selectedCity || selectedType || selectedAgeRange || showVirtualOnly) && (
            <div className="hidden md:flex flex-wrap gap-2 mb-6">
              <div className="text-sm font-medium mr-2 flex items-center">
                Active Filters:
              </div>
              {selectedSport && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>Sport: {getSportName(parseInt(selectedSport))}</span>
                  <button 
                    onClick={() => setSelectedSport("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedSkillLevel && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>Level: {skillLevelNames[selectedSkillLevel]}</span>
                  <button 
                    onClick={() => setSelectedSkillLevel("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedState && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>State: {selectedState}</span>
                  <button 
                    onClick={() => setSelectedState("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedCity && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>City: {selectedCity}</span>
                  <button 
                    onClick={() => setSelectedCity("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedType && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>Type: {selectedType.replace("_", " ")}</span>
                  <button 
                    onClick={() => setSelectedType("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {selectedAgeRange && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>Age: {ageBrackets.find(b => b.value === selectedAgeRange)?.label}</span>
                  <button 
                    onClick={() => setSelectedAgeRange("")}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              {showVirtualOnly && (
                <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span>Virtual Only</span>
                  <button 
                    onClick={() => setShowVirtualOnly(false)}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Camps Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading camps...</p>
              </div>
            </div>
          ) : sortedCamps.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedCamps.map((camp) => (
                <CampCard 
                  key={camp.id} 
                  camp={camp} 
                  onRegisterClick={() => handleRegisterClick(camp.id)}
                  isAuthenticated={!!user}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8">
              <Calendar size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No matching camps found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {searchQuery || selectedSport || selectedSkillLevel || selectedState || 
                  selectedCity || selectedType || selectedAgeRange || showVirtualOnly
                  ? "Try adjusting your filters to find more camps."
                  : "There are no upcoming camps available at this time. Check back later for new opportunities."}
              </p>
              {(searchQuery || selectedSport || selectedSkillLevel || selectedState || 
                selectedCity || selectedType || selectedAgeRange || showVirtualOnly) && (
                <Button 
                  variant="outline"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      {!user && (
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Register for a Camp?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Sign up today to register your athletes and manage their sports activities all in one place.
              </p>
              <Button size="lg" asChild>
                <Link href="/auth">Create Your Account</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">SportsAssist</h3>
              <p className="text-muted-foreground">
                The premier platform for sports camp management and registration.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
                <li><Link href="#camps" className="text-muted-foreground hover:text-foreground">Browse Camps</Link></li>
                {!user ? (
                  <>
                    <li><Link href="/auth" className="text-muted-foreground hover:text-foreground">Sign In</Link></li>
                    <li><Link href="/auth" className="text-muted-foreground hover:text-foreground">Register</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link></li>
                    <li><Link href="/dashboard/my-athletes" className="text-muted-foreground hover:text-foreground">My Athletes</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Popular Sports</h4>
              <ul className="space-y-2">
                {sportsList.slice(0, 5).map(sport => (
                  <li key={sport}>
                    <button 
                      onClick={() => {
                        setSelectedSport(sportsMap[sport]?.toString() || "");
                        if (location !== '/') {
                          setLocation('/');
                        }
                        document.getElementById('camps')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {sport}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>support@sportsassist.io</li>
                <li>1-800-SPORTS-1</li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="text-center text-muted-foreground text-sm">
            © {new Date().getFullYear()} SportsAssist. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

interface CampCardProps {
  camp: ExtendedCamp;
  onRegisterClick: () => void;
  isAuthenticated: boolean;
}

function CampCard({ camp, onRegisterClick, isAuthenticated }: CampCardProps) {  
  const isVirtual = camp.type === "virtual";
  const now = new Date();
  const startDate = new Date(camp.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Show "Starting soon" badge if camp starts within 7 days
  const showStartingSoon = daysUntilStart <= 7 && daysUntilStart > 0;
  
  // Check if camp is featured
  const isFeatured = camp.visibility === "public" && camp.type !== "virtual";
  
  return (
    <Card className={`overflow-hidden ${isFeatured ? 'border-primary/50 shadow-md' : ''}`}>
      {isFeatured && (
        <div className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium flex items-center justify-center">
          <Sparkles className="h-3 w-3 mr-1" />
          Featured Camp
        </div>
      )}
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
                {sport.sportId !== null ? getSportName(sport.sportId) : "Unknown Sport"} ({skillLevelNames[sport.skillLevel]})
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
                <span className="text-sm text-muted-foreground truncate max-w-[230px]">
                  {camp.location}
                </span>
                <span className="text-sm text-muted-foreground">
                  {camp.city}, {camp.state}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Type</span>
              <span className="text-sm text-muted-foreground capitalize">
                {camp.type.replace("_", " ")}
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
        <Button 
          variant="default" 
          className="w-full flex items-center gap-2" 
          onClick={onRegisterClick}
        >
          <span>{isAuthenticated ? "View Details" : "Register"}</span>
          {isAuthenticated ? <ArrowRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}