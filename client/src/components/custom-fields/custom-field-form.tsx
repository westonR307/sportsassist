import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FieldType, ValidationType } from "@shared/types";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Schema for form validation
const customFieldSchema = z.object({
  // Remove name field from schema since it will be auto-generated
  label: z.string().min(1, "Field label is required"),
  description: z.string().optional(),
  fieldType: z.enum(["short_text", "long_text", "dropdown", "single_select", "multi_select"] as const),
  validationType: z.enum(["required", "email", "phone", "number", "date", "none"] as const),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  source: z.enum(["registration", "camp"]).optional(),
  isInternal: z.boolean().default(false),
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

const fieldTypeOptions = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
];

const validationTypeOptions = [
  { value: "none", label: "None" },
  { value: "required", label: "Required" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

interface CustomFieldFormProps {
  organizationId: number;
  fieldSource?: 'registration' | 'camp';
  customField?: {
    id: number;
    name?: string; // Name is optional, will be auto-generated from label
    label: string;
    description?: string;
    fieldType: FieldType;
    validationType: ValidationType;
    required: boolean;
    options?: string[];
    source?: string;
    isInternal?: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomFieldForm({
  organizationId,
  customField,
  fieldSource = 'registration',
  onSuccess,
  onCancel,
}: CustomFieldFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newOption, setNewOption] = useState("");

  // Set up form
  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      label: customField?.label || "",
      description: customField?.description || "",
      fieldType: customField?.fieldType || "short_text",
      validationType: customField?.validationType || "none",
      required: customField?.required || false,
      options: customField?.options || [],
      source: customField?.source as 'registration' | 'camp' || fieldSource,
      isInternal: customField?.isInternal || false,
    },
  });

  const showOptionsField = ["dropdown", "single_select", "multi_select"].includes(
    form.watch("fieldType")
  );

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (values: CustomFieldFormValues) => {
      if (customField?.id) {
        // Update existing field
        // First try the debug endpoint
        try {
          console.log("Using debug endpoint to update field:", customField.id);
          const res = await fetch(`/debug/custom-fields/${customField.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(values)
          });
          
          if (res.ok) {
            console.log("Debug update succeeded");
            return await res.json();
          } else {
            console.log("Debug update failed, trying regular endpoint");
          }
        } catch (err) {
          console.error("Error using debug endpoint:", err);
        }
        
        // Fall back to regular endpoint if debug fails
        const res = await apiRequest(
          "PATCH",
          `/api/custom-fields/${customField.id}`,
          values
        );
        return await res.json();
      } else {
        // Create new field
        const res = await apiRequest(
          "POST",
          `/api/organizations/${organizationId}/custom-fields?source=${values.source || fieldSource}`,
          values
        );
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: customField
          ? `${fieldSource === 'camp' ? 'Camp meta' : 'Custom'} field updated`
          : `${fieldSource === 'camp' ? 'Camp meta' : 'Custom'} field created`,
        description: customField
          ? `Your ${fieldSource === 'camp' ? 'camp meta' : 'custom'} field has been updated successfully.`
          : `Your ${fieldSource === 'camp' ? 'camp meta' : 'custom'} field has been created successfully.`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: [`/api/organizations/${organizationId}/custom-fields`, fieldSource],
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${customField ? "update" : "create"} ${fieldSource === 'camp' ? 'camp meta' : 'custom'} field: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: CustomFieldFormValues) => {
    // Ensure source field is set properly
    values.source = values.source || fieldSource;
    mutation.mutate(values);
  };

  // Options management
  const addOption = () => {
    if (!newOption) return;
    
    const currentOptions = form.getValues("options") || [];
    if (currentOptions.includes(newOption)) {
      toast({
        title: "Duplicate option",
        description: "This option already exists",
        variant: "destructive",
      });
      return;
    }
    
    form.setValue("options", [...currentOptions, newOption]);
    setNewOption("");
  };

  const removeOption = (option: string) => {
    const currentOptions = form.getValues("options") || [];
    form.setValue(
      "options",
      currentOptions.filter((o) => o !== option)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Label</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Medical Information" {...field} />
              </FormControl>
              <FormDescription>
                This is what users will see on the form and what the system will use to generate a unique field identifier
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide details about any medical conditions..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Helper text shown to users filling the form
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fieldType"
            render={({ field }) => (
              <FormItem>
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
                    {fieldTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The type of input field to display
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Validation Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select validation type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {validationTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Special validation rules for this field
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="required"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Required Field</FormLabel>
                <FormDescription>
                  {fieldSource === 'registration' 
                    ? "Make this field mandatory on registration forms" 
                    : "Make this field mandatory when creating/editing camps"}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isInternal"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Internal Field</FormLabel>
                <FormDescription>
                  Internal fields are only visible to organization members, not to participants or parents
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {showOptionsField && (
          <div className="space-y-4">
            <Separator />
            <h3 className="text-lg font-medium">Field Options</h3>

            <div className="flex gap-2">
              <Input
                placeholder="Add new option..."
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addOption}
                className="flex gap-1 items-center"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {form.watch("options")?.map((option) => (
                <Badge key={option} variant="secondary" className="py-2">
                  {option}
                  <button
                    type="button"
                    onClick={() => removeOption(option)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {form.watch("options")?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No options added yet
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : customField ? "Update Field" : "Create Field"}
          </Button>
        </div>
      </form>
    </Form>
  );
}