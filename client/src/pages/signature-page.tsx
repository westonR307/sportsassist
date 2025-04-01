import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import SignatureCanvas from 'react-signature-canvas';
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function SignaturePage() {
  const params = useParams<{ token: string }>();
  const { token } = params;
  const { toast } = useToast();
  const [signatureData, setSignatureData] = useState<{[key: string]: any}>({});
  const [sigEmpty, setSigEmpty] = useState(true);
  const sigRef = useRef<SignatureCanvas>(null);
  
  // Query to fetch signature request, document, and fields
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/signature-requests/token/${token}`],
    retry: 1,
    onError: (error: any) => {
      toast({
        title: "Failed to load document",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Initialize field values with any dynamic data we received from the server
  useEffect(() => {
    if (data?.dynamicFieldData && Object.keys(data.dynamicFieldData).length > 0) {
      const dynamicFields = data.fields.filter((field: any) => field.fieldType === 'dynamic_field' && field.dataSource);
      
      // Initialize field values with dynamic data
      const initialFieldValues: {[key: string]: any} = {};
      
      // For each dynamic field, set the value from the dynamicFieldData
      dynamicFields.forEach((field: any) => {
        if (field.dataSource && data.dynamicFieldData[field.dataSource]) {
          initialFieldValues[`field_${field.id}`] = data.dynamicFieldData[field.dataSource];
        }
      });
      
      // Set the initial field values
      setSignatureData(initialFieldValues);
    }
  }, [data]);

  // Mutation for signing document
  const signDocumentMutation = useMutation({
    mutationFn: async (signatureData: any) => {
      return apiRequest('POST', `/api/signature-requests/${data?.signatureRequest.id}/sign`, {
        token: token,
        signature: signatureData.signature,
        fieldValues: signatureData.fieldValues || {}
      });
    },
    onSuccess: () => {
      toast({
        title: "Document signed successfully",
        description: "Thank you for signing this document.",
      });
      
      // Display success UI instead of redirecting
      setSigningComplete(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to sign document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for declining document
  const declineDocumentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', `/api/signature-requests/${data?.signatureRequest.id}/decline`, {
        token
      });
    },
    onSuccess: () => {
      toast({
        title: "Document declined",
        description: "You have declined to sign this document.",
      });
      
      // Display declined UI
      setSigningDeclined(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [signingComplete, setSigningComplete] = useState(false);
  const [signingDeclined, setSigningDeclined] = useState(false);

  // Handle when signature changes
  const handleSignatureChange = () => {
    if (sigRef.current) {
      setSigEmpty(sigRef.current.isEmpty());
    }
  };

  // Handle clearing signature
  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setSigEmpty(true);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (sigEmpty) {
      toast({
        title: "Signature required",
        description: "Please provide your signature to continue.",
        variant: "destructive",
      });
      return;
    }
    
    const signature = sigRef.current?.toDataURL() || '';
    signDocumentMutation.mutate({
      signature,
      fieldValues: signatureData
    });
  };

  // Handle decline
  const handleDecline = () => {
    if (window.confirm("Are you sure you want to decline signing this document?")) {
      declineDocumentMutation.mutate();
    }
  };

  // Check if request is expired or already processed
  const isRequestInactive = data?.signatureRequest.status && data.signatureRequest.status !== 'pending';
  const statusMessage = {
    expired: "This signature request has expired.",
    signed: "This document has already been signed.",
    declined: "You have declined to sign this document.",
    revoked: "This signature request has been revoked by the sender.",
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {isLoading ? (
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-6" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Document</h1>
          <p className="text-muted-foreground mb-4">
            The document you're trying to access is no longer available or the link is invalid.
          </p>
        </div>
      ) : signingComplete ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Document Signed Successfully</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for signing this document. A confirmation has been sent to your email.
          </p>
          <p className="text-sm text-muted-foreground">
            For your reference, this document was signed on {format(new Date(), 'MMMM d, yyyy, h:mm a')}.
          </p>
        </div>
      ) : signingDeclined ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Document Declined</h1>
          <p className="text-muted-foreground mb-4">
            You have declined to sign this document. The sender has been notified.
          </p>
        </div>
      ) : isRequestInactive ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">This request is no longer active</h1>
          <p className="text-muted-foreground mb-4">
            {statusMessage[data.signatureRequest.status as keyof typeof statusMessage] || 
             "This signature request has been processed."}
          </p>
        </div>
      ) : data ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{data.document.title}</h1>
            {data.signatureRequest.message && (
              <Alert className="mt-4">
                <AlertTitle>Message from sender</AlertTitle>
                <AlertDescription>
                  {data.signatureRequest.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Card className="mb-8 shadow-md overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] w-full">
                <div className="p-6">
                  {/* Document Content */}
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: data.document.content.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Separator className="my-8" />

          {/* Dynamic Fields Section */}
          {data.fields && data.fields.filter((field: any) => field.fieldType === 'dynamic_field').length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Information</h2>
              <p className="text-muted-foreground mb-4">
                Please review the following information that will be included in this document.
                You can make changes if needed.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {data.fields
                  .filter((field: any) => field.fieldType === 'dynamic_field')
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((field: any) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={`field_${field.id}`}>{field.label}</Label>
                      <Input
                        id={`field_${field.id}`}
                        value={signatureData[`field_${field.id}`] || ''}
                        onChange={(e) => setSignatureData({
                          ...signatureData,
                          [`field_${field.id}`]: e.target.value
                        })}
                        required={field.required}
                      />
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          
          <Separator className="my-8" />

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Signature</h2>
            <p className="text-muted-foreground mb-4">
              Please sign below to indicate that you have read and agree to the terms presented in the document.
            </p>

            <div className="border rounded-md p-4 mb-4">
              <div className="mb-2">
                <Label>Draw your signature</Label>
              </div>
              <div className="border rounded-md h-40 mb-2 bg-background">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{ className: 'w-full h-full' }}
                  onEnd={handleSignatureChange}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                Clear
              </Button>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={declineDocumentMutation.isPending}
              >
                {declineDocumentMutation.isPending ? "Processing..." : "Decline"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={sigEmpty || signDocumentMutation.isPending}
              >
                {signDocumentMutation.isPending ? "Processing..." : "Sign Document"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}