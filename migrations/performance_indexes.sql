-- Performance optimization indexes
-- Add these indexes to improve query performance for commonly accessed data

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);

-- Camps table indexes
CREATE INDEX IF NOT EXISTS camps_organization_id_idx ON camps(organization_id);
CREATE INDEX IF NOT EXISTS camps_visibility_idx ON camps(visibility);
CREATE INDEX IF NOT EXISTS camps_start_date_idx ON camps(start_date);
CREATE INDEX IF NOT EXISTS camps_status_idx ON camps(status);

-- Registrations table indexes
CREATE INDEX IF NOT EXISTS registrations_camp_id_user_id_idx ON registrations(camp_id, user_id);
CREATE INDEX IF NOT EXISTS registrations_child_id_idx ON registrations(child_id);
CREATE INDEX IF NOT EXISTS registrations_paid_idx ON registrations(paid);
CREATE INDEX IF NOT EXISTS registrations_waitlisted_idx ON registrations(waitlisted);

-- Camp sessions indexes
CREATE INDEX IF NOT EXISTS camp_sessions_camp_id_idx ON camp_sessions(camp_id);
CREATE INDEX IF NOT EXISTS camp_sessions_start_date_idx ON camp_sessions(start_date);

-- Camp schedules indexes
CREATE INDEX IF NOT EXISTS camp_schedules_camp_id_idx ON camp_schedules(camp_id);
CREATE INDEX IF NOT EXISTS camp_schedules_day_of_week_idx ON camp_schedules(day_of_week);

-- Children table indexes
CREATE INDEX IF NOT EXISTS children_parent_id_idx ON children(parent_id);

-- Custom fields indexes
CREATE INDEX IF NOT EXISTS camp_custom_fields_camp_id_idx ON camp_custom_fields(camp_id);
CREATE INDEX IF NOT EXISTS custom_field_responses_registration_id_idx ON custom_field_responses(registration_id);
CREATE INDEX IF NOT EXISTS custom_field_responses_field_id_idx ON custom_field_responses(field_id);

-- Availability and booking indexes
CREATE INDEX IF NOT EXISTS availability_slots_camp_id_idx ON availability_slots(camp_id);
CREATE INDEX IF NOT EXISTS availability_slots_date_idx ON availability_slots(date);
CREATE INDEX IF NOT EXISTS availability_slots_status_idx ON availability_slots(status);
CREATE INDEX IF NOT EXISTS slot_bookings_slot_id_idx ON slot_bookings(slot_id);
CREATE INDEX IF NOT EXISTS slot_bookings_user_id_idx ON slot_bookings(user_id);
CREATE INDEX IF NOT EXISTS slot_bookings_status_idx ON slot_bookings(status);