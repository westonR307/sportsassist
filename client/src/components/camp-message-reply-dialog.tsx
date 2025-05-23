import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const replySchema = z.object({
  content: z.string().min(1, "Reply content is required"),
  replyToAll: z.boolean().default(false),
  specificRecipientId: z.number().optional(),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface CampMessageReplyDialogProps {
  messageId: number;
  messageSubject: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
}

export function CampMessageReplyDialog({
  messageId,
  messageSubject,
  open,
  onOpenChange,
  organizationId,
}: CampMessageReplyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      content: "",
      replyToAll: false,
      specificRecipientId: undefined
    },
  });

  async function onSubmit(data: ReplyFormValues) {
    setIsSubmitting(true);
    try {
      console.log("Sending reply to message ID:", messageId);
      
      const requestBody = {
        content: data.content,
        replyToAll: data.replyToAll,
        recipientId: data.replyToAll ? null : data.specificRecipientId // Only set specific recipient if not replying to all
      };
      
      console.log("Reply request body:", requestBody);
      
      const response = await apiRequest(`/api/camp-messages/${messageId}/replies`, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      
      console.log("Reply sent response:", response);

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/organizations/${organizationId}/camp-messages`],
      });

      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully",
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: `Failed to send reply: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send reply. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reply to Message</DialogTitle>
          <DialogDescription>
            <span className="font-medium">Re: {messageSubject}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Reply</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your reply here..."
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
              name="replyToAll"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Reply to all participants</FormLabel>
                    {field.value && (
                      <p className="text-sm text-amber-600 mt-1">
                        All recipients of the original message will receive this reply. 
                        Uncheck this to reply only to the sender.
                      </p>
                    )}
                    {!field.value && (
                      <p className="text-sm text-muted-foreground">
                        Only the sender will receive this reply. Check this to send to all recipients.
                      </p>
                    )}
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
                Send Reply
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}