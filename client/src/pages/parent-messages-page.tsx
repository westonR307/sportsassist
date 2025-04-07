
import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import { ParentSidebar } from "@/components/parent-sidebar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Circle, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CampMessageReplyDialog } from "@/components/camp-message-reply-dialog";

interface CampMessageRecipient {
  id: number;
  parentId: number;
  messageId: number;
  isRead: boolean;
  createdAt: string;
}

interface CampMessage {
  id: number;
  subject: string;
  content: string;
  senderName: string;
  createdAt: string;
  sentToAll: boolean;
  campId: number;
  campName: string;
}

interface MessageWithRecipient {
  message: CampMessage;
  recipient: CampMessageRecipient;
}

export function ParentMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = [`/api/parent/${user?.id}/camp-messages`];

  const { data: messages, isLoading } = useQuery<MessageWithRecipient[]>({
    queryKey,
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for marking a message as read
  const markAsReadMutation = useMutation({
    mutationFn: ({ messageId, recipientId }: { messageId: number; recipientId: number }) => 
      apiRequest(`/api/camp-messages/${messageId}/recipients/${recipientId}/read`, {
        method: 'PATCH'
      }),
    onSuccess: () => {
      // Invalidate the messages query to refetch with updated read status
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mark unread messages as read when component mounts
  useEffect(() => {
    if (messages) {
      // Find all unread messages
      const unreadMessages = messages.filter(
        (msg) => !msg.recipient.isRead
      );

      // Mark each unread message as read
      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate({
          messageId: msg.message.id,
          recipientId: msg.recipient.id
        });
      });
    }
  }, [messages]);

  // Group messages by camp
  const messagesByCamp = messages?.reduce((acc: Record<string, MessageWithRecipient[]>, msg) => {
    const campId = msg.message.campId;
    if (!acc[campId]) {
      acc[campId] = [];
    }
    acc[campId].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-background">
      <ParentSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <span className="loading loading-spinner">Loading...</span>
            </div>
          ) : messages?.length > 0 ? (
            <div className="space-y-8">
              {messagesByCamp && Object.entries(messagesByCamp).map(([campId, campMessages]) => (
                <div key={campId} className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {campMessages[0].message.campName || "Camp"}
                  </h2>
                  <div className="space-y-4 pl-4">
                    {campMessages.map((msg) => (
                      <Card 
                        key={msg.message.id} 
                        className={`shadow-sm ${!msg.recipient.isRead ? 'border-primary' : ''}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {!msg.recipient.isRead && (
                                <Circle className="h-2 w-2 fill-primary text-primary" />
                              )}
                              <CardTitle className="text-base">{msg.message.subject}</CardTitle>
                            </div>
                            <Badge variant="outline">
                              {format(new Date(msg.message.createdAt), "MMM d, yyyy")}
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            From: {msg.message.senderName || "Camp Staff"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.message.content}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-2">
                          <CampMessageReplyDialog 
                            messageId={msg.message.id} 
                            campId={msg.message.campId}
                          />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No messages yet
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}

export default ParentMessagesPage;
