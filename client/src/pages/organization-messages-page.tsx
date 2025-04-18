import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowLeft } from "lucide-react";
import { BackButton } from "@/components/back-button";

import { format } from "date-fns";

type CampBasicInfo = {
  id: number;
  name: string;
};

type MessageReply = {
  id: number;
  messageId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
};

type CampMessage = {
  id: number;
  campId: number;
  campName: string;
  organizationId: number;
  senderId: number;
  senderName: string;
  subject: string;
  content: string;
  sentToAll: boolean;
  createdAt: string;
  recipientsCount: number;
  replies?: MessageReply[];
};

export default function OrganizationMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCamp, setSelectedCamp] = useState<number | "all">("all");
  
  // Fetch organization data
  const { data: organization, isLoading: isLoadingOrg } = useQuery<any>({
    queryKey: user?.organizationId ? [`/api/organizations/${user.organizationId}`] : null,
    enabled: !!user?.organizationId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      toast({
        title: "Error fetching organization",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
  
  // Fetch all camps
  const { data: camps } = useQuery<CampBasicInfo[]>({
    queryKey: ["/api/camps"],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    onError: (error) => {
      toast({
        title: "Error fetching camps",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
  
  // Fetch all camp messages for organization
  const { data: messages, isLoading: isLoadingMessages } = useQuery<CampMessage[]>({
    queryKey: user?.organizationId ? [`/api/organizations/${user.organizationId}/camp-messages`] : null,
    enabled: !!user?.organizationId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    onError: (error) => {
      toast({
        title: "Error fetching camp messages",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Filter messages based on search term and selected camp
  const filteredMessages = messages?.filter(message => {
    // Filter by search term (looking in subject and content)
    const matchesSearch = searchTerm === "" || 
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.campName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by selected camp
    const matchesCamp = selectedCamp === "all" || message.campId === selectedCamp;
    
    return matchesSearch && matchesCamp;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization Messages</CardTitle>
          <CardDescription>
            View and manage messages sent across all your camps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select 
              value={selectedCamp.toString()} 
              onValueChange={(value) => setSelectedCamp(value === "all" ? "all" : parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Camp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Camps</SelectItem>
                {camps?.map((camp) => (
                  <SelectItem key={camp.id} value={camp.id.toString()}>
                    {camp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMessages && filteredMessages.length > 0 ? (
              <div className="divide-y">
                {filteredMessages.map((message) => (
                  <div key={message.id} className="p-4 hover:bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-medium">{message.subject}</h3>
                      <Badge variant="outline">
                        {format(new Date(message.createdAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>From: {message.senderName}</span>
                      <span>•</span>
                      <span>Camp: {message.campName}</span>
                      <span>•</span>
                      <span>
                        Recipients: {message.sentToAll ? "All Participants" : message.recipientsCount}
                      </span>
                    </div>
                    <div className="text-sm mt-2 whitespace-pre-wrap">
                      {message.content.length > 200
                        ? `${message.content.substring(0, 200)}...`
                        : message.content}
                    </div>
                    
                    {/* Display message replies if any */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="mt-4 ml-4 border-l-2 pl-4">
                        <h4 className="text-sm font-medium mb-2">Replies ({message.replies.length})</h4>
                        <div className="space-y-3">
                          {message.replies.map((reply) => (
                            <div key={reply.id} className="bg-muted p-3 rounded-md">
                              <div className="flex justify-between items-start mb-1">
                                <div className="text-xs font-medium">{reply.senderName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(reply.createdAt), "MMM d, yyyy h:mm a")}
                                </div>
                              </div>
                              <div className="text-sm">{reply.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No messages found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || selectedCamp !== "all"
                    ? "Try adjusting your search filters"
                    : "Send your first message from a camp page"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between"></CardFooter>
      </Card>
    </div>
  );
}