import React from "react";
import { Child } from "@shared/schema";
import { ExtendedChild } from "@shared/child-types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Info, 
  User, 
  Award, 
  Medal, 
  School, 
  Ruler, 
  Weight, 
  HeartPulse, 
  HelpCircle, 
  Edit 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  sportsById, 
  skillLevelNames, 
  jerseySizeNames, 
  genderNames,
  getSportName 
} from "@shared/sports-utils";

interface ViewAthleteDialogProps {
  athlete: ExtendedChild | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ViewAthleteDialog({ 
  athlete,
  open, 
  onOpenChange, 
  onEdit 
}: ViewAthleteDialogProps) {
  
  if (!athlete) return null;

  // Calculate age based on date of birth
  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Athlete Profile</DialogTitle>
          <DialogDescription>
            View detailed information about {athlete.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Profile header with image */}
          <div className="flex items-center gap-4 mb-2">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted">
              {athlete.profilePhoto ? (
                <img
                  src={athlete.profilePhoto}
                  alt={athlete.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">{athlete.fullName}</h3>
              <p className="text-sm text-muted-foreground">
                {athlete.dateOfBirth ? (
                  <span>
                    {calculateAge(new Date(athlete.dateOfBirth))} years old ({new Date(athlete.dateOfBirth).toLocaleDateString()})
                  </span>
                ) : (
                  "No birth date provided"
                )}
              </p>
              {athlete.gender && (
                <p className="text-sm text-muted-foreground">
                  {genderNames[athlete.gender] || athlete.gender}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {athlete.currentGrade && (
                <div className="flex items-center gap-2 text-sm">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>Grade: {athlete.currentGrade}</span>
                </div>
              )}
              {athlete.schoolName && (
                <div className="flex items-center gap-2 text-sm">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>School: {athlete.schoolName}</span>
                </div>
              )}
              {athlete.height && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span>Height: {athlete.height}</span>
                </div>
              )}
              {athlete.weight && (
                <div className="flex items-center gap-2 text-sm">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span>Weight: {athlete.weight}</span>
                </div>
              )}
              {athlete.jerseySize && (
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span>Jersey/T-Shirt Size: {jerseySizeNames[athlete.jerseySize] || athlete.jerseySize}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Sports Information */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Sports Experience</h4>
            {athlete.sportsHistory && (
              <div className="flex items-start gap-2 text-sm mb-2">
                <Medal className="h-4 w-4 text-muted-foreground mt-1" />
                <span>History: {athlete.sportsHistory}</span>
              </div>
            )}
            
            {athlete.sportsInterests && athlete.sportsInterests.length > 0 ? (
              <div className="space-y-2 mt-2">
                <h5 className="text-sm font-medium">Sports Played:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {athlete.sportsInterests.map((sport, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm border rounded-md p-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{getSportName(sport.sportId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {skillLevelNames[sport.skillLevel] || sport.skillLevel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sports information added yet.</p>
            )}
          </div>

          <Separator />

          {/* Emergency Information */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Emergency Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {athlete.emergencyContact && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Contact: {athlete.emergencyContact}</span>
                </div>
              )}
              {athlete.emergencyPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Phone: {athlete.emergencyPhone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Medical Information */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Health Information</h4>
            <div className="space-y-2">
              {athlete.medicalInformation ? (
                <div className="flex items-start gap-2 text-sm">
                  <HeartPulse className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>Medical Info: {athlete.medicalInformation}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No medical information provided.</p>
              )}
              {athlete.specialNeeds && (
                <div className="flex items-start gap-2 text-sm">
                  <HelpCircle className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>Special Needs: {athlete.specialNeeds}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              variant="default"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}