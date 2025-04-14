import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "@hello-pangea/dnd";
import { 
  Info, 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical, 
  AlertTriangle, 
  ArrowUpDown
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Field type options for the form builder
const fieldTypes = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text (Paragraph)" },
  { value: "dropdown", label: "Dropdown" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" }
];

// Validation type options
const validationTypes = [
  { value: "none", label: "None" },
  { value: "required", label: "Required" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" }
];

// Form source options
const formSources = [
  { value: "registration", label: "Registration Form" },
  { value: "camp", label: "Camp Information" }
];

// Schema for creating/editing a custom field
const customFieldSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  label: z.string().min(2, "Label must be at least 2 characters"),
  description: z.string().optional(),
  fieldType: z.enum(["short_text", "long_text", "dropdown", "single_select", "multi_select"]),
  required: z.boolean().default(false),
  validationType: z.enum(["none", "required", "email", "phone", "number", "date"]).default("none"),
  options: z.array(z.string()).optional(),
  fieldSource: z.enum(["registration", "camp"]).default("registration"),
  isInternal: z.boolean().default(false),
});

type CustomFieldFormData = z.infer<typeof customFieldSchema>;

interface CustomFieldResponse {
  id: number;
  name: string;
  label: string;
  description: string | null;
  fieldType: "short_text" | "long_text" | "dropdown" | "single_select" | "multi_select";
  required: boolean;
  validationType: "none" | "required" | "email" | "phone" | "number" | "date";
  options: string[] | null;
  fieldSource: "registration" | "camp";
  isInternal: boolean;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
}

interface CampCustomFieldResponse {
  id: number;
  campId: number;
  customFieldId: number;
  order: number;
  required: boolean;
  field: CustomFieldResponse;
}

// Props for the form builder component
interface CustomFormBuilderProps {
  campId: number; 
  organizationId: number;
  mode?: "create" | "edit";
  initialFields?: CampCustomFieldResponse[];
  onUpdate?: (fields: CampCustomFieldResponse[]) => void;
}

