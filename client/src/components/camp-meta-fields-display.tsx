import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, HelpCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CampMetaFieldsDisplayProps {
  campId: number;
  canManage?: boolean;
  className?: string;
}

export function CampMetaFieldsDisplay({ 
  campId, 
  canManage = false, 
  className = "" 
}: CampMetaFieldsDisplayProps) {
  const [hasLoadedFields, setHasLoadedFields] = useState(false);

  // Fetch camp meta fields
  const { data: metaFields, isLoading, error } = useQuery({
    queryKey: [`/api/camps/${campId}/meta-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/meta-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp meta fields");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isLoading && metaFields) {
      setHasLoadedFields(true);
    }
  }, [isLoading, metaFields]);

  // If no fields are loaded yet, don't render anything
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-24 ${className}`}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading camp information...</span>
      </div>
    );
  }

  // If there's an error, show it only if you can manage the camp
  if (error && canManage) {
    return (
      <div className={`flex items-center p-3 rounded-md bg-red-50 text-red-800 ${className}`}>
        <AlertCircle className="w-4 h-4 mr-2" />
        <span className="text-sm">Failed to load custom camp information</span>
      </div>
    );
  }

  // Only show the component if there are fields to display
  if (!metaFields || metaFields.length === 0) {
    if (canManage) {
      return (
        <div className={`p-4 border rounded-md bg-muted/20 ${className}`}>
          <div className="flex items-center text-muted-foreground mb-2">
            <Info className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">No custom information fields</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add custom fields to provide additional information about this camp.
          </p>
        </div>
      );
    }
    return null; // Don't show anything if there are no fields and user can't manage
  }

  // Group fields by isInternal status
  const publicFields = metaFields.filter((field: any) => !field.field.isInternal);
  const internalFields = metaFields.filter((field: any) => field.field.isInternal);

  // If you can't manage and there are no public fields, don't show anything
  if (!canManage && publicFields.length === 0) {
    return null;
  }

  const formatFieldValue = (field: any) => {
    if (field.response) {
      return field.response;
    } else if (field.responseArray && field.responseArray.length > 0) {
      return field.responseArray.join(", ");
    }
    return "-";
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-medium mb-3">Additional Information</h3>
      
      {/* Public fields - visible to everyone */}
      {publicFields.length > 0 && (
        <div className="space-y-3 mb-4">
          {publicFields.map((field: any) => (
            <Card key={field.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{field.field.label}</h4>
                  </div>
                  {field.field.description && (
                    <p className="text-xs text-muted-foreground">{field.field.description}</p>
                  )}
                  <p className="text-sm">
                    {formatFieldValue(field)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Internal fields - only shown to organization members */}
      {canManage && internalFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2">
              Internal
            </Badge>
            <span className="text-sm text-muted-foreground">Only visible to organization members</span>
          </div>
          {internalFields.map((field: any) => (
            <Card key={field.id} className="overflow-hidden border-dashed">
              <CardContent className="p-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h4 className="font-medium text-sm">{field.field.label}</h4>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Internal: only visible to organization members</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {field.field.description && (
                    <p className="text-xs text-muted-foreground">{field.field.description}</p>
                  )}
                  <p className="text-sm">
                    {formatFieldValue(field)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}