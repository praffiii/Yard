import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { apiConfig } from '../infrastructure/config.js';
import { allowAllRateLimiter, type RateLimiter } from '../infrastructure/rate-limiter.js';
import { runApplication } from '../runtime/application.js';
import { healthCheck } from './routes/health.js';
import { problemForStatus, routeNotFoundProblem } from './problems.js';
import { requestIdMiddleware } from './request-id.js';
import type { ApiEnv } from './request-context.js';
import { createV1Routes } from './v1/routes.js';

export type CreateAppOptions = {
  /** Only contract tests enable the non-product validation fixture. */
  readonly includeContractFixture?: boolean;
  readonly rateLimiter?: RateLimiter;
};

export function createApp(options: CreateAppOptions = {}) {
  const v1 = createV1Routes({
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
        origin: (origin) => (apiConfig.allowedOrigins.includes(origin) ? origin : undefined),
      }),
    )
    .get('/healthz', async (c) => c.json(await runApplication(healthCheck)))
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

export const app = createApp();
export type AppType = typeof app;
export type { ProblemCode, ProblemDetails, ProblemType } from './problems.js';
