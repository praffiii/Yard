import type { MiddlewareHandler } from 'hono';
import type { ApiEnv } from './request-context.js';

export const requestIdMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
};
