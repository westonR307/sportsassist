-- Add soft delete and cancellation fields to camps table
ALTER TABLE camps
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Update the listing queries to filter out deleted camps by default
COMMENT ON COLUMN camps.is_deleted IS 'When true, the camp is soft deleted and should not appear in regular listing queries';
COMMENT ON COLUMN camps.is_cancelled IS 'When true, the camp is cancelled but still visible with a cancelled status';
COMMENT ON COLUMN camps.deleted_at IS 'Timestamp when the camp was soft deleted';
COMMENT ON COLUMN camps.cancelled_at IS 'Timestamp when the camp was cancelled';
COMMENT ON COLUMN camps.cancel_reason IS 'Optional reason provided for cancellation';