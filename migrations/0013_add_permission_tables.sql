-- Create the permission sets table
CREATE TABLE IF NOT EXISTS permission_sets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  is_default BOOLEAN DEFAULT FALSE,
  default_for_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create the permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_set_id INTEGER NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'organization',
  allowed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create the user permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_set_id INTEGER NOT NULL REFERENCES permission_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_by_set ON permissions(permission_set_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_by_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_by_set ON user_permissions(permission_set_id);
CREATE INDEX IF NOT EXISTS idx_permission_sets_by_org ON permission_sets(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_sets_by_role ON permission_sets(default_for_role);

-- Create default permission sets for the existing roles
INSERT INTO permission_sets (name, description, organization_id, is_default, default_for_role)
SELECT 'Camp Creator Default Permissions', 'Default permissions for Camp Creators', id, TRUE, 'camp_creator'
FROM organizations;

INSERT INTO permission_sets (name, description, organization_id, is_default, default_for_role)
SELECT 'Manager Default Permissions', 'Default permissions for Managers', id, TRUE, 'manager'
FROM organizations;

INSERT INTO permission_sets (name, description, organization_id, is_default, default_for_role)
SELECT 'Coach Default Permissions', 'Default permissions for Coaches', id, TRUE, 'coach'
FROM organizations;

INSERT INTO permission_sets (name, description, organization_id, is_default, default_for_role)
SELECT 'Volunteer Default Permissions', 'Default permissions for Volunteers', id, TRUE, 'volunteer'
FROM organizations;

-- Add permissions for Camp Creator role
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'create', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'edit', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'delete', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

-- Team management for camp creator
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'team', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'team', 'create', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'team', 'edit', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'team', 'delete', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

-- Documents for camp creator
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'documents', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'documents', 'create', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'documents', 'edit', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'camp_creator';

-- Add permissions for Manager role (limited compared to camp creator)
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'manager';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'edit', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'manager';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'team', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'manager';

-- Add permissions for Coach role (more limited)
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'coach';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'sessions', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'coach';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'athletes', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'coach';

-- Add permissions for Volunteer role (most limited)
INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'camps', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'volunteer';

INSERT INTO permissions (permission_set_id, resource, action, scope, allowed)
SELECT ps.id, 'sessions', 'view', 'organization', TRUE
FROM permission_sets ps WHERE ps.default_for_role = 'volunteer';