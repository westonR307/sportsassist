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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

const sportsList = [
  "Archery", "Badminton", "Baseball", "Basketball", "Biathlon",
  "Billiards", "Bobsleigh", "Bodybuilding", "Bowling", "Boxing",
  "Canoeing", "Cheerleading", "Chess", "Climbing", "Cricket",
  "CrossFit", "Curling", "Cycling", "Darts", "Equestrian",
  "Fencing", "Field Hockey", "Figure Skating", "Fishing", "Football (American)",
  "Frisbee (Ultimate)", "Golf", "Gymnastics", "Handball", "Hockey (Ice)",
  "Hockey (Roller)", "Judo", "Karate", "Kayaking", "Kickboxing",
  "Lacrosse", "Mixed Martial Arts (MMA)", "Motocross", "Netball", "Paddleboarding",
  "Paintball", "Parkour", "Pickleball", "Powerlifting", "Racquetball",
  "Rock Climbing", "Rowing", "Rugby", "Running", "Sailing",
  "Skateboarding", "Skiing", "Snowboarding", "Soccer", "Softball",
  "Speed Skating", "Squash", "Surfing", "Swimming", "Table Tennis",
  "Taekwondo", "Tennis", "Track and Field", "Triathlon", "Volleyball",
  "Water Polo", "Weightlifting", "Wrestling", "Yoga", "Zumba"
].sort();

const skillLevels = ["Beginner", "Intermediate", "Advanced", "All Levels"];

export function AddCampDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = React.useState<string | null>(null);
  const [skillLevel, setSkillLevel] = React.useState("Beginner");
  const [openSportCombobox, setOpenSportCombobox] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState("basic");

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

      if (!selectedSport) {
        throw new Error("Sport selection is required");
      }

      const response = await fetch("/api/camps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId: user.organizationId,
          sport: selectedSport,
          skillLevel: skillLevel,
          additionalLocationDetails: data.additionalLocationDetails
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
        description: error.message || "Failed to create camp",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertCampSchema>) => {
    if (!selectedSport) {
      toast({
        title: "Error",
        description: "Please select a sport",
        variant: "destructive",
      });
      setCurrentTab("basic");
      return;
    }
    console.log("Submitting with sport:", selectedSport);
    console.log("Form data being submitted:", data);
    
    try {
      createCampMutation.mutate({
        ...data,
        sport: selectedSport,
        skillLevel: skillLevel
      });
    } catch (error) {
      console.error("Error during mutation:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Camp</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs 
                defaultValue="basic" 
                className="w-full"
                value={currentTab}
                onValueChange={setCurrentTab}
              >
                <TabsList className="grid grid-cols-3 mb-4 sticky top-0 bg-background z-10">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

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

                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <select
                        value={selectedSport || ""}
                        onChange={(e) => setSelectedSport(e.target.value || null)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="" disabled>Select a sport...</option>
                        {sportsList.map((sport) => (
                          <option key={sport} value={sport}>
                            {sport}
                          </option>
                        ))}
                      </select>
                      {selectedSport && (
                        <div className="mt-1 text-sm text-green-600">
                          Selected: {selectedSport}
                        </div>
                      )}
                    </FormItem>

                    <FormItem>
                      <FormLabel>Skill Level</FormLabel>
                      <select
                        value={skillLevel}
                        onChange={(e) => setSkillLevel(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        {skillLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </FormItem>
                  </div>

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
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      onClick={async () => {
                        const isValid = await form.trigger(["name", "description"]);
                        if (isValid) {
                          setCurrentTab("location");
                        }
                      }}
                    >
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

                  <FormField
                    control={form.control}
                    name="additionalLocationDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Location Information</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional details about the location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setCurrentTab("basic");
                      }}
                    >
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      onClick={async () => {
                        const isValid = await form.trigger(["streetAddress", "city", "state", "zipCode"]);
                        if (isValid) {
                          setCurrentTab("settings");
                        }
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-0">
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

                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setCurrentTab("location");
                      }}
                    >
                      Previous
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCampMutation.isPending}
                    >
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
              </Tabs>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
