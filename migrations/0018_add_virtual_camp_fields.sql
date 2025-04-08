-- Add virtual fields to camps table
ALTER TABLE camps 
ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS virtual_meeting_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS camps_is_virtual_idx ON camps(is_virtual);