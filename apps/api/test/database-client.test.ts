import { Effect } from 'effect';
import { describe, expect, it } from 'vite-plus/test';
import type { DatabaseClient, YardDatabase } from '../src/infrastructure/database/client.js';
import { Database, applicationLayer, runApplication } from '../src/runtime/application.js';

describe('database application boundary', () => {
  it('provides the configured Drizzle client through the Effect layer', async () => {
    const handle = {} as YardDatabase;
    const database: DatabaseClient = {
      kind: 'client',
      db: handle,
      ping: async () => undefined,
      close: async () => undefined,
    };

    try {
      const providedDatabase = await runApplication(
        Effect.gen(function* () {
          return yield* Database;
        }),
        applicationLayer(database),
      );

      expect(providedDatabase.db).toBe(database.db);
    } finally {
      await database.close();
    }
  });
});
