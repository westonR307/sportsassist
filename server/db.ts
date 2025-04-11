import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as tables from "@shared/tables";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a drizzle instance with merged schemas
// Combine schema and tables into a single schema object
const mergedSchema = { ...schema, ...tables };

// Create the db instance with the merged schema
export const db = drizzle(pool, { schema: mergedSchema });
