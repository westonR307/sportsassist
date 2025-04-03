-- Add a field_source column to the custom_fields table to differentiate between registration and camp fields
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS field_source VARCHAR(20) DEFAULT 'registration';

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_source ON custom_fields(field_source);
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_source ON custom_fields(organization_id, field_source);
