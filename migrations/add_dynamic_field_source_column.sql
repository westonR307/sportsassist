-- Add a new column to document_fields for dynamic field data sources
ALTER TABLE document_fields ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);