import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Camp } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, Calendar, ArrowLeft, Building, Users, Mail, 
  Globe, Phone, Instagram, Facebook, Twitter, Linkedin,
  MapPinned, Clock, Award, Star, User, CalendarRange,
  MessageCircle, Share2, Info, ChevronRight, Zap, Trophy
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { getSportName, skillLevelNames } from "@shared/sports-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ExtendedCamp extends Camp {
  sportName?: string;
  registeredCount?: number;
  campSports?: any[];
}

interface Organization {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  aboutText: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    [key: string]: string | undefined;
  } | null;
  bannerImageUrl: string | null;
  slug: string | null;
  missionStatement: string | null;
  feature1Title: string | null;
  feature1Description: string | null;
  feature2Title: string | null;
  feature2Description: string | null;
  feature3Title: string | null;
  feature3Description: string | null;
}

export default function OrganizationViewPage() {
  const { slugOrName } = useParams();
  const [activeTab, setActiveTab] = useState('about');
  
  // Fetch organization by slug or name
  const { data: organization, isLoading: isOrgLoading, error: orgError } = useQuery<Organization>({
    queryKey: [`/api/organizations/public/${slugOrName}`],
    enabled: !!slugOrName,
  });
  
  // Once we have the organization, fetch their camps
  const { data: camps = [], isLoading: campsLoading } = useQuery<ExtendedCamp[]>({
    queryKey: [`/api/organizations/public/${slugOrName}/camps`],
    enabled: !!slugOrName,
  });
  
  // Apply organization branding to the page
  useEffect(() => {
    if (organization) {
      // Apply custom CSS variables for colors if they exist
      const root = document.documentElement;
      
      if (organization.primaryColor) {
        root.style.setProperty('--org-primary-color', organization.primaryColor);
      }
      
      if (organization.secondaryColor) {
        root.style.setProperty('--org-secondary-color', organization.secondaryColor);
      }
      
      // Clean up when component unmounts
      return () => {
        root.style.removeProperty('--org-primary-color');
        root.style.removeProperty('--org-secondary-color');
      };
    }
  }, [organization]);

  if (isOrgLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <Button variant="outline" asChild className="w-fit">
            <Link to="/find-camps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Find Camps
            </Link>
          </Button>
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          
          <Skeleton className="h-40 w-full rounded-lg" />
          
          <div>
            <Skeleton className="h-10 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
          <Building className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Organization Not Found</h1>
          <p className="text-muted-foreground">
            The organization you're looking for could not be found or may no longer be available.
          </p>
          <Button variant="outline" asChild>
            <Link to="/find-camps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Find Camps
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Define CSS variables for organization branding
  const orgStyles = {
    '--banner-height': '300px',
    '--header-height': '120px',
    '--header-padding': '30px',
    '--org-primary': organization.primaryColor || 'hsl(var(--primary))',
    '--org-secondary': organization.secondaryColor || 'hsl(var(--secondary))',
  } as React.CSSProperties;

  // Hero background style with or without banner
  const heroBgStyle = organization.bannerImageUrl 
    ? { 
        backgroundImage: `url(${organization.bannerImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } 
    : { 
        background: organization.primaryColor ? `linear-gradient(135deg, ${organization.primaryColor}, ${organization.secondaryColor || organization.primaryColor})` : 'var(--background)'
      };

  return (
    <div style={orgStyles} className="min-h-screen bg-background/95">
      {/* Hero Section with Banner */}
      <div 
        className="relative w-full py-16 md:py-24 overflow-hidden"
        style={heroBgStyle}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        
        {/* Navigation Bar */}
        <div className="absolute top-4 left-4 z-20">
          <Button variant="outline" asChild className="bg-white/90 hover:bg-white">
            <Link to="/find-camps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Find Camps
            </Link>
          </Button>
        </div>
        
        {/* Organization Logo and Header */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative">
              {organization.logoUrl ? (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white">
                  <img 
                    src={organization.logoUrl} 
                    alt={organization.name} 
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-white bg-white flex items-center justify-center shadow-xl">
                  <Building className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
                {organization.displayName || organization.name}
              </h1>
              
              {organization.description && (
                <p className="mt-4 text-xl text-white/90 md:max-w-2xl">
                  {organization.description}
                </p>
              )}
              
              <div className="mt-8 flex flex-wrap items-center gap-4 justify-center md:justify-start">
                {organization.contactEmail && (
                  <a href={`mailto:${organization.contactEmail}`} 
                     className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                    <Mail className="w-5 h-5" />
                    <span>Contact Us</span>
                  </a>
                )}
                
                {organization.websiteUrl && (
                  <a href={organization.websiteUrl} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                    <Globe className="w-5 h-5" />
                    <span>Visit Website</span>
                  </a>
                )}
                
                {/* Social Media Links */}
                {organization.socialLinks && (
                  <div className="flex items-center gap-3">
                    {organization.socialLinks.facebook && (
                      <a href={organization.socialLinks.facebook} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="rounded-full p-2.5 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {organization.socialLinks.twitter && (
                      <a href={organization.socialLinks.twitter} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="rounded-full p-2.5 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {organization.socialLinks.instagram && (
                      <a href={organization.socialLinks.instagram} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="rounded-full p-2.5 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {organization.socialLinks.linkedin && (
                      <a href={organization.socialLinks.linkedin} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="rounded-full p-2.5 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all shadow-md">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-white text-center shadow-lg border border-white/20">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <div className="font-bold text-xl">{camps.length}</div>
              <div className="text-sm text-white/80">Active Camps</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-white text-center shadow-lg border border-white/20">
              <Star className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <div className="font-bold text-xl">
                {/* Calculate total registrations */}
                {camps.reduce((acc, camp) => acc + (camp.registeredCount || 0), 0)}
              </div>
              <div className="text-sm text-white/80">Total Participants</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-white text-center shadow-lg border border-white/20">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <div className="font-bold text-xl">
                {/* Calculate unique sports */}
                {new Set(camps.flatMap(camp => 
                  camp.campSports?.map(sport => sport.sportId) || [camp.sportName]
                )).size}
              </div>
              <div className="text-sm text-white/80">Sports Offered</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 -mt-12 relative z-20">
        <div className="bg-background rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs Navigation */}
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 pb-0">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="camps">Our Camps</TabsTrigger>
              </TabsList>
            </div>
            
            {/* About Tab */}
            <TabsContent value="about" className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-card rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center" 
                        style={{ color: organization.primaryColor || undefined }}>
                      <Info className="mr-2 h-5 w-5" />
                      About Us
                    </h2>
                    {organization.aboutText ? (
                      <div className="prose prose-lg max-w-none">
                        <p className="whitespace-pre-line">
                          {organization.aboutText}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No detailed information has been provided by {organization.displayName || organization.name} yet.
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center"
                        style={{ color: organization.primaryColor || undefined }}>
                      <Trophy className="mr-2 h-5 w-5" />
                      Our Mission
                    </h2>
                    {organization.missionStatement ? (
                      <p className="mb-6 whitespace-pre-line">
                        {organization.missionStatement}
                      </p>
                    ) : (
                      <p className="mb-6">
                        We are dedicated to providing exceptional sports experiences that develop athletic skills,
                        build character, and foster a lifelong love of sports in participants of all ages and abilities.
                      </p>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-4 flex items-center"
                       style={{ color: organization.primaryColor || undefined }}>
                      <Award className="mr-2 h-5 w-5" />
                      Why Choose Us
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {/* Feature 1 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3" 
                             style={{ background: `${organization.primaryColor}20` || 'var(--primary/20)' }}>
                          <Award className="h-5 w-5" style={{ color: organization.primaryColor || undefined }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{organization.feature1Title || "Quality Instruction"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {organization.feature1Description || "Professional coaching from experienced instructors"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Feature 2 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3" 
                             style={{ background: `${organization.primaryColor}20` || 'var(--primary/20)' }}>
                          <User className="h-5 w-5" style={{ color: organization.primaryColor || undefined }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{organization.feature2Title || "Personal Development"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {organization.feature2Description || "Focus on character building and life skills"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Feature 3 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3" 
                             style={{ background: `${organization.primaryColor}20` || 'var(--primary/20)' }}>
                          <Users className="h-5 w-5" style={{ color: organization.primaryColor || undefined }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{organization.feature3Title || "Inclusive Environment"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {organization.feature3Description || "Welcoming atmosphere for participants of all levels"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Default fourth feature if none of the custom ones are available */}
                      {!organization.feature1Title && !organization.feature2Title && !organization.feature3Title && (
                        <div className="flex items-start">
                          <div className="rounded-full p-2 mr-3" 
                              style={{ background: `${organization.primaryColor}20` || 'var(--primary/20)' }}>
                            <Zap className="h-5 w-5" style={{ color: organization.primaryColor || undefined }} />
                          </div>
                          <div>
                            <h3 className="font-semibold">Innovative Programs</h3>
                            <p className="text-sm text-muted-foreground">Cutting-edge training methods and curriculum</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <div className="bg-card rounded-xl shadow-md p-6 sticky top-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center"
                        style={{ color: organization.primaryColor || undefined }}>
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Contact Information
                    </h3>
                    
                    <div className="space-y-4">
                      {organization.contactEmail && (
                        <div className="flex items-start">
                          <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <a href={`mailto:${organization.contactEmail}`} className="text-sm hover:underline">
                              {organization.contactEmail}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {organization.websiteUrl && (
                        <div className="flex items-start">
                          <Globe className="h-5 w-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Website</p>
                            <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                              {new URL(organization.websiteUrl).hostname}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      <Separator className="my-4" />
                      
                      <div className="flex items-start">
                        <Share2 className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Share Profile</p>
                          <div className="flex gap-2 mt-2">
                            {organization.socialLinks?.facebook && (
                              <a href={organization.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                                 className="text-facebook hover:text-facebook/80 transition-colors">
                                <Facebook className="h-5 w-5" />
                              </a>
                            )}
                            {organization.socialLinks?.twitter && (
                              <a href={organization.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                 className="text-twitter hover:text-twitter/80 transition-colors">
                                <Twitter className="h-5 w-5" />
                              </a>
                            )}
                            {organization.socialLinks?.instagram && (
                              <a href={organization.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                                 className="text-instagram hover:text-instagram/80 transition-colors">
                                <Instagram className="h-5 w-5" />
                              </a>
                            )}
                            {organization.socialLinks?.linkedin && (
                              <a href={organization.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                 className="text-linkedin hover:text-linkedin/80 transition-colors">
                                <Linkedin className="h-5 w-5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <Button className="w-full" 
                              style={{ 
                                backgroundColor: organization.primaryColor || undefined,
                                color: organization.primaryColor ? 'white' : undefined
                              }}>
                        Contact Us
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Camps Tab */}
            <TabsContent value="camps" className="p-6">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2" style={{ color: organization.primaryColor || 'inherit' }}>
                  Available Camps
                </h2>
                <p className="text-muted-foreground">
                  Explore our diverse selection of camps designed to help athletes of all levels excel.
                </p>
              </div>
              
              {campsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-80 w-full rounded-lg" />
                  ))}
                </div>
              ) : camps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {camps.map((camp) => (
                    <CampCard 
                      key={camp.id} 
                      camp={camp} 
                      primaryColor={organization.primaryColor}
                      secondaryColor={organization.secondaryColor}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 border rounded-xl bg-card/50 shadow-sm">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/60" />
                  <h3 className="text-xl font-semibold">No Available Camps</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    {organization.displayName || organization.name} doesn't have any active camps at the moment.
                    Check back later for new camp offerings!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Removed duplicate "Why Choose Us" section */}
    </div>
  );
}

function CampCard({ 
  camp, 
  primaryColor,
  secondaryColor
}: { 
  camp: ExtendedCamp;
  primaryColor: string | null;
  secondaryColor: string | null;
}) {
  // Define camp card styles with organization branding
  const cardStyle = {
    borderTop: primaryColor ? `4px solid ${primaryColor}` : undefined,
    borderColor: primaryColor ? `${primaryColor}` : undefined,
  };
  
  const buttonStyle = {
    backgroundColor: primaryColor || undefined,
    color: primaryColor ? 'white' : undefined,
    borderColor: primaryColor || undefined,
  };
  
  // Badge styling
  const badgeStyle = {
    backgroundColor: secondaryColor ? `${secondaryColor}20` : 'var(--primary-foreground)',
    color: secondaryColor || undefined,
    borderColor: secondaryColor ? `${secondaryColor}40` : undefined,
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200" style={cardStyle}>
      <CardHeader className="p-4 pb-2 space-y-3">
        <CardTitle className="text-lg font-bold line-clamp-1" style={{ color: primaryColor || undefined }}>
          {camp.name}
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {camp.campSports && camp.campSports.length > 0 ? (
            camp.campSports.map((sport, index) => (
              <Badge key={index} variant="outline" className="text-xs" style={badgeStyle}>
                {sport.sportId ? getSportName(sport.sportId) : "Unknown"} - {sport.skillLevel ? skillLevelNames[sport.skillLevel as keyof typeof skillLevelNames] : "Any level"}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs" style={badgeStyle}>
              {camp.sportName || "General"} - All levels
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">
            {camp.isVirtual ? "Virtual" : (camp.type === "virtual" ? "Online/Virtual" : `${camp.city}, ${camp.state}`)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d, yyyy")}
          </span>
        </div>
        
        {camp.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mt-3">
            {camp.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
        <div className="flex items-center">
          <p className="font-bold text-lg" style={{ color: primaryColor || undefined }}>${camp.price}</p>
          {camp.registeredCount !== undefined && (
            <p className="text-xs text-muted-foreground ml-2">
              {camp.registeredCount} registered
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            asChild
            style={buttonStyle}
            className="hover:opacity-90 transition-opacity"
          >
            <Link to={`/camp/${camp.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}