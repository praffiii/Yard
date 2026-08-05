import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { schema } from './schema/index.js';

export type YardDatabase = NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export type DatabaseHealth = {
  readonly kind: 'health';
  readonly ping: () => Promise<void>;
};

export type DatabaseClient<TDatabase extends YardDatabase = YardDatabase> = {
  readonly kind: 'client';
  readonly db: TDatabase;
  readonly ping: () => Promise<void>;
  readonly close: () => Promise<void>;
};
