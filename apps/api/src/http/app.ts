import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { apiConfig } from '../infrastructure/config.js';
import { rejectingTokenVerifier } from './auth-middleware.js';
import type { AuthTokenVerifier } from '../infrastructure/auth/clerk-adapter.js';
import { type DatabaseClient, type DatabaseHealth } from '../infrastructure/database/client.js';
import type { ProviderAdapters } from '../infrastructure/provider-types.js';
import { allowAllRateLimiter, type RateLimiter } from '../infrastructure/rate-limiter.js';
import { applicationLayer, runApplication } from '../runtime/application.js';
import { healthCheck } from './routes/health.js';
import { problemForStatus, routeNotFoundProblem } from './problems.js';
import { requestIdMiddleware } from './request-id.js';
import type { ApiEnv } from './request-context.js';
import { createV1Routes } from './v1/routes.js';

export type CreateAppOptions = {
  /** Only contract tests enable the non-product validation fixture. */
  readonly includeContractFixture?: boolean;
  readonly allowedOrigins?: readonly string[];
  readonly authVerifier?: AuthTokenVerifier;
  readonly rateLimiter?: RateLimiter;
  readonly database?: DatabaseClient | DatabaseHealth;
  readonly providers?: ProviderAdapters;
};

export function createApp(options: CreateAppOptions = {}) {
  const layer =
    options.database?.kind === 'client'
      ? applicationLayer(options.database, options.providers)
      : applicationLayer(options.database);
  const v1 = createV1Routes({
    authVerifier: options.authVerifier ?? rejectingTokenVerifier,
    includeContractFixture: options.includeContractFixture,
    rateLimiter: options.rateLimiter ?? allowAllRateLimiter,
  });

  const api = new Hono<ApiEnv>()
    .use('*', requestIdMiddleware)
    .use(
      '*',
      cors({
        allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
        exposeHeaders: ['Retry-After', 'X-Request-ID'],
        origin: (origin) =>
          (options.allowedOrigins ?? apiConfig.allowedOrigins).includes(origin)
            ? origin
            : undefined,
      }),
    )
    .get('/healthz', async (c) => {
      const health = await runApplication(healthCheck, layer);

      if (health.status === 'ok') {
        return c.json(health, 200);
      }

      return c.json(health, 503);
    })
    .route('/v1', v1);

  api.onError((error, c) => {
    if (error instanceof HTTPException) {
      return problemForStatus(c, error.status);
    }

    return problemForStatus(c, 500);
  });

  api.notFound((c) => routeNotFoundProblem(c));

  return api;
}

export type AppType = ReturnType<typeof createApp>;
export type { ProblemCode, ProblemDetails, ProblemType } from './problems.js';
