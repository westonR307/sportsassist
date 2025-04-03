import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface AddCampCustomFieldButtonDialogProps {
  organizationId: number;
  onFieldSelected: (fieldId: number) => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function AddCampCustomFieldButtonDialog({
  organizationId,
  onFieldSelected,
  className = "",
  variant = "outline",
  size = "sm",
  label = "Add Custom Field",
}: AddCampCustomFieldButtonDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch available custom fields with type "registration"
  const { data: customFields, isLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`, "registration"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/custom-fields?fieldSource=registration`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  const handleAdd = () => {
    if (selectedFieldId) {
      onFieldSelected(selectedFieldId);
      setOpen(false);
      toast({
        title: "Field added",
        description: "The custom field has been added to the registration form."
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Custom Field to Registration Form</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading available fields...
            </div>
          ) : !customFields || customFields.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <p>No custom fields available.</p>
              <p className="text-sm mt-2">
                Create custom fields in your organization settings.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  <Select onValueChange={(value) => setSelectedFieldId(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {customFields.map((field: any) => (
                        <SelectItem key={field.id} value={field.id.toString()}>
                          <div className="flex items-center">
                            <span>{field.label}</span>
                            {field.isInternal && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!selectedFieldId || isLoading}
            >
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}