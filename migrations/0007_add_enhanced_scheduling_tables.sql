-- Create tables for the enhanced scheduling system

-- Create the camp_sessions table
CREATE TABLE IF NOT EXISTS "camp_sessions" (
  "id" SERIAL PRIMARY KEY,
  "camp_id" INTEGER NOT NULL REFERENCES "camps"("id"),
  "session_date" TIMESTAMP NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "recurrence_group_id" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create the recurrence_patterns table
CREATE TABLE IF NOT EXISTS "recurrence_patterns" (
  "id" SERIAL PRIMARY KEY,
  "camp_id" INTEGER NOT NULL REFERENCES "camps"("id"),
  "name" TEXT NOT NULL,
  "pattern_type" TEXT NOT NULL,
  "repeat_type" TEXT NOT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "days_of_week" INTEGER[],
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "camp_sessions_camp_id_idx" ON "camp_sessions"("camp_id");
CREATE INDEX IF NOT EXISTS "camp_sessions_session_date_idx" ON "camp_sessions"("session_date");
CREATE INDEX IF NOT EXISTS "recurrence_patterns_camp_id_idx" ON "recurrence_patterns"("camp_id");