
import React, { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Circle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CampMessageReplyDialog } from "@/components/camp-message-reply-dialog";

interface CampMessage {
  id: number;
  subject: string;
  content: string;
  senderName: string;
  createdAt: string;
  sentToAll: boolean;
  isRead: boolean;
  recipientId: number | null;
}

interface ParentCampMessagesTabProps {
  campId: number;
}

export function ParentCampMessagesTab({ campId }: ParentCampMessagesTabProps) {
  const queryClient = useQueryClient();
  const queryKey = [`/api/camps/${campId}/messages/parent`];

  const { data: messages, isLoading } = useQuery<CampMessage[]>({
    queryKey,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for marking a message as read
  const markAsReadMutation = useMutation({
    mutationFn: ({ messageId, recipientId }: { messageId: number; recipientId: number }) => 
      apiRequest(
        'PATCH',
        `/api/camp-messages/${messageId}/recipients/${recipientId}/read`
      ),
    onSuccess: () => {
      // Invalidate the messages query to refetch with updated read status
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mark unread messages as read when component mounts
  useEffect(() => {
    if (messages) {
      // Find all unread messages that have a recipientId
      const unreadMessages = messages.filter(
        (message) => !message.isRead && message.recipientId !== null
      );

      // Mark each unread message as read
      unreadMessages.forEach((message) => {
        if (message.recipientId) {
          markAsReadMutation.mutate({
            messageId: message.id,
            recipientId: message.recipientId
          });
        }
      });
    }
  }, [messages]);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Camp Messages</h3>
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <span className="loading loading-spinner">Loading...</span>
          </div>
        ) : messages?.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className={`shadow-sm ${!message.isRead ? 'border-primary' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {!message.isRead && (
                        <Circle className="h-2 w-2 fill-primary text-primary" />
                      )}
                      <CardTitle className="text-base">{message.subject}</CardTitle>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(message.createdAt), "MMM d, yyyy")}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    From: {message.senderName || "Camp Staff"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-2">
                  <CampMessageReplyDialog 
                    messageId={message.id} 
                    campId={campId}
                    // For parents, don't enable reply-all functionality
                    hasMultipleRecipients={false}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            No messages yet for this camp
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
