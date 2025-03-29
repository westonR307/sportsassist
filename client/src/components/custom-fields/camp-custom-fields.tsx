import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CampCustomField, CustomField } from "@shared/schema";

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
import { Loader2, MoreVertical, Plus, PenSquare, Trash2, GripVertical, MoveUp, MoveDown } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CampCustomFieldsProps {
  campId: number;
  organizationId: number;
}

type CampFieldWithDetails = CampCustomField & { field: CustomField };

export function CampCustomFields({ 
  campId, 
  organizationId 
}: CampCustomFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [deleteFieldId, setDeleteFieldId] = useState<number | null>(null);

  // Fetch custom fields for this camp
  const { data: campFields, isLoading: isLoadingCampFields } = useQuery({
    queryKey: [`/api/camps/${campId}/custom-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/custom-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp custom fields");
      return res.json() as Promise<CampFieldWithDetails[]>;
    },
  });

  // Fetch all organization custom fields (available to add)
  const { data: orgFields, isLoading: isLoadingOrgFields } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/custom-fields`);
      if (!res.ok) throw new Error("Failed to fetch organization custom fields");
      return res.json() as Promise<CustomField[]>;
    },
  });

  // Add field mutation
  const addFieldMutation = useMutation({
    mutationFn: async (customFieldId: number) => {
      const res = await apiRequest("POST", `/api/camps/${campId}/custom-fields`, {
        customFieldId,
        order: campFields?.length || 0,
      });
      if (!res.ok) throw new Error("Failed to add field to camp");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Field added to camp",
        description: "The custom field has been added to the registration form.",
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/camps/${campId}/custom-fields`],
      });
      
      setAddFieldDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update field order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, order }: { id: number; order: number }) => {
      const res = await apiRequest("PATCH", `/api/camp-custom-fields/${id}`, {
        order,
      });
      if (!res.ok) throw new Error("Failed to update field order");
      return await res.json();
    },
    onSuccess: () => {
      // No toast needed for reordering to reduce noise
      queryClient.invalidateQueries({
        queryKey: [`/api/camps/${campId}/custom-fields`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update field order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update required status mutation
  const updateRequiredMutation = useMutation({
    mutationFn: async ({ id, required }: { id: number; required: boolean }) => {
      const res = await apiRequest("PATCH", `/api/camp-custom-fields/${id}`, {
        required,
      });
      if (!res.ok) throw new Error("Failed to update field");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/camps/${campId}/custom-fields`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Remove field mutation
  const removeFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/camp-custom-fields/${id}`);
      if (!res.ok) throw new Error("Failed to remove field from camp");
    },
    onSuccess: () => {
      toast({
        title: "Field removed",
        description: "The field has been removed from the registration form.",
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/camps/${campId}/custom-fields`],
      });
      
      setDeleteFieldId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !campFields) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    // Update the order in the database
    const fieldsToUpdate = [...campFields];
    const [movedField] = fieldsToUpdate.splice(sourceIndex, 1);
    fieldsToUpdate.splice(destinationIndex, 0, movedField);
    
    // Update all affected fields' order
    fieldsToUpdate.forEach((field, index) => {
      if (field.order !== index) {
        updateOrderMutation.mutate({ id: field.id, order: index });
      }
    });
  };

  // Get available fields (not already added to camp)
  const getAvailableFields = () => {
    if (!orgFields || !campFields) return [];
    
    const campFieldIds = new Set(campFields.map(cf => cf.customFieldId));
    return orgFields.filter(field => !campFieldIds.has(field.id));
  };

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

  if (isLoadingCampFields) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableFields = getAvailableFields();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Registration Form Fields</h3>
          <p className="text-muted-foreground">
            Customize what information to collect during registration
          </p>
        </div>
        <Dialog open={addFieldDialogOpen} onOpenChange={setAddFieldDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-1 items-center">
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {isLoadingOrgFields ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableFields.length === 0 ? (
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-muted-foreground">
                    No available custom fields. Create custom fields in your organization settings first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select custom fields to add to this camp's registration form:
                  </p>
                  <div className="grid gap-2">
                    {availableFields.map((field) => (
                      <Card key={field.id} className="overflow-hidden">
                        <div className="p-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{field.label}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getFieldTypeLabel(field.fieldType)}
                              </Badge>
                              {field.required && (
                                <Badge variant="secondary" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            {field.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {field.description}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => addFieldMutation.mutate(field.id)}
                            disabled={addFieldMutation.isPending}
                            size="sm"
                          >
                            {addFieldMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!campFields || campFields.length === 0 ? (
        <div className="bg-muted/50 border rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium">No custom fields added</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Add custom fields to collect specific information from participants
            during registration.
          </p>
          <Button
            className="mt-4"
            onClick={() => setAddFieldDialogOpen(true)}
          >
            Add Custom Fields
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="camp-fields">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="border rounded-md"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Field Label</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-28 text-center">Required</TableHead>
                      <TableHead className="w-14"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campFields.map((field, index) => (
                      <Draggable
                        key={field.id}
                        draggableId={field.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            key={field.id}
                            className="group"
                          >
                            <TableCell
                              className="w-10 cursor-grab"
                              {...provided.dragHandleProps}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{field.field.label}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {field.field.name}
                                </span>
                                {field.field.description && (
                                  <span className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {field.field.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getFieldTypeLabel(field.field.fieldType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={field.required ?? field.field.required}
                                onCheckedChange={(checked) =>
                                  updateRequiredMutation.mutate({
                                    id: field.id,
                                    required: checked,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setDeleteFieldId(field.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </TableBody>
                </Table>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteFieldId}
        onOpenChange={(open) => !open && setDeleteFieldId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this field from the registration form?
              This won't delete the custom field itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFieldId && removeFieldMutation.mutate(deleteFieldId)}
              disabled={removeFieldMutation.isPending}
            >
              {removeFieldMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}