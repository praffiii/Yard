import { Context, Effect, Layer } from 'effect';
import {
  unavailableDatabase,
  type DatabaseClient,
  type DatabaseHealth,
} from '../infrastructure/database/client.js';
import type { ProviderAdapters } from '../infrastructure/provider-types.js';

export const Database = Context.GenericTag<DatabaseClient>('@yard/api/Database');
export const DatabaseHealthProbe = Context.GenericTag<DatabaseHealth>('@yard/api/DatabaseHealth');
export const ProviderServices = Context.GenericTag<ProviderAdapters>('@yard/api/ProviderServices');

type ApplicationDatabase = DatabaseClient | DatabaseHealth;
type HealthLayer = Layer.Layer<DatabaseHealth>;
type DatabaseLayer = Layer.Layer<DatabaseHealth | DatabaseClient | ProviderAdapters>;

const unavailableProviderAdapters: ProviderAdapters = {
  getImageProcessor: () => {
    throw new Error('Image processor configuration is missing');
  },
  getMapProvider: () => {
    throw new Error('Map provider configuration is missing');
  },
  getObjectStorage: () => {
    throw new Error('Object storage configuration is missing');
  },
  getTransactionalEmail: () => {
    throw new Error('Transactional email configuration is missing');
  },
};

/** Compose the complete application layer for a configured database and provider boundary. */
export function applicationLayer(
  database: DatabaseClient,
  providers?: ProviderAdapters,
): DatabaseLayer;
/** Compose the health-only layer used by transport tests and unavailable defaults. */
export function applicationLayer(database?: DatabaseHealth): HealthLayer;
export function applicationLayer(
  database: ApplicationDatabase | undefined,
  providers?: ProviderAdapters,
): HealthLayer | DatabaseLayer;
export function applicationLayer(
  database: ApplicationDatabase = unavailableDatabase,
  providers = unavailableProviderAdapters,
): HealthLayer | DatabaseLayer {
  if (database.kind === 'health') {
    return Layer.succeed(DatabaseHealthProbe, database);
  }

  const health = { kind: 'health' as const, ping: database.ping };
  return Layer.merge(
    Layer.merge(Layer.succeed(DatabaseHealthProbe, health), Layer.succeed(Database, database)),
    Layer.succeed(ProviderServices, providers),
  );
}

export function runApplication<A, E, R>(effect: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) {
  return Effect.runPromise(effect.pipe(Effect.provide(layer)));
}
