import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Globe, 
  Calendar, 
  Users, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram 
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { AppLayout } from '@/components/app-layout';

// Organization interface (match the server-side model)
interface Organization {
  id: number;
  name: string;
  description: string | null;
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
  slug?: string | null;
}

// Camp data interface
interface Camp {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  price: number;
  capacity: number;
  registeredCount: number;
  sportId: number;
  sportName?: string;
  skillLevel: string;
  slug?: string;
}

export default function OrganizationPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = React.useState('about');
  
  // Fetch organization data
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery<Organization>({
    queryKey: [`/api/organizations/public/${slug}`],
    enabled: !!slug,
  });
  
  // Fetch organization's camps
  const { data: camps, isLoading: campsLoading } = useQuery<Camp[]>({
    queryKey: [`/api/organizations/public/${slug}/camps`],
    enabled: !!slug,
  });
  
  if (orgLoading || campsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (orgError || !organization) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Organization Not Found</h1>
          <p className="text-muted-foreground">
            We couldn't find the organization you're looking for.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  // Use organization colors for styling or fallback to defaults
  const primaryColor = organization.primaryColor || '#3730a3';
  const secondaryColor = organization.secondaryColor || '#1e3a8a';
  
  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6">
        {/* Banner and Logo Section */}
        <div 
          className="relative h-48 md:h-64 w-full rounded-lg bg-cover bg-center mb-16 md:mb-20" 
          style={{ 
            backgroundImage: organization.bannerImageUrl 
              ? `url(${organization.bannerImageUrl})` 
              : `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
          }}
        >
          <div className="absolute -bottom-14 left-6 flex items-end">
            <div 
              className="w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden border-4 border-background bg-white"
            >
              {organization.logoUrl ? (
                <img 
                  src={organization.logoUrl} 
                  alt={`${organization.name} logo`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center" 
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-3xl font-bold text-white">
                    {organization.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute -bottom-12 left-40 md:left-44">
            <h1 className="text-2xl md:text-3xl font-bold">
              {organization.displayName || organization.name}
            </h1>
            {organization.description && (
              <p className="text-sm md:text-base text-muted-foreground max-w-lg">
                {organization.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="mt-16 md:mt-20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>About</span>
              </TabsTrigger>
              <TabsTrigger value="camps" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Camps</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Contact</span>
              </TabsTrigger>
            </TabsList>
            
            {/* About Tab */}
            <TabsContent value="about" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>About {organization.displayName || organization.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {organization.aboutText ? (
                    <div className="prose prose-sm max-w-none">
                      {organization.aboutText.split('\\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      This organization hasn't added any information about themselves yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Camps Tab */}
            <TabsContent value="camps" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Camps</CardTitle>
                </CardHeader>
                <CardContent>
                  {camps && camps.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {camps.map(camp => (
                        <Card key={camp.id} className="overflow-hidden">
                          <div 
                            className="h-3" 
                            style={{ backgroundColor: primaryColor }}
                          ></div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold">{camp.name}</h3>
                              <Badge variant="outline" className="ml-2">
                                {camp.skillLevel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {camp.description}
                            </p>
                            <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(camp.startDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{camp.registeredCount}/{camp.capacity}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <Button asChild size="sm" className="w-full" style={{ backgroundColor: primaryColor }}>
                                <Link href={`/camps/${camp.slug || camp.id}`}>View Details</Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No camps are currently available from this organization.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Contact Tab */}
            <TabsContent value="contact" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {organization.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <a 
                          href={`mailto:${organization.contactEmail}`} 
                          className="text-primary hover:underline"
                        >
                          {organization.contactEmail}
                        </a>
                      </div>
                    )}
                    
                    {organization.websiteUrl && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <a 
                          href={organization.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {organization.websiteUrl.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {organization.socialLinks && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium mb-3">Social Media</h3>
                        <div className="flex gap-4">
                          {organization.socialLinks.facebook && (
                            <a 
                              href={organization.socialLinks.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Facebook className="h-5 w-5" />
                            </a>
                          )}
                          {organization.socialLinks.twitter && (
                            <a 
                              href={organization.socialLinks.twitter} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          {organization.socialLinks.linkedin && (
                            <a 
                              href={organization.socialLinks.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Linkedin className="h-5 w-5" />
                            </a>
                          )}
                          {organization.socialLinks.instagram && (
                            <a 
                              href={organization.socialLinks.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Instagram className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="mt-6">
                    <Button asChild className="w-full" style={{ backgroundColor: primaryColor }}>
                      <Link href={`/contact?org=${organization.id}`}>
                        Send Message
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}