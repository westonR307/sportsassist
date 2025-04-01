-- Create the camp_document_agreements table
CREATE TABLE IF NOT EXISTS camp_document_agreements (
  id SERIAL PRIMARY KEY,
  camp_id INTEGER NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(camp_id, document_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_camp_document_agreements_camp_id ON camp_document_agreements(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_document_agreements_document_id ON camp_document_agreements(document_id);