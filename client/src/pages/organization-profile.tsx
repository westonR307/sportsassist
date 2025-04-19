import React, { useState, useEffect, useCallback } from 'react';
import { CreatorLayout } from '@/components/creator-layout';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import debounce from 'lodash.debounce';
import { apiRequest } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/error-boundary';
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
  Loader2,
  RotateCcw,
  Save,
  Eye,
  ExternalLink
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


// Form validation schema for organization profile
const organizationProfileSchema = z.object({
  name: z.string().min(2, { message: 'Organization name must be at least 2 characters.' }),
  displayName: z.string().optional(),
  description: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  buttonColor: z.string().optional(),
  aboutText: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z.object({
    facebook: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal(''))
  }).optional(),
  missionStatement: z.string().optional(),
  feature1Title: z.string().optional(),
  feature1Description: z.string().optional(),
  feature2Title: z.string().optional(),
  feature2Description: z.string().optional(),
  feature3Title: z.string().optional(),
  feature3Description: z.string().optional()
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
  slug?: string | null;
  missionStatement?: string | null;
  feature1Title?: string | null;
  feature1Description?: string | null;
  feature2Title?: string | null;
  feature2Description?: string | null;
  feature3Title?: string | null;
  feature3Description?: string | null;
}

export default function OrganizationProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic-info');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Query to fetch the organization data for the current user
  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ['/api/organizations', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('No organization ID available');
      }
      console.log(`Fetching organization data for ID: ${user.organizationId}`);
      const response = await fetch(`/api/organizations/${user.organizationId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch organization data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched organization data:', data);
      return data;
    },
    enabled: !!user && !!user.organizationId,
  });

  // Form setup with default values from the fetched organization data
  const defaultFormValues = {
    name: organization?.name || '',
    displayName: organization?.displayName || '',
    description: organization?.description || '',
    primaryColor: organization?.primaryColor || '#3730a3',
    secondaryColor: organization?.secondaryColor || '#1e3a8a',
    buttonColor: organization?.buttonColor || '#fbbf24',
    aboutText: organization?.aboutText || '',
    contactEmail: organization?.contactEmail || '',
    websiteUrl: organization?.websiteUrl || '',
    socialLinks: {
      facebook: organization?.socialLinks?.facebook || '',
      twitter: organization?.socialLinks?.twitter || '',
      linkedin: organization?.socialLinks?.linkedin || '',
      instagram: organization?.socialLinks?.instagram || '',
    },
    missionStatement: organization?.missionStatement || '',
    feature1Title: organization?.feature1Title || '',
    feature1Description: organization?.feature1Description || '',
    feature2Title: organization?.feature2Title || '',
    feature2Description: organization?.feature2Description || '',
    feature3Title: organization?.feature3Title || '',
    feature3Description: organization?.feature3Description || '',
  };
  
  console.log('Initial form values:', defaultFormValues);
  
  const form = useForm<OrganizationProfileData>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: defaultFormValues,
    values: defaultFormValues // Set values directly as well
  });
  
  // Update form values when organization data loads or changes
  useEffect(() => {
    if (organization) {
      console.log('Setting organization data:', organization);
      
      // Create the data object to reset the form with
      const formData = {
        name: organization.name || '',
        displayName: organization.displayName || '',
        description: organization.description || '',
        primaryColor: organization.primaryColor || '#3730a3',
        secondaryColor: organization.secondaryColor || '#1e3a8a',
        buttonColor: organization.buttonColor || '#fbbf24',
        aboutText: organization.aboutText || '',
        contactEmail: organization.contactEmail || '',
        websiteUrl: organization.websiteUrl || '',
        socialLinks: {
          facebook: organization.socialLinks?.facebook || '',
          twitter: organization.socialLinks?.twitter || '',
          linkedin: organization.socialLinks?.linkedin || '',
          instagram: organization.socialLinks?.instagram || '',
        },
        missionStatement: organization.missionStatement || '',
        feature1Title: organization.feature1Title || '',
        feature1Description: organization.feature1Description || '',
        feature2Title: organization.feature2Title || '',
        feature2Description: organization.feature2Description || '',
        feature3Title: organization.feature3Title || '',
        feature3Description: organization.feature3Description || '',
      };
      
      console.log('Resetting form with data:', formData);
      form.reset(formData);
      
      // Also set the preview images if they exist
      if (organization.logoUrl) {
        setLogoPreview(organization.logoUrl);
      }
      
      if (organization.bannerImageUrl) {
        setBannerPreview(organization.bannerImageUrl);
      }
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
      console.log(`Sending profile update to /api/organizations/${user.organizationId}/profile with data:`, data);
      
      const response = await fetch(`/api/organizations/${user.organizationId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      console.log('API response status:', response.status);
      
      // Clone the response to read it multiple times
      const clonedResponse = response.clone();
      const rawResponse = await clonedResponse.text();
      console.log('Raw API response:', rawResponse);
      
      if (!response.ok) {
        console.error(`API Error: ${response.status}`, rawResponse);
        throw new Error(`${response.status}: ${rawResponse}`);
      }
      
      // Parse the original response as JSON
      try {
        return JSON.parse(rawResponse);
      } catch (error) {
        console.error('Failed to parse API response as JSON:', error);
        throw new Error(`Failed to parse server response: ${rawResponse}`);
      }
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

  // Get only the changed fields to optimize updates
  const getChangedFields = (data: OrganizationProfileData): Partial<OrganizationProfileData> => {
    const changed: Partial<OrganizationProfileData> = {};
    const original = organization || {} as Organization;
    
    // Only include fields that have changed
    if (data.name !== original.name) changed.name = data.name;
    if (data.displayName !== original.displayName) changed.displayName = data.displayName;
    if (data.description !== original.description) changed.description = data.description;
    if (data.primaryColor !== original.primaryColor) changed.primaryColor = data.primaryColor;
    if (data.secondaryColor !== original.secondaryColor) changed.secondaryColor = data.secondaryColor;
    if (data.buttonColor !== original.buttonColor) changed.buttonColor = data.buttonColor;
    if (data.aboutText !== original.aboutText) changed.aboutText = data.aboutText;
    if (data.contactEmail !== original.contactEmail) changed.contactEmail = data.contactEmail;
    if (data.websiteUrl !== original.websiteUrl) changed.websiteUrl = data.websiteUrl;
    
    // New mission and features fields
    if (data.missionStatement !== original.missionStatement) changed.missionStatement = data.missionStatement;
    if (data.feature1Title !== original.feature1Title) changed.feature1Title = data.feature1Title;
    if (data.feature1Description !== original.feature1Description) changed.feature1Description = data.feature1Description;
    if (data.feature2Title !== original.feature2Title) changed.feature2Title = data.feature2Title;
    if (data.feature2Description !== original.feature2Description) changed.feature2Description = data.feature2Description;
    if (data.feature3Title !== original.feature3Title) changed.feature3Title = data.feature3Title;
    if (data.feature3Description !== original.feature3Description) changed.feature3Description = data.feature3Description;
    
    // Handle social links
    if (data.socialLinks) {
      const originalSocialLinks = original.socialLinks || {} as NonNullable<Organization['socialLinks']>;
      const changedSocialLinks: Record<string, string> = {};
      let hasSocialChanges = false;
      
      if (data.socialLinks.facebook !== originalSocialLinks.facebook) {
        changedSocialLinks.facebook = data.socialLinks.facebook || '';
        hasSocialChanges = true;
      }
      if (data.socialLinks.twitter !== originalSocialLinks.twitter) {
        changedSocialLinks.twitter = data.socialLinks.twitter || '';
        hasSocialChanges = true;
      }
      if (data.socialLinks.linkedin !== originalSocialLinks.linkedin) {
        changedSocialLinks.linkedin = data.socialLinks.linkedin || '';
        hasSocialChanges = true;
      }
      if (data.socialLinks.instagram !== originalSocialLinks.instagram) {
        changedSocialLinks.instagram = data.socialLinks.instagram || '';
        hasSocialChanges = true;
      }
      
      if (hasSocialChanges) {
        changed.socialLinks = changedSocialLinks as typeof data.socialLinks;
      }
    }
    
    // If no changes detected, include at least the name to satisfy requirements
    if (Object.keys(changed).length === 0) {
      changed.name = data.name;
    }
    
    return changed;
  };

  // Helper function to validate color format
  const validateColorFormat = (color: string | undefined | null): boolean => {
    if (!color) return true;
    const validHexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return validHexColor.test(color);
  };

  // Handle form submission - Manual save only when Save button is clicked
  const onSubmit = (data: OrganizationProfileData) => {
    console.log('Form submitted with data:', data);
    const changedData = getChangedFields(data);
    console.log('Submitting changed fields:', changedData);
    
    // Only proceed if there are changes to save
    if (Object.keys(changedData).length === 0) {
      toast({
        title: 'No Changes Detected',
        description: 'No changes were made to save.',
        variant: 'default',
      });
      return;
    }
    
    // Validate color fields before submission
    if (changedData.primaryColor && !validateColorFormat(changedData.primaryColor)) {
      toast({
        title: 'Invalid Color Format',
        description: 'Primary color must be a valid hex color (e.g., #3730a3).',
        variant: 'destructive',
      });
      return;
    }
    
    if (changedData.secondaryColor && !validateColorFormat(changedData.secondaryColor)) {
      toast({
        title: 'Invalid Color Format',
        description: 'Secondary color must be a valid hex color (e.g., #1e3a8a).',
        variant: 'destructive',
      });
      return;
    }
    
    if (changedData.buttonColor && !validateColorFormat(changedData.buttonColor)) {
      toast({
        title: 'Invalid Color Format',
        description: 'Button color must be a valid hex color (e.g., #fbbf24).',
        variant: 'destructive',
      });
      return;
    }
    
    // If validation passes, submit the changes - manual save only
    updateProfileMutation.mutate(changedData);
    
    // Also upload any files that were selected
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
      setLogoFile(null);
    }
    
    if (bannerFile) {
      uploadBannerMutation.mutate(bannerFile);
      setBannerFile(null);
    }
  };

  // Handle logo file change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setLogoFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle banner file change
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setBannerFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    
    if (organization?.logoUrl && user?.organizationId) {
      fetch(`/api/organizations/${user.organizationId}/logo`, {
        method: 'DELETE',
        credentials: 'include'
      })
        .then(response => {
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/organizations', user.organizationId] });
            toast({
              title: 'Logo Removed',
              description: 'Your organization logo has been removed.',
              variant: 'default',
            });
          } else {
            throw new Error('Failed to remove logo');
          }
        })
        .catch(error => {
          toast({
            title: 'Removal Failed',
            description: `Failed to remove logo: ${error.message}`,
            variant: 'destructive',
          });
        });
    }
  };

  // Handle banner removal
  const handleRemoveBanner = () => {
    setBannerPreview(null);
    setBannerFile(null);
    
    if (organization?.bannerImageUrl && user?.organizationId) {
      fetch(`/api/organizations/${user.organizationId}/banner`, {
        method: 'DELETE',
        credentials: 'include'
      })
        .then(response => {
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/organizations', user.organizationId] });
            toast({
              title: 'Banner Removed',
              description: 'Your organization banner has been removed.',
              variant: 'default',
            });
          } else {
            throw new Error('Failed to remove banner');
          }
        })
        .catch(error => {
          toast({
            title: 'Removal Failed',
            description: `Failed to remove banner: ${error.message}`,
            variant: 'destructive',
          });
        });
    }
  };

  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
            <p className="text-muted-foreground">Customize your organization's profile and appearance</p>
          </div>
          {organization?.name && (
            <Link
              to={`/organization/${organization.slug || organization.name.toLowerCase().replace(/\s+/g, '-')}`}
              target="_blank"
              className="mt-2"
            >
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Preview Profile</span>
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
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
            <form onSubmit={(e) => {
              e.preventDefault(); // Prevent default form submission behavior
              console.log('Form submission event:', e);
              console.log('Form state before submit:', form.getValues());
              form.handleSubmit(onSubmit)(e);
            }} className="space-y-6">
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
                            <div className="flex gap-2">
                              <Label 
                                htmlFor="logo-upload" 
                                className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Logo
                              </Label>
                              {(logoPreview || organization?.logoUrl) && (
                                <Button
                                  variant="outline"
                                  type="button"
                                  className="inline-flex items-center text-destructive hover:text-destructive"
                                  onClick={handleRemoveLogo}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              )}
                            </div>
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
                            {(bannerPreview || organization?.bannerImageUrl) && (
                              <Button
                                variant="outline"
                                type="button"
                                className="inline-flex items-center text-destructive hover:text-destructive"
                                onClick={handleRemoveBanner}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </Button>
                            )}
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
                        <div className="space-y-2">
                          <Label htmlFor="primaryColorInput">Primary Color</Label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-10 w-10 rounded border"
                              style={{ backgroundColor: form.watch('primaryColor') || '#3730a3' }}
                            ></div>
                            <Input 
                              id="primaryColorInput"
                              type="text" 
                              value={form.watch('primaryColor') || '#3730a3'}
                              onChange={(e) => form.setValue('primaryColor', e.target.value)}
                              placeholder="#3730a3"
                              maxLength={7}
                              className="w-32"
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Main color for your organization's branding (HEX format: #RRGGBB).
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="secondaryColorInput">Secondary Color</Label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-10 w-10 rounded border"
                              style={{ backgroundColor: form.watch('secondaryColor') || '#1e3a8a' }}
                            ></div>
                            <Input 
                              id="secondaryColorInput"
                              type="text" 
                              value={form.watch('secondaryColor') || '#1e3a8a'}
                              onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                              placeholder="#1e3a8a"
                              maxLength={7}
                              className="w-32"
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Accent color for your organization's branding (HEX format: #RRGGBB).
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="buttonColorInput">Button Color</Label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-10 w-10 rounded border"
                              style={{ backgroundColor: form.watch('buttonColor') || form.watch('primaryColor') || '#3730a3' }}
                            ></div>
                            <Input 
                              id="buttonColorInput"
                              type="text" 
                              value={form.watch('buttonColor') || ''}
                              onChange={(e) => form.setValue('buttonColor', e.target.value)}
                              placeholder={form.watch('primaryColor') || '#3730a3'}
                              maxLength={7}
                              className="w-32"
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Custom color for buttons (HEX format: #RRGGBB). Leave empty to use your primary color.
                          </p>
                        </div>
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
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="aboutText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About Us</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell people about your organization, history, and values..." 
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

                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="missionStatement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mission Statement</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What is your organization's mission or purpose?" 
                              className="min-h-[120px]" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be featured prominently on your profile page.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Feature Highlights</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Add up to three unique features or benefits of your organization that you want to highlight.
                      </p>
                      
                      <div className="space-y-6">
                        {/* Feature 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <FormField
                              control={form.control}
                              name="feature1Title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 1 Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Expert Coaches" {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="feature1Description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 1 Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Brief description of this feature..." 
                                      className="resize-none" 
                                      {...field} 
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Feature 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <FormField
                              control={form.control}
                              name="feature2Title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 2 Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Small Class Sizes" {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="feature2Description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 2 Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Brief description of this feature..." 
                                      className="resize-none" 
                                      {...field} 
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Feature 3 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <FormField
                              control={form.control}
                              name="feature3Title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 3 Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., State-of-the-art Facilities" {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="feature3Description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Feature 3 Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Brief description of this feature..." 
                                      className="resize-none" 
                                      {...field} 
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
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
                              placeholder="contact@example.com" 
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
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://www.example.com" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Your organization's official website.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <div>
                      <h3 className="text-lg font-medium mb-4">Social Media Links</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="socialLinks.facebook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Facebook className="h-4 w-4" />
                                Facebook
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://facebook.com/your-page" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="socialLinks.twitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Twitter className="h-4 w-4" />
                                Twitter
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://twitter.com/your-handle" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="socialLinks.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Instagram className="h-4 w-4" />
                                Instagram
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://instagram.com/your-handle" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="socialLinks.linkedin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://linkedin.com/company/your-company" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-2">
                  {(updateProfileMutation.isPending || uploadLogoMutation.isPending || uploadBannerMutation.isPending) ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving changes...</span>
                    </div>
                  ) : updateProfileMutation.isSuccess ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      <span>Changes saved</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset(defaultFormValues);
                      if (organization?.logoUrl) {
                        setLogoPreview(organization.logoUrl);
                      } else {
                        setLogoPreview(null);
                      }
                      if (organization?.bannerImageUrl) {
                        setBannerPreview(organization.bannerImageUrl);
                      } else {
                        setBannerPreview(null);
                      }
                      setLogoFile(null);
                      setBannerFile(null);
                    }}
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Tabs>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 border-t pt-6">
          <div className="flex-1">
            <h3 className="text-lg font-medium">Profile Preview</h3>
            <p className="text-sm text-muted-foreground">
              See how your organization profile will appear to users
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <div className="flex flex-col items-center p-4 border rounded-lg max-w-xs bg-card">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-background flex items-center justify-center">
                {(logoPreview || organization?.logoUrl) ? (
                  <img 
                    src={logoPreview || organization?.logoUrl || ''} 
                    alt={organization?.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-base font-bold text-center" style={{ color: form.watch('primaryColor') || '#3730a3' }}>
                {form.watch('displayName') || form.watch('name')}
              </h3>
              {form.watch('description') && (
                <p className="text-xs text-center text-muted-foreground mt-1 line-clamp-2">
                  {form.watch('description')}
                </p>
              )}
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