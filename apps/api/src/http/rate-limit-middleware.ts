import type { MiddlewareHandler } from 'hono';
import { problemCodes, problemResponse, problemTypes } from './problems.js';
import type { ApiEnv } from './request-context.js';
import type { RateLimiter } from '../infrastructure/rate-limiter.js';

/**
 * Identity context is intentionally supplied by trusted auth/proxy middleware;
 * never derive a Yard user ID or client identity from request headers here.
 */
export function rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const decision = await limiter.check({
      yardUserId: c.get('yardUserId'),
      clientIp: c.get('clientIp'),
      method: c.req.method,
      path: c.req.path,
    });

    if (!decision.allowed) {
      const retryAfterSeconds = decision.retryAfterSeconds;
      if (
        retryAfterSeconds !== undefined &&
        Number.isInteger(retryAfterSeconds) &&
        retryAfterSeconds >= 0
      ) {
        c.header('Retry-After', String(retryAfterSeconds));
      }

      return problemResponse(c, {
        type: problemTypes.rateLimited,
        title: 'Too Many Requests',
        status: 429,
        code: problemCodes.rateLimited,
        detail: 'Too many requests. Try again later.',
      });
    }

    return next();
  };
}
