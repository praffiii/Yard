import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { databaseConfig } from '../config.js';
import type { DatabaseClient } from './types.js';
import { schema } from './schema/index.js';
import { createPooledDatabase } from './pooled-client.js';

/** Creates the pooled Neon runtime client. Migrations use the direct URL instead. */
export function createNeonDatabase(url: string): DatabaseClient<NeonDatabase<typeof schema>> {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: databaseConfig.healthProbeTimeoutMs,
    query_timeout: databaseConfig.healthProbeTimeoutMs,
  });
  const db = drizzle(pool, { schema });

  return createPooledDatabase(pool, db);
}
