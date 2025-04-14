import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CustomField } from "@shared/schema";
import { FieldType, ValidationType } from "@shared/types";

// Define the form-compatible custom field type to match CustomFieldFormProps
interface FormCompatibleCustomField {
  id: number;
  name: string;
  label: string;
  description?: string;
  fieldType: FieldType;
  validationType: ValidationType;
  required: boolean;
  options?: string[];
  source?: string;
}

// Helper function to convert CustomField to FormCompatibleCustomField
function convertToFormCompatibleField(field: CustomField, source: 'registration' | 'camp'): FormCompatibleCustomField {
  return {
    id: field.id,
    name: field.name,
    label: field.label,
    description: field.description || undefined,
    fieldType: field.fieldType,
    validationType: field.validationType,
    required: field.required,
    options: field.options ? [...field.options] : undefined,
    source: source
  };
}

// UI components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreVertical, Plus, PenSquare, Trash2 } from "lucide-react";

// Import Custom Field Form
import { CustomFieldForm } from "./custom-field-form";

interface CustomFieldsListProps {
  organizationId: number;
  fieldSource?: 'registration' | 'camp';
}

export function CustomFieldsList({ organizationId, fieldSource = 'registration' }: CustomFieldsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editField, setEditField] = useState<FormCompatibleCustomField | null>(null);
  const [deleteField, setDeleteField] = useState<FormCompatibleCustomField | null>(null);

  // Fetch custom fields based on source
  const { data: customFields, isLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`, fieldSource],
    queryFn: async () => {
      const url = `/api/organizations/${organizationId}/custom-fields?source=${fieldSource}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${fieldSource} custom fields`);
      const fields = await res.json();
      return fields as CustomField[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      // Try the debug endpoint first
      try {
        console.log("Using debug endpoint to delete field:", fieldId);
        const res = await fetch(`/debug/custom-fields/${fieldId}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (res.ok) {
          console.log("Debug delete succeeded");
          return;
        } else {
          console.log("Debug delete failed, trying regular endpoint");
        }
      } catch (err) {
        console.error("Error using debug endpoint:", err);
      }
      
      // Fall back to regular endpoint if debug fails
      const res = await apiRequest("DELETE", `/api/custom-fields/${fieldId}`);
      if (!res.ok) throw new Error("Failed to delete custom field");
    },
    onSuccess: () => {
      toast({
        title: "Custom field deleted",
        description: "The custom field has been deleted successfully.",
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: [`/api/organizations/${organizationId}/custom-fields`, fieldSource],
      });
      
      setDeleteField(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete custom field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Field type display helper
  const getFieldTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      short_text: "Short Text",
      long_text: "Long Text",
      dropdown: "Dropdown",
      single_select: "Single Select",
      multi_select: "Multi Select",
    };
    return typeMap[type] || type;
  };

  // Validation type display helper
  const getValidationTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      none: "None",
      required: "Required",
      email: "Email",
      phone: "Phone Number",
      number: "Number",
      date: "Date",
    };
    return typeMap[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getTitleText = () => {
    return fieldSource === 'registration' 
      ? "Registration Custom Fields" 
      : "Camp Meta Fields";
  };
  
  const getDescriptionText = () => {
    return fieldSource === 'registration'
      ? "Create reusable fields for your camp registration forms"
      : "Create custom fields to store additional information about your camps";
  };
  
  const getEmptyStateText = () => {
    return fieldSource === 'registration'
      ? "Create custom fields to collect specific information from camp participants during registration."
      : "Create custom fields to store additional information about your camps.";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{getTitleText()}</h2>
          <p className="text-muted-foreground">
            {getDescriptionText()}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-1 items-center">
              <Plus className="h-4 w-4" />
              New Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create {fieldSource === 'camp' ? 'Camp Meta' : 'Custom'} Field</DialogTitle>
            </DialogHeader>
            <CustomFieldForm
              organizationId={organizationId}
              fieldSource={fieldSource}
              onSuccess={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {customFields?.length === 0 ? (
        <div className="bg-muted/50 border rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium">No {fieldSource} fields yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {getEmptyStateText()}
          </p>
          <Button
            className="mt-4"
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Your First Field
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customFields?.map((field) => (
            <Card key={field.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{field.label}</CardTitle>
                    <CardDescription className="text-xs font-mono mt-1">
                      {field.name}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditField(convertToFormCompatibleField(field, fieldSource));
                        }}
                        className="flex items-center gap-2"
                      >
                        <PenSquare className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteField(convertToFormCompatibleField(field, fieldSource));
                        }}
                        className="flex items-center gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">
                    {getFieldTypeLabel(field.fieldType)}
                  </Badge>
                  {field.validationType !== "none" && (
                    <Badge variant="outline">
                      {getValidationTypeLabel(field.validationType)}
                    </Badge>
                  )}
                  {field.required && (
                    <Badge variant="secondary">Required</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {field.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {field.description}
                  </p>
                )}
              </CardContent>
              {(field.options?.length || 0) > 0 && (
                <CardFooter className="pt-0">
                  <div className="w-full">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Options:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {field.options?.slice(0, 5).map((option) => (
                        <Badge
                          key={option}
                          variant="secondary"
                          className="text-xs py-0"
                        >
                          {option}
                        </Badge>
                      ))}
                      {(field.options?.length || 0) > 5 && (
                        <Badge
                          variant="outline"
                          className="text-xs py-0"
                        >
                          +{(field.options?.length || 0) - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Field Dialog */}
      {editField && (
        <Dialog
          open={!!editField}
          onOpenChange={(open) => !open && setEditField(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {fieldSource === 'camp' ? 'Camp Meta' : 'Custom'} Field</DialogTitle>
            </DialogHeader>
            <CustomFieldForm
              organizationId={organizationId}
              customField={editField}
              fieldSource={fieldSource}
              onSuccess={() => setEditField(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteField}
        onOpenChange={(open) => !open && setDeleteField(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {fieldSource === 'camp' ? 'camp meta' : 'custom'} field "{deleteField?.label}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteField && deleteMutation.mutate(deleteField.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}