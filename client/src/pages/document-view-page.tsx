import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, File, Send, PencilLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Document } from "../../../shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DocumentViewPage() {
  const params = useParams<{ id: string }>();
  const documentId = parseInt(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  
  // Query to fetch document
  const { data: document, isLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    retry: 1,
    enabled: !isNaN(documentId),
    onError: (error: any) => {
      toast({
        title: "Failed to load document",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Query to fetch fields for document
  const { data: fields } = useQuery({
    queryKey: [`/api/documents/${documentId}/fields`],
    enabled: !isNaN(documentId) && !!document,
    retry: 1
  });

  // Mutation for sending signature request
  const sendSignatureRequestMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      return apiRequest(`/api/documents/${documentId}/signature-requests`, {
        method: 'POST',
        body: JSON.stringify({
          requestedForEmail: data.email,
          message: "Please sign this document at your earliest convenience."
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Signature request sent",
        description: `The document has been sent to ${emailAddress} for signature.`,
      });
      setIsSignatureDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send signature request",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle sending signature request
  const handleSendSignatureRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailAddress.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    sendSignatureRequestMutation.mutate({ email: emailAddress });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div>
          <Skeleton className="h-8 w-1/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-destructive text-xl">Failed to load document</div>
          <p className="mt-2">The document might not exist or you don't have permission to view it.</p>
          <Button className="mt-4" asChild>
            <Link to="/documents">Go back to documents</Link>
          </Button>
        </div>
      ) : document ? (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold">{document.title}</h1>
              <div className="flex items-center mt-2">
                <Badge variant={document.status === 'active' ? 'default' : 'secondary'}>
                  {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground ml-3">
                  Created {format(new Date(document.createdAt), 'PPP')}
                </span>
              </div>
              {document.description && (
                <p className="mt-2 text-muted-foreground max-w-2xl">
                  {document.description}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" asChild>
                <Link to={`/documents/${documentId}/edit`}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit Document
                </Link>
              </Button>
              <Button 
                onClick={() => setIsSignatureDialogOpen(true)} 
                disabled={document.status !== 'active'}
              >
                <Send className="mr-2 h-4 w-4" />
                Send for Signature
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Document Preview */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Document Preview</h2>
            <Card className="shadow-md">
              <CardContent className="p-6">
                <ScrollArea className="h-[600px] w-full border rounded-md bg-white p-6">
                  <div className="max-w-3xl mx-auto">
                    <div className="prose prose-sm">
                      {document.content ? (
                        <div dangerouslySetInnerHTML={{ __html: document.content.replace(/\n/g, '<br/>') }} />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          No content available for this document.
                        </div>
                      )}
                    </div>
                    
                    {fields && fields.length > 0 && (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="font-medium mb-2">Signature Fields</h4>
                        <div className="space-y-2">
                          {fields.map((field: any) => (
                            <div key={field.id} className="border rounded p-2 text-sm">
                              <div className="font-medium">{field.label}</div>
                              <div className="text-xs text-muted-foreground">
                                Type: {field.fieldType.charAt(0).toUpperCase() + field.fieldType.slice(1)}
                                {field.required && <span className="ml-2 text-destructive">Required</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Send for Signature Dialog */}
          <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Document for Signature</DialogTitle>
                <DialogDescription>
                  Enter the email address of the person who should sign this document.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendSignatureRequest}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="recipient@example.com" 
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={sendSignatureRequestMutation.isPending || !emailAddress.trim()}
                  >
                    {sendSignatureRequestMutation.isPending ? "Sending..." : "Send Request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}