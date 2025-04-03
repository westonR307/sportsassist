-- Add is_internal column to custom_fields table
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;