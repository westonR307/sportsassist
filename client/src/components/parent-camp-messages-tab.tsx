
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail } from "lucide-react";

interface ParentCampMessagesTabProps {
  campId: number;
}

export function ParentCampMessagesTab({ campId }: ParentCampMessagesTabProps) {
  const { data: messages, isLoading } = useQuery({
    queryKey: [`/api/camps/${campId}/messages/parent`],
    refetchOnWindowFocus: false,
  });

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
            {messages.map((message: any) => (
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
                    From: {message.senderName || "Camp Staff"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </CardContent>
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
