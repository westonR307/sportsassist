-- Add rescheduled fields to camp_sessions table
ALTER TABLE camp_sessions 
ADD COLUMN rescheduled_date TIMESTAMP,
ADD COLUMN rescheduled_start_time TIME,
ADD COLUMN rescheduled_end_time TIME,
ADD COLUMN rescheduled_status TEXT;

-- Update the status field to accept 'rescheduled' value
COMMENT ON COLUMN camp_sessions.status IS 'Can be: active, cancelled, rescheduled';