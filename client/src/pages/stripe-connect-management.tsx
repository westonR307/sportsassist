import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/apiRequest";

const StripeConnectManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [feePassthrough, setFeePassthrough] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState("15");

  // Get the user's organization ID
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
  });

  // Get organization details including Stripe account info
  const { data: organization, isLoading: orgLoading, refetch: refetchOrg } = useQuery({
    queryKey: ['/api/organizations', orgId],
    enabled: !!orgId,
    refetchOnWindowFocus: false,
  });

  // Get Stripe account status
  const { data: stripeStatus, isLoading: stripeStatusLoading, refetch: refetchStripeStatus } = useQuery({
    queryKey: ['/api/organizations', orgId, 'stripe/account-status'],
    enabled: !!orgId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user?.organizationId) {
      setOrgId(user.organizationId);
    }
  }, [user]);

  useEffect(() => {
    if (organization) {
      // Set the initial values from the organization
      setFeePassthrough(organization.stripeFeePassthrough || false);
      setPlatformFeePercent(organization.stripePlatformFeePercent?.toString() || "15");
    }
  }, [organization]);

  const createStripeAccount = async () => {
    if (!orgId) return;
    
    try {
      setProcessing(true);
      const response = await apiRequest(`/api/organizations/${orgId}/stripe/create-account`, {
        method: 'POST',
      });
      
      toast({
        title: "Stripe account created",
        description: "Your Stripe account has been created successfully.",
      });
      
      // Refresh the data
      await Promise.all([
        refetchOrg(),
        refetchStripeStatus(),
      ]);
    } catch (error: any) {
      console.error("Error creating Stripe account:", error);
      toast({
        title: "Failed to create Stripe account",
        description: error.message || "An error occurred while creating your Stripe account.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const createAccountLink = async () => {
    if (!orgId) return;
    
    try {
      setProcessing(true);
      const response = await apiRequest(`/api/organizations/${orgId}/stripe/create-account-link`, {
        method: 'POST',
        body: {
          refreshUrl: window.location.href,
          returnUrl: window.location.href,
        },
      });
      
      // Redirect to Stripe's onboarding
      window.location.href = response.url;
    } catch (error: any) {
      console.error("Error creating account link:", error);
      toast({
        title: "Failed to create account link",
        description: error.message || "An error occurred while creating the onboarding link.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const updateStripeSettings = async () => {
    if (!orgId) return;
    
    try {
      setProcessing(true);
      const response = await apiRequest(`/api/organizations/${orgId}/stripe/settings`, {
        method: 'PUT',
        body: {
          stripeFeePassthrough: feePassthrough,
          stripePlatformFeePercent: parseFloat(platformFeePercent),
        },
      });
      
      toast({
        title: "Settings updated",
        description: "Your Stripe settings have been updated successfully.",
      });
      
      // Refresh organization data
      await refetchOrg();
    } catch (error: any) {
      console.error("Error updating Stripe settings:", error);
      toast({
        title: "Failed to update settings",
        description: error.message || "An error occurred while updating your Stripe settings.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (userLoading || orgLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="mt-4">Loading...</span>
      </div>
    </div>;
  }

  if (!user || !user.organizationId || user.role !== "camp_creator") {
    return <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Stripe Connect</h1>
      <p>You need to be an organization owner to access this page.</p>
    </div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Connect Management</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Stripe Account</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connect Account</CardTitle>
              <CardDescription>
                Connect your organization with Stripe to accept payments for camp registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!stripeStatus || !stripeStatus.hasStripeAccount ? (
                <div className="space-y-4">
                  <p>Your organization doesn't have a Stripe account yet. Create one to start accepting payments.</p>
                  <Button onClick={createStripeAccount} disabled={processing}>
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Stripe Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Status</p>
                      <p>{stripeStatus.status}</p>
                    </div>
                    <div>
                      <p className="font-medium">Account ID</p>
                      <p className="font-mono text-sm">{stripeStatus.accountId}</p>
                    </div>
                    <div>
                      <p className="font-medium">Details Submitted</p>
                      <p>{stripeStatus.detailsSubmitted ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Charges Enabled</p>
                      <p>{stripeStatus.chargesEnabled ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Payouts Enabled</p>
                      <p>{stripeStatus.payoutsEnabled ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  
                  {!stripeStatus.detailsSubmitted && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800">
                        Your Stripe account is not fully set up. Complete the onboarding process to start accepting payments.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-2" 
                        onClick={createAccountLink}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Complete Onboarding
                      </Button>
                    </div>
                  )}
                  
                  {stripeStatus.requirements && stripeStatus.requirements.currently_due?.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 font-medium">There are still some requirements needed:</p>
                      <ul className="list-disc pl-5 mt-2">
                        {stripeStatus.requirements.currently_due.map((item: string) => (
                          <li key={item} className="text-sm text-yellow-700">{item.replace(/_/g, ' ')}</li>
                        ))}
                      </ul>
                      <Button 
                        variant="outline" 
                        className="mt-2" 
                        onClick={createAccountLink}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Complete Requirements
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure how payments and platform fees are handled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="fee-passthrough">Fee Passthrough</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, the platform fee will be added to the camp price and paid by the athlete.
                      When disabled, your organization will absorb the platform fee.
                    </p>
                  </div>
                  <Switch
                    id="fee-passthrough"
                    checked={feePassthrough}
                    onCheckedChange={setFeePassthrough}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="platform-fee">Platform Fee Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="platform-fee"
                      type="number"
                      min="0"
                      step="0.1"
                      value={platformFeePercent}
                      onChange={(e) => setPlatformFeePercent(e.target.value)}
                      className="max-w-[100px]"
                    />
                    <span>%</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    The percentage of each registration fee that goes to the platform.
                    The default is 15%.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={updateStripeSettings} 
                    disabled={processing || !organization?.stripeAccountId}
                  >
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StripeConnectManagement;