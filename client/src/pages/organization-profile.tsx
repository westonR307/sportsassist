import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  UserCircle, 
  Building2, 
  Palette, 
  FileText, 
  Mail, 
  Globe,
  Upload,
  Trash2, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Instagram,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { ColorPicker } from '../components/color-picker';

// Form validation schema for organization profile
const organizationProfileSchema = z.object({
  name: z.string().min(2, { message: 'Organization name must be at least 2 characters.' }),
  displayName: z.string().optional(),
  description: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  aboutText: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z.object({
    facebook: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal(''))
  }).optional()
});

type OrganizationProfileData = z.infer<typeof organizationProfileSchema>;

// Organization interface
interface Organization {
  id: number;
  name: string;
  description: string | null;
  stripeAccountId?: string | null;
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
  slug?: string | null;
}

export default function OrganizationProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic-info');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Query to fetch the organization data for the current user
  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ['/api/organizations', user?.organizationId],
    enabled: !!user && !!user.organizationId,
  });

  // Form setup with default values from the fetched organization data
  const form = useForm<OrganizationProfileData>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      primaryColor: '#3730a3',
      secondaryColor: '#1e3a8a',
      aboutText: '',
      contactEmail: '',
      websiteUrl: '',
      socialLinks: {
        facebook: '',
        twitter: '',
        linkedin: '',
        instagram: '',
      }
    }
  });
  
  // Update form values when organization data loads or changes
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || '',
        displayName: organization.displayName || '',
        description: organization.description || '',
        primaryColor: organization.primaryColor || '#3730a3',
        secondaryColor: organization.secondaryColor || '#1e3a8a',
        aboutText: organization.aboutText || '',
        contactEmail: organization.contactEmail || '',
        websiteUrl: organization.websiteUrl || '',
        socialLinks: {
          facebook: organization.socialLinks?.facebook || '',
          twitter: organization.socialLinks?.twitter || '',
          linkedin: organization.socialLinks?.linkedin || '',
          instagram: organization.socialLinks?.instagram || '',
        }
      });
    }
  }, [organization, form]);

  // Mutation to update organization profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: OrganizationProfileData) => {
      if (!user?.organizationId) {
        throw new Error('No organization associated with this user');
      }
      console.log('Submitting organization profile data:', data);
      
      // Make a direct fetch call to avoid format issues with apiRequest
      const response = await fetch(`/api/organizations/${user.organizationId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      if (user?.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', user.organizationId] });
      }
      toast({
        title: 'Profile Updated',
        description: 'Your organization profile has been successfully updated.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: `Failed to update profile: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation to upload logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.organizationId) {
        throw new Error('No organization associated with this user');
      }
      const formData = new FormData();
      formData.append('logo', file);
      
      // For file uploads, we need to use fetch directly since apiRequest doesn't support FormData
      const response = await fetch(`/api/organizations/${user.organizationId}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return response;
    },
    onSuccess: () => {
      if (user?.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', user.organizationId] });
      }
      toast({
        title: 'Logo Uploaded',
        description: 'Your organization logo has been successfully updated.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload logo: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation to upload banner
  const uploadBannerMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.organizationId) {
        throw new Error('No organization associated with this user');
      }
      const formData = new FormData();
      formData.append('banner', file);
      
      // For file uploads, we need to use fetch directly since apiRequest doesn't support FormData
      const response = await fetch(`/api/organizations/${user.organizationId}/banner`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return response;
    },
    onSuccess: () => {
      if (user?.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', user.organizationId] });
      }
      toast({
        title: 'Banner Uploaded',
        description: 'Your organization banner has been successfully updated.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload banner: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: OrganizationProfileData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle logo file change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      uploadLogoMutation.mutate(file);
    }
  };

  // Handle banner file change
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      uploadBannerMutation.mutate(file);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Profile</h1>
          <p className="text-muted-foreground">
            Customize your organization's profile and appearance
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="basic-info" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Basic Info</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Contact & Social</span>
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <TabsContent value="basic-info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Set your organization's name and basic details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your organization name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your official organization name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter display name (optional)" {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional shorter or alternative name to display on your profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of your organization" 
                            className="resize-none" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief tagline or description (250 characters max).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>
                    Upload your logo and customize your brand colors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="logo-upload">Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="h-24 w-24 border rounded-md flex items-center justify-center overflow-hidden bg-gray-50">
                          {(logoPreview || organization?.logoUrl) ? (
                            <img 
                              src={logoPreview || organization?.logoUrl || ''} 
                              alt="Organization Logo" 
                              className="h-full w-full object-contain" 
                            />
                          ) : (
                            <UserCircle className="h-16 w-16 text-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label 
                            htmlFor="logo-upload" 
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Logo
                          </Label>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleLogoChange}
                          />
                          <p className="text-xs text-muted-foreground">
                            Recommended size: 400x400 pixels (square)
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="banner-upload">Banner Image</Label>
                      <div className="mt-2 flex flex-col gap-4">
                        <div className="h-32 border rounded-md flex items-center justify-center overflow-hidden bg-gray-50 relative">
                          {(bannerPreview || organization?.bannerImageUrl) ? (
                            <img 
                              src={bannerPreview || organization?.bannerImageUrl || ''} 
                              alt="Organization Banner" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="text-center text-gray-300">
                              <Building2 className="h-16 w-16 mx-auto" />
                              <p className="text-sm">No banner uploaded</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Label 
                            htmlFor="banner-upload" 
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Banner
                          </Label>
                          <input 
                            id="banner-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleBannerChange}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recommended size: 1200x300 pixels (4:1 ratio)
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                              <ColorPicker 
                                value={field.value || '#3730a3'} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormDescription>
                              Main color for your organization's branding.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Color</FormLabel>
                            <FormControl>
                              <ColorPicker 
                                value={field.value || '#1e3a8a'} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormDescription>
                              Accent color for your organization's branding.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Section</CardTitle>
                  <CardDescription>
                    Share information about your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="aboutText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Us</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell people about your organization, mission, and values..." 
                            className="min-h-[200px]" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          This text will be displayed on your public profile page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    How people can reach your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="contact@yourorganization.com" 
                            type="email" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Public email address for inquiries.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://yourorganization.com" 
                            type="url" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Your organization's website URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-4" />

                  <div>
                    <h3 className="text-sm font-medium mb-3">Social Media Links</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="socialLinks.facebook"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <Facebook className="h-5 w-5 text-blue-600" />
                              <FormLabel className="w-24">Facebook</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://facebook.com/yourpage" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="socialLinks.twitter"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <Twitter className="h-5 w-5 text-blue-400" />
                              <FormLabel className="w-24">Twitter</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://twitter.com/yourhandle" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="socialLinks.linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <Linkedin className="h-5 w-5 text-blue-800" />
                              <FormLabel className="w-24">LinkedIn</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://linkedin.com/company/yourcompany" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="socialLinks.instagram"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <Instagram className="h-5 w-5 text-pink-600" />
                              <FormLabel className="w-24">Instagram</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://instagram.com/yourhandle" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                disabled={updateProfileMutation.isPending}
                onClick={() => form.reset()}
              >
                Reset
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || !form.formState.isDirty}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Profile Preview</h2>
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {/* Banner Preview */}
          <div className="h-32 bg-gray-200 relative">
            {(bannerPreview || organization?.bannerImageUrl) ? (
              <img 
                src={bannerPreview || organization?.bannerImageUrl || ''} 
                alt="Banner Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Banner Preview
              </div>
            )}
            
            {/* Logo Preview - positioned overlapping the banner */}
            <div className="absolute -bottom-12 left-4 h-24 w-24 rounded-full border-4 border-white bg-white overflow-hidden">
              {(logoPreview || organization?.logoUrl) ? (
                <img 
                  src={logoPreview || organization?.logoUrl || ''} 
                  alt="Logo Preview" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <UserCircle className="h-16 w-16" />
                </div>
              )}
            </div>
          </div>
          
          {/* Organization Details */}
          <div className="pt-16 pb-4 px-4 bg-white">
            <h2 className="text-xl font-bold" style={{ color: form.watch('primaryColor') || '#3730a3' }}>
              {form.watch('displayName') || form.watch('name') || 'Organization Name'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {form.watch('description') || 'Organization description will appear here'}
            </p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {form.watch('websiteUrl') && (
                <div className="flex items-center text-xs gap-1 text-gray-600">
                  <Globe className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{form.watch('websiteUrl')}</span>
                </div>
              )}
              {form.watch('contactEmail') && (
                <div className="flex items-center text-xs gap-1 text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span>{form.watch('contactEmail')}</span>
                </div>
              )}
            </div>
            
            {/* Social Icons */}
            <div className="mt-3 flex gap-2">
              {form.watch('socialLinks.facebook') && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Facebook className="h-3 w-3" />
                </div>
              )}
              {form.watch('socialLinks.twitter') && (
                <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white">
                  <Twitter className="h-3 w-3" />
                </div>
              )}
              {form.watch('socialLinks.linkedin') && (
                <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-white">
                  <Linkedin className="h-3 w-3" />
                </div>
              )}
              {form.watch('socialLinks.instagram') && (
                <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white">
                  <Instagram className="h-3 w-3" />
                </div>
              )}
            </div>
            
            {/* About Preview */}
            {form.watch('aboutText') && (
              <div className="mt-4 text-xs text-gray-600 line-clamp-3">
                <span style={{ color: form.watch('secondaryColor') || '#1e3a8a' }} className="font-medium">About Us:</span> {form.watch('aboutText')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}