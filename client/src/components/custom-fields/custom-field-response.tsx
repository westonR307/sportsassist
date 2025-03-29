import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { CustomField, CampCustomField } from "@shared/schema";

// UI components
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CustomFieldWithDetails extends CampCustomField {
  field: CustomField;
}

interface CustomFieldResponseProps {
  fieldData: CustomFieldWithDetails;
  namePrefix?: string;
}

export function CustomFieldResponse({
  fieldData,
  namePrefix = "",
}: CustomFieldResponseProps) {
  const form = useFormContext();

  // Determine field name
  const fieldName = `${namePrefix}${namePrefix ? "." : ""}${fieldData.field.name}`;

  // Determine if field is required  
  const isRequired = fieldData.required ?? fieldData.field.required;

  // Set up field validation
  const validationType = fieldData.field.validationType;
  
  // Use effect to register field when component mounts
  useEffect(() => {
    // For multi-select fields, ensure we have an array as default value
    if (fieldData.field.fieldType === "multi_select") {
      const currentValue = form.getValues(fieldName);
      if (!Array.isArray(currentValue)) {
        form.setValue(fieldName, []);
      }
    }
  }, [form, fieldName, fieldData.field.fieldType]);

  const renderField = () => {
    switch (fieldData.field.fieldType) {
      case "short_text":
        return (
          <FormField
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? "This field is required" : false,
              ...(validationType === "email" && {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              }),
              ...(validationType === "phone" && {
                pattern: {
                  value: /^[0-9+\-().]{10,15}$/,
                  message: "Invalid phone number",
                },
              }),
              ...(validationType === "number" && {
                pattern: {
                  value: /^[0-9]*$/,
                  message: "Must be a number",
                },
              }),
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {fieldData.field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type={validationType === "number" ? "number" : "text"}
                  />
                </FormControl>
                {fieldData.field.description && (
                  <FormDescription>{fieldData.field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "long_text":
        return (
          <FormField
            control={form.control}
            name={fieldName}
            rules={{ required: isRequired ? "This field is required" : false }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {fieldData.field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                {fieldData.field.description && (
                  <FormDescription>{fieldData.field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "dropdown":
        return (
          <FormField
            control={form.control}
            name={fieldName}
            rules={{ required: isRequired ? "This field is required" : false }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {fieldData.field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fieldData.field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldData.field.description && (
                  <FormDescription>{fieldData.field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "single_select":
        return (
          <FormField
            control={form.control}
            name={fieldName}
            rules={{ required: isRequired ? "This field is required" : false }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>
                  {fieldData.field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-1"
                  >
                    {fieldData.field.options?.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${fieldName}-${option}`} />
                        <Label htmlFor={`${fieldName}-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                {fieldData.field.description && (
                  <FormDescription>{fieldData.field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "multi_select":
        return (
          <FormField
            control={form.control}
            name={fieldName}
            rules={{
              validate: (value) =>
                isRequired && (!value || value.length === 0)
                  ? "Please select at least one option"
                  : true,
            }}
            render={({ field }) => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>
                    {fieldData.field.label}
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  {fieldData.field.description && (
                    <FormDescription>{fieldData.field.description}</FormDescription>
                  )}
                </div>
                <div className="space-y-2">
                  {fieldData.field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${fieldName}-${option}`}
                        checked={(field.value || []).includes(option)}
                        onCheckedChange={(checked) => {
                          const currentValue = [...(field.value || [])];
                          if (checked) {
                            if (!currentValue.includes(option)) {
                              field.onChange([...currentValue, option]);
                            }
                          } else {
                            field.onChange(
                              currentValue.filter((value) => value !== option)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`${fieldName}-${option}`}
                        className="text-sm font-normal"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return <div>Unsupported field type: {fieldData.field.fieldType}</div>;
    }
  };

  return renderField();
}

// Component to render a collection of custom field responses
interface CustomFieldResponseGroupProps {
  fields: CustomFieldWithDetails[];
  namePrefix?: string;
}

export function CustomFieldResponseGroup({
  fields,
  namePrefix = "",
}: CustomFieldResponseGroupProps) {
  // Sort fields by their order property
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sortedFields.map((field) => (
        <CustomFieldResponse
          key={field.id}
          fieldData={field}
          namePrefix={namePrefix}
        />
      ))}
    </div>
  );
}