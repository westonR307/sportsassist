import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runPerformanceIndexes() {
  try {
    console.log('Starting performance index migration...');
    
    // Read the SQL file
    const sqlPath = path.join('.', 'migrations', 'performance_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL statements
    console.log('Executing performance indexes...');
    await pool.query(sql);
    
    console.log('Performance indexes created successfully!');
  } catch (error) {
    console.error('Error creating performance indexes:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runPerformanceIndexes();