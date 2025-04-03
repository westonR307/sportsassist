import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface AddCampMetaFieldButtonProps {
  campId: number;
  organizationId: number;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function AddCampMetaFieldButton({
  campId,
  organizationId,
  className = "",
  variant = "outline",
  size = "sm",
  label = "Add Field",
}: AddCampMetaFieldButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available custom fields with type "meta"
  const { data: customFields, isLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}/custom-fields`, "meta"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/custom-fields?fieldSource=meta`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  // Add the field to the camp
  const addFieldMutation = useMutation({
    mutationFn: async (customFieldId: number) => {
      const res = await fetch(`/api/camps/${campId}/meta-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customFieldId,
        }),
      });
      if (!res.ok) throw new Error("Failed to add field to camp");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/camps/${campId}/meta-fields`] });
      toast({
        title: "Field added",
        description: "The field has been added to the camp successfully."
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (selectedFieldId) {
      addFieldMutation.mutate(selectedFieldId);
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
            <DialogTitle>Add Custom Field to Camp</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
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
              disabled={!selectedFieldId || addFieldMutation.isPending}
            >
              {addFieldMutation.isPending ? "Adding..." : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}