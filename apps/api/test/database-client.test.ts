import { Effect } from 'effect';
import { describe, expect, it } from 'vite-plus/test';
import type { DatabaseClient, YardDatabase } from '../src/infrastructure/database/client.js';
import { createPooledDatabase } from '../src/infrastructure/database/pooled-client.js';
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

describe('pooled database readiness', () => {
  it('shares concurrent probes and starts a new probe after completion', async () => {
    let queryCalls = 0;
    let finishQuery: (() => void) | undefined;
    const queryFinished = new Promise<void>((resolve) => {
      finishQuery = resolve;
    });
    const database = createPooledDatabase(
      {
        query: async () => {
          queryCalls += 1;
          await queryFinished;
        },
        end: async () => undefined,
        on: () => undefined,
      },
      {} as YardDatabase,
    );

    const firstPing = database.ping();
    const secondPing = database.ping();

    expect(queryCalls).toBe(1);
    finishQuery?.();
    await Promise.all([firstPing, secondPing]);

    await database.ping();
    expect(queryCalls).toBe(2);
  });

  it('clears a failed probe so the next probe can retry', async () => {
    let queryCalls = 0;
    const database = createPooledDatabase(
      {
        query: async () => {
          queryCalls += 1;
          if (queryCalls === 1) {
            throw new Error('probe failed');
          }
        },
        end: async () => undefined,
        on: () => undefined,
      },
      {} as YardDatabase,
    );

    await expect(database.ping()).rejects.toThrow('probe failed');
    await expect(database.ping()).resolves.toBeUndefined();
    expect(queryCalls).toBe(2);
  });
});
