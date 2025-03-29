// Shared sports utility constants and functions

// Sport list - alphabetically sorted with objects containing ID and name
export const sportsList = [
  { id: 1, name: "Archery" },
  { id: 2, name: "Badminton" },
  { id: 3, name: "Baseball" },
  { id: 4, name: "Basketball" },
  { id: 5, name: "Biathlon" },
  { id: 6, name: "Billiards" },
  { id: 7, name: "Bobsleigh" },
  { id: 8, name: "Bodybuilding" },
  { id: 9, name: "Bowling" },
  { id: 10, name: "Boxing" },
  { id: 11, name: "Canoeing" },
  { id: 12, name: "Cheerleading" },
  { id: 13, name: "Chess" },
  { id: 14, name: "Climbing" },
  { id: 15, name: "Cricket" },
  { id: 16, name: "CrossFit" },
  { id: 17, name: "Curling" },
  { id: 18, name: "Cycling" },
  { id: 19, name: "Darts" },
  { id: 20, name: "Equestrian" },
  { id: 21, name: "Fencing" },
  { id: 22, name: "Field Hockey" },
  { id: 23, name: "Figure Skating" },
  { id: 24, name: "Fishing" },
  { id: 25, name: "Football (American)" },
  { id: 26, name: "Frisbee (Ultimate)" },
  { id: 27, name: "Golf" },
  { id: 28, name: "Gymnastics" },
  { id: 29, name: "Handball" },
  { id: 30, name: "Hockey (Ice)" },
  { id: 31, name: "Hockey (Roller)" },
  { id: 32, name: "Judo" },
  { id: 33, name: "Karate" },
  { id: 34, name: "Kayaking" },
  { id: 35, name: "Kickboxing" },
  { id: 36, name: "Lacrosse" },
  { id: 37, name: "Mixed Martial Arts (MMA)" },
  { id: 38, name: "Motocross" },
  { id: 39, name: "Netball" },
  { id: 40, name: "Paddleboarding" },
  { id: 41, name: "Paintball" },
  { id: 42, name: "Parkour" },
  { id: 43, name: "Pickleball" },
  { id: 44, name: "Powerlifting" },
  { id: 45, name: "Racquetball" },
  { id: 46, name: "Rock Climbing" },
  { id: 47, name: "Rowing" },
  { id: 48, name: "Rugby" },
  { id: 49, name: "Running" },
  { id: 50, name: "Sailing" },
  { id: 51, name: "Skateboarding" },
  { id: 52, name: "Skiing" },
  { id: 53, name: "Snowboarding" },
  { id: 54, name: "Soccer" },
  { id: 55, name: "Softball" },
  { id: 56, name: "Speed Skating" },
  { id: 57, name: "Squash" },
  { id: 58, name: "Surfing" },
  { id: 59, name: "Swimming" },
  { id: 60, name: "Table Tennis" },
  { id: 61, name: "Taekwondo" },
  { id: 62, name: "Tennis" },
  { id: 63, name: "Track and Field" },
  { id: 64, name: "Triathlon" },
  { id: 65, name: "Volleyball" },
  { id: 66, name: "Water Polo" },
  { id: 67, name: "Weightlifting" },
  { id: 68, name: "Wrestling" },
  { id: 69, name: "Yoga" },
  { id: 70, name: "Zumba" }
];

// Mapping sport names to IDs based on the database
export const sportsMap: Record<string, number> = {
  Archery: 1, Badminton: 2, Baseball: 3, Basketball: 4, Biathlon: 5,
  Billiards: 6, Bobsleigh: 7, Bodybuilding: 8, Bowling: 9, Boxing: 10,
  Canoeing: 11, Cheerleading: 12, Chess: 13, Climbing: 14, Cricket: 15,
  CrossFit: 16, Curling: 17, Cycling: 18, Darts: 19, Equestrian: 20,
  Fencing: 21, "Field Hockey": 22, "Figure Skating": 23, Fishing: 24, "Football (American)": 25,
  "Frisbee (Ultimate)": 26, Golf: 27, Gymnastics: 28, Handball: 29, "Hockey (Ice)": 30,
  "Hockey (Roller)": 31, Judo: 32, Karate: 33, Kayaking: 34, Kickboxing: 35,
  Lacrosse: 36, "Mixed Martial Arts (MMA)": 37, Motocross: 38, Netball: 39, Paddleboarding: 40,
  Paintball: 41, Parkour: 42, Pickleball: 43, Powerlifting: 44, Racquetball: 45,
  "Rock Climbing": 46, Rowing: 47, Rugby: 48, Running: 49, Sailing: 50,
  Skateboarding: 51, Skiing: 52, Snowboarding: 53, Soccer: 54, Softball: 55,
  "Speed Skating": 56, Squash: 57, Surfing: 58, Swimming: 59, "Table Tennis": 60,
  Taekwondo: 61, Tennis: 62, "Track and Field": 63, Triathlon: 64, Volleyball: 65,
  "Water Polo": 66, Weightlifting: 67, Wrestling: 68, Yoga: 69, Zumba: 70,
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