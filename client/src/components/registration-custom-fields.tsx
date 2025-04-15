import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomField } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface RegistrationCustomFieldsProps {
  campId: number;
  onFieldsChange: (fieldResponses: Record<string, any>) => void;
}

type FieldResponse = {
  fieldId: number;
  value: string | boolean | string[];
};

export function RegistrationCustomFields({ campId, onFieldsChange }: RegistrationCustomFieldsProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  
  // Fetch camp custom fields
  const { data: customFields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: [`/api/camps/${campId}/custom-fields`],
    enabled: !!campId,
  });
  
  // Update parent component when responses change
  useEffect(() => {
    onFieldsChange(responses);
  }, [responses, onFieldsChange]);
  
  // If no custom fields, return nothing
  if (!isLoading && customFields.length === 0) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  const handleFieldChange = (fieldId: number, value: string | boolean | string[]) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide the following additional information required for this camp.
        </p>
        
        <div className="space-y-4">
          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`field-${field.id}`} className="flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              
              {field.fieldType === 'short_text' && (
                <Input
                  id={`field-${field.id}`}
                  placeholder={field.name || field.label}
                  value={(responses[field.id] as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.fieldType === 'long_text' && (
                <Textarea
                  id={`field-${field.id}`}
                  placeholder={field.name || field.label}
                  value={(responses[field.id] as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {/* This isn't in the schema, but keeping for potential future use */}
              {field.fieldType === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.id}`}
                    checked={(responses[field.id] as boolean) || false}
                    onCheckedChange={(checked) => handleFieldChange(field.id, !!checked)}
                    required={field.required}
                  />
                  <label
                    htmlFor={`field-${field.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.name || 'Yes'}
                  </label>
                </div>
              )}
              
              {(field.fieldType === 'dropdown' || field.fieldType === 'single_select') && field.options && (
                <Select
                  value={(responses[field.id] as string) || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                >
                  <SelectTrigger id={`field-${field.id}`}>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(field.options) ? 
                      field.options.map((option, index) => (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      ))
                      : 
                      // Handle if options is stored as a string
                      typeof field.options === 'string' ? 
                        field.options.split(',').map((option, index) => (
                          <SelectItem key={index} value={option.trim()}>
                            {option.trim()}
                          </SelectItem>
                        ))
                        : null
                    }
                  </SelectContent>
                </Select>
              )}
              
              {field.fieldType === 'multi_select' && field.options && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Select all that apply:</p>
                  <div className="space-y-2">
                    {Array.isArray(field.options) ? (
                      field.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`field-${field.id}-option-${index}`}
                            checked={Array.isArray(responses[field.id]) && (responses[field.id] as string[]).includes(option)}
                            onCheckedChange={(checked) => {
                              const currentValues = Array.isArray(responses[field.id]) 
                                ? [...responses[field.id] as string[]] 
                                : [];
                              
                              if (checked) {
                                // Add the option if checked
                                handleFieldChange(field.id, [...currentValues, option]);
                              } else {
                                // Remove the option if unchecked
                                handleFieldChange(
                                  field.id, 
                                  currentValues.filter(val => val !== option)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`field-${field.id}-option-${index}`}
                            className="text-sm font-medium leading-none"
                          >
                            {option}
                          </label>
                        </div>
                      ))
                    ) : typeof field.options === 'string' ? (
                      field.options.split(',').map((option, index) => {
                        const trimmedOption = option.trim();
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                              id={`field-${field.id}-option-${index}`}
                              checked={Array.isArray(responses[field.id]) && (responses[field.id] as string[]).includes(trimmedOption)}
                              onCheckedChange={(checked) => {
                                const currentValues = Array.isArray(responses[field.id]) 
                                  ? [...responses[field.id] as string[]] 
                                  : [];
                                
                                if (checked) {
                                  handleFieldChange(field.id, [...currentValues, trimmedOption]);
                                } else {
                                  handleFieldChange(
                                    field.id, 
                                    currentValues.filter(val => val !== trimmedOption)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`field-${field.id}-option-${index}`}
                              className="text-sm font-medium leading-none"
                            >
                              {trimmedOption}
                            </label>
                          </div>
                        );
                      })
                    ) : null}
                  </div>
                </div>
              )}
              
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}