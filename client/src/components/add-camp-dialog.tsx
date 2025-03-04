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
import {Combobox} from "@/components/ui/combobox";


export function AddCampDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sports data (replace with your actual API call)
  const { data: sportsData = [] } = useQuery({
    queryKey: ["/api/sports"],
    // Add error handling here to gracefully handle API failures.
    onError: (error) => {
      console.error("Error fetching sports data:", error);
      toast({ title: "Error", description: "Could not load sports data", variant: "destructive" });
    },
  });
  const sports = sportsData.map(sport => ({value: sport.id, label: sport.name}))

  // Get today's date for default date fields
  const today = new Date();
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
      price: "", // Allow empty price
      capacity: 20,
      minAge: 5,
      maxAge: 18,
      type: "group",
      visibility: "public",
      waitlistEnabled: true,
      repeatType: "none",
      repeatCount: 0,
      registrationStartDate: formatDateForInput(today), // Start date can be today
      registrationEndDate: formatDateForInput(today), // End date can be today
      startDate: formatDateForInput(today), // Start date can be today
      endDate: formatDateForInput(today), // End date can be today
      additionalLocationDetails: "",
      sport: null
    },
  });

  const createCampMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertCampSchema>) => {
      console.log("Form values before submission:", values);

      try {
        // Validate required fields explicitly
        const requiredFields = [
          "name", "description", "streetAddress", "city", "state", "zipCode",
          "startDate", "endDate", "registrationStartDate", "registrationEndDate", "sport"
        ];

        const missingFields = requiredFields.filter(field => !values[field as keyof typeof values]);

        if (missingFields.length > 0) {
          console.error("Missing required fields:", missingFields);
          throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }

        // Ensure dates are valid (add more robust date validation as needed)
        const startDate = new Date(values.startDate);
        const endDate = new Date(values.endDate);
        const regStartDate = new Date(values.registrationStartDate);
        const regEndDate = new Date(values.registrationEndDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) ||
            isNaN(regStartDate.getTime()) || isNaN(regEndDate.getTime())) {
          throw new Error("One or more dates are invalid");
        }

        const response = await fetch("/api/camps", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to create camp";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || "Failed to create camp";
            if (errorJson.errors) {
              console.error("Validation errors:", errorJson.errors);
            }
          } catch (e) {
            errorMessage = errorText || "Failed to create camp";
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        return responseData;
      } catch (error) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof insertCampSchema>) => {
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

                  {/* Sport */}
                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sport*</FormLabel>
                        <FormControl>
                          <Combobox value={field.value} onValueChange={field.onChange}>
                            <Combobox.Input placeholder="Select a sport" />
                            <Combobox.Options>
                              {sports.map((sport) => (
                                <Combobox.Option key={sport.value} value={sport.value}>
                                  {sport.label}
                                </Combobox.Option>
                              ))}
                            </Combobox.Options>
                          </Combobox>
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
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
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

                  {/* Additional Location Details */}
                  <FormField
                    control={form.control}
                    name="additionalLocationDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Location Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter additional details about the location (e.g., parking instructions, entrance information)"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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