import { useState } from "react";
import { ExtendedChild } from "@shared/child-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SimpleEditAthleteDialogProps {
  athlete: ExtendedChild | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleEditAthleteDialog({ athlete, open, onOpenChange }: SimpleEditAthleteDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: athlete?.fullName || "",
    gender: athlete?.gender || "male",
    dateOfBirth: athlete?.dateOfBirth ? new Date(athlete.dateOfBirth).toISOString().split('T')[0] : "",
    schoolName: athlete?.schoolName || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete?.id) return;
    
    setLoading(true);
    
    try {
      console.log("Submitting data:", formData);
      
      // Create a payload with required fields
      const payload = {
        ...formData,
        communicationOptIn: true,
        preferredContact: "email"
      };
      
      console.log("Full payload:", payload);
      
      const res = await apiRequest("PUT", `/api/parent/children/${athlete.id}`, payload);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update: ${res.status} ${errorText}`);
      }
      
      await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      onOpenChange(false);
      
      toast({
        title: "Athlete updated",
        description: "Your athlete's profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Update failed:", error);
      toast({
        title: "Failed to update athlete",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!athlete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Athlete - Basic Information</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
            <Input 
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth</label>
            <Input 
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="gender" className="text-sm font-medium">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleSelectChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="schoolName" className="text-sm font-medium">School Name</label>
            <Input 
              id="schoolName"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              placeholder="School name"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}