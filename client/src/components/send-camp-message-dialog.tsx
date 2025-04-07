import React, { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch registrations for the camp
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: [`/api/camps/${campId}/registrations-with-parents`],
    enabled: open,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    select: (data: any[]) => {
      return data.map((reg) => ({
        id: reg.id,
        childId: reg.childId,
        childName: reg.childName || "Unknown Child",
        parentId: reg.parentId,
        parentName: reg.parentName || "Unknown Parent",
        parentEmail: reg.parentEmail || "No email provided"
      }));
    }
  });

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

  // Reset selected recipients when switching to "send to all"
  useEffect(() => {
    if (sendToAll) {
      form.setValue("selectedRecipients", []);
    }
  }, [sendToAll, form]);

  async function onSubmit(data: SendMessageFormValues) {
    setIsSubmitting(true);
    try {
      // Add validation for non-empty recipients if not sending to all
      if (!data.sendToAll && (!data.selectedRecipients || data.selectedRecipients.length === 0)) {
        throw new Error("You must select at least one recipient if not sending to all participants");
      }

      const response = await fetch(`/api/camps/${campId}/messages`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
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
        
        // Close the dialog and reset form
        setOpen(false);
        form.reset();
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
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                      onCheckedChange={field.onChange}
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
                        {isLoadingRegistrations ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading participants...</span>
                          </div>
                        ) : registrations && registrations.length > 0 ? (
                          <ScrollArea className="h-52 w-full">
                            <div className="space-y-2 p-2">
                              {registrations.map((registration) => (
                                <Card key={registration.id} className={`cursor-pointer transition-colors ${
                                  field.value?.includes(registration.id) 
                                    ? 'bg-primary/10 border-primary' 
                                    : 'hover:bg-muted'
                                }`}>
                                  <CardContent 
                                    className="p-3 flex justify-between items-center"
                                    onClick={() => {
                                      const selectedRecipients = [...(field.value || [])];
                                      const index = selectedRecipients.indexOf(registration.id);
                                    
                                      if (index > -1) {
                                        selectedRecipients.splice(index, 1);
                                      } else {
                                        selectedRecipients.push(registration.id);
                                      }
                                    
                                      field.onChange(selectedRecipients);
                                    }}
                                  >
                                    <div>
                                      <div className="font-medium">{registration.childName}</div>
                                      <div className="text-sm text-muted-foreground">Parent: {registration.parentName}</div>
                                      <div className="text-xs text-muted-foreground">{registration.parentEmail}</div>
                                    </div>
                                    <Checkbox 
                                      checked={field.value?.includes(registration.id)}
                                      onCheckedChange={(checked) => {
                                        const selectedRecipients = [...(field.value || [])];
                                        const index = selectedRecipients.indexOf(registration.id);
                                      
                                        if (checked && index === -1) {
                                          selectedRecipients.push(registration.id);
                                        } else if (!checked && index > -1) {
                                          selectedRecipients.splice(index, 1);
                                        }
                                      
                                        field.onChange(selectedRecipients);
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
                onClick={() => setOpen(false)}
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