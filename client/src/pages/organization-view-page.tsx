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
  Globe, Phone, Instagram, Facebook, Twitter, Linkedin 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { getSportName, skillLevelNames } from "@shared/sports-utils";

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
}

export default function OrganizationViewPage() {
  const { slugOrName } = useParams();
  
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
    '--banner-height': '200px',
    '--header-height': '120px',
    '--header-padding': '30px',
    '--org-primary': organization.primaryColor || 'hsl(var(--primary))',
    '--org-secondary': organization.secondaryColor || 'hsl(var(--secondary))',
  } as React.CSSProperties;

  return (
    <div style={orgStyles}>
      {/* Banner Image (if available) */}
      {organization.bannerImageUrl && (
        <div 
          className="w-full relative bg-cover bg-center"
          style={{
            height: 'var(--banner-height)',
            backgroundImage: `url(${organization.bannerImageUrl})`,
          }}
        >
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent to-background"
            style={{ 
              background: `linear-gradient(to bottom, rgba(0,0,0,0.1), ${organization.primaryColor || 'var(--background)'})` 
            }}
          />
        </div>
      )}
      
      <div className={`container mx-auto px-4 ${organization.bannerImageUrl ? '-mt-24' : 'pt-8'}`}>
        <div className="flex flex-col gap-6">
          {/* Back Button */}
          <Button variant="outline" asChild className="w-fit relative z-10">
            <Link to="/find-camps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Find Camps
            </Link>
          </Button>
          
          {/* Organization Header */}
          <div className={`flex flex-col md:flex-row items-start md:items-center gap-6 p-6 rounded-xl ${organization.primaryColor ? 'text-white' : ''}`}
            style={{
              background: organization.primaryColor || 'var(--card)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            {organization.logoUrl ? (
              <img 
                src={organization.logoUrl} 
                alt={organization.name} 
                className="w-28 h-28 object-contain rounded-xl border bg-white p-2 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl border bg-background flex items-center justify-center shadow-md">
                <Building className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold">{organization.displayName || organization.name}</h1>
              
              {organization.description && (
                <p className={`mt-2 text-lg ${organization.primaryColor ? 'text-gray-100' : 'text-muted-foreground'}`}>
                  {organization.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                {organization.contactEmail && (
                  <a href={`mailto:${organization.contactEmail}`} 
                     className={`flex items-center gap-1 px-3 py-1 rounded-full ${organization.primaryColor ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Contact</span>
                  </a>
                )}
                
                {organization.websiteUrl && (
                  <a href={organization.websiteUrl} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className={`flex items-center gap-1 px-3 py-1 rounded-full ${organization.primaryColor ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">Website</span>
                  </a>
                )}
                
                {/* Social Media Links */}
                {organization.socialLinks && (
                  <div className="flex items-center gap-2">
                    {organization.socialLinks.facebook && (
                      <a href={organization.socialLinks.facebook} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className={`rounded-full p-2 ${organization.primaryColor ? 'bg-white/20 hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {organization.socialLinks.twitter && (
                      <a href={organization.socialLinks.twitter} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className={`rounded-full p-2 ${organization.primaryColor ? 'bg-white/20 hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {organization.socialLinks.instagram && (
                      <a href={organization.socialLinks.instagram} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className={`rounded-full p-2 ${organization.primaryColor ? 'bg-white/20 hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {organization.socialLinks.linkedin && (
                      <a href={organization.socialLinks.linkedin} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className={`rounded-full p-2 ${organization.primaryColor ? 'bg-white/20 hover:bg-white/30' : 'bg-muted hover:bg-muted/80'} transition-colors`}>
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* About Section */}
          {organization.aboutText && (
            <div className="bg-card shadow rounded-lg p-6 mt-4">
              <h2 className="text-2xl font-bold mb-4">About {organization.displayName || organization.name}</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground whitespace-pre-line">
                  {organization.aboutText}
                </p>
              </div>
            </div>
          )}
          
          {/* Available Camps */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: organization.primaryColor || 'inherit' }}>
                Available Camps
              </h2>
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
              <div className="text-center p-12 border rounded-lg bg-card/50 shadow-sm">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/60" />
                <h3 className="text-xl font-semibold">No Available Camps</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  {organization.displayName || organization.name} doesn't have any active camps at the moment.
                  Check back later for new camp offerings!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
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
            {camp.type === "virtual" ? "Online/Virtual" : `${camp.city}, ${camp.state}`}
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