import { readDatabaseRuntimeConfig, type DatabaseRuntimeConfig } from '../config.js';
import { createNeonDatabase } from './neon-adapter.js';
import { createPostgresDatabase } from './postgres-adapter.js';
import type { DatabaseClient, DatabaseHealth } from './types.js';

export type { DatabaseClient, DatabaseHealth, YardDatabase } from './types.js';

/** A safe default for tests and callers that intentionally omit infrastructure. */
export const unavailableDatabase: DatabaseHealth = {
  kind: 'health',
  ping: async () => {
    throw new Error('Database runtime configuration is missing');
  },
};

export function createDatabaseClient(
  config: DatabaseRuntimeConfig = readDatabaseRuntimeConfig(),
): DatabaseClient {
  if (config.driver === 'neon') {
    return createNeonDatabase(config.url);
  }

  return createPostgresDatabase(config.url);
}
