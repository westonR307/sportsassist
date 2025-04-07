-- Add camp message replies table
CREATE TABLE IF NOT EXISTS camp_message_replies (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES camp_messages(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  camp_id INTEGER NOT NULL REFERENCES camps(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS camp_message_replies_message_id_idx ON camp_message_replies(message_id);
CREATE INDEX IF NOT EXISTS camp_message_replies_sender_id_idx ON camp_message_replies(sender_id);
CREATE INDEX IF NOT EXISTS camp_message_replies_camp_id_idx ON camp_message_replies(camp_id);
CREATE INDEX IF NOT EXISTS camp_message_replies_organization_id_idx ON camp_message_replies(organization_id);