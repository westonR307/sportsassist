// Script to update password for a user
import crypto from 'crypto';
import pg from 'pg';
import { promisify } from 'util';

const { Pool } = pg;

// Function to generate a secure password hash (matching the one in server/utils.ts)
async function hashPassword(password) {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Use scrypt for hashing (same as in the app)
  const scryptAsync = promisify(crypto.scrypt);
  const buf = await scryptAsync(password, salt, 64);
  
  // Return the hash and salt as a single string
  return `${buf.toString('hex')}.${salt}`;
}

async function updatePassword() {
  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // User email to update
  const userEmail = 'mlu@sportsassist.io';
  
  // New password - you can change this to any secure password you want
  const newPassword = 'SportsAssist2024!';
  
  try {
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update the user's password hash
    const result = await pool.query(
      'UPDATE users SET "passwordHash" = $1, password = $2 WHERE email = $3 RETURNING id, username, email',
      [passwordHash, '', userEmail] // Set password field to empty string as in the registration logic
    );
    
    if (result.rows.length > 0) {
      console.log(`Password updated successfully for user: ${result.rows[0].email}`);
      console.log(`New password is: ${newPassword}`);
    } else {
      console.log(`User with email ${userEmail} not found.`);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
updatePassword();