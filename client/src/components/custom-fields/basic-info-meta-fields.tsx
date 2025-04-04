import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormContext } from "react-hook-form";
import { apiRequest } from "@/lib/api";

interface BasicInfoMetaFieldsProps {
  campId?: number;
  organizationId: number;
  showSaveButton?: boolean;
}

export interface BasicInfoMetaFieldsRef {
  saveFieldsIfNeeded: () => Promise<boolean | undefined>;
  setCampId: (id: number) => void;
}

export const BasicInfoMetaFields = React.forwardRef<BasicInfoMetaFieldsRef, BasicInfoMetaFieldsProps>(({
  campId,
  organizationId,
  showSaveButton = true, // Default to showing save button
}, ref) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useFormContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [addedFields, setAddedFields] = useState<any[]>([]);
  const [internalCampId, setInternalCampId] = useState<number | undefined>(campId);

  // Fetch available custom fields for camps
  const { data: availableFields, isLoading: isLoadingFields } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`, "camp"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/custom-fields?source=camp`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  // If a campId is provided, fetch the existing meta fields
  const { data: existingMetaFields, isLoading: isLoadingMeta } = useQuery({
    queryKey: [campId ? `/api/camps/${campId}/meta-fields` : 'no-camp'],
    queryFn: async () => {
      if (!campId) return [];
      const res = await fetch(`/api/camps/${campId}/meta-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp meta fields");
      return res.json();
    },
    enabled: !!campId,
  });

  // Update added fields whenever existing data changes
  useEffect(() => {
    if (existingMetaFields) {
      setAddedFields(existingMetaFields);
    }
  }, [existingMetaFields]);

  // Create a new meta field (temp client-side only)
  const handleAddField = () => {
    if (!selectedFieldId || !availableFields) return;
    
    const fieldToAdd = availableFields.find((f: any) => f.id === selectedFieldId);
    if (!fieldToAdd) return;
    
    // Generate a temporary ID for the new field (negative to avoid conflicts)
    const tempId = -Math.floor(Math.random() * 1000) - 1;
    
    const newField = {
      id: tempId,
      customFieldId: selectedFieldId,
      field: fieldToAdd,
      response: null,
      responseArray: null,
      isTemporary: true, // Flag to identify fields not yet saved to server
    };
    
    setAddedFields([...addedFields, newField]);
    setDialogOpen(false);
    setSelectedFieldId(null);
  };

  // Remove a field from the form (client-side only)
  const handleRemoveField = (id: number) => {
    setAddedFields(addedFields.filter(field => field.id !== id));
  };

  // Update field value
  const handleFieldValueChange = (fieldId: number, value: any) => {
    setAddedFields(
      addedFields.map(field => {
        if (field.id === fieldId) {
          if (field.field.fieldType === "multiselect") {
            return { ...field, responseArray: value, response: null };
          } else {
            return { ...field, response: value, responseArray: null };
          }
        }
        return field;
      })
    );
  };

  // Filter out fields that have already been added
  const getFilteredAvailableFields = () => {
    if (!availableFields) return [];
    const addedFieldIds = addedFields.map(field => field.customFieldId);
    return availableFields.filter((field: any) => !addedFieldIds.includes(field.id));
  };

  // Get the value for a multi-select field value
  const getMultiselectFieldValue = (field: any, optionValue: string) => {
    return field.responseArray ? field.responseArray.includes(optionValue) : false;
  };

  // Save all meta fields to the server
  const saveMetaFields = async () => {
    const currentCampId = internalCampId || campId;
    if (!currentCampId) {
      console.error("Cannot save meta fields: No camp ID available");
      console.log("internalCampId:", internalCampId, "campId:", campId);
      return false;
    }
    
    console.log(`Saving meta fields for camp ID ${currentCampId}, ${addedFields.length} fields to process`);
    
    // Skip if no fields to process
    if (addedFields.length === 0) {
      console.log("No meta fields to process, skipping save operation");
      return true;
    }
    
    try {
      // First, handle all adds and updates
      for (const field of addedFields) {
        if (field.isTemporary) {
          // New field to be created
          console.log(`Creating new meta field: customFieldId=${field.customFieldId}`);
          await apiRequest("POST", `/api/camps/${currentCampId}/meta-fields`, {
            customFieldId: field.customFieldId,
            campId: currentCampId, // Explicitly include the camp ID
            response: field.response,
            responseArray: field.responseArray,
          });
        } else {
          // Existing field to be updated - using PATCH instead of PUT
          console.log(`Updating existing meta field: id=${field.id}, campId=${currentCampId}`);
          await apiRequest("PATCH", `/api/camps/${currentCampId}/meta-fields/${field.id}`, {
            response: field.response,
            responseArray: field.responseArray,
          });
        }
      }
      
      // Handle deletions - compare existingMetaFields with addedFields
      if (existingMetaFields) {
        const existingIds = existingMetaFields.map((field: any) => field.id);
        const currentIds = addedFields.filter(f => !f.isTemporary).map(f => f.id);
        
        // Find IDs that are in existingIds but not in currentIds (these have been removed)
        const deletedIds = existingIds.filter((id: number) => !currentIds.includes(id));
        
        console.log(`Deleting ${deletedIds.length} removed meta fields`);
        
        // Delete each removed field
        for (const id of deletedIds) {
          await apiRequest("DELETE", `/api/camps/${currentCampId}/meta-fields/${id}`);
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${currentCampId}/meta-fields`] });
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      
      toast({
        title: "Custom fields saved",
        description: "Camp meta fields have been updated successfully",
      });
      
      // Mark temporary fields as persistent
      setAddedFields(addedFields.map(field => ({
        ...field,
        isTemporary: false
      })));
      
      console.log("Meta fields saved successfully");
      return true;
      
    } catch (error) {
      console.error("Error saving meta fields:", error);
      toast({
        title: "Failed to save custom fields",
        description: "There was an error saving the camp meta fields",
        variant: "destructive",
      });
      return false;
    }
  };

  // Method to set the camp ID for use after camp creation
  const setCampId = (id: number) => {
    console.log(`Setting camp ID for meta fields to ${id}`);
    setInternalCampId(id);
  };

  // Watch for form submission event
  // We'll expose a saveFields method that can be called by the parent component
  const saveFieldsIfNeeded = async () => {
    const currentCampId = internalCampId || campId;
    if (!currentCampId) {
      console.error("No camp ID available for saving meta fields");
      console.log("saveFieldsIfNeeded - internalCampId:", internalCampId, "campId:", campId);
      return false;
    }
    
    console.log(`Checking if meta fields need to be saved for camp ID ${currentCampId}`);
    
    if (addedFields.length > 0) {
      console.log(`Saving ${addedFields.length} meta fields for camp ${currentCampId}`);
      try {
        const result = await saveMetaFields();
        console.log("Meta fields save result:", result);
        return result;
      } catch (error) {
        console.error("Error saving meta fields in saveFieldsIfNeeded:", error);
        return false;
      }
    } else {
      console.log("No meta fields to save");
      return true;
    }
  };
  
  // Expose methods to parent via ref
  React.useImperativeHandle(
    ref,
    () => ({
      saveFieldsIfNeeded,
      setCampId
    })
  );

  const isLoading = isLoadingFields || isLoadingMeta;
  const filteredAvailableFields = getFilteredAvailableFields();

  return (
    <div className="space-y-6">
      {/* Display added meta fields */}
      {addedFields.length > 0 && (
        <div className="space-y-4 mt-4">
          {addedFields.map((field) => (
            <div key={field.id} className="space-y-1 border-t pt-4">
              <div className="flex justify-between items-center">
                <Label 
                  htmlFor={`meta-field-${field.id}`}
                  className="font-medium flex items-center"
                >
                  {field.field.label} 
                  {field.field.required && <span className="text-destructive ml-1">*</span>}
                  {field.field.isInternal && (
                    <Badge variant="secondary" className="ml-2 text-xs">Internal</Badge>
                  )}
                </Label>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveField(field.id)}
                  className="h-6 w-6 p-0"
                >
                  &times;
                </Button>
              </div>

              {field.field.description && (
                <p className="text-sm text-muted-foreground mb-1">{field.field.description}</p>
              )}

              {/* Render different inputs based on field type */}
              {field.field.fieldType === "short_text" && (
                <Input
                  id={`meta-field-${field.id}`}
                  value={field.response || ""}
                  onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                  placeholder={field.field.description || `Enter ${field.field.label.toLowerCase()}`}
                />
              )}

              {field.field.fieldType === "long_text" && (
                <Textarea
                  id={`meta-field-${field.id}`}
                  value={field.response || ""}
                  onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                  placeholder={field.field.description || `Enter ${field.field.label.toLowerCase()}`}
                  rows={3}
                />
              )}

              {field.field.fieldType === "dropdown" && (
                <Select
                  value={field.response || ""}
                  onValueChange={(value) => handleFieldValueChange(field.id, value)}
                >
                  <SelectTrigger id={`meta-field-${field.id}`}>
                    <SelectValue placeholder={`Select ${field.field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.field.options?.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.field.fieldType === "single_select" && (
                <Select
                  value={field.response || ""}
                  onValueChange={(value) => handleFieldValueChange(field.id, value)}
                >
                  <SelectTrigger id={`meta-field-${field.id}`}>
                    <SelectValue placeholder={`Select ${field.field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.field.options?.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.field.fieldType === "multi_select" && (
                <div className="space-y-2">
                  {field.field.options?.map((option: string) => (
                    <div key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`option-${field.id}-${option}`}
                        checked={getMultiselectFieldValue(field, option)}
                        onChange={(e) => {
                          const currentValues = [...(field.responseArray || [])];
                          if (e.target.checked) {
                            if (!currentValues.includes(option)) {
                              handleFieldValueChange(field.id, [...currentValues, option]);
                            }
                          } else {
                            handleFieldValueChange(field.id, currentValues.filter(v => v !== option));
                          }
                        }}
                        className="rounded border-input h-4 w-4"
                      />
                      <Label htmlFor={`option-${field.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Field and Save buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDialogOpen(true);
          }}
          className="mt-2"
          disabled={isLoading || filteredAvailableFields.length === 0}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </Button>
        
        {addedFields.length > 0 && (campId || internalCampId) && showSaveButton && (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              saveMetaFields();
            }}
            className="mt-2"
            disabled={isLoading}
            type="button"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Fields
          </Button>
        )}
      </div>

      {/* Field selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={true}>
        <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => {
          e.preventDefault(); // Prevent any clicks outside from closing parent dialogs
        }}>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredAvailableFields.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <p>No more custom fields available.</p>
              <p className="text-sm mt-2">
                Create custom fields in your organization settings.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {/* Simplified to a standard select element */}
                  <div className="mb-3">
                    <Label htmlFor="field-selector">Select a field to add</Label>
                    <select 
                      id="field-selector"
                      className="w-full mt-1 px-3 py-2 border rounded-md" 
                      onChange={(e) => setSelectedFieldId(Number(e.target.value))}
                      value={selectedFieldId || ""}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">-- Select a field --</option>
                      {filteredAvailableFields.map((field: any) => (
                        <option key={field.id} value={field.id}>
                          {field.label} {field.isInternal ? '(Internal)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDialogOpen(false);
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddField();
              }}
              disabled={!selectedFieldId}
              type="button"
            >
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});