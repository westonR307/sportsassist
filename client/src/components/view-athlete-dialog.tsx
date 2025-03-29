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

// Map of sport IDs to names
const sportsMap: Record<number, string> = {
  1: "Archery", 2: "Badminton", 3: "Baseball", 4: "Basketball", 5: "Biathlon", 6: "Bocce", 7: "Bowling", 8: "Boxing",
  9: "Canoeing", 10: "Cheerleading", 11: "Chess", 12: "Cricket", 13: "Croquet", 14: "Cross Country", 15: "Curling",
  16: "Cycling", 17: "Dance", 18: "Diving", 19: "Dodgeball", 20: "Equestrian", 21: "Fencing", 22: "Field Hockey",
  23: "Figure Skating", 24: "Fishing", 25: "Flag Football", 26: "Football", 27: "Frisbee", 28: "Golf",
  29: "Gymnastics", 30: "Handball", 31: "Hiking", 32: "Hockey", 33: "Horseback Riding", 34: "Judo", 35: "Karate",
  36: "Kayaking", 37: "Kickball", 38: "Lacrosse", 39: "Martial Arts", 40: "Motocross", 41: "Paintball",
  42: "Pickleball", 43: "Ping Pong", 44: "Quidditch", 45: "Racquetball", 46: "Rodeo", 47: "Roller Derby",
  48: "Roller Skating", 49: "Rowing", 50: "Rugby", 51: "Running", 52: "Sailing", 53: "Skateboarding", 54: "Skiing",
  55: "Snowboarding", 56: "Soccer", 57: "Softball", 58: "Speed Skating", 59: "Squash", 60: "Surfing", 61: "Swimming",
  62: "Table Tennis", 63: "Taekwondo", 64: "Tennis", 65: "Track and Field", 66: "Triathlon", 67: "Ultimate Frisbee",
  68: "Volleyball", 69: "Water Polo", 70: "Weightlifting", 71: "Wrestling", 72: "Yoga", 73: "Zumba",
};

// Skill level display names
const skillLevelNames: Record<string, string> = {
  "beginner": "Beginner - Just starting out",
  "intermediate": "Intermediate - Some experience",
  "advanced": "Advanced - Significant experience"
};

// Jersey size display names
const jerseySizeNames: Record<string, string> = {
  "YS": "Youth Small",
  "YM": "Youth Medium",
  "YL": "Youth Large",
  "YXL": "Youth XL",
  "AS": "Adult Small",
  "AM": "Adult Medium",
  "AL": "Adult Large",
  "AXL": "Adult XL",
  "A2XL": "Adult 2XL"
};

// Gender display names
const genderNames: Record<string, string> = {
  "male": "Male",
  "female": "Female",
  "other": "Other",
  "prefer_not_to_say": "Prefer not to say"
};

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
                        <div>{sportsMap[sport.sportId] || "Unknown Sport"}</div>
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