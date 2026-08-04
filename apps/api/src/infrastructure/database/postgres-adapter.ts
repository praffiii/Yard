import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { databaseConfig } from '../config.js';
import type { DatabaseClient } from './types.js';
import { schema } from './schema/index.js';
import { createPooledDatabase } from './pooled-client.js';

/** Creates a pooled PostgreSQL client for local development and tests. */
export function createPostgresDatabase(url: string): DatabaseClient<NodePgDatabase<typeof schema>> {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: databaseConfig.healthProbeTimeoutMs,
    query_timeout: databaseConfig.healthProbeTimeoutMs,
  });
  const db = drizzle(pool, { schema });

  return createPooledDatabase(pool, db);
}
