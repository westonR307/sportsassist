// Custom fields migration script
import { customFields, campCustomFields, customFieldResponses } from '../shared/schema.js';
import { db } from '../server/db.js';

(async function() {
  try {
    console.log('Starting custom fields migration...');
    
    // Create custom_fields table
    console.log('Creating custom_fields table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        field_type TEXT NOT NULL,
        required BOOLEAN NOT NULL DEFAULT false,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        validation_type TEXT NOT NULL DEFAULT 'none',
        options JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create camp_custom_fields table
    console.log('Creating camp_custom_fields table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS camp_custom_fields (
        id SERIAL PRIMARY KEY,
        camp_id INTEGER NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
        custom_field_id INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL DEFAULT 0,
        required BOOLEAN
      );
    `);
    
    // Create custom_field_responses table
    console.log('Creating custom_field_responses table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS custom_field_responses (
        id SERIAL PRIMARY KEY,
        registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
        custom_field_id INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
        response TEXT,
        response_array JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
})();