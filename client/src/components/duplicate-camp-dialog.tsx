import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

interface DuplicateCampDialogProps {
  campId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateCampDialog({
  campId,
  open,
  onOpenChange,
}: DuplicateCampDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch camp details
  const { data: camp, isLoading: isCampLoading } = useQuery({
    queryKey: [`/api/camps/${campId}`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}`);
      if (!res.ok) throw new Error("Failed to fetch camp details");
      return res.json();
    },
    enabled: open, // Only fetch data when dialog is open
  });

  // Fetch camp meta fields
  const { data: metaFields, isLoading: isMetaFieldsLoading } = useQuery({
    queryKey: [`/api/camps/${campId}/meta-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/meta-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp meta fields");
      return res.json();
    },
    enabled: open, // Only fetch data when dialog is open
  });

  // Fetch camp custom fields (registration form fields)
  const { data: customFields, isLoading: isCustomFieldsLoading } = useQuery({
    queryKey: [`/api/camps/${campId}/custom-fields`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}/custom-fields`);
      if (!res.ok) throw new Error("Failed to fetch camp custom fields");
      return res.json();
    },
    enabled: open, // Only fetch data when dialog is open
  });

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      // Store the data in localStorage for the add camp dialog to access
      if (camp) {
        // Clone the camp data and modify it for a new camp
        const campData = { ...camp };
        
        // Remove properties that should not be duplicated
        delete campData.id;
        delete campData.permissions;
        delete campData.slug;
        delete campData.isDeleted;
        delete campData.isCancelled;
        delete campData.deletedAt;
        delete campData.cancelledAt;
        delete campData.cancelReason;

        // Append "Copy" to the name
        campData.name = `${campData.name} (Copy)`;

        // Add custom and meta fields to the duplicated data
        const duplicateData = {
          camp: campData,
          metaFields: metaFields || [],
          customFields: customFields || []
        };

        // Store in localStorage
        localStorage.setItem('duplicateCampData', JSON.stringify(duplicateData));

        // Navigate to camps page with dialog open flag
        setLocation('/dashboard/camps?showAddDialog=true');
        
        toast({
          title: "Ready to Duplicate",
          description: "Camp data loaded for duplication",
        });
      }
    } catch (error) {
      console.error("Error in duplicate process:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate camp data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const isDataLoading = isCampLoading || isMetaFieldsLoading || isCustomFieldsLoading;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Camp</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new camp with all the settings, custom fields, and meta fields from{" "}
            <span className="font-semibold">{camp?.name || "this camp"}</span>.
            <br /><br />
            You'll be able to review and modify all details before creating the new camp.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDuplicate}
            disabled={isLoading || isDataLoading}
            className="bg-primary"
          >
            {isLoading || isDataLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Camp
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}