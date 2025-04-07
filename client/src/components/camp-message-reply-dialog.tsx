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
import { Loader2, Send, Reply } from "lucide-react";

// Form schema
const formSchema = z.object({
  content: z.string().min(1, "Reply message is required").max(2000, "Reply is too long (max 2000 characters)"),
});

type FormData = z.infer<typeof formSchema>;

interface CampMessageReplyDialogProps {
  messageId: number;
  campId: number;
  onSuccess?: () => void;
  className?: string;
}

export function CampMessageReplyDialog({ 
  messageId, 
  campId,
  onSuccess,
  className = "" 
}: CampMessageReplyDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  const replyMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest(
        "POST",
        `/api/camp-messages/${messageId}/replies`,
        {
          content: data.content,
          campId
        }
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/messages/parent`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parent/${user?.id}/camp-messages`] });
      
      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the camp administrators.",
      });
      
      // Clear form and close dialog
      form.reset();
      setOpen(false);
      
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
    },
  });

  function onSubmit(data: FormData) {
    replyMutation.mutate(data);
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

  return (
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
          <DialogTitle>Reply to Message</DialogTitle>
          <DialogDescription>
            Your reply will be sent to the camp administrators only.
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
                    Your reply will only be visible to the camp staff, not to other parents or athletes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
  );
}