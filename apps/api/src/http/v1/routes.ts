import { Hono } from 'hono';
import { Schema } from 'effect';
import { authenticationMiddleware } from '../auth-middleware.js';
import { rateLimitMiddleware } from '../rate-limit-middleware.js';
import { contractFixtureRoutes } from './contract-routes.js';
import type { ApiEnv } from '../request-context.js';
import type { AuthTokenVerifier } from '../../infrastructure/auth/clerk-adapter.js';
import type { RateLimiter } from '../../infrastructure/rate-limiter.js';

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
  authVerifier: AuthTokenVerifier;
  rateLimiter: RateLimiter;
  includeContractFixture?: boolean;
}) {
  // Keep the anonymous group intentionally small: only the version discovery
  // route belongs here until a product endpoint explicitly requires public access.
  const publicRoutes = new Hono<ApiEnv>().get('/', rateLimitMiddleware(options.rateLimiter), (c) =>
    c.json(apiVersionResponse),
  );

  // This registry is always mounted. Add every product route group through
  // protectedRouteGroup so authentication runs before rate limiting or a
  // handler can consume request context.
  const protectedRoutes = new Hono<ApiEnv>();

  if (options.includeContractFixture) {
    protectedRoutes.route('/__contract', protectedRouteGroup(options, contractFixtureRoutes));
  }

  return new Hono<ApiEnv>().route('/', publicRoutes).route('/', protectedRoutes);
}

function protectedRouteGroup(
  options: {
    authVerifier: AuthTokenVerifier;
    rateLimiter: RateLimiter;
  },
  routes: Hono<ApiEnv>,
) {
  return new Hono<ApiEnv>()
    .use('*', authenticationMiddleware(options.authVerifier))
    .use('*', rateLimitMiddleware(options.rateLimiter))
    .route('/', routes);
}
