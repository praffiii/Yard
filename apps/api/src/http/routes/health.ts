import { Duration, Effect, Schema } from 'effect';
import { databaseConfig } from '../../infrastructure/config.js';
import { DatabaseHealthProbe } from '../../runtime/application.js';

export const HealthResponse = Schema.Struct({
  service: Schema.Literal('yard-api'),
  status: Schema.Literal('ok', 'unavailable'),
});

export type HealthResponse = Schema.Schema.Type<typeof HealthResponse>;

const healthyPayload: HealthResponse = {
  service: 'yard-api',
  status: 'ok',
};

const unavailablePayload: HealthResponse = {
  service: 'yard-api',
  status: 'unavailable',
};

/** Probes only the database dependency and converts failures to a safe readiness result. */
export const healthCheck = Effect.gen(function* () {
  const database = yield* DatabaseHealthProbe;

  yield* Effect.tryPromise({
    try: () => database.ping(),
    catch: () => new Error('Database readiness probe failed'),
  }).pipe(Effect.timeout(Duration.millis(databaseConfig.healthProbeTimeoutMs)));

  return Schema.decodeUnknownSync(HealthResponse)(healthyPayload);
}).pipe(Effect.catchAll(() => Effect.succeed(unavailablePayload)));
