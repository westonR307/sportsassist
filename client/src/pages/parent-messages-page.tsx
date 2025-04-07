
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParentSidebar } from "@/components/parent-sidebar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail } from "lucide-react";

export function ParentMessagesPage() {
  const { user } = useAuth();

  const { data: messages, isLoading } = useQuery({
    queryKey: [`/api/parent/${user?.id}/camp-messages`],
    enabled: !!user?.id,
  });

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
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <Card key={msg.message.id} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{msg.message.subject}</CardTitle>
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
                </Card>
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
