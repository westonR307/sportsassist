import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertCampSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function AddCampDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sports data
  const { data: sports } = useQuery({
    queryKey: ["/api/sports"],
  });

  // Get tomorrow's date for default date fields
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  // Format dates as YYYY-MM-DD for input fields
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const form = useForm<z.infer<typeof insertCampSchema>>({
    resolver: zodResolver(insertCampSchema),
    defaultValues: {
      name: "",
      description: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      price: 0,
      capacity: 20,
      minAge: 5,
      maxAge: 18,
      type: "group",
      visibility: "public",
      waitlistEnabled: true,
      repeatType: "none",
      repeatCount: 0,
      // Initialize date fields with actual date values
      registrationStartDate: formatDateForInput(tomorrow),
      registrationEndDate: formatDateForInput(nextWeek),
      startDate: formatDateForInput(nextWeek),
      endDate: formatDateForInput(nextMonth),
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertCampSchema>) => {
      // Log the full form values for debugging
      console.log("Form values before submission:", values);

      try {
        // Validate required fields explicitly
        const requiredFields = [
          "name", "description", "streetAddress", "city", "state", "zipCode", 
          "startDate", "endDate", "registrationStartDate", "registrationEndDate"
        ];

        const missingFields = requiredFields.filter(field => !values[field as keyof typeof values]);

        if (missingFields.length > 0) {
          console.error("Missing required fields:", missingFields);
          throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }

        // Ensure dates are valid
        try {
          const startDate = new Date(values.startDate);
          const endDate = new Date(values.endDate);
          const regStartDate = new Date(values.registrationStartDate);
          const regEndDate = new Date(values.registrationEndDate);

          console.log("Parsed dates:", {
            startDate,
            endDate,
            regStartDate,
            regEndDate
          });

          // Additional date validation
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || 
              isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
            throw new Error("One or more dates are invalid");
          }
        } catch (dateError) {
          console.error("Date validation error:", dateError);
          throw new Error("Please ensure all dates are valid");
        }

        // Make the API request
        console.log("Sending request to create camp...");
        const response = await fetch("/api/camps", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);

          let errorMessage = "Failed to create camp";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || "Failed to create camp";
            if (errorJson.errors) {
              console.error("Validation errors:", errorJson.errors);
            }
          } catch (e) {
            // If the error isn't valid JSON, use the text directly
            errorMessage = errorText || "Failed to create camp";
          }

          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log("Camp created successfully:", responseData);
        return responseData;
      } catch (error) {
        console.error("Exception during camp creation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      toast({
        title: "Success",
        description: "Camp created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Camp creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof insertCampSchema>) => {
    console.log("Form submitted with values:", values);
    createCampMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Camp</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="dates">Dates & Capacity</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  {/* Camp Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Name*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter camp name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description*</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the camp"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="one_on_one">One-on-One</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Visibility */}
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="dates" className="space-y-4">
                  {/* Registration Start Date */}
                  <FormField
                    control={form.control}
                    name="registrationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Start Date*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Registration End Date */}
                  <FormField
                    control={form.control}
                    name="registrationEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration End Date*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Camp Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Start Date*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Camp End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp End Date*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Capacity */}
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Age Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
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
                          <FormLabel>Max Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  {/* Street Address */}
                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main St"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* City */}
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Anytown"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* State and Zip */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="CA"
                              maxLength={2}
                              {...field}
                            />
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
                          <FormLabel>ZIP Code*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="12345"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={createCampMutation.isPending}
              >
                {createCampMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Camp"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}