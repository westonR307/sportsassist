import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Add scheduling_type column to camps
    console.log('1. Adding scheduling_type column to camps table...');
    await pool.query(`
      ALTER TABLE camps
      ADD COLUMN IF NOT EXISTS scheduling_type TEXT NOT NULL DEFAULT 'fixed'
    `);
    console.log('scheduling_type column added successfully.');

    // Create availability_slots table
    console.log('2. Creating availability_slots table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id SERIAL PRIMARY KEY,
        camp_id INTEGER NOT NULL REFERENCES camps(id),
        creator_id INTEGER NOT NULL REFERENCES users(id),
        slot_date TIMESTAMP NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        status TEXT NOT NULL DEFAULT 'available',
        max_bookings INTEGER NOT NULL DEFAULT 1,
        current_bookings INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        buffer_before INTEGER DEFAULT 0,
        buffer_after INTEGER DEFAULT 0,
        is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
        recurrence_rule TEXT,
        recurrence_end_date TIMESTAMP,
        parent_slot_id INTEGER REFERENCES availability_slots(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('availability_slots table created successfully.');

    // Create slot_bookings table
    console.log('3. Creating slot_bookings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slot_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER NOT NULL REFERENCES availability_slots(id),
        registration_id INTEGER REFERENCES registrations(id),
        child_id INTEGER NOT NULL REFERENCES children(id),
        parent_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'confirmed',
        booking_date TIMESTAMP NOT NULL DEFAULT NOW(),
        cancelled_at TIMESTAMP,
        cancel_reason TEXT,
        rescheduled_from_id INTEGER REFERENCES slot_bookings(id),
        notes TEXT,
        notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
        reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
        feedback_sent BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('slot_bookings table created successfully.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();