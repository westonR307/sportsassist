-- Add new columns to the children table for enhanced athlete profiles
ALTER TABLE "children"
ADD COLUMN IF NOT EXISTS "current_grade" TEXT,
ADD COLUMN IF NOT EXISTS "school_name" TEXT,
ADD COLUMN IF NOT EXISTS "sports_history" TEXT,
ADD COLUMN IF NOT EXISTS "achievements" TEXT[],
ADD COLUMN IF NOT EXISTS "jersey_size" TEXT,
ADD COLUMN IF NOT EXISTS "shoe_size" TEXT,
ADD COLUMN IF NOT EXISTS "height" TEXT,
ADD COLUMN IF NOT EXISTS "weight" TEXT;