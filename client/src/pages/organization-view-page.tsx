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

// Don't import CreatorLayout since we'll just add the public view of the organization profile

interface ExtendedCamp extends Camp {
  sportName?: string;
  registeredCount?: number;
  campSports?: any[];
  isVirtual?: boolean;
  city?: string;
  state?: string;
}

interface Organization {
  id: number;
  name: string;
  description: string | null;
  createdAt?: Date;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  aboutText?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  socialLinks?: {
    linkedin?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
  } | null;
  bannerImageUrl?: string | null;
  displayName?: string | null;
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

  // Fetch organization's camps
  const { data: camps, isLoading: isCampsLoading } = useQuery<ExtendedCamp[]>({
    queryKey: [`/api/organizations/public/${slugOrName}/camps`],
    enabled: !!slugOrName && !!organization?.id,
  });

  // Set the page title when organization data is loaded
  useEffect(() => {
    if (organization) {
      document.title = `${organization.displayName || organization.name} - SportsAssist.io`;
    }
    return () => {
      document.title = 'SportsAssist.io';
    };
  }, [organization]);

  // Show loading state
  if (isOrgLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Skeleton className="h-16 w-16 rounded-full mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Show error state
  if (orgError || !organization) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <Building className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn't find the organization you're looking for.
          It may have been removed or you might have followed an invalid link.
        </p>
        <div className="flex space-x-4">
          <Button asChild variant="outline">
            <Link href="/browse">Browse Organizations</Link>
          </Button>
          <Button asChild>
            <Link href="/">Return Home</Link>
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
    <div className="min-h-screen flex flex-col">
      {/* Back button for mobile navigation */}
      <div className="lg:hidden p-4 bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link href="/browse">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
        </Button>
      </div>

      {/* Hero section with organization banner */}
      <div 
        className="w-full relative"
        style={{ ...heroBgStyle, height: 'var(--banner-height)' }}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
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
                  {organization.websiteUrl && (
                    <a 
                      href={organization.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition rounded-full pl-4 pr-6 py-2 text-white"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                    </a>
                  )}
                  
                  {organization.contactEmail && (
                    <a 
                      href={`mailto:${organization.contactEmail}`}
                      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition rounded-full pl-4 pr-6 py-2 text-white"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Contact</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full max-w-xl mx-auto grid-cols-4">
              <TabsTrigger value="about" className="flex gap-2 items-center justify-center">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger value="camps" className="flex gap-2 items-center justify-center">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Camps</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="flex gap-2 items-center justify-center">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Features</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex gap-2 items-center justify-center">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mx-auto max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About {organization.displayName || organization.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  {organization.missionStatement && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-muted">
                      <h3 className="text-xl font-bold mb-2" style={{ color: organization.primaryColor || undefined }}>
                        Our Mission
                      </h3>
                      <p className="italic">{organization.missionStatement}</p>
                    </div>
                  )}

                  {organization.aboutText ? (
                    <div>
                      {organization.aboutText.split('\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No detailed information has been provided by this organization.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="camps" className="mx-auto max-w-6xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Available Camps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCampsLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-64 w-full" />
                      ))}
                    </div>
                  )}
                  
                  {camps && camps.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {camps.map(camp => (
                        <CampCard 
                          key={camp.id} 
                          camp={camp} 
                          primaryColor={organization.primaryColor} 
                          secondaryColor={organization.secondaryColor}
                        />
                      ))}
                    </div>
                  ) : !isCampsLoading && (
                    <div className="text-center py-16">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Camps Available</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        This organization doesn't have any active camps at the moment.
                        Check back later or contact them directly for more information.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="mx-auto max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Program Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(organization.feature1Title || organization.feature2Title || organization.feature3Title) ? (
                    <div className="grid gap-8 md:grid-cols-3">
                      {/* Feature 1 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3" 
                             style={{ background: `${organization.primaryColor}20` || 'var(--primary/20)' }}>
                          <Trophy className="h-5 w-5" style={{ color: organization.primaryColor || undefined }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{organization.feature1Title || "Expert Coaching"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {organization.feature1Description || "Learn from the best in the field"}
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
                          <h3 className="font-semibold">{organization.feature3Title || "Team Environment"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {organization.feature3Description || "Build lasting friendships and connections"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">This organization hasn't provided any feature details yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mx-auto max-w-3xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      {organization.contactEmail && (
                        <div className="flex items-center gap-3">
                          <div className="rounded-full p-2 bg-primary/10">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <a 
                              href={`mailto:${organization.contactEmail}`} 
                              className="text-sm text-primary hover:underline"
                            >
                              {organization.contactEmail}
                            </a>
                          </div>
                        </div>
                      )}

                      {organization.websiteUrl && (
                        <div className="flex items-center gap-3">
                          <div className="rounded-full p-2 bg-primary/10">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Website</p>
                            <a 
                              href={organization.websiteUrl} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {organization.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {organization.socialLinks && (
                        <div>
                          <p className="text-sm font-medium">Share Profile</p>
                          <div className="flex gap-2 mt-2">
                            {organization.socialLinks?.facebook && (
                              <a href={organization.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                                 className="text-facebook hover:text-facebook/80 transition-colors">
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                            {organization.socialLinks?.twitter && (
                              <a href={organization.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                 className="text-twitter hover:text-twitter/80 transition-colors">
                                <Twitter className="h-4 w-4" />
                              </a>
                            )}
                            {organization.socialLinks?.linkedin && (
                              <a href={organization.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                 className="text-linkedin hover:text-linkedin/80 transition-colors">
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Component for each camp card
function CampCard({ 
  camp, 
  primaryColor, 
  secondaryColor 
}: { 
  camp: ExtendedCamp, 
  primaryColor?: string | null,
  secondaryColor?: string | null
}) {
  const buttonStyle = primaryColor ? {
    backgroundColor: primaryColor,
    borderColor: primaryColor
  } : {};

  return (
    <Card className="flex flex-col overflow-hidden h-full">
      <div 
        className="h-2" 
        style={{ backgroundColor: primaryColor || 'var(--primary)' }}
      ></div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold line-clamp-2">{camp.name}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {camp.sportName && (
            <Badge variant="outline" className="text-xs">
              {camp.sportName}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {skillLevelNames[camp.skillLevel] || camp.skillLevel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {camp.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{camp.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(camp.startDate), "MMM d")} - {format(new Date(camp.endDate), "MMM d, yyyy")}
            </span>
          </div>
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