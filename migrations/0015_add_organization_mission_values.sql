-- Add mission statement and features columns to organizations table
ALTER TABLE organizations 
ADD COLUMN mission_statement TEXT,
ADD COLUMN feature_1_title TEXT,
ADD COLUMN feature_1_description TEXT,
ADD COLUMN feature_2_title TEXT,
ADD COLUMN feature_2_description TEXT,
ADD COLUMN feature_3_title TEXT,
ADD COLUMN feature_3_description TEXT;
