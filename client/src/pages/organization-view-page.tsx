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
  MapPin, Calendar, ArrowLeft as ArrowLeftIcon, Building, Users, Mail, 
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
  buttonColor?: string | null;
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

interface OrganizationViewPageProps {
  slugOrName: string;
}

// Helper function to calculate color brightness (0-255)
// Higher values are brighter (closer to white)
function calculateColorBrightness(hexColor: string): number {
  try {
    if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) {
      return 150; // Default medium brightness
    }
    
    // Remove the # if present
    const hex = hexColor.replace(/^#/, '');
    
    // Parse the hex values to RGB
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
    // This formula accounts for human perception of color (we perceive green as brighter than red or blue)
    return (0.299 * r + 0.587 * g + 0.114 * b);
  } catch (error) {
    console.error("Error calculating color brightness:", error);
    return 150; // Default medium brightness
  }
}

// Function to determine if text should be light or dark based on background
function getTextColorForBackground(hexColor: string): string {
  const brightness = calculateColorBrightness(hexColor);
  // If brightness is above 160 (relatively bright background), use dark text
  return brightness > 160 ? '#333333' : '#ffffff';
}

export default function OrganizationViewPage({ slugOrName }: OrganizationViewPageProps) {
  // All hook declarations must come first, before any conditional returns
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
  
  // Calculate text color based on the organization's primary color brightness
  // For light backgrounds (like light blue) we use dark text (#333333)
  // For dark backgrounds we use white text (#ffffff)
  const textColor = organization?.primaryColor 
    ? getTextColorForBackground(organization.primaryColor)
    : '#ffffff';
    
  // Define a muted version of the text color for less important text
  const textColorMuted = textColor === '#ffffff' 
    ? 'rgba(255, 255, 255, 0.8)'  // slightly transparent white
    : 'rgba(51, 51, 51, 0.8)';    // slightly transparent dark gray

  // Helper function to convert hex to hsl for CSS Variables
  const hexToHSL = (hex: string): string => {
    try {
      // Check if hex is valid
      if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        console.log("Invalid hex color format:", hex);
        return '221 83% 53%'; // Default primary color in HSL
      }
      
      // Remove the # if present
      hex = hex.replace(/^#/, '');
      
      // Validate hex length
      if (hex.length !== 6) {
        console.log("Invalid hex color length:", hex, "length:", hex.length);
        return '221 83% 53%'; // Default primary color in HSL
      }
      
      // Parse the hex values
      let r = parseInt(hex.slice(0, 2), 16) / 255;
      let g = parseInt(hex.slice(2, 4), 16) / 255;
      let b = parseInt(hex.slice(4, 6), 16) / 255;
      
      // Check if parsing was successful
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.log("Failed to parse hex color:", hex, "r:", r, "g:", g, "b:", b);
        return '221 83% 53%'; // Default primary color in HSL
      }
      
      // Find min and max values for lightness calculation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      
      // Calculate lightness
      let lightness = (max + min) / 2;
      
      // Calculate saturation
      let saturation = 0;
      if (max !== min) {
        saturation = lightness > 0.5 
          ? (max - min) / (2.0 - max - min) 
          : (max - min) / (max + min);
      }
      
      // Calculate hue
      let hue = 0;
      if (max !== min) {
        if (max === r) {
          hue = (g - b) / (max - min) + (g < b ? 6 : 0);
        } else if (max === g) {
          hue = (b - r) / (max - min) + 2;
        } else {
          hue = (r - g) / (max - min) + 4;
        }
        hue *= 60;
      }
      
      // Convert to integers (degrees, percentage, percentage)
      hue = Math.round(hue);
      saturation = Math.round(saturation * 100);
      lightness = Math.round(lightness * 100);
      
      return `${hue} ${saturation}% ${lightness}%`;
    } catch (error) {
      console.error("Error converting hex to HSL:", error);
      return '221 83% 53%'; // Default primary color in HSL
    }
  };
  // Note: We're using the global functions defined outside the component
  
  // Set default HSL values always, regardless of whether the organization data is loaded
  const defaultPrimaryHSL = '221 83% 53%'; // Default blue
  const defaultSecondaryHSL = '221 83% 53%';
  
  // Safely compute HSL values (with fallbacks)
  const primaryHSL = organization?.primaryColor ? hexToHSL(organization.primaryColor) : defaultPrimaryHSL;
  const secondaryHSL = organization?.secondaryColor ? hexToHSL(organization.secondaryColor) : primaryHSL;
  
  // Always-called effect for page title
  useEffect(() => {
    if (organization) {
      document.title = `${organization.displayName || organization.name} - SportsAssist.io`;
    } else {
      document.title = 'SportsAssist.io';
    }
    return () => {
      document.title = 'SportsAssist.io';
    };
  }, [organization]);
  
  // Always-called effect for CSS variables
  useEffect(() => {
    // Only apply if we have organization data
    if (organization) {
      // Apply the styles to document root for consistent colors across the application
      document.documentElement.style.setProperty('--primary', primaryHSL);
      document.documentElement.style.setProperty('--secondary', secondaryHSL);
      document.documentElement.style.setProperty('--border', primaryHSL);
      document.documentElement.style.setProperty('--ring', primaryHSL);
      
      console.log("Applied organization colors:", {
        primaryColor: organization.primaryColor,
        primaryHSL,
        secondaryColor: organization.secondaryColor,
        secondaryHSL
      });
    }
    
    // Cleanup when component unmounts
    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--secondary');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--ring');
    };
  }, [organization, primaryHSL, secondaryHSL]);
  
  // Define CSS variables for organization branding
  const orgStyles = {
    '--banner-height': '300px',
    '--header-height': '120px',
    '--header-padding': '30px',
    '--primary': primaryHSL,
    '--primary-foreground': '#ffffff',
    '--secondary': secondaryHSL,
    '--border': primaryHSL,
    '--ring': primaryHSL,
  } as React.CSSProperties;
  
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

  // Hero background style with or without banner - only after we know organization exists
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
    <div className="min-h-screen flex flex-col" style={orgStyles}>
      {/* Back Button since we don't have a layout now */}
      <div className="fixed top-0 left-0 m-4 z-50">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => window.history.back()}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
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
      <div className="flex-1 py-8" style={{ background: heroBgStyle.background || (organization.bannerImageUrl ? 'rgba(0,0,0,0.9)' : 'var(--primary)') }}>
        <div className="container mx-auto px-4">
          {/* No code here - we'll move color calculations to the top of the component */}
            
          {/* Organization Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Active Camps Stat */}
            <div 
              className="rounded-lg border p-6 flex flex-col items-center justify-center text-center"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: textColor
              }}
            >
              <div className="text-amber-300 mb-2">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {camps?.length || 0}
              </div>
              <div className="text-sm" style={{ color: textColorMuted }}>
                Active Camps
              </div>
            </div>
            
            {/* Total Participants Stat */}
            <div 
              className="rounded-lg border p-6 flex flex-col items-center justify-center text-center"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: textColor
              }}
            >
              <div className="text-amber-300 mb-2">
                <Star className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {camps?.reduce((total, camp) => total + (camp.registeredCount || 0), 0) || 0}
              </div>
              <div className="text-sm" style={{ color: textColorMuted }}>
                Total Participants
              </div>
            </div>
            
            {/* Sports Offered Stat */}
            <div 
              className="rounded-lg border p-6 flex flex-col items-center justify-center text-center"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: textColor
              }}
            >
              <div className="text-amber-300 mb-2">
                <CalendarRange className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {new Set(camps?.map(camp => camp.sportName).filter(Boolean)).size || 0}
              </div>
              <div className="text-sm" style={{ color: textColorMuted }}>
                Sports Offered
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList 
              className="grid w-full max-w-xl mx-auto grid-cols-4"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: textColor 
              }}
            >
              <TabsTrigger 
                value="about" 
                className="flex gap-2 items-center justify-center" 
                style={{ 
                  color: textColor,
                  ['--tw-data-active-bg' as any]: 'rgba(255,255,255,0.3)',
                  ['--tw-data-active-color' as any]: textColor
                }}
              >
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger 
                value="camps" 
                className="flex gap-2 items-center justify-center" 
                style={{ 
                  color: textColor,
                  ['--tw-data-active-bg' as any]: 'rgba(255,255,255,0.3)',
                  ['--tw-data-active-color' as any]: textColor
                }}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Camps</span>
              </TabsTrigger>
              <TabsTrigger 
                value="features" 
                className="flex gap-2 items-center justify-center" 
                style={{ 
                  color: textColor,
                  ['--tw-data-active-bg' as any]: 'rgba(255,255,255,0.3)',
                  ['--tw-data-active-color' as any]: textColor
                }}
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Features</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contact" 
                className="flex gap-2 items-center justify-center" 
                style={{ 
                  color: textColor,
                  ['--tw-data-active-bg' as any]: 'rgba(255,255,255,0.3)',
                  ['--tw-data-active-color' as any]: textColor
                }}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mx-auto max-w-4xl">
              <Card 
                className="backdrop-blur-sm border" 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: textColor 
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: textColor }}>
                    <Info className="h-5 w-5" />
                    About {organization.displayName || organization.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none" style={{ color: textColor }}>
                  {organization.missionStatement && (
                    <div 
                      className="mb-6 p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                      }}
                    >
                      <h3 className="text-xl font-bold mb-2" style={{ color: textColor }}>
                        Our Mission
                      </h3>
                      <p className="italic" style={{ color: textColorMuted }}>{organization.missionStatement}</p>
                    </div>
                  )}

                  {organization.aboutText ? (
                    <div>
                      {organization.aboutText.split('\n').map((paragraph, i) => (
                        <p key={i} style={{ color: textColorMuted }}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: textColorMuted }}>No detailed information has been provided by this organization.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="camps" className="mx-auto max-w-6xl">
              <Card className="bg-white/20 border-white/10 backdrop-blur-sm text-white">
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
                        <Skeleton key={i} className="h-64 w-full bg-white/10" />
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
                          buttonColor={organization.buttonColor}
                        />
                      ))}
                    </div>
                  ) : !isCampsLoading && (
                    <div className="text-center py-16">
                      <Calendar className="h-12 w-12 mx-auto text-white/60 mb-4" />
                      <h3 className="text-xl font-semibold mb-2 text-white">No Camps Available</h3>
                      <p className="text-white/70 max-w-md mx-auto">
                        This organization doesn't have any active camps at the moment.
                        Check back later or contact them directly for more information.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="mx-auto max-w-4xl">
              <Card className="bg-white/20 border-white/10 backdrop-blur-sm text-white">
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
                        <div className="rounded-full p-2 mr-3 bg-white/20"> 
                          <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{organization.feature1Title || "Expert Coaching"}</h3>
                          <p className="text-sm text-white/80">
                            {organization.feature1Description || "Learn from the best in the field"}
                          </p>
                        </div>
                      </div>

                      {/* Feature 2 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3 bg-white/20">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{organization.feature2Title || "Personal Development"}</h3>
                          <p className="text-sm text-white/80">
                            {organization.feature2Description || "Focus on character building and life skills"}
                          </p>
                        </div>
                      </div>

                      {/* Feature 3 */}
                      <div className="flex items-start">
                        <div className="rounded-full p-2 mr-3 bg-white/20">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{organization.feature3Title || "Team Environment"}</h3>
                          <p className="text-sm text-white/80">
                            {organization.feature3Description || "Build lasting friendships and connections"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-white/70">This organization hasn't provided any feature details yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mx-auto max-w-3xl">
              <Card className="bg-white/20 border-white/10 backdrop-blur-sm text-white">
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
                          <div className="rounded-full p-2 bg-white/20">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Email</p>
                            <a 
                              href={`mailto:${organization.contactEmail}`} 
                              className="text-sm text-white/90 hover:text-white hover:underline"
                            >
                              {organization.contactEmail}
                            </a>
                          </div>
                        </div>
                      )}

                      {organization.websiteUrl && (
                        <div className="flex items-center gap-3">
                          <div className="rounded-full p-2 bg-white/20">
                            <Globe className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Website</p>
                            <a 
                              href={organization.websiteUrl} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-white/90 hover:text-white hover:underline"
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
                          <p className="text-sm font-medium text-white">Share Profile</p>
                          <div className="flex gap-2 mt-2">
                            {organization.socialLinks?.facebook && (
                              <a href={organization.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                                 className="text-white hover:text-white/80 transition-colors">
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                            {organization.socialLinks?.twitter && (
                              <a href={organization.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                 className="text-white hover:text-white/80 transition-colors">
                                <Twitter className="h-4 w-4" />
                              </a>
                            )}
                            {organization.socialLinks?.linkedin && (
                              <a href={organization.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                 className="text-white hover:text-white/80 transition-colors">
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
  secondaryColor, 
  buttonColor
}: { 
  camp: ExtendedCamp, 
  primaryColor?: string | null,
  secondaryColor?: string | null,
  buttonColor?: string | null
}) {
  // Use organization's button color (or primary color as fallback)
  const buttonStyle = buttonColor ? {
    backgroundColor: buttonColor,
    borderColor: buttonColor,
    color: '#ffffff' // white text
  } : primaryColor ? {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
    color: '#ffffff' // white text
  } : {
    backgroundColor: '#F59E0B', // amber-500 (fallback)
    borderColor: '#F59E0B',
    color: '#ffffff'
  };

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
          <p className="font-bold text-lg" style={{ color: primaryColor || '#F59E0B' }}>${camp.price}</p>
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