import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  Eye, 
  EyeOff,
  Trash2,
  Save, 
  Loader2,
  PenBox
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AddCampMetaFieldButton } from "./add-camp-meta-field-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CampMetaFieldsEditorProps {
  campId: number;
  organizationId: number;
}

export function CampMetaFieldsEditor({ campId, organizationId }: CampMetaFieldsEditorProps) {
  const [editingField, setEditingField] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current meta fields
  const { data: metaFields, isLoading, error } = useQuery({
    queryKey: [`/api/camps/${campId}/meta-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/meta-fields`);
      if (!res.ok) throw new Error("Failed to fetch meta fields");
      return res.json();
    },
  });

  // Update a meta field response
  const updateMetaFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/camp-meta-fields/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update meta field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({ title: "Field updated", description: "The field has been updated successfully" });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating field", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Delete a meta field
  const deleteMetaFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/camp-meta-fields/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete meta field");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({ title: "Field removed", description: "The field has been removed from the camp" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error removing field", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleEditField = (field: any) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const handleSaveField = () => {
    if (editingField) {
      updateMetaFieldMutation.mutate(editingField);
    }
  };

  const handleDeleteField = (id: number) => {
    if (confirm("Are you sure you want to remove this field from the camp?")) {
      deleteMetaFieldMutation.mutate(id);
    }
  };

  const handleValueChange = (value: string) => {
    setEditingField({
      ...editingField,
      response: value,
      responseArray: null,
    });
  };

  const handleValuesChange = (values: string[]) => {
    setEditingField({
      ...editingField,
      response: null,
      responseArray: values,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center border p-4 rounded-md bg-red-50 text-red-800">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>Failed to load custom fields</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Camp Information Fields</h3>
        <AddCampMetaFieldButton campId={campId} organizationId={organizationId} />
      </div>

      {(!metaFields || metaFields.length === 0) ? (
        <div className="text-center p-6 border rounded-md bg-muted/50">
          <p className="text-muted-foreground">No custom information fields added yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Add Field" to add custom information about this camp
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {metaFields.map((field: any) => (
            <Card key={field.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <h4 className="font-medium">{field.field.label}</h4>
                    {field.field.isInternal && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Internal
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Only visible to organization members</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!field.field.isInternal && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="ml-2 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visible to everyone</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{field.field.description}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium">Value:</p>
                    <p className="text-sm">
                      {field.response || 
                        (field.responseArray?.length 
                          ? field.responseArray.join(", ") 
                          : <span className="italic text-muted-foreground">No value set</span>)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditField(field)}
                  >
                    <PenBox className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                    disabled={deleteMetaFieldMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Field Dialog */}
      {editingField && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Field: {editingField.field.label}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Visibility toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="visibility">Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    {editingField.field.isInternal 
                      ? "Only visible to organization members" 
                      : "Visible to everyone"}
                  </p>
                </div>
                <Switch
                  id="visibility"
                  disabled
                  checked={!editingField.field.isInternal}
                />
              </div>

              {/* Field value editor */}
              <div className="space-y-2">
                <Label>Field Value</Label>
                {editingField.field.fieldType === "text" && (
                  <Input
                    value={editingField.response || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                  />
                )}
                
                {editingField.field.fieldType === "textarea" && (
                  <Textarea
                    value={editingField.response || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    rows={4}
                  />
                )}
                
                {editingField.field.fieldType === "number" && (
                  <Input
                    type="number"
                    value={editingField.response || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                  />
                )}
                
                {editingField.field.fieldType === "select" && (
                  <Select
                    value={editingField.response || ""}
                    onValueChange={handleValueChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {editingField.field.options?.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {editingField.field.fieldType === "multiselect" && (
                  <div className="space-y-2">
                    {editingField.field.options?.map((option: string) => (
                      <div key={option} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`option-${option}`}
                          checked={(editingField.responseArray || []).includes(option)}
                          onChange={(e) => {
                            const currentValues = [...(editingField.responseArray || [])];
                            if (e.target.checked) {
                              if (!currentValues.includes(option)) {
                                handleValuesChange([...currentValues, option]);
                              }
                            } else {
                              handleValuesChange(currentValues.filter(v => v !== option));
                            }
                          }}
                          className="rounded border-input h-4 w-4"
                        />
                        <Label htmlFor={`option-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveField}
                disabled={updateMetaFieldMutation.isPending}
              >
                {updateMetaFieldMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}