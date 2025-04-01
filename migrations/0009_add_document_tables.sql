-- Create documents table for storing waivers, forms, and other documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  type VARCHAR(50) NOT NULL DEFAULT 'waiver',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  author_id INTEGER REFERENCES users(id),
  file_path VARCHAR(255),
  file_type VARCHAR(50),
  file_size INTEGER,
  hash VARCHAR(255)
);

-- Create document_fields table for signature and form fields
CREATE TABLE IF NOT EXISTS document_fields (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  x_position INTEGER NOT NULL DEFAULT 0,
  y_position INTEGER NOT NULL DEFAULT 0,
  page_number INTEGER NOT NULL DEFAULT 1,
  width INTEGER NOT NULL DEFAULT 200,
  height INTEGER NOT NULL DEFAULT 50,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create signature_requests table for tracking document signatures
CREATE TABLE IF NOT EXISTS signature_requests (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  requested_for_id INTEGER REFERENCES users(id),
  requested_for_email VARCHAR(255),
  camp_id INTEGER REFERENCES camps(id),
  registration_id INTEGER REFERENCES registrations(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  signature_data TEXT,
  signed_at TIMESTAMP,
  reminder_sent_at TIMESTAMP
);

-- Create document_audit table for tracking document activities
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  signature_request_id INTEGER REFERENCES signature_requests(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_id INTEGER REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS documents_organization_id_idx ON documents(organization_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS document_fields_document_id_idx ON document_fields(document_id);
CREATE INDEX IF NOT EXISTS signature_requests_document_id_idx ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS signature_requests_token_idx ON signature_requests(token);
CREATE INDEX IF NOT EXISTS signature_requests_status_idx ON signature_requests(status);
CREATE INDEX IF NOT EXISTS document_audit_logs_document_id_idx ON document_audit_logs(document_id);