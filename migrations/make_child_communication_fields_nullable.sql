-- Migration to modify children table schema
-- 1. Make communication fields nullable
ALTER TABLE children ALTER COLUMN preferred_contact DROP NOT NULL;
ALTER TABLE children ALTER COLUMN communication_opt_in DROP NOT NULL;

-- 2. Drop irrelevant fields (height and weight)
ALTER TABLE children DROP COLUMN IF EXISTS height;
ALTER TABLE children DROP COLUMN IF EXISTS weight;