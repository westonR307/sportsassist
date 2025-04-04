-- Add new columns to organizations table for profile customization
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS about_text text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS social_links jsonb,
ADD COLUMN IF NOT EXISTS banner_image_url text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create table for organization messages (in-platform communication)
CREATE TABLE IF NOT EXISTS organization_messages (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  sender_id INTEGER REFERENCES users(id),
  sender_name TEXT,
  sender_email TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Update existing organizations to have a slug
UPDATE organizations
SET slug = LOWER(REPLACE(name, ' ', '-'))
WHERE slug IS NULL;