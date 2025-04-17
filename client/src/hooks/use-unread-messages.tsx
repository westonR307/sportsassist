import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

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

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const queryKey = [`/api/parent/${user?.id}/camp-messages`];

  const { data: messages, isLoading, error } = useQuery<MessageWithRecipient[]>({
    queryKey,
    enabled: !!user?.id && user?.role === "parent",
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Ensure messages is an array before using array methods
    const messagesArray = Array.isArray(messages) ? messages : [];
    
    if (messagesArray.length > 0) {
      // Use proper type checking within the filter as well
      const count = messagesArray.filter(msg => 
        msg && typeof msg === 'object' && 
        msg.recipient && typeof msg.recipient === 'object' && 
        msg.recipient.isRead === false
      ).length;
      
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [messages]);

  return {
    unreadCount,
    isLoading,
    error,
    messages
  };
}