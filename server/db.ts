import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as tables from "@shared/tables";

// Configure Neon with websocket constructor
neonConfig.webSocketConstructor = ws;
// Add error handling to avoid crash on websocket errors
neonConfig.wsRetryStartDelayMs = 100; // Start retry delay in milliseconds
neonConfig.wsRetryBackoffFactor = 1.5; // Exponential backoff factor
neonConfig.wsMaxRetries = 5; // Maximum number of retries

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Safely handle connection errors
const handlePoolError = (err: Error) => {
  console.error("Database pool error:", err.message);
  
  // Don't exit the process - allow reconnection to happen
  console.info("Attempting to recover from database error...");
};

// Create a more resilient pool configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increased from default 10 connections for high traffic
  idleTimeoutMillis: 30000, // Connection idle timeout (30 seconds)
  connectionTimeoutMillis: 3000, // Connection acquisition timeout (3 seconds)
  allowExitOnIdle: false, // Don't exit on idle
});

// Register the error handler
pool.on('error', handlePoolError);

// Create a drizzle instance with merged schemas
// Combine schema and tables into a single schema object
const mergedSchema = { ...schema, ...tables };

// Create the db instance with the merged schema
export const db = drizzle(pool, { schema: mergedSchema });
