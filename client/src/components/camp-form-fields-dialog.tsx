import { Camp } from "@shared/schema";
import { EditCampCustomFields } from "@/components/edit-camp-custom-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CampFormFieldsDialogProps {
  camp: Camp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampFormFieldsDialog({
  camp,
  open,
  onOpenChange,
}: CampFormFieldsDialogProps) {
  if (!camp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registration Form Fields</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <EditCampCustomFields camp={camp} />
        </div>
      </DialogContent>
    </Dialog>
  );
}