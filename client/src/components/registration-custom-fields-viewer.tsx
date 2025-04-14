import React from "react";
import { 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger,
  Accordion
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Tag } from "lucide-react";

interface CustomFieldResponse {
  id: number;
  registrationId: number;
  customFieldId: number;
  response: string | null;
  responseArray: string[] | null;
  slotBookingId?: number | null;
  campId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  field: {
    id: number;
    name: string;
    description: string | null;
    label: string;
    fieldType: string;
    required: boolean;
    validationType: string;
    options: string[] | null;
  }
}

interface RegistrationCustomFieldsViewerProps {
  customFieldResponses?: CustomFieldResponse[];
}

export function RegistrationCustomFieldsViewer({ customFieldResponses }: RegistrationCustomFieldsViewerProps) {
  if (!customFieldResponses || customFieldResponses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No custom field responses available.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="custom-fields">
        <AccordionTrigger className="font-semibold text-sm py-2">
          <div className="flex items-center">
            <ClipboardList className="h-4 w-4 mr-2" />
            Custom Field Responses
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 border rounded-lg mt-2 bg-muted/50">
          <div className="space-y-3">
            {customFieldResponses.map((response) => (
              <div key={response.id} className="text-sm">
                <div className="font-medium mb-1 flex items-center">
                  <Tag className="h-3 w-3 mr-2 text-muted-foreground" />
                  {response.field.label}
                  {response.field.required && (
                    <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                  )}
                </div>
                <div className="pl-5 text-muted-foreground">
                  {renderResponse(response)}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function renderResponse(response: CustomFieldResponse) {
  if (response.responseArray && response.responseArray.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {response.responseArray.map((item, index) => (
          <Badge key={index} variant="secondary" className="font-normal">
            {item}
          </Badge>
        ))}
      </div>
    );
  }
  
  if (response.response) {
    return response.response;
  }
  
  return <span className="italic">No response provided</span>;
}