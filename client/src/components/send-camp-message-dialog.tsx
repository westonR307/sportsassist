import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

// Define registration data structure
interface RegistrationWithChild {
  id: number;
  childId: number;
  childName: string;
  parentId: number;
  parentName: string;
  parentEmail: string;
}

// Define the schema for the form
const sendMessageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  sendToAll: z.boolean().default(true),
  selectedRecipients: z.array(z.number()).optional(),
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

interface SendCampMessageDialogProps {
  campId: number;
  campName: string;
}

export function SendCampMessageDialog({
  campId,
  campName
}: SendCampMessageDialogProps) {
  // Basic state
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipients, setRecipients] = useState<RegistrationWithChild[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form with default values
  const form = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      subject: "",
      content: "",
      sendToAll: true,
      selectedRecipients: []
    }
  });

  // Watch the sendToAll field value to update the form
  const sendToAll = form.watch("sendToAll");

  // Function to load recipients
  const loadRecipients = async () => {
    // Skip if dialog not open or we already have recipients
    if (!open) {
      console.log("Dialog not open, skipping recipient fetch");
      return;
    }
    
    // Always try to fetch fresh data when dialog opens
    setIsLoadingRecipients(true);
    try {
      console.log(`Attempting to fetch participants for camp ID: ${campId}`);
      
      // First check user authentication status
      const userCheckResponse = await fetch('/api/user');
      console.log(`User authentication check status: ${userCheckResponse.status}`);
      
      if (!userCheckResponse.ok) {
        throw new Error("You must be logged in to send messages");
      }
      
      // Get user info for debugging
      const userData = await userCheckResponse.json();
      console.log(`Authenticated as: ${userData.username}, Role: ${userData.role}, Organization: ${userData.organizationId}`);
      
      // Now fetch the registrations with parent info
      console.log(`Fetching registrations with parents for camp ${campId}`);
      const response = await fetch(`/api/camps/${campId}/registrations-with-parents`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`Registration API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded ${data.length} participants:`, data); 
        
        if (!data || data.length === 0) {
          console.log("No participants found for this camp");
          setRecipients([]);
          return;
        }
        
        const formattedData = data.map((reg: any) => ({
          id: reg.id,
          childId: reg.childId,
          childName: reg.childName || "Unknown Child",
          parentId: reg.parentId,
          parentName: reg.parentName || "Unknown Parent",
          parentEmail: reg.parentEmail || "No email provided"
        }));
        
        console.log("Formatted recipient data:", formattedData);
        setRecipients(formattedData);
      } else if (response.status === 403) {
        console.log("Permission denied when fetching participants");
        throw new Error("You don't have permission to access participant information");
      } else if (response.status === 404) {
        console.log("Camp not found when fetching participants");
        throw new Error("Camp not found");
      } else {
        const errorText = await response.text();
        console.log("Error response from API:", errorText);
        
        const errorData = JSON.parse(errorText || '{}');
        throw new Error(errorData?.message || "Failed to load participants");
      }
    } catch (error) {
      console.error("Error loading participants:", error);
      toast({
        title: "Failed to load participants",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      
      // Set empty array on error to avoid null reference issues
      setRecipients([]);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  // Handle dialog open/close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    
    // If opening dialog, load recipients
    if (newOpen) {
      loadRecipients();
    } else {
      // If closing dialog, reset form
      form.reset({
        subject: "",
        content: "",
        sendToAll: true,
        selectedRecipients: []
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: SendMessageFormValues) => {
    setIsSubmitting(true);
    try {
      // Add validation for non-empty recipients if not sending to all
      if (!data.sendToAll && (!data.selectedRecipients || data.selectedRecipients.length === 0)) {
        throw new Error("You must select at least one recipient if not sending to all participants");
      }

      // Check authentication first
      const userCheckResponse = await fetch('/api/user');
      if (!userCheckResponse.ok) {
        throw new Error("You must be logged in to send messages");
      }

      const response = await fetch(`/api/camps/${campId}/messages`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          subject: data.subject,
          content: data.content,
          sendToAll: data.sendToAll,
          selectedRecipients: !data.sendToAll ? data.selectedRecipients : undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Message sent",
          description: `Message sent to ${result.recipientsCount} recipient${result.recipientsCount !== 1 ? 's' : ''}.`,
        });
        
        // Invalidate the messages cache to refresh the list
        queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/messages`] });
        
        // Close the dialog
        handleOpenChange(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle recipient selection
  const toggleRecipient = (recipientId: number) => {
    const currentSelectedRecipients = form.getValues("selectedRecipients") || [];
    const index = currentSelectedRecipients.indexOf(recipientId);
    
    if (index > -1) {
      // Remove recipient if already selected
      const newSelectedRecipients = [...currentSelectedRecipients];
      newSelectedRecipients.splice(index, 1);
      form.setValue("selectedRecipients", newSelectedRecipients);
    } else {
      // Add recipient if not already selected
      form.setValue("selectedRecipients", [...currentSelectedRecipients, recipientId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">Send Message to Participants</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message to Camp Participants</DialogTitle>
          <DialogDescription>
            Send a message to participants registered for {campName}. 
            The message will be sent via email and stored in the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter message subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your message content"
                      className="min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Formatting options are not available. This message will be sent as plain text.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendToAll"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          form.setValue("selectedRecipients", []);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Send to all participants
                    </FormLabel>
                    <FormDescription>
                      Sends to everyone registered for this camp. If unchecked, you'll be able to select specific participants.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {!sendToAll && (
              <FormField
                control={form.control}
                name="selectedRecipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Recipients</FormLabel>
                    <FormDescription>
                      Select one or more participants to send this message to.
                    </FormDescription>
                    <FormControl>
                      <div className="rounded-md border p-2">
                        {isLoadingRecipients ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading participants...</span>
                          </div>
                        ) : recipients.length > 0 ? (
                          <ScrollArea className="h-52 w-full">
                            <div className="space-y-2 p-2">
                              {recipients.map((registration) => (
                                <Card 
                                  key={registration.id} 
                                  className={`cursor-pointer transition-colors ${
                                    field.value?.includes(registration.id) 
                                      ? 'bg-primary/10 border-primary' 
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  <CardContent 
                                    className="p-3 flex justify-between items-center"
                                    onClick={() => toggleRecipient(registration.id)}
                                  >
                                    <div>
                                      <div className="font-medium">{registration.childName}</div>
                                      <div className="text-sm text-muted-foreground">Parent: {registration.parentName}</div>
                                      <div className="text-xs text-muted-foreground">{registration.parentEmail}</div>
                                    </div>
                                    <Checkbox 
                                      checked={field.value?.includes(registration.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          toggleRecipient(registration.id);
                                        } else {
                                          toggleRecipient(registration.id);
                                        }
                                      }}
                                      className="h-5 w-5"
                                    />
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                            <p className="text-muted-foreground">No participants found for this camp.</p>
                            <p className="text-sm text-muted-foreground">Please select "Send to all" if you wish to message when participants register.</p>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}