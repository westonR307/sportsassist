// Shared sports utility constants and functions

// Sport list - alphabetically sorted
export const sportsList = [
  "Archery", "Badminton", "Baseball", "Basketball", "Biathlon",
  "Billiards", "Bobsleigh", "Bodybuilding", "Bowling", "Boxing",
  "Canoeing", "Cheerleading", "Chess", "Climbing", "Cricket",
  "CrossFit", "Curling", "Cycling", "Darts", "Equestrian",
  "Fencing", "Field Hockey", "Figure Skating", "Fishing", "Football (American)",
  "Frisbee (Ultimate)", "Golf", "Gymnastics", "Handball", "Hockey (Ice)",
  "Hockey (Roller)", "Judo", "Karate", "Kayaking", "Kickboxing",
  "Lacrosse", "Mixed Martial Arts (MMA)", "Motocross", "Netball", "Paddleboarding",
  "Paintball", "Parkour", "Pickleball", "Powerlifting", "Racquetball",
  "Rock Climbing", "Rowing", "Rugby", "Running", "Sailing",
  "Skateboarding", "Skiing", "Snowboarding", "Soccer", "Softball",
  "Speed Skating", "Squash", "Surfing", "Swimming", "Table Tennis",
  "Taekwondo", "Tennis", "Track and Field", "Triathlon", "Volleyball",
  "Water Polo", "Weightlifting", "Wrestling", "Yoga", "Zumba"
].sort();

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