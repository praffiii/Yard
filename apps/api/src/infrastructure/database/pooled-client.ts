import type { DatabaseClient, YardDatabase } from './types.js';

type DatabasePool = {
  readonly query: (query: string) => Promise<unknown>;
  readonly end: () => Promise<void>;
  readonly on: (event: 'error', listener: (error: Error) => void) => unknown;
};

/** Shares one in-flight readiness probe and keeps pool lifecycle provider-neutral. */
export function createPooledDatabase<TDatabase extends YardDatabase>(
  pool: DatabasePool,
  db: TDatabase,
): DatabaseClient<TDatabase> {
  let pendingPing: Promise<void> | undefined;
  let poolError: Error | undefined;

  pool.on('error', (error) => {
    poolError = error;
  });

  return {
    kind: 'client',
    db,
    ping: () => {
      if (poolError) {
        const error = poolError;
        poolError = undefined;
        return Promise.reject(error);
      }

      pendingPing ??= Promise.resolve()
        .then(() => pool.query('SELECT 1'))
        .then(() => undefined)
        .finally(() => {
          pendingPing = undefined;
        });

      return pendingPing;
    },
    close: () => pool.end(),
  };
}
