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
              
              {field.type === 'text' && (
                <Input
                  id={`field-${field.id}`}
                  placeholder={field.placeholder || ''}
                  value={(responses[field.id] as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === 'textarea' && (
                <Textarea
                  id={`field-${field.id}`}
                  placeholder={field.placeholder || ''}
                  value={(responses[field.id] as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
              
              {field.type === 'checkbox' && (
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
                    {field.placeholder || 'Yes'}
                  </label>
                </div>
              )}
              
              {field.type === 'select' && field.options && (
                <Select
                  value={(responses[field.id] as string) || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                >
                  <SelectTrigger id={`field-${field.id}`}>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.split(',').map((option, index) => (
                      <SelectItem key={index} value={option.trim()}>
                        {option.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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