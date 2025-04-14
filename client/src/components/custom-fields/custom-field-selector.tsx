import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Circle, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomField {
  id: number;
  name: string;
  label: string;
  description: string | null;
  fieldType: string;
  required: boolean;
  validationType: string;
  isInternal: boolean;
  options?: string[] | null;
}

interface CustomFieldSelectorProps {
  organizationId: number | undefined;
  selectedFields: number[];
  onFieldsChange: (fieldIds: number[]) => void;
  maxHeight?: string;
}

export function CustomFieldSelector({
  organizationId,
  selectedFields,
  onFieldsChange,
  maxHeight = "300px"
}: CustomFieldSelectorProps) {
  const [selected, setSelected] = useState<number[]>(selectedFields || []);

  // Query to fetch available custom fields
  const { data: customFields, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`, "registration"],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await fetch(`/api/organizations/${organizationId}/custom-fields?source=registration`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch custom fields");
      }
      
      return await res.json() as CustomField[];
    },
    enabled: !!organizationId,
  });

  // Update local state when selected fields prop changes
  useEffect(() => {
    setSelected(selectedFields || []);
  }, [selectedFields]);

  // Update parent component when selections change
  useEffect(() => {
    onFieldsChange(selected);
  }, [selected, onFieldsChange]);

  const toggleField = (fieldId: number) => {
    setSelected(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Get field type display name
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load custom fields</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-2 text-red-600" 
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Try again
        </Button>
      </div>
    );
  }

  if (!customFields || customFields.length === 0) {
    return (
      <div className="p-4 border border-muted rounded-md bg-muted/20">
        <p className="text-muted-foreground text-sm">
          No custom fields available. Create custom fields first in the Custom Fields page.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <ScrollArea className="w-full" style={{ maxHeight }}>
        <div className="p-1">
          {customFields.map((field) => (
            <Card 
              key={field.id} 
              className={`mb-2 cursor-pointer hover:bg-accent/5 transition-colors ${
                selected.includes(field.id) ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => toggleField(field.id)}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {selected.includes(field.id) ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {field.label}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {field.name}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {getFieldTypeLabel(field.fieldType)}
                    </Badge>
                    {field.required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {field.isInternal && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100/80">
                        Internal
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {field.description && (
                <CardContent className="pb-3 pt-0 px-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {field.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}