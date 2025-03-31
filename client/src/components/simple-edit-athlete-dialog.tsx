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
    currentGrade: athlete?.currentGrade || "",
    sportsHistory: athlete?.sportsHistory || "",
    emergencyContact: athlete?.emergencyContact || "",
    emergencyPhone: athlete?.emergencyPhone || "",
    medicalInformation: athlete?.medicalInformation || "",
    specialNeeds: athlete?.specialNeeds || "",
    jerseySize: athlete?.jerseySize || "",
    communicationOptIn: athlete?.communicationOptIn ?? true,
    preferredContact: athlete?.preferredContact || "email",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    
    if (!athlete?.id) {
      console.error("No athlete ID provided");
      toast({
        title: "Error",
        description: "Could not identify athlete to update",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!formData.fullName || !formData.dateOfBirth) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    console.log("Starting athlete update process...");
    
    try {
      console.log("Submitting data:", formData);
      
      // Create a comprehensive payload with all fields
      const payload = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender || "male",
        schoolName: formData.schoolName || "",
        currentGrade: formData.currentGrade || "",
        sportsHistory: formData.sportsHistory || "",
        emergencyContact: formData.emergencyContact || "",
        emergencyPhone: formData.emergencyPhone || "",
        medicalInformation: formData.medicalInformation || "",
        specialNeeds: formData.specialNeeds || "",
        jerseySize: formData.jerseySize || "",
        communicationOptIn: formData.communicationOptIn,
        preferredContact: formData.preferredContact || "email",
        // Include an empty sportsInterests array to satisfy server expectations
        sportsInterests: []
      };
      
      console.log("Full payload:", JSON.stringify(payload, null, 2));
      
      // Use direct fetch with explicit path
      const response = await fetch(`/api/parent/children/${athlete.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include" // Important: include credentials for auth
      });
      
      // Check for response errors and log them
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error: ${response.status}`, errorText);
        throw new Error(`Failed to update athlete: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Update successful, received data:", data);
      
      // Force refresh the children data
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      
      // Close the dialog
      onOpenChange(false);
      
      toast({
        title: "Athlete updated",
        description: "Profile has been updated successfully",
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
      <DialogContent 
        className="sm:max-w-[600px]"
        aria-labelledby="simple-edit-athlete-title"
        aria-describedby="simple-edit-athlete-description"
      >
        <DialogHeader>
          <DialogTitle id="simple-edit-athlete-title">Edit Athlete Profile</DialogTitle>
          <p id="simple-edit-athlete-description" className="text-sm text-muted-foreground">
            Update {athlete.fullName}'s information.
          </p>
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
          
          <div className="space-y-2">
            <label htmlFor="currentGrade" className="text-sm font-medium">Current Grade</label>
            <Input 
              id="currentGrade"
              name="currentGrade"
              value={formData.currentGrade}
              onChange={handleInputChange}
              placeholder="Current grade"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="sportsHistory" className="text-sm font-medium">Sports History</label>
            <Input 
              id="sportsHistory"
              name="sportsHistory"
              value={formData.sportsHistory}
              onChange={handleInputChange}
              placeholder="Previous sports experience"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="emergencyContact" className="text-sm font-medium">Emergency Contact</label>
              <Input 
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                placeholder="Emergency contact name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="emergencyPhone" className="text-sm font-medium">Emergency Phone</label>
              <Input 
                id="emergencyPhone"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleInputChange}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="medicalInformation" className="text-sm font-medium">Medical Information</label>
            <Input 
              id="medicalInformation"
              name="medicalInformation"
              value={formData.medicalInformation}
              onChange={handleInputChange}
              placeholder="Any medical conditions or allergies"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="specialNeeds" className="text-sm font-medium">Special Needs</label>
            <Input 
              id="specialNeeds"
              name="specialNeeds"
              value={formData.specialNeeds}
              onChange={handleInputChange}
              placeholder="Any special requirements"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="jerseySize" className="text-sm font-medium">Jersey Size</label>
            <select
              id="jerseySize"
              name="jerseySize"
              value={formData.jerseySize}
              onChange={handleSelectChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Select a size</option>
              <option value="YS">Youth Small</option>
              <option value="YM">Youth Medium</option>
              <option value="YL">Youth Large</option>
              <option value="AS">Adult Small</option>
              <option value="AM">Adult Medium</option>
              <option value="AL">Adult Large</option>
              <option value="AXL">Adult XL</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="preferredContact" className="text-sm font-medium">Preferred Contact Method</label>
            <select
              id="preferredContact"
              name="preferredContact"
              value={formData.preferredContact}
              onChange={handleSelectChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text Message</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="communicationOptIn"
              name="communicationOptIn"
              checked={formData.communicationOptIn}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="communicationOptIn" className="text-sm">
              Receive updates about camps and events
            </label>
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