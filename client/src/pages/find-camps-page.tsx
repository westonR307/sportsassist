import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Camp, CampSport } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
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
  Sparkles,
  List,
  Grid3X3,
  Users
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { skillLevelNames } from "@shared/sports-utils";
import { getSportName } from "@shared/sports-utils";
import { sportsList, sportsMap } from "@shared/sports-utils";

// Extended Camp type with additional properties from the API
interface ExtendedCamp extends Camp {
  campSports?: CampSport[];
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  location?: string; // Computed property for display purposes
  organization?: {
    id: number;
    name: string;
    logoUrl: string | null;
    slug: string | null;
  };
  coaches?: Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    profilePhoto: string | null;
    role: string;
  }>;
}

export default function FindCampsPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading: isUserLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("any");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("any");
  const [selectedState, setSelectedState] = useState<string>("any");
  const [selectedCity, setSelectedCity] = useState<string>("any");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("any");
  const [selectedType, setSelectedType] = useState<string>("any");
  const [showVirtualOnly, setShowVirtualOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("startDate");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCamp, setSelectedCamp] = useState<ExtendedCamp | null>(null);

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
      return a.price - b.price;
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
    setSelectedSport("any");
    setSelectedSkillLevel("any");
    setSelectedState("any");
    setSelectedCity("any");
    setSelectedAgeRange("any");
    setSelectedType("any");
    setShowVirtualOnly(false);
  };

  const handleRegisterClick = (campId: number, campSlug?: string | null) => {
    console.log("Navigating to camp details with:", campSlug ? `slug: ${campSlug}` : `ID: ${campId}`);

    // Determine the URL path based on whether we have a slug
    const campPath = campSlug 
      ? `/register/camp/slug/${campSlug}`
      : `/register/camp/${campId}`;

    if (!user) {
      // Redirect to auth page with return URL
      setLocation(`/auth?returnTo=${campPath}`);
    } else {
      // Directly go to camp details
      setLocation(campPath);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Search and Filters */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col">
          <div className="flex items-center mb-3">
            <BackButton to="/parent-dashboard" />
          </div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Find Camps</h2>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="hidden md:flex"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="hidden md:flex"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

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
                              variant={selectedSport === "any" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSport("any")}
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
                              variant={selectedSkillLevel === "any" ? "secondary" : "outline"} 
                              onClick={() => setSelectedSkillLevel("any")}
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
                              variant={selectedType === "any" ? "secondary" : "outline"} 
                              onClick={() => setSelectedType("any")}
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
                              variant={selectedAgeRange === "any" ? "secondary" : "outline"} 
                              onClick={() => setSelectedAgeRange("any")}
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

                      <AccordionItem value="sort">
                        <AccordionTrigger>Sort By</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2 py-2">
                            <Button 
                              variant={sortBy === "startDate" ? "secondary" : "outline"} 
                              onClick={() => setSortBy("startDate")}
                              className="justify-start"
                            >
                              Start Date
                            </Button>
                            <Button 
                              variant={sortBy === "name" ? "secondary" : "outline"} 
                              onClick={() => setSortBy("name")}
                              className="justify-start"
                            >
                              Name
                            </Button>
                            <Button 
                              variant={sortBy === "price" ? "secondary" : "outline"} 
                              onClick={() => setSortBy("price")}
                              className="justify-start"
                            >
                              Price
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-between items-center fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                      <Button 
                        variant="outline"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </Button>
                      <SheetClose asChild>
                        <Button>Apply Filters</Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <span>Sort</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>Sort Camps</SheetTitle>
                  </SheetHeader>
                  <div className="py-4 space-y-2">
                    <Button 
                      variant={sortBy === "startDate" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSortBy("startDate")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Start Date
                    </Button>
                    <Button 
                      variant={sortBy === "name" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSortBy("name")}
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Name
                    </Button>
                    <Button 
                      variant={sortBy === "price" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSortBy("price")}
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Price
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Applied Filters */}
          {(selectedSport || selectedSkillLevel || selectedState || 
            selectedCity || selectedType || selectedAgeRange || showVirtualOnly) && (
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="text-sm font-medium mb-1 mr-2 mt-1">Active filters:</div>
              {selectedSport && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Sport: {getSportName(Number(selectedSport))}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedSport("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedSkillLevel && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Level: {skillLevelNames[selectedSkillLevel as keyof typeof skillLevelNames]}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedSkillLevel("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedState && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>State: {selectedState}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedState("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedCity && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>City: {selectedCity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedCity("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedType && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Type: {selectedType.replace("_", " ")}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedType("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedAgeRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Age: {ageBrackets.find(b => b.value === selectedAgeRange)?.label}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedAgeRange("any")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {showVirtualOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Virtual Only</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setShowVirtualOnly(false)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {(selectedSport || selectedSkillLevel || selectedState || 
                selectedCity || selectedType || selectedAgeRange || showVirtualOnly) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={clearAllFilters}
                >
                  Clear All
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[300px] bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : sortedCamps.length ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCamps.map(camp => (
                  <CampCard 
                    key={camp.id} 
                    camp={camp} 
                    onRegisterClick={() => handleRegisterClick(camp.id, camp.slug)}
                    isAuthenticated={!!user}
                    onViewDetails={() => setSelectedCamp(camp)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {sortedCamps.map(camp => (
                  <CampListItem 
                    key={camp.id} 
                    camp={camp} 
                    onRegisterClick={() => handleRegisterClick(camp.id, camp.slug)}
                    isAuthenticated={!!user}
                    onViewDetails={() => setSelectedCamp(camp)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8">
              <Calendar size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Camps Found</h3>
              <p className="text-muted-foreground text-center max-wmd">
                We couldn'tfind any camps matching your search criteria. Try adjusting your filters or check back later.
              </p>
              <Button onClick={clearAllFilters}>Clear All Filters</Button>
            </div>
          )}
        </div>
      </section>

      {/* Camp Details Dialog */}
      <Dialog open={!!selectedCamp} onOpenChange={(open) => !open && setSelectedCamp(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 max-h-[80vh] overflow-y-auto">
          {selectedCamp && (
            <>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-bold">{selectedCamp.name}</DialogTitle>
                {selectedCamp.organization && (
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <span>Organized by: </span>
                    <Link 
                      to={`/organization/${selectedCamp.organization.slug || selectedCamp.organization.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="ml-1 font-medium text-primary hover:underline"
                      aria-label={`View ${selectedCamp.organization.name}'s profile`}
                    >
                      {selectedCamp.organization.name}
                    </Link>
                  </div>
                )}
                <DialogDescription className="flex flex-wrap gap-2 mt-2">
                  {selectedCamp.campSports && selectedCamp.campSports.length > 0 ? (
                    selectedCamp.campSports.map((sport, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10">
                        {sport.sportId ? getSportName(sport.sportId) : "Unknown"} - {sport.skillLevel ? skillLevelNames[sport.skillLevel as keyof typeof skillLevelNames] : "Any level"}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="bg-primary/10">
                      General - All levels
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 pt-2">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCamp.streetAddress}, {selectedCamp.city}, {selectedCamp.state} {selectedCamp.zipCode}
                      </p>
                      {selectedCamp.additionalLocationDetails && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedCamp.additionalLocationDetails}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Dates</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedCamp.startDate), "MMMM d, yyyy")} - {format(new Date(selectedCamp.endDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Times</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCamp.defaultStartTime ? format(new Date(`2022-01-01T${selectedCamp.defaultStartTime}`), "h:mm a") : "Varies"} - 
                        {selectedCamp.defaultEndTime ? format(new Date(`2022-01-01T${selectedCamp.defaultEndTime}`), "h:mm a") : "Varies"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Age Range</p>
                      <p className="text-sm text-muted-foreground">
                        Ages {selectedCamp.minAge} - {selectedCamp.maxAge}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {selectedCamp.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {selectedCamp.coaches && selectedCamp.coaches.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Coaches</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedCamp.coaches.map((coach: { id: number; firstName: string | null; lastName: string | null; profilePhoto: string | null; role: string }, index: number) => (
                            <div key={index} className="flex items-center gap-1">
                              <div className="relative h-6 w-6 rounded-full overflow-hidden bg-muted">
                                {coach.profilePhoto ? (
                                  <img
                                    src={coach.profilePhoto}
                                    alt={`${coach.firstName} ${coach.lastName}`}
                                    className="object-cover h-full w-full"
                                  />
                                ) : (
                                  <User className="h-4 w-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {coach.firstName} {coach.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedCamp.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    <p className="text-xl font-bold">${selectedCamp.price}</p>
                    <Button onClick={() => {
                      handleRegisterClick(selectedCamp.id, selectedCamp.slug);
                      setSelectedCamp(null);
                    }}>
                      Register Now
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CampCardProps {
  camp: ExtendedCamp;
  onRegisterClick: () => void;
  isAuthenticated: boolean;
  onViewDetails: () => void;
}

function CampCard({ camp, onRegisterClick, isAuthenticated, onViewDetails }: CampCardProps) {  
  const isVirtual = camp.type === "virtual";
  const now = new Date();
  const startDate = new Date(camp.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Show "Starting soon" badge if camp starts within 7 days
  const showStartingSoon = daysUntilStart <= 7 && daysUntilStart > 0;

  // Check if camp is featured
  const isFeatured = camp.visibility === "public" && camp.type !== "virtual";

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg font-bold line-clamp-1">{camp.name}</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {camp.campSports && camp.campSports.length > 0 ? (
                camp.campSports.map((sport, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/10 text-xs">
                    {sport.sportId ? getSportName(sport.sportId) : "Unknown"} - {sport.skillLevel ? skillLevelNames[sport.skillLevel as keyof typeof skillLevelNames] : "Any level"}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-xs">
                  General - All levels
                </Badge>
              )}
            </div>
          </div>
          {isFeatured && (
            <Badge className="ml-2 shrink-0" variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">
            {isVirtual ? "Online/Virtual" : `${camp.city}, ${camp.state}`}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d, yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {camp.defaultStartTime ? format(new Date(`2022-01-01T${camp.defaultStartTime}`), "h:mm a") : "Varies"} - 
            {camp.defaultEndTime ? format(new Date(`2022-01-01T${camp.defaultEndTime}`), "h:mm a") : "Varies"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Ages {camp.minAge} - {camp.maxAge}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground capitalize">
            {camp.type.replace("_", " ")}
          </span>
        </div>

        {camp.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
            {camp.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
        <div className="flex items-center">
          <p className="font-bold">${camp.price}</p>
          {showStartingSoon && (
            <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
              Starting Soon
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            Details
          </Button>
          <Button size="sm" onClick={onRegisterClick}>
            Register
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface CampListItemProps {
  camp: ExtendedCamp;
  onRegisterClick: () => void;
  isAuthenticated: boolean;
  onViewDetails: () => void;
}

function CampListItem({ camp, onRegisterClick, isAuthenticated, onViewDetails }: CampListItemProps) {
  const isVirtual = camp.type === "virtual";
  const now = new Date();
  const startDate = new Date(camp.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Show "Starting soon" badge if camp starts within 7 days
  const showStartingSoon = daysUntilStart <= 7 && daysUntilStart > 0;

  // Check if camp is featured
  const isFeatured = camp.visibility === "public" && camp.type !== "virtual";

  return (
    <div className="py-4 flex flex-col md:flex-row gap-4 hover:bg-muted/30 p-2 rounded-md cursor-pointer transition-colors" onClick={onViewDetails}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-bold">{camp.name}</h3>
          {isFeatured && (
            <Badge variant="secondary" className="ml-auto md:ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {showStartingSoon && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Starting Soon
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {camp.campSports && camp.campSports.length > 0 ? (
            camp.campSports.map((sport, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10 text-xs">
                {sport.sportId ? getSportName(sport.sportId) : "Unknown"} - {sport.skillLevel ? skillLevelNames[sport.skillLevel as keyof typeof skillLevelNames] : "Any level"}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="bg-primary/10 text-xs">
              General - All levels
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {camp.description}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span>{isVirtual ? "Online/Virtual" : `${camp.city}, ${camp.state}`}</span>
          </div>

          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            <span>{format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d")}</span>
          </div>

          <div className="flex items-center">
            <User className="h-3.5 w-3.5 mr-1" />
            <span>Ages {camp.minAge} - {camp.maxAge}</span>
          </div>

          <div className="flex items-center">
            <span className="capitalize">{camp.type.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:flex-col md:items-end justify-between">
        <p className="text-lg font-bold">${camp.price}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}>
            Details
          </Button>
          <Button size="sm" onClick={(e) => {
            e.stopPropagation();
            onRegisterClick();
          }}>
            Register
          </Button>
        </div>
      </div>
    </div>
  );
}