-- Create camp_messages table
CREATE TABLE IF NOT EXISTS camp_messages (
  id SERIAL PRIMARY KEY,
  camp_id INTEGER NOT NULL REFERENCES camps(id),
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_to_all BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create camp_message_recipients table
CREATE TABLE IF NOT EXISTS camp_message_recipients (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES camp_messages(id) ON DELETE CASCADE,
  registration_id INTEGER NOT NULL REFERENCES registrations(id),
  child_id INTEGER NOT NULL REFERENCES children(id),
  parent_id INTEGER NOT NULL REFERENCES users(id),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  email_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS camp_messages_camp_id_idx ON camp_messages(camp_id);
CREATE INDEX IF NOT EXISTS camp_messages_organization_id_idx ON camp_messages(organization_id);
CREATE INDEX IF NOT EXISTS camp_message_recipients_message_id_idx ON camp_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS camp_message_recipients_parent_id_idx ON camp_message_recipients(parent_id);