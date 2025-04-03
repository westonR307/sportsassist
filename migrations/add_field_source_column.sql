-- Add the field_source column to the custom_fields table
ALTER TABLE custom_fields 
ADD COLUMN IF NOT EXISTS field_source TEXT NOT NULL DEFAULT 'registration';

-- Update existing fields to have the correct source
-- Since any existing fields are registration fields, we can set them all to 'registration'
UPDATE custom_fields SET field_source = 'registration';