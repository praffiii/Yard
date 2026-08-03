import { Effect, Schema } from 'effect';

export const HealthResponse = Schema.Struct({
  service: Schema.Literal('yard-api'),
  status: Schema.Literal('ok'),
});

export type HealthResponse = Schema.Schema.Type<typeof HealthResponse>;

const healthPayload: HealthResponse = {
  service: 'yard-api',
  status: 'ok',
};

export const healthCheck = Effect.succeed(Schema.decodeUnknownSync(HealthResponse)(healthPayload));
