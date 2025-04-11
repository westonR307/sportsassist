import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { desc, sql } from 'drizzle-orm';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
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

// Create a regular drizzle instance
export const db = drizzle(pool, { schema: { ...schema, ...tables } });

// Create a db object with prepared queries
export const dbWithPreparedQueries = drizzle({
  client: pool, 
  schema: { ...schema, ...tables },
  prepared: true
});
