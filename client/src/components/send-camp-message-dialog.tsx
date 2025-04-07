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
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Define the schema for the form
const sendMessageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  sendToAll: z.boolean().default(true)
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

  const form = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      subject: "",
      content: "",
      sendToAll: true
    }
  });

  async function onSubmit(data: SendMessageFormValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/camps/${campId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          subject: data.subject,
          content: data.content,
          sendToAll: data.sendToAll
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
                      Sends to everyone registered for this camp. If unchecked, you'll be able to select specific participants in a future version.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

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