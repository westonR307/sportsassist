import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendCampMessageDialog } from "@/components/send-camp-message-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampMessage {
  id: number;
  campId: number;
  subject: string;
  content: string;
  sentById: number;
  sentBy: {
    username: string;
    first_name: string;
    last_name: string;
  };
  createdAt: string;
  updatedAt: string;
  sentToAll: boolean;
  emailSent: boolean;
  recipientsCount?: number;
}

interface CampMessagesTabProps {
  campId: number;
  campName: string;
  hasPermission: boolean;
}

export function CampMessagesTab({ 
  campId, 
  campName, 
  hasPermission 
}: CampMessagesTabProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  const { data: messages, isLoading, isError, error, refetch } = useQuery({
    queryKey: [`/api/camps/${campId}/messages`],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    select: (data: CampMessage[]) => {
      // Sort messages by createdAt date in descending order (newest first)
      return [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    onError: (error) => {
      console.error("Error fetching camp messages:", error);
      toast({
        title: "Failed to load messages",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  function formatSenderName(message: CampMessage) {
    if (message.sentBy?.first_name && message.sentBy?.last_name) {
      return `${message.sentBy.first_name} ${message.sentBy.last_name}`;
    }
    return message.sentBy?.username || "Unknown sender";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Camp Messages</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
          {hasPermission && (
            <SendCampMessageDialog campId={campId} campName={campName} />
          )}
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          {/* Future tabs could include: Sent by Me, Recent, etc. */}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">
                {error instanceof Error ? error.message : "Failed to load messages"}
              </p>
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : messages && messages.length > 0 ? (
            <ScrollArea className="h-[400px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <Card key={message.id} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{message.subject}</CardTitle>
                        <Badge variant="outline">
                          {format(new Date(message.createdAt), "MMM d, yyyy")}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        From: {formatSenderName(message)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content.length > 300 
                          ? `${message.content.substring(0, 300)}...` 
                          : message.content}
                      </div>
                      
                      {/* Display message replies if any */}
                      {message.replies && message.replies.length > 0 && (
                        <div className="mt-4 border-t pt-3">
                          <h4 className="text-sm font-medium mb-2">Replies</h4>
                          <div className="space-y-3">
                            {message.replies.map((reply) => (
                              <div key={reply.id} className="bg-muted p-3 rounded-md">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-xs font-medium">{reply.senderName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(reply.createdAt), "MMM d, yyyy h:mm a")}
                                  </div>
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{reply.content}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                      <div>
                        Sent to: {message.sentToAll ? "All Participants" : "Selected Participants"}
                      </div>
                      <div>
                        {message.emailSent ? (
                          <span className="text-green-600">Email Sent</span>
                        ) : (
                          <span className="text-amber-600">Email Pending</span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No messages have been sent for this camp yet.</p>
              {/* We already have a send message button in the header, so removing the duplicate one here */}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}