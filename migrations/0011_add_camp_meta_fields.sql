-- Add the camp_meta_fields table
CREATE TABLE IF NOT EXISTS camp_meta_fields (
    id SERIAL PRIMARY KEY,
    camp_id INTEGER NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    custom_field_id INTEGER NOT NULL REFERENCES custom_fields(id),
    response TEXT,
    response_array JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(camp_id, custom_field_id)
);

-- Add index for faster lookups by camp_id
CREATE INDEX IF NOT EXISTS camp_meta_fields_camp_id_idx ON camp_meta_fields(camp_id);