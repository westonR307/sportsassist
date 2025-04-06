import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Camp } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, ArrowLeft, Building, Users, Mail, Globe, Phone } from "lucide-react";
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
  socialLinks: any | null;
  bannerImageUrl: string | null;
  slug: string | null;
}

export default function OrganizationViewPage() {
  const { slugOrName } = useParams();
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  
  // Fetch organization by slug or name
  const { data: organization, isLoading: isOrgLoading, error: orgError } = useQuery<Organization>({
    queryKey: [`/api/organizations/public/${slugOrName}`],
    enabled: !!slugOrName,
  });
  
  // Once we have the organization ID, fetch their camps
  const { data: camps = [], isLoading: campsLoading } = useQuery<ExtendedCamp[]>({
    queryKey: [`/api/organizations/public/${slugOrName}/camps`],
    enabled: !!slugOrName,
  });

  if (isOrgLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* Back Button */}
        <Button variant="outline" asChild className="w-fit">
          <Link to="/find-camps">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Find Camps
          </Link>
        </Button>
        
        {/* Organization Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {organization.logoUrl ? (
            <img 
              src={organization.logoUrl} 
              alt={organization.name} 
              className="w-24 h-24 object-contain rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center">
              <Building className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <h1 className="text-3xl font-bold">{organization.displayName || organization.name}</h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {organization.contactEmail && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-1" />
                  <a href={`mailto:${organization.contactEmail}`} className="hover:underline">
                    {organization.contactEmail}
                  </a>
                </div>
              )}
              
              {organization.websiteUrl && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 mr-1" />
                  <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Website
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* About Section */}
        {(organization.description || organization.aboutText) && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">
                {organization.aboutText || organization.description}
              </p>
            </div>
          </div>
        )}
        
        <Separator className="my-2" />
        
        {/* Available Camps */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Available Camps</h2>
          
          {campsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : camps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps.map((camp) => (
                <CampCard key={camp.id} camp={camp} />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/30">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Available Camps</h3>
              <p className="text-muted-foreground mt-2">
                This organization doesn't have any active camps at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CampCard({ camp }: { camp: ExtendedCamp }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2 space-y-2">
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
          <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
            {camp.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
        <div className="flex items-center">
          <p className="font-bold">${camp.price}</p>
          {camp.registeredCount !== undefined && (
            <p className="text-xs text-muted-foreground ml-2">
              {camp.registeredCount} registered
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to={`/dashboard/camps/${camp.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}