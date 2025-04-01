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
            
            <div className="border rounded-md p-4 my-4 bg-white">
              <div className="prose prose-sm max-w-none">
                {document.content ? (
                  <div dangerouslySetInnerHTML={{ __html: document.content }} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No content available for preview
                  </p>
                )}
              </div>
            </div>
            
            {document.fields && document.fields.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Form Fields</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {document.fields.map((field: any) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 border rounded">
                      <span className="font-medium truncate">{field.label}</span>
                      <Badge variant="outline" className="ml-auto">
                        {field.fieldType}
                      </Badge>
                      {field.required && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close Preview
              </Button>
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