import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Reply, Users, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form schema
const formSchema = z.object({
  content: z.string().min(1, "Reply message is required").max(2000, "Reply is too long (max 2000 characters)"),
  replyToAll: z.boolean().default(false)
});

type FormData = z.infer<typeof formSchema>;

interface CampMessageReplyDialogProps {
  messageId: number;
  campId: number;
  recipientId?: number;
  subject?: string;
  onSuccess?: () => void;
  className?: string;
  hasMultipleRecipients?: boolean; // Add this to indicate if the message was sent to multiple recipients
}

export function CampMessageReplyDialog({ 
  messageId, 
  campId,
  recipientId,
  subject,
  onSuccess,
  className = "",
  hasMultipleRecipients = false
}: CampMessageReplyDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showReplyAllWarning, setShowReplyAllWarning] = useState(false);
  const [pendingReplyData, setPendingReplyData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      replyToAll: false
    },
  });

  const replyMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest(
        "POST",
        `/api/camp-messages/${messageId}/replies`,
        {
          content: data.content,
          campId,
          recipientId: data.replyToAll ? null : recipientId, // If replyToAll is true, set recipientId to null
          subject,
          replyToAll: data.replyToAll
        }
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/messages/parent`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parent/${user?.id}/camp-messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/camp-messages`] });
      
      toast({
        title: "Reply sent",
        description: user?.role === 'parent' 
          ? "Your reply has been sent to the camp administrators."
          : pendingReplyData?.replyToAll 
            ? "Your reply has been sent to all recipients of the original message."
            : "Your reply has been sent successfully.",
      });
      
      // Clear form and close dialog
      form.reset();
      setOpen(false);
      setPendingReplyData(null);
      
      // Call optional success callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error("Error sending reply:", error);
      toast({
        title: "Error sending reply",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setPendingReplyData(null);
    },
  });

  function onSubmit(data: FormData) {
    // If replying to all, show warning dialog first
    if (data.replyToAll && user?.role !== 'parent') {
      setPendingReplyData(data);
      setShowReplyAllWarning(true);
    } else {
      // Otherwise, just send the reply
      replyMutation.mutate(data);
    }
  }
  
  function handleOpenChange(newOpen: boolean) {
    // If we're closing the dialog and there's a pending submission, don't allow it
    if (!newOpen && replyMutation.isPending) {
      return;
    }
    
    // Reset form when opening the dialog
    if (newOpen) {
      form.reset();
    }
    
    setOpen(newOpen);
  }

  function proceedWithReplyToAll() {
    if (pendingReplyData) {
      replyMutation.mutate(pendingReplyData);
    }
    setShowReplyAllWarning(false);
  }

  function cancelReplyToAll() {
    setPendingReplyData(null);
    setShowReplyAllWarning(false);
  }

  // Parents can only reply to organization staff
  const isReplyAllAllowed = user?.role !== 'parent' && hasMultipleRecipients;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-1 ${className}`}
          >
            <Reply className="h-4 w-4" />
            Reply
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {subject ? `Reply to: ${subject}` : "Reply to Message"}
            </DialogTitle>
            <DialogDescription>
              {user?.role === 'parent' 
                ? "Your reply will be sent to the camp administrators only."
                : "Your reply will be sent to the parent/athlete who sent this message."}
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
                    <FormDescription>
                      {user?.role === 'parent' 
                        ? "Your reply will only be visible to the camp staff, not to other parents or athletes."
                        : form.watch("replyToAll")
                          ? "Your reply will be sent to all recipients of the original message."
                          : "Your reply will only be visible to the parent/athlete who sent this message, not to other parents or athletes."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Only show reply all option for organization users and if there are multiple recipients */}
              {isReplyAllAllowed && (
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
                        <FormLabel className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Reply to all recipients
                        </FormLabel>
                        <FormDescription>
                          This will send your reply to all recipients of the original message.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  disabled={replyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={replyMutation.isPending}
                >
                  {replyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Reply
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reply All Warning Dialog */}
      <AlertDialog open={showReplyAllWarning} onOpenChange={setShowReplyAllWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
              Confirm Reply to All
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send this reply to all recipients of the original message. 
              This means all parents/athletes who received the original message will see your reply.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReplyToAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithReplyToAll}>
              Yes, Reply to All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}