import { Hono } from 'hono';
import { Schema } from 'effect';
import { rateLimit } from '../rate-limit.js';
import { contractFixtureRoutes } from './contract-routes.js';
import type { ApiEnv } from '../request-context.js';
import type { RateLimiter } from '../../infrastructure/rate-limit.js';

const ApiVersionResponseSchema = Schema.Struct({
  apiVersion: Schema.Literal('v1'),
  service: Schema.Literal('yard-api'),
});

const apiVersionResponse = Schema.decodeUnknownSync(ApiVersionResponseSchema)({
  apiVersion: 'v1',
  service: 'yard-api',
});

export type ApiVersionResponse = Schema.Schema.Type<typeof ApiVersionResponseSchema>;

export function createV1Routes(options: {
  rateLimiter: RateLimiter;
  includeContractFixture?: boolean;
}) {
  const routes = new Hono<ApiEnv>()
    .use('*', rateLimit(options.rateLimiter))
    // Keep the reserved namespace discoverable and typed before product routes land.
    .get('/', (c) => c.json(apiVersionResponse));

  if (options.includeContractFixture) {
    routes.route('/__contract', contractFixtureRoutes);
  }

  return routes;
}
