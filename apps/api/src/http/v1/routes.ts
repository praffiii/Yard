import { Hono } from 'hono';
import { Schema } from 'effect';
import { authenticationMiddleware } from '../auth-middleware.js';
import { identityMiddleware } from '../identity-middleware.js';
import { rateLimitMiddleware } from '../rate-limit-middleware.js';
import { contractFixtureRoutes } from './contract-routes.js';
import { createIdentityRoutes } from './identity-routes.js';
import type { ApiEnv } from '../request-context.js';
import type { AuthTokenVerifier } from '../../infrastructure/auth/clerk-adapter.js';
import type { RateLimiter } from '../../infrastructure/rate-limiter.js';
import type { IdentityService } from '../../modules/identity/index.js';

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
  identity: IdentityService;
  includeContractFixture?: boolean;
}) {
  // Keep the anonymous surface intentionally small. Protected groups are mounted
  // at explicit prefixes so unknown public routes never run authentication.
  const productRoutes = new Hono<ApiEnv>()
    .get('/', rateLimitMiddleware(options.rateLimiter), (c) => c.json(apiVersionResponse))
    .route('/me', protectedRouteGroup(options, createIdentityRoutes(options.identity)));

  if (options.includeContractFixture) {
    productRoutes.route('/__contract', protectedRouteGroup(options, contractFixtureRoutes));
  }

  return productRoutes;
}

function protectedRouteGroup(
  options: {
    authVerifier: AuthTokenVerifier;
    rateLimiter: RateLimiter;
    identity: IdentityService;
  },
  routes: Hono<ApiEnv>,
) {
  return new Hono<ApiEnv>()
    .use('*', authenticationMiddleware(options.authVerifier))
    .use('*', identityMiddleware(options.identity))
    .use('*', rateLimitMiddleware(options.rateLimiter))
    .route('/', routes);
}
