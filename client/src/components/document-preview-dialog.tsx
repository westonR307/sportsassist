import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// CSS styles for document content
const documentContentStyles = `
  .document-content {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    font-size: 0.95rem;
    white-space: pre-wrap;
  }
  
  .document-content p {
    margin-bottom: 1rem;
  }
  
  .document-content h1, .document-content h2, .document-content h3, 
  .document-content h4, .document-content h5, .document-content h6 {
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .document-content h1 { font-size: 1.5rem; }
  .document-content h2 { font-size: 1.3rem; }
  .document-content h3 { font-size: 1.2rem; }
  .document-content h4 { font-size: 1.1rem; }
  
  .document-content ul, .document-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .document-content li {
    margin-bottom: 0.5rem;
  }
  
  .document-content strong, .document-content b {
    font-weight: bold;
  }
  
  .document-content em, .document-content i {
    font-style: italic;
  }
  
  .document-content blockquote {
    border-left: 3px solid #e2e8f0;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
  }
  
  .document-content table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .document-content table td, .document-content table th {
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
  }
  
  .document-content table th {
    background-color: #f8fafc;
    font-weight: bold;
  }
`;

interface DocumentPreviewDialogProps {
  documentId: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  documentId,
  isOpen,
  onOpenChange,
}) => {
  const { toast } = useToast();
  
  // Fetch document data
  const { data: document, isLoading, error } = useQuery({
    queryKey: documentId ? [`/api/documents/${documentId}`] : [],
    enabled: !!documentId && isOpen,
    onError: (error: any) => {
      toast({
        title: "Error loading document",
        description: error.message || "Could not load the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!documentId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Add style tag for document content styling */}
      <style dangerouslySetInnerHTML={{ __html: documentContentStyles }} />
      
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Document</h3>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message || "Could not load the document. Please try again."}
            </p>
          </div>
        ) : document ? (
          <>
            <DialogHeader>
              <div className="flex justify-between items-center gap-4">
                <DialogTitle className="text-xl">{document.title}</DialogTitle>
                <Badge variant={document.status === "active" ? "default" : "outline"}>
                  {document.status}
                </Badge>
              </div>
              {document.description && (
                <DialogDescription>{document.description}</DialogDescription>
              )}
            </DialogHeader>
            
            <div className="border rounded-md p-6 my-4 bg-white shadow-sm">
              <div className="prose prose-sm max-w-none overflow-auto">
                {document.content ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: document.content }} 
                    className="document-content"
                    style={{
                      lineHeight: "1.6",
                      fontSize: "0.95rem",
                      whiteSpace: "pre-wrap",
                      padding: "1rem"
                    }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No content available for preview
                  </p>
                )}
              </div>
            </div>
            
            {document.fields && document.fields.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <span className="px-2 py-1 bg-muted rounded-md mr-2">Fields</span>
                  <span className="text-muted-foreground text-xs">The following fields are defined in this document</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {document.fields.map((field: any) => (
                    <div key={field.id} className="flex items-center gap-2 p-3 border rounded-md shadow-sm bg-card">
                      <span className="font-medium truncate">{field.label}</span>
                      <Badge variant={field.fieldType === "signature" ? "default" : "outline"} className="ml-auto whitespace-nowrap">
                        {field.fieldType.replace('_', ' ')}
                      </Badge>
                      {field.required && (
                        <div className="flex items-center">
                          <Check className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground ml-1">Required</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t pt-4">
              <div className="text-xs text-muted-foreground mb-4 sm:mb-0">
                <p>Last updated: {document.updatedAt ? new Date(document.updatedAt).toLocaleDateString() : 'N/A'}</p>
                {document.version && <p>Version: {document.version}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close Preview
                </Button>
                {document.status === "active" && (
                  <Button variant="default" onClick={() => onOpenChange(false)}>
                    Use Document
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold">No Document Found</h3>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewDialog;