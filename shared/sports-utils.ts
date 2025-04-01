// Shared sports utility constants and functions

// Sport list - alphabetically sorted with objects containing ID and name
export const sportsList = [
  { id: 11, name: "Archery" },
  { id: 12, name: "Badminton" },
  { id: 3, name: "Baseball" },
  { id: 1, name: "Basketball" },
  { id: 13, name: "Biathlon" },
  { id: 14, name: "Billiards" },
  { id: 15, name: "Bobsleigh" },
  { id: 16, name: "Bodybuilding" },
  { id: 17, name: "Bowling" },
  { id: 18, name: "Boxing" },
  { id: 19, name: "Canoeing" },
  { id: 20, name: "Cheerleading" },
  { id: 21, name: "Chess" },
  { id: 22, name: "Climbing" },
  { id: 23, name: "Cricket" },
  { id: 24, name: "CrossFit" },
  { id: 25, name: "Curling" },
  { id: 26, name: "Cycling" },
  { id: 27, name: "Darts" },
  { id: 28, name: "Equestrian" },
  { id: 29, name: "Fencing" },
  { id: 30, name: "Field Hockey" },
  { id: 31, name: "Figure Skating" },
  { id: 32, name: "Fishing" },
  { id: 6, name: "Football" },
  { id: 33, name: "Football (American)" },
  { id: 34, name: "Frisbee (Ultimate)" },
  { id: 9, name: "Golf" },
  { id: 35, name: "Gymnastics" },
  { id: 36, name: "Handball" },
  { id: 10, name: "Hockey" },
  { id: 37, name: "Hockey (Ice)" },
  { id: 38, name: "Hockey (Roller)" },
  { id: 39, name: "Judo" },
  { id: 40, name: "Karate" },
  { id: 41, name: "Kayaking" },
  { id: 42, name: "Kickboxing" },
  { id: 43, name: "Lacrosse" },
  { id: 44, name: "Mixed Martial Arts (MMA)" },
  { id: 45, name: "Motocross" },
  { id: 46, name: "Netball" },
  { id: 47, name: "Paddleboarding" },
  { id: 48, name: "Paintball" },
  { id: 49, name: "Parkour" },
  { id: 50, name: "Pickleball" },
  { id: 51, name: "Powerlifting" },
  { id: 52, name: "Racquetball" },
  { id: 53, name: "Rock Climbing" },
  { id: 54, name: "Rowing" },
  { id: 55, name: "Rugby" },
  { id: 56, name: "Running" },
  { id: 57, name: "Sailing" },
  { id: 58, name: "Skateboarding" },
  { id: 59, name: "Skiing" },
  { id: 60, name: "Snowboarding" },
  { id: 2, name: "Soccer" },
  { id: 61, name: "Softball" },
  { id: 62, name: "Speed Skating" },
  { id: 63, name: "Squash" },
  { id: 64, name: "Surfing" },
  { id: 5, name: "Swimming" },
  { id: 65, name: "Table Tennis" },
  { id: 66, name: "Taekwondo" },
  { id: 4, name: "Tennis" },
  { id: 8, name: "Track and Field" },
  { id: 67, name: "Triathlon" },
  { id: 7, name: "Volleyball" },
  { id: 68, name: "Water Polo" },
  { id: 69, name: "Weightlifting" },
  { id: 70, name: "Wrestling" },
  { id: 71, name: "Yoga" },
  { id: 72, name: "Zumba" }
];

// Mapping sport names to IDs based on the database
export const sportsMap: Record<string, number> = {
  Archery: 11, 
  Badminton: 12, 
  Baseball: 3, 
  Basketball: 1, 
  Biathlon: 13,
  Billiards: 14, 
  Bobsleigh: 15, 
  Bodybuilding: 16, 
  Bowling: 17, 
  Boxing: 18,
  Canoeing: 19, 
  Cheerleading: 20, 
  Chess: 21, 
  Climbing: 22, 
  Cricket: 23,
  CrossFit: 24, 
  Curling: 25, 
  Cycling: 26, 
  Darts: 27, 
  Equestrian: 28,
  Fencing: 29, 
  "Field Hockey": 30, 
  "Figure Skating": 31, 
  Fishing: 32, 
  Football: 6,
  "Football (American)": 33,
  "Frisbee (Ultimate)": 34, 
  Golf: 9, 
  Gymnastics: 35, 
  Handball: 36, 
  Hockey: 10,
  "Hockey (Ice)": 37,
  "Hockey (Roller)": 38, 
  Judo: 39, 
  Karate: 40, 
  Kayaking: 41,
  Kickboxing: 42,
  Lacrosse: 43, 
  "Mixed Martial Arts (MMA)": 44, 
  Motocross: 45, 
  Netball: 46,
  Paddleboarding: 47,
  Paintball: 48, 
  Parkour: 49, 
  Pickleball: 50, 
  Powerlifting: 51,
  Racquetball: 52,
  "Rock Climbing": 53, 
  Rowing: 54, 
  Rugby: 55, 
  Running: 56,
  Sailing: 57,
  Skateboarding: 58, 
  Skiing: 59, 
  Snowboarding: 60, 
  Soccer: 2,
  Softball: 61,
  "Speed Skating": 62, 
  Squash: 63, 
  Surfing: 64, 
  Swimming: 5,
  "Table Tennis": 65,
  Taekwondo: 66, 
  Tennis: 4, 
  "Track and Field": 8, 
  Triathlon: 67,
  Volleyball: 7,
  "Water Polo": 68, 
  Weightlifting: 69, 
  Wrestling: 70, 
  Yoga: 71,
  Zumba: 72
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