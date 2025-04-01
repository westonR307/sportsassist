import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, AlertCircle, Clock, FileText, ChevronRight, Pen } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import DocumentPreviewDialog from "./document-preview-dialog";

interface DocumentAgreementsSelectorProps {
  campId: number;
}

export function DocumentAgreementsSelector({ campId }: DocumentAgreementsSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Fetch available documents
  const { data: documents, isLoading: isLoadingDocuments, error: documentsError } = useQuery({
    queryKey: ['/api/documents'],
    enabled: true,
  });

  // Fetch current camp agreement
  const { data: campAgreements, isLoading: isLoadingAgreements, error: agreementsError } = useQuery({
    queryKey: [`/api/camps/${campId}/agreements`],
    enabled: !!campId,
  });

  // Set selected document when camp agreements are loaded
  useEffect(() => {
    if (campAgreements && campAgreements.length > 0) {
      setSelectedDocumentId(campAgreements[0].documentId);
    }
  }, [campAgreements]);
  
  // Handle opening preview dialog
  const handleOpenPreview = (documentId: number) => {
    setPreviewDocumentId(documentId);
    setIsPreviewOpen(true);
  };

  // Update camp agreement mutation
  const updateAgreementMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest(
        'PUT', 
        `/api/camps/${campId}/agreements`,
        { documentId }
      );
    },
    onSuccess: () => {
      toast({
        title: 'Agreement updated',
        description: 'The camp agreement has been updated successfully.',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/agreements`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating agreement',
        description: error.message || 'There was an error updating the camp agreement.',
        variant: 'destructive',
      });
    },
  });

  // Handle document selection
  const handleDocumentSelect = (documentId: number) => {
    setSelectedDocumentId(documentId);
  };

  // Save selected document as camp agreement
  const saveSelectedDocument = () => {
    if (selectedDocumentId) {
      updateAgreementMutation.mutate(selectedDocumentId);
    }
  };

  if (isLoadingDocuments || isLoadingAgreements) {
    return <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>;
  }

  if (documentsError || agreementsError) {
    return (
      <div className="p-4 border rounded-md bg-red-50 text-red-700">
        <AlertCircle className="h-5 w-5 mb-2" />
        <p>Error loading documents or agreements.</p>
        <p className="text-sm">{(documentsError as Error)?.message || (agreementsError as Error)?.message}</p>
      </div>
    );
  }

  const isAgreementActive = campAgreements && campAgreements.length > 0;
  
  // Find the current agreement document details
  const currentAgreementDocument = isAgreementActive && documents ? 
    documents.find((doc: any) => doc.id === campAgreements[0].documentId) : null;

  return (
    <div className="space-y-4">
      {/* Document Preview Dialog */}
      <DocumentPreviewDialog 
        documentId={previewDocumentId} 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen} 
      />
      
      {isAgreementActive && currentAgreementDocument && (
        <div className="bg-green-50 p-4 rounded-md border border-green-200 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-green-800">Active Agreement</h4>
            <p className="text-sm text-green-700">
              {currentAgreementDocument.title}
            </p>
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8" 
                onClick={() => handleOpenPreview(currentAgreementDocument.id)}
              >
                <FileText className="h-4 w-4 mr-1" />
                View
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-md p-4 space-y-4">
        <h4 className="text-sm font-medium">Select a Different Agreement</h4>
        
        {documents && documents.length > 0 ? (
          <>
            <RadioGroup
              value={selectedDocumentId?.toString()}
              onValueChange={(value) => handleDocumentSelect(parseInt(value))}
              className="space-y-2"
            >
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className={`flex items-start space-x-3 p-3 rounded-md border ${
                    selectedDocumentId === doc.id
                      ? "bg-primary/5 border-primary"
                      : "bg-white hover:bg-muted/30"
                  }`}
                >
                  <RadioGroupItem value={doc.id.toString()} id={`doc-${doc.id}`} />
                  <div className="flex-1">
                    <Label
                      htmlFor={`doc-${doc.id}`}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant={doc.status === "active" ? "default" : "outline"}>
                        {doc.status}
                      </Badge>
                    </Label>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => handleOpenPreview(doc.id)}
                      >
                        Preview <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <Button 
              onClick={saveSelectedDocument} 
              disabled={!selectedDocumentId || updateAgreementMutation.isPending}
              className="mt-4"
            >
              {updateAgreementMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>Save Agreement Selection</>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center p-6 border border-dashed rounded-md">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">No Documents Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a document first to set it as the camp agreement.
            </p>
            <Link href="/documents/create">
              <Button>
                <Pen className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentAgreementsSelector;