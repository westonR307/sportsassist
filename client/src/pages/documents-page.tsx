import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, File, Calendar, ChevronRight, Pencil, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { 
  Dialog, 
  DialogClose,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Document } from "../../../shared/schema";

export default function DocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Query to fetch all documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['/api/documents'],
    retry: 1,
    onError: (error: any) => {
      toast({
        title: "Failed to load documents",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for creating a new document
  const createDocumentMutation = useMutation({
    mutationFn: async (formData: { title: string; description: string; content: string; type: string; status: string; }) => {
      return apiRequest('POST', '/api/documents', formData);
    },
    onSuccess: () => {
      toast({
        title: "Document created",
        description: "The document was created successfully.",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a document
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a document
  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createDocumentMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      content: formData.get('content') as string,
      type: 'waiver', // Default type for now
      status: 'draft', // Start as draft
    });
  };

  // Handle document deletion
  const handleDeleteDocument = (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage waivers, forms, and legal documents for your camps
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-destructive text-xl">Failed to load documents</div>
          <p className="mt-2">Please try again later</p>
        </div>
      ) : documents?.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <File className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            Create your first waiver, form, or legal document to get started.
          </p>
          <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document: Document) => (
            <Card key={document.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle>{document.title}</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/documents/${document.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteDocument(document)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    document.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : document.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {document.type === 'waiver' ? 'Waiver' : 'Form'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {document.description || "No description provided"}
                </p>
                <div className="mt-3 flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span>
                    Created {format(new Date(document.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/documents/${document.id}`}>
                    Preview
                  </Link>
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="ml-2"
                  disabled={document.status !== 'active'}
                  asChild
                >
                  <Link to={`/documents/${document.id}/send`}>
                    <Send className="mr-2 h-3.5 w-3.5" />
                    Send for Signature
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Document Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleCreateDocument}>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Add a new waiver, form, or legal document for your camp participants.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Liability Waiver"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Briefly describe the purpose of this document"
                  className="col-span-3"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="content" className="text-right pt-2">
                  Content
                </Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter the document text or paste your content here"
                  className="col-span-3"
                  rows={6}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDocumentMutation.isPending}>
                {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}