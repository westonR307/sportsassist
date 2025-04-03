import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CampMetaField, CustomField } from "@shared/schema";

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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { CustomFieldResponse } from "./custom-field-response";

interface CampMetaFieldWithField extends CampMetaField {
  field: CustomField;
}

interface CampMetaFieldsProps {
  campId: number;
  readOnly?: boolean;
}

export function CampMetaFields({ campId, readOnly = false }: CampMetaFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState<boolean>(false);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState<boolean>(false);

  // Get all custom fields for the organization, filtered for camp fields
  const { data: allCustomFields, isLoading: isLoadingFields } = useQuery({
    queryKey: ["/api/organizations", "custom-fields", "camp"],
    queryFn: async () => {
      // Get the organization ID from the camp
      const campRes = await fetch(`/api/camps/${campId}`);
      if (!campRes.ok) throw new Error("Failed to fetch camp");
      const camp = await campRes.json();
      
      // Fetch custom fields for this organization, filtered to "camp" source
      const res = await fetch(`/api/organizations/${camp.organizationId}/custom-fields?source=camp`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json() as Promise<CustomField[]>;
    },
  });

  // Get existing camp meta fields
  const { data: campMetaFields, isLoading: isLoadingCampFields } = useQuery({
    queryKey: [`/api/camps/${campId}/meta-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/meta-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp meta fields");
      return res.json() as Promise<CampMetaFieldWithField[]>;
    },
  });

  // Create a new camp meta field
  const createCampMetaField = useMutation({
    mutationFn: async (data: { customFieldId: number, response?: string, responseArray?: string[] }) => {
      return apiRequest(`/api/camps/${campId}/meta-fields`, {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({
        title: "Success",
        description: "Field added to camp successfully",
      });
      setAddFieldDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add field to camp",
        variant: "destructive",
      });
    },
  });

  // Update a camp meta field
  const updateCampMetaField = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<CampMetaField> }) => {
      return apiRequest(`/api/camp-meta-fields/${id}`, {
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({
        title: "Success",
        description: "Field updated successfully",
      });
      setFieldDialogOpen(false);
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update field",
        variant: "destructive",
      });
    },
  });

  // Delete a camp meta field
  const deleteCampMetaField = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/camp-meta-fields/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({
        title: "Success",
        description: "Field removed successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove field",
        variant: "destructive",
      });
    },
  });

  // Handler for adding a field to the camp
  const handleAddField = (fieldId: number) => {
    createCampMetaField.mutate({ customFieldId: fieldId });
  };

  // Get the selected field
  const selectedField = selectedFieldId 
    ? campMetaFields?.find(f => f.id === selectedFieldId) 
    : null;

  // Filter out fields that are already added to the camp
  const availableFields = allCustomFields?.filter(field => 
    !campMetaFields?.some(campField => campField.customFieldId === field.id)
  ) || [];

  const isLoading = isLoadingFields || isLoadingCampFields;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Camp Custom Fields</CardTitle>
            <CardDescription>
              Add custom fields to capture additional camp information
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={addFieldDialogOpen} onOpenChange={setAddFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Field to Camp</DialogTitle>
                </DialogHeader>
                
                {availableFields.length > 0 ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {availableFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex justify-between items-center border p-3 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleAddField(field.id)}
                      >
                        <div>
                          <h4 className="font-medium">{field.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {field.description || field.name}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">
                              {field.fieldType}
                            </Badge>
                            <Badge variant={field.isInternal ? "secondary" : "outline"}>
                              {field.isInternal ? "Internal" : "Public"}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground">
                      No available fields to add. Create new custom fields in the
                      organization settings.
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {campMetaFields && campMetaFields.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Field</TableHead>
                <TableHead className="w-[30%]">Type</TableHead>
                <TableHead className="w-[30%]">Value</TableHead>
                {!readOnly && <TableHead className="w-[10%]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campMetaFields.map((campField) => (
                <TableRow key={campField.id}>
                  <TableCell className="font-medium">
                    {campField.field.label}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {campField.field.fieldType}
                      </Badge>
                      {campField.field.isInternal && (
                        <Badge variant="secondary">Internal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px] truncate">
                      {campField.response || 
                        (campField.responseArray?.length ? campField.responseArray.join(", ") : "-")}
                    </div>
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditMode(true);
                              setSelectedFieldId(campField.id);
                              setFieldDialogOpen(true);
                            }}
                          >
                            <PenSquare className="h-4 w-4 mr-2" />
                            Edit Value
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedFieldId(campField.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-10 text-center border rounded-md">
            <p className="text-muted-foreground">
              No custom fields added to this camp yet.
            </p>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setAddFieldDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            )}
          </div>
        )}

        {/* Field edit dialog */}
        {selectedField && (
          <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editMode ? "Edit Field Value" : "Field Details"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{selectedField.field.label}</h3>
                    {selectedField.field.isInternal && (
                      <Badge variant="secondary" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedField.field.description || selectedField.field.name}
                  </p>
                </div>
                
                {editMode ? (
                  <CustomFieldResponse
                    field={selectedField.field}
                    value={selectedField.response || undefined}
                    valueArray={selectedField.responseArray || undefined}
                    onChange={(value, valueArray) => {
                      updateCampMetaField.mutate({
                        id: selectedField.id,
                        data: {
                          response: value,
                          responseArray: valueArray,
                        },
                      });
                    }}
                  />
                ) : (
                  <div className="border p-3 rounded-md bg-muted/30">
                    <p className="break-words">
                      {selectedField.response || 
                       (selectedField.responseArray?.length ? selectedField.responseArray.join(", ") : "-")}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  {editMode ? (
                    <>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setEditMode(false)}
                        disabled={updateCampMetaField.isPending}
                      >
                        {updateCampMetaField.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
                        Close
                      </Button>
                      {!readOnly && (
                        <Button onClick={() => setEditMode(true)}>
                          Edit Value
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete confirmation dialog */}
        {selectedField && (
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Custom Field</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{selectedField.field.label}" from this camp?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteCampMetaField.mutate(selectedField.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteCampMetaField.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}