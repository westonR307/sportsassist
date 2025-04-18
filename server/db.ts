
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
  statement_timeout: 30000, // Terminate queries running longer than 30 seconds
  query_timeout: 30000, // Timeout for query execution
  // Additional settings to optimize compute usage
  ssl: {
    rejectUnauthorized: false, // Required for some PostgreSQL providers
  },
};

// Track pool status
let poolHealthy = true;
let totalConnections = 0;
let activeConnections = 0;
let idleConnections = 0;
let waitingClients = 0;

// Create the connection pool
export const pool = new Pool(poolConfig);

// Add pool monitoring
setInterval(() => {
  if (pool.totalCount !== undefined) totalConnections = pool.totalCount;
  if (pool.idleCount !== undefined) idleConnections = pool.idleCount;
  if (pool.waitingCount !== undefined) waitingClients = pool.waitingCount;
  activeConnections = totalConnections - idleConnections;
  
  // Log pool stats every 5 minutes in production, more frequently in development
  if (process.env.NODE_ENV !== 'production' || Date.now() % (5 * 60 * 1000) < 1000) {
    console.log(`[DB Pool] Total: ${totalConnections}, Active: ${activeConnections}, Idle: ${idleConnections}, Waiting: ${waitingClients}`);
  }
  
  // Alert if pool is approaching capacity
  if (totalConnections >= poolConfig.max * 0.8) {
    console.warn(`[DB Pool] Warning: Connection pool at ${Math.round(totalConnections/poolConfig.max*100)}% capacity`);
  }
}, 60000); // Check every minute

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

// Utility functions for database optimization
export function isSlowQuery(startTime: number, threshold = 500): boolean {
  const duration = Date.now() - startTime;
  return duration > threshold;
}

// This function can be used as a wrapper for expensive queries to log performance
export async function monitorQuery<T>(
  name: string, 
  queryFn: () => Promise<T>, 
  threshold = 500
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    if (duration > threshold) {
      console.warn(`[SLOW QUERY] ${name} took ${duration}ms`);
    }
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[QUERY ERROR] ${name} failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}
