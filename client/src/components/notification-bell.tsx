import { Bell } from "lucide-react";
import { useState } from "react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount, messages } = useUnreadMessages();
  const [open, setOpen] = useState(false);

  // Group messages by camp
  const messagesByCamp = messages?.reduce((acc: Record<string, any[]>, msg) => {
    const campId = msg.message.campId;
    if (!acc[campId]) {
      acc[campId] = [];
    }
    acc[campId].push(msg);
    return acc;
  }, {});

  // Sort messages by date (newest first)
  const sortedMessages = messages?.sort((a, b) => {
    return new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime();
  });

  // Get most recent 5 messages
  const recentMessages = sortedMessages?.slice(0, 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-medium">Notifications</h4>
          <Badge variant="outline" className="text-xs">
            {unreadCount} unread
          </Badge>
        </div>
        <ScrollArea className="h-[300px]">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentMessages?.map((msg) => (
                <Link 
                  key={`${msg.message.id}-${msg.recipient.id}`} 
                  href="/parent/messages"
                  onClick={() => setOpen(false)}
                >
                  <div className={cn(
                    "flex gap-3 p-3 hover:bg-muted/50 cursor-pointer",
                    !msg.recipient.isRead && "bg-primary/5"
                  )}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {msg.message.senderName?.substring(0, 2) || "CS"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium truncate">
                          {!msg.recipient.isRead && <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1"></span>}
                          {msg.message.subject}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(msg.message.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-medium">{msg.message.campName}:</span> {msg.message.content.substring(0, 60)}
                        {msg.message.content.length > 60 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {messages.length > 5 && (
                <div className="p-3 border-t">
                  <Link href="/parent/messages" onClick={() => setOpen(false)}>
                    <Button variant="link" className="w-full text-xs">
                      View all {messages.length} notifications
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}