import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCampSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("basic");

  // Get default dates
  const today = new Date();
  const regStart = new Date(today);
  const regEnd = new Date(today);
  regEnd.setDate(regEnd.getDate() + 30); // Registration ends in 30 days
  const campStart = new Date(regEnd);
  campStart.setDate(campStart.getDate() + 1); // Camp starts day after registration ends
  const campEnd = new Date(campStart);
  campEnd.setDate(campEnd.getDate() + 7); // Camp runs for 7 days by default

  const form = useForm<z.infer<typeof insertCampSchema>>({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      price: "",
      capacity: 20,
      type: "group",
      visibility: "public",
      waitlistEnabled: true,
      minAge: "",
      maxAge: "",
      repeatType: "none",
      repeatCount: "",
      registrationStartDate: regStart.toISOString().split('T')[0],
      registrationEndDate: regEnd.toISOString().split('T')[0],
      startDate: campStart.toISOString().split('T')[0],
      endDate: campEnd.toISOString().split('T')[0],
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCampSchema>) => {
      if (!user?.organizationId) {
        throw new Error("Organization ID required");
      }

      const response = await fetch("/api/camps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId: user.organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create camp");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Camp created successfully",
      });
    },
    onError: (error) => {
      console.error("Camp creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create camp",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertCampSchema>) => {
    createCampMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1 py-4">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter camp name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe the camp" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="registrationStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Start</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registrationEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration End</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Camp Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Camp End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                              min={1}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                              min={1}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                              min={0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              min={1}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Type</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="group">Group</option>
                            <option value="one_on_one">One-on-One</option>
                            <option value="team">Team</option>
                            <option value="virtual">Virtual</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="waitlistEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Enable waitlist when camp is full</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repeatType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Schedule</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="none">No Repeat</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("repeatType") !== "none" && (
                    <FormField
                      control={form.control}
                      name="repeatCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Number of {form.watch("repeatType") === "weekly" ? "Weeks" : "Months"} to Repeat
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                              min={0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button type="button" onClick={() => setActiveTab("location")}>
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main St" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="CA" maxLength={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="12345" pattern="\d{5}(-\d{4})?" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
                      Previous
                    </Button>
                    <Button type="submit" disabled={createCampMutation.isPending}>
                      {createCampMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Camp"
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}