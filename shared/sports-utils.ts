// Shared sports utility constants and functions

// Sport list matching the database
export const sportsList = [
  { id: 1, name: "Basketball" },
  { id: 2, name: "Soccer" },
  { id: 3, name: "Baseball" },
  { id: 4, name: "Tennis" },
  { id: 5, name: "Swimming" },
  { id: 6, name: "Football" },
  { id: 7, name: "Volleyball" },
  { id: 8, name: "Track and Field" },
  { id: 9, name: "Golf" },
  { id: 10, name: "Hockey" }
];

// Mapping sport names to IDs based on the database
export const sportsMap: Record<string, number> = {
  Basketball: 1,
  Soccer: 2,
  Baseball: 3,
  Tennis: 4,
  Swimming: 5,
  Football: 6,
  Volleyball: 7,
  "Track and Field": 8,
  Golf: 9,
  Hockey: 10
};

// Reverse mapping of sport IDs to names
export const sportsById: Record<number, string> = Object.fromEntries(
  Object.entries(sportsMap).map(([name, id]) => [id, name])
);

// Skill level options
export const skillLevels = [
  "beginner", 
  "intermediate", 
  "advanced"
];

// Skill level display names
export const skillLevelNames: Record<string, string> = {
  "beginner": "Beginner - Just starting out",
  "intermediate": "Intermediate - Some experience",
  "advanced": "Advanced - Significant experience"
};

// Jersey size options
export const jerseySizes = [
  "YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"
];

// Jersey size display names
export const jerseySizeNames: Record<string, string> = {
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
export const genderNames: Record<string, string> = {
  "male": "Male",
  "female": "Female",
  "other": "Other",
  "prefer_not_to_say": "Prefer not to say"
};

// Utility function to get sport name from ID
export function getSportName(sportId: number): string {
  return sportsById[sportId] || "Unknown Sport";
}