import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, Clock, MapPin, Search, Filter, Laptop, Calendar as CalendarIcon } from "lucide-react";
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
import { Camp } from "@shared/schema";
import { skillLevelNames } from "@shared/sports-utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getSportName } from "@shared/sports-utils";

export default function AvailableCampsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("all_sports");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("any_level");
  const [selectedType, setSelectedType] = useState<string>("any_type");
  const [showVirtualOnly, setShowVirtualOnly] = useState(false);

  const { data: camps = [], isLoading } = useQuery<Camp[]>({
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

  // Apply search and filters
  const filteredCamps = availableCamps.filter(camp => {
    // Search query filter
    const matchesSearch = searchQuery === "" || 
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Sport filter
    const hasSport = selectedSport === "" || selectedSport === "all_sports" || 
      (camp.campSports && camp.campSports.some(cs => cs.sportId.toString() === selectedSport));
    
    // Skill level filter
    const hasSkillLevel = selectedSkillLevel === "" || selectedSkillLevel === "any_level" || 
      (camp.campSports && camp.campSports.some(cs => cs.skillLevel === selectedSkillLevel));
    
    // Camp type filter
    const matchesType = selectedType === "" || selectedType === "any_type" || camp.type === selectedType;
    
    // Virtual only filter
    const matchesVirtual = !showVirtualOnly || camp.type === "virtual";
    
    return matchesSearch && hasSport && hasSkillLevel && matchesType && matchesVirtual;
  });

  // Get unique sports from available camps
  const availableSports = Array.from(
    new Set(
      availableCamps
        .flatMap(camp => camp.campSports || [])
        .map(cs => cs.sportId)
    )
  );

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
                  {availableSports.map(sportId => (
                    <SelectItem key={sportId} value={sportId.toString()}>
                      {getSportName(sportId)}
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
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Camp Type</h4>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any_type">Any Type</SelectItem>
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCamps.map((camp) => (
                <CampCard key={camp.id} camp={camp} />
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
  camp: Camp;
}

function CampCard({ camp }: CampCardProps) {  
  const isVirtual = camp.type === "virtual";
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
            {camp.campSports.map((sport, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="text-xs"
              >
                {getSportName(sport.sportId)} ({skillLevelNames[sport.skillLevel]})
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
        <Button variant="default" className="w-full flex items-center gap-2" asChild>
          <a href={`/dashboard/camps/${camp.id}`}>
            <span>View Details</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}