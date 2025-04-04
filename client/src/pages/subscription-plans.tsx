import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Plus, Trash2, Edit, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertSubscriptionPlanSchema } from "../../../shared/schema";
import { z } from "zod";

// Define the subscription form schema
const subscriptionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0, "Price must be a non-negative number"),
  billingInterval: z.enum(["month", "year"]),
  tier: z.enum(["free", "basic", "premium", "enterprise"]),
  platformFeePercent: z.coerce.number().min(0).max(100, "Fee percentage must be between 0 and 100"),
  isActive: z.boolean().default(true),
  features: z.string().transform(val => val.split('\n').filter(Boolean)),
  maxCamps: z.coerce.number().min(0, "Maximum camps must be a non-negative number"),
  maxTeamMembers: z.coerce.number().min(0, "Maximum team members must be a non-negative number"),
  maxAthletes: z.coerce.number().min(0, "Maximum athletes must be a non-negative number")
});

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

// Subscription plan component
const SubscriptionPlans: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: () => apiRequest('/api/subscription-plans'),
  });

  // Create a new subscription plan
  const createPlanMutation = useMutation({
    mutationFn: (data: SubscriptionFormValues) => 
      apiRequest('/api/subscription-plans', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-plans'] });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Subscription plan created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan.",
        variant: "destructive",
      });
    },
  });

  // Update a subscription plan
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubscriptionFormValues }) =>
      apiRequest(`/api/subscription-plans/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-plans'] });
      setEditingPlan(null);
      toast({
        title: "Success",
        description: "Subscription plan updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan.",
        variant: "destructive",
      });
    },
  });

  // Form for creating/editing subscription plans
  const SubscriptionPlanForm = ({ plan, onSubmit, isEdit = false }: { plan?: any; onSubmit: (data: SubscriptionFormValues) => void; isEdit?: boolean }) => {
    const form = useForm<SubscriptionFormValues>({
      resolver: zodResolver(subscriptionFormSchema),
      defaultValues: plan ? {
        ...plan,
        features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      } : {
        name: '',
        description: '',
        price: 0,
        billingInterval: 'month',
        tier: 'basic',
        platformFeePercent: 5,
        isActive: true,
        features: '',
        maxCamps: 5,
        maxTeamMembers: 5,
        maxAthletes: 100,
      },
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Basic Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Plan description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Interval</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing interval" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="platformFeePercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform Fee Percentage</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  The percentage fee the platform will charge for each registration. Can be passed to the customer or absorbed by the camp creator.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="maxCamps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Camps</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxTeamMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Team Members</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxAthletes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Athletes</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="features"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Features (one per line)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="e.g., Unlimited registrations&#10;Custom forms&#10;Email notifications" 
                    {...field} 
                    rows={5}
                  />
                </FormControl>
                <FormDescription>
                  Enter each feature on a new line. These will be displayed as bullet points.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <FormDescription>
                    Make this plan available for purchase
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => isEdit ? setEditingPlan(null) : setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
              {isEdit ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  // Render the subscription plan card
  const PlanCard = ({ plan }: { plan: any }) => {
    return (
      <Card className={`${!plan.isActive && 'opacity-60'}`}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                ${plan.price} / {plan.billingInterval === 'month' ? 'month' : 'year'}
              </CardDescription>
            </div>
            <Badge variant={plan.isActive ? 'default' : 'outline'}>
              {plan.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{plan.description}</p>
          
          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            <div>
              <span className="font-semibold block">Max Camps</span>
              {plan.maxCamps}
            </div>
            <div>
              <span className="font-semibold block">Max Team Members</span>
              {plan.maxTeamMembers}
            </div>
            <div>
              <span className="font-semibold block">Platform Fee</span>
              {plan.platformFeePercent}%
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <h4 className="font-semibold mb-2">Features:</h4>
          <ul className="list-disc list-inside space-y-1">
            {plan.features && Array.isArray(plan.features) && plan.features.map((feature: string, index: number) => (
              <li key={index} className="text-sm flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 inline flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditingPlan(plan)}
          >
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading subscription plans...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading subscription plans</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage your organization's subscription plans</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add New Plan
        </Button>
      </div>

      {plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan: any) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="mb-4">No subscription plans found.</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Your First Plan
          </Button>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Subscription Plan</DialogTitle>
            <DialogDescription>
              Define a new subscription plan for camp creators to purchase.
            </DialogDescription>
          </DialogHeader>
          <SubscriptionPlanForm 
            onSubmit={(data) => createPlanMutation.mutate(data)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the details of this subscription plan.
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <SubscriptionPlanForm 
              plan={editingPlan}
              onSubmit={(data) => updatePlanMutation.mutate({ id: editingPlan.id, data })}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPlans;