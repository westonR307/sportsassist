import { z } from "zod";
import { Child } from "./schema";
import { SportLevel } from "./types";

// Type definition for sport interests data structure
export interface SportInterest {
  sportId: number;
  skillLevel: SportLevel;
  preferredPositions?: string[];
  currentTeam?: string;
}

// Extended Child type with properties needed for UI
export interface ExtendedChild extends Child {
  sportsInterests?: SportInterest[];
  medicalInformation?: string;
}

// Type guard to check if a Child has sportsInterests
export function hasExtendedFields(child: Child): child is ExtendedChild {
  return (child as ExtendedChild).sportsInterests !== undefined || 
         (child as ExtendedChild).medicalInformation !== undefined;
}