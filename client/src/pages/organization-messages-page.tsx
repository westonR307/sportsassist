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
};

export default function OrganizationMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCamp, setSelectedCamp] = useState<number | "all">("all");
  
  // Fetch all camps
  const { data: camps } = useQuery<CampBasicInfo[]>({
    queryKey: ["/api/camps/basic-info"],
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
  const { data: messages, isLoading } = useQuery<CampMessage[]>({
    queryKey: ["/api/organizations/camp-messages"],
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
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMessages && filteredMessages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Camp</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead className="text-right">Recipients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(message.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{message.campName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {message.subject}
                      </TableCell>
                      <TableCell>{message.senderName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{message.recipientsCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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