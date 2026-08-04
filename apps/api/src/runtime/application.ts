import { Context, Effect, Layer } from 'effect';
import {
  unavailableDatabase,
  type DatabaseClient,
  type DatabaseHealth,
} from '../infrastructure/database/client.js';

export const Database = Context.GenericTag<DatabaseClient>('@yard/api/Database');
export const DatabaseHealthProbe = Context.GenericTag<DatabaseHealth>('@yard/api/DatabaseHealth');

type ApplicationDatabase = DatabaseClient | DatabaseHealth;
type HealthLayer = Layer.Layer<DatabaseHealth>;
type DatabaseLayer = Layer.Layer<DatabaseHealth | DatabaseClient>;

/** Compose the complete application layer for a configured database client. */
export function applicationLayer(database: DatabaseClient): DatabaseLayer;
/** Compose the health-only layer used by transport tests and unavailable defaults. */
export function applicationLayer(database?: DatabaseHealth): HealthLayer;
export function applicationLayer(
  database: ApplicationDatabase | undefined,
): HealthLayer | DatabaseLayer;
export function applicationLayer(
  database: ApplicationDatabase = unavailableDatabase,
): HealthLayer | DatabaseLayer {
  if (database.kind === 'health') {
    return Layer.succeed(DatabaseHealthProbe, database);
  }

  const health = { kind: 'health' as const, ping: database.ping };
  return Layer.merge(Layer.succeed(DatabaseHealthProbe, health), Layer.succeed(Database, database));
}

export function runApplication<A, E, R>(effect: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) {
  return Effect.runPromise(effect.pipe(Effect.provide(layer)));
}
