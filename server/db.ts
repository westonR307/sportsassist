
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as tables from "@shared/tables";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// More robust WebSocket configuration
neonConfig.wsRetryStartDelayMs = 100; // Start retry delay in milliseconds
neonConfig.wsRetryBackoffFactor = 1.5; // Exponential backoff factor
neonConfig.wsRetryMaxDelayMs = 5000; // Maximum delay between retries
neonConfig.wsMaxRetries = 5; // Maximum number of retries

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create a pool with optimized settings to reduce compute hours
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced connection pool size to minimize open connections
  min: 2, // Maintain at least 2 connections to avoid cold starts
  idleTimeoutMillis: 10000, // Close idle connections after 10 seconds (reduced from 30s)
  connectionTimeoutMillis: 3000, // Reduced connection timeout
  maxUses: 5000, // Reduced max uses to prevent connection leaks
  keepAlive: true, // Keep connections alive
  application_name: 'sports_camp_app', // For better identification in logs
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Add error handler to the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process - let the connection pool handle reconnection
});

// Add connection error handler
pool.on('connect', (client) => {
  client.on('error', (err: Error) => {
    console.error('Database client error:', err);
  });
});

// Create drizzle instance with merged schemas
const mergedSchema = { ...schema, ...tables };

// Export database instance
export const db = drizzle(pool, { schema: mergedSchema });
