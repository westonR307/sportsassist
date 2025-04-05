/**
 * Script to create a platform admin user for the database.
 * 
 * Run with:
 * node scripts/create-admin-user.js
 */

// Import required modules
import { hashPassword } from '../server/auth.js';
import { db } from '../server/db.js';
import { users } from '../shared/tables.js';
import { eq } from 'drizzle-orm';

// Admin user details (replace with your own values)
const adminUser = {
  username: 'admin',
  email: 'admin@sportsassist.io',
  role: 'platform_admin',
  first_name: 'Admin',
  last_name: 'User',
  password: 'adminpass123'  // Will be hashed before storing
};

async function createAdminUser() {
  try {
    console.log('Checking if admin user already exists...');
    const existingUser = await db.select().from(users).where(eq(users.username, adminUser.username)).limit(1);
    
    if (existingUser.length > 0) {
      console.log('Admin user already exists.');
      return;
    }
    
    // Hash the password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(adminUser.password);
    
    // Insert the admin user
    console.log('Creating admin user...');
    const result = await db.insert(users).values({
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      password: passwordHash,
      passwordHash: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Admin user created successfully!');
    console.log('Username:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Password:', adminUser.password);
    console.log('Role:', adminUser.role);
    console.log('\nYou can now log in to the admin dashboard at /admin');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Execute the function
createAdminUser();