export default function CustomFormBuilder({
  campId,
  organizationId,
  mode = "edit",
  initialFields = [],
  onUpdate
}: CustomFormBuilderProps) {
  const [fields, setFields] = useState<CampCustomFieldResponse[]>(initialFields);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomFieldResponse | null>(null);
  const [selectedCampField, setSelectedCampField] = useState<CampCustomFieldResponse | null>(null);
  const [optionsInput, setOptionsInput] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use the form hook with validation schema
  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      name: "",
      label: "",
      description: "",
      fieldType: "short_text",
      required: false,
      validationType: "none",
      options: [],
      fieldSource: "registration",
      isInternal: false,
    }
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isAddDialogOpen && !isEditDialogOpen) {
      form.reset();
      setOptionsInput("");
      setSelectedField(null);
      setSelectedCampField(null);
    }
  }, [isAddDialogOpen, isEditDialogOpen, form]);

  // Fetch available custom fields for this organization
  const { data: availableFields, isLoading: fieldsLoading } = useQuery<CustomFieldResponse[]>({
    queryKey: ["/api/custom-fields", organizationId],
    enabled: !!organizationId,
  });

  // Fetch custom fields assigned to this camp
  const { data: campFields, isLoading: campFieldsLoading } = useQuery({
    queryKey: ["/api/camps", campId, "custom-fields"],
    enabled: !!campId,
  });

  // Handle the effect of campFields changing
  useEffect(() => {
    if (campFields && campFields.length > 0) {
      setFields(campFields);
      if (onUpdate) onUpdate(campFields);
    }
  }, [campFields, onUpdate]);

  // Mutation to create a new custom field
  const createFieldMutation = useMutation({
    mutationFn: async (field: CustomFieldFormData) => {
      return apiRequest({
        method: "POST",
        url: "/api/custom-fields",
        data: {
          ...field,
          organizationId
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      // Refetch available fields
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom field",
        variant: "destructive",
      });
    }
  });

  // Mutation to update a custom field
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, field }: { id: number, field: Partial<CustomFieldFormData> }) => {
      return apiRequest({
        method: "PATCH",
        url: `/api/custom-fields/${id}`,
        data: field
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
      // Refetch available fields
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update custom field",
        variant: "destructive",
      });
    }
  });

  // Mutation to add a field to the camp
  const addFieldToCampMutation = useMutation({
    mutationFn: async (data: { customFieldId: number, required: boolean }) => {
      return apiRequest({
        method: "POST",
        url: `/api/camps/${campId}/custom-fields`,
        data: {
          customFieldId: data.customFieldId,
          required: data.required,
          order: fields.length // Add to the end
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Field added to registration form",
      });
      // Refetch camp fields
      queryClient.invalidateQueries({ queryKey: ["/api/camps", campId, "custom-fields"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add field to form",
        variant: "destructive",
      });
    }
  });

  // Mutation to remove a field from the camp
  const removeFieldFromCampMutation = useMutation({
    mutationFn: async (campFieldId: number) => {
      return apiRequest({
        method: "DELETE",
        url: `/api/camps/${campId}/custom-fields/${campFieldId}`,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Field removed from registration form",
      });
      // Refetch camp fields
      queryClient.invalidateQueries({ queryKey: ["/api/camps", campId, "custom-fields"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove field from form",
        variant: "destructive",
      });
    }
  });

  // Mutation to update field order
  const updateFieldOrderMutation = useMutation({
    mutationFn: async (orderedFields: { id: number, order: number }[]) => {
      return apiRequest({
        method: "PATCH",
        url: `/api/camps/${campId}/custom-fields/reorder`,
        data: { fields: orderedFields }
      });
    },
    onSuccess: () => {
      // No toast needed for reordering
      // Refetch camp fields
      queryClient.invalidateQueries({ queryKey: ["/api/camps", campId, "custom-fields"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update field order",
        variant: "destructive",
      });
    }
  });

  // Handle form submission for creating a new field
  const onSubmit = (data: CustomFieldFormData) => {
    // If options input exists, parse it
    if (data.fieldType === "dropdown" || data.fieldType === "single_select" || data.fieldType === "multi_select") {
      if (optionsInput) {
        data.options = optionsInput.split("\n").filter(option => option.trim() !== "");
      }
    } else {
      data.options = undefined;
    }

    // Decide whether to create or update based on if selectedField exists
    if (selectedField) {
      updateFieldMutation.mutate({ id: selectedField.id, field: data });
    } else {
      createFieldMutation.mutate(data);
    }
  };

  // Handle adding a field from the organization to the camp
  const handleAddExistingField = (field: CustomFieldResponse) => {
    // Don't add if already added
    if (fields.some(f => f.customFieldId === field.id)) {
      toast({
        title: "Field already added",
        description: "This field is already part of the registration form",
      });
      return;
    }

    addFieldToCampMutation.mutate({
      customFieldId: field.id,
      required: field.required
    });
  };

  // Handle removing a field from the camp
  const handleRemoveField = (campFieldId: number) => {
    removeFieldFromCampMutation.mutate(campFieldId);
  };

  // Handle form field reordering via drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    // Don't do anything if position hasn't changed
    if (sourceIndex === destinationIndex) return;
    
    // Create a copy of the fields array
    const newFields = Array.from(fields);
    
    // Remove the dragged item
    const [removed] = newFields.splice(sourceIndex, 1);
    
    // Insert it at the new position
    newFields.splice(destinationIndex, 0, removed);
    
    // Update the order property
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      order: index
    }));
    
    // Update state
    setFields(updatedFields);
    
    // Save the new order to the server
    updateFieldOrderMutation.mutate(
      updatedFields.map(field => ({
        id: field.id,
        order: field.order
      }))
    );
  };

  // Open edit dialog with field data
  const handleEditField = (field: CustomFieldResponse, campField: CampCustomFieldResponse) => {
    setSelectedField(field);
    setSelectedCampField(campField);
    
    // Set form values
    form.reset({
      name: field.name,
      label: field.label,
      description: field.description || "",
      fieldType: field.fieldType,
      required: campField.required,
      validationType: field.validationType,
      options: field.options || [],
      fieldSource: field.fieldSource,
      isInternal: field.isInternal
    });
    
    // Set options input
    if (field.options) {
      setOptionsInput(field.options.join("\n"));
    }
    
    setIsEditDialogOpen(true);
  };

  // Watch for field type changes to show/hide options
  const fieldType = form.watch("fieldType");
  const needsOptions = fieldType === "dropdown" || fieldType === "single_select" || fieldType === "multi_select";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Custom Registration Form</CardTitle>
              <CardDescription>
                Define additional fields to collect from athletes during registration
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Field
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Create Custom Field</DialogTitle>
                  <DialogDescription>
                    Add a new field to collect information from athletes during registration.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Name (Internal)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. jersey_size" {...field} />
                          </FormControl>
                          <FormDescription>
                            This name is used internally and should be snake_case
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Jersey Size" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is what users will see on the form
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g. Please select your preferred jersey size" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Help text shown below the field
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="fieldType"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Field Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fieldTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="validationType"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Validation</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select validation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {validationTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {needsOptions && (
                      <FormItem>
                        <FormLabel>Options</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter each option on a new line"
                            value={optionsInput}
                            onChange={(e) => setOptionsInput(e.target.value)}
                            rows={5}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter one option per line
                        </FormDescription>
                      </FormItem>
                    )}
                    
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="fieldSource"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Field Purpose</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select purpose" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {formSources.map(source => (
                                  <SelectItem key={source.value} value={source.value}>
                                    {source.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Where this field will be used
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="required"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Required Field</FormLabel>
                            <div className="flex items-center gap-2 pt-3">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <span className="text-sm text-muted-foreground">
                                Make this field required
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="isInternal"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="text-sm">Internal Field</FormLabel>
                            <FormDescription>
                              Field will only be visible to organization members, not registrants
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createFieldMutation.isPending}
                      >
                        {createFieldMutation.isPending && (
                          <div className="mr-2">
                            <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                        Create Field
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No custom fields added yet. Add fields to collect additional information during registration.
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="form-fields">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {fields.map((field, index) => (
                      <Draggable 
                        key={field.id.toString()} 
                        draggableId={field.id.toString()} 
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border rounded-md p-3 bg-background"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex gap-3">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="cursor-move flex items-center text-muted-foreground"
                                >
                                  <GripVertical size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{field.field.label}</h4>
                                    {field.required && (
                                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                        Required
                                      </Badge>
                                    )}
                                    {field.field.isInternal && (
                                      <Badge variant="outline" className="text-xs">
                                        Internal
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {fieldTypes.find(t => t.value === field.field.fieldType)?.label || field.field.fieldType}
                                    
                                    {field.field.validationType !== "none" && (
                                      <span className="ml-2">
                                        • Validation: {validationTypes.find(t => t.value === field.field.validationType)?.label}
                                      </span>
                                    )}
                                    
                                    {field.field.options && field.field.options.length > 0 && (
                                      <span className="ml-2">
                                        • {field.field.options.length} options
                                      </span>
                                    )}
                                  </p>
                                  
                                  {field.field.description && (
                                    <p className="text-sm italic mt-1">{field.field.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button 
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditField(field.field, field)}
                                >
                                  <Edit2 size={16} />
                                </Button>
                                <Button 
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveField(field.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog for editing existing fields */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Custom Field</DialogTitle>
            <DialogDescription>
              Edit this field in your registration form.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Name (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. jersey_size" {...field} />
                    </FormControl>
                    <FormDescription>
                      This name is used internally and should be snake_case
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jersey Size" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is what users will see on the form
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g. Please select your preferred jersey size" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Help text shown below the field
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Field Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fieldTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="validationType"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Validation</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select validation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {validationTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {needsOptions && (
                <FormItem>
                  <FormLabel>Options</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter each option on a new line"
                      value={optionsInput}
                      onChange={(e) => setOptionsInput(e.target.value)}
                      rows={5}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter one option per line
                  </FormDescription>
                </FormItem>
              )}
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="fieldSource"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Field Purpose</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formSources.map(source => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Where this field will be used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Required Field</FormLabel>
                      <div className="flex items-center gap-2 pt-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">
                          Make this field required
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isInternal"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm">Internal Field</FormLabel>
                      <FormDescription>
                        Field will only be visible to organization members, not registrants
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateFieldMutation.isPending}
                >
                  {updateFieldMutation.isPending && (
                    <div className="mr-2">
                      <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Available fields section */}
      {availableFields && availableFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Field Library</CardTitle>
            <CardDescription>
              Add existing fields from your organization's library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {availableFields.map(field => {
                  // Check if field is already added to this camp
                  const isAdded = fields.some(f => f.customFieldId === field.id);
                  
                  return (
                    <div 
                      key={field.id}
                      className={`p-3 border rounded-md ${isAdded ? 'bg-muted/50' : 'bg-background'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{field.label}</h4>
                            {field.required && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                Required
                              </Badge>
                            )}
                            {field.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {fieldTypes.find(t => t.value === field.fieldType)?.label || field.fieldType}
                            
                            {field.options && field.options.length > 0 && (
                              <span className="ml-2">
                                • {field.options.length} options
                              </span>
                            )}
                          </p>
                          
                          {field.description && (
                            <p className="text-sm italic mt-1">{field.description}</p>
                          )}
                        </div>
                        
                        <div>
                          {isAdded ? (
                            <Badge variant="secondary">Added</Badge>
                          ) : (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddExistingField(field)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}