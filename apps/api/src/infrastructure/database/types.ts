import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { schema } from './schema/index.js';

export type YardDatabase = NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export type DatabaseHealth = Readonly<{
  kind: 'health';
  ping: () => Promise<void>;
}>;

export type DatabaseClient<TDatabase extends YardDatabase = YardDatabase> = Readonly<{
  kind: 'client';
  db: TDatabase;
  ping: () => Promise<void>;
  close: () => Promise<void>;
}>;
