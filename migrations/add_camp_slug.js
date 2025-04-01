import { db } from '../server/db.js';
import { sql, eq } from 'drizzle-orm';
import { camps } from '../shared/tables.js';

// Function to generate a random slug
import crypto from 'crypto';

function generateSlug() {
  // Use node's crypto module to generate a cryptographically secure random string
  return crypto.randomBytes(12).toString('hex');
}

async function main() {
  console.log('Starting migration to add unique slugs to all camps...');
  
  try {
    // Check if the slug column exists
    const slugColumnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'camps' AND column_name = 'slug'
    `);
    
    // If the slug column doesn't exist, add it
    if (slugColumnCheck.rows.length === 0) {
      console.log('Creating slug column in camps table...');
      await db.execute(sql`
        ALTER TABLE camps 
        ADD COLUMN slug TEXT DEFAULT NULL;
      `);
      console.log('Slug column created successfully.');
    } else {
      console.log('Slug column already exists.');
    }
    
    // Fetch all camps without a slug
    const campsWithoutSlug = await db.select()
      .from(camps)
      .where(sql`slug IS NULL`);
    
    console.log(`Found ${campsWithoutSlug.length} camps without slugs.`);
    
    // Update each camp with a unique slug
    for (const camp of campsWithoutSlug) {
      const slug = generateSlug();
      await db.update(camps)
        .set({ slug })
        .where(eq(camps.id, camp.id));
      console.log(`Added slug "${slug}" to camp ID ${camp.id}`);
    }
    
    // Add a unique constraint to the slug column
    const uniqueConstraintCheck = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'camps' AND constraint_type = 'UNIQUE' AND constraint_name = 'camps_slug_unique'
    `);
    
    if (uniqueConstraintCheck.rows.length === 0) {
      console.log('Adding unique constraint to slug column...');
      await db.execute(sql`
        ALTER TABLE camps 
        ADD CONSTRAINT camps_slug_unique UNIQUE (slug);
      `);
      console.log('Unique constraint added successfully.');
    } else {
      console.log('Unique constraint already exists.');
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });