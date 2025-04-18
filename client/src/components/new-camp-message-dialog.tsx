import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const messageSchema = z.object({
  campId: z.string().min(1, "Please select a camp"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  sendToAll: z.boolean().default(true),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface CampBasicInfo {
  id: number;
  name: string;
}

interface NewCampMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  camps: CampBasicInfo[];
}

export function NewCampMessageDialog({
  open,
  onOpenChange,
  organizationId,
  camps,
}: NewCampMessageDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      campId: "",
      subject: "",
      content: "",
      sendToAll: true,
    },
  });

  async function onSubmit(data: MessageFormValues) {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const campId = parseInt(data.campId);
      
      await apiRequest(`/api/camps/${campId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          subject: data.subject,
          content: data.content,
          sendToAll: data.sendToAll,
          organizationId: organizationId,
          senderId: user.id,
          senderName: user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}` : 
            user.username,
        }),
      });

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/organizations/${organizationId}/camp-messages`],
      });

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Camp Message</DialogTitle>
          <DialogDescription>
            Send a message to camp participants and staff
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="campId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Camp</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a camp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {camps.map((camp) => (
                        <SelectItem key={camp.id} value={camp.id.toString()}>
                          {camp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="Type your message here..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
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
                    <FormLabel>Send to all participants</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      If unchecked, you'll be able to select specific recipients after sending
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Message
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}