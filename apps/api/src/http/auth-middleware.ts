import type { MiddlewareHandler } from 'hono';
import { problemForStatus } from './problems.js';
import type { ApiEnv } from './request-context.js';
import type { AuthTokenVerifier, VerifiedIdentity } from '../infrastructure/auth/clerk-adapter.js';

const bearerTokenPattern = /^Bearer\s+(\S+)$/i;

/**
 * Authenticates a protected transport path and stores only verified identity
 * context. Missing, malformed, and provider-rejected credentials are
 * intentionally indistinguishable to callers.
 */
export function authenticationMiddleware(verifier: AuthTokenVerifier): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const authorization = c.req.header('Authorization');
    const token = authorization?.match(bearerTokenPattern)?.[1];

    if (!token) {
      return problemForStatus(c, 401);
    }

    let identity: VerifiedIdentity;

    try {
      identity = await verifier.verify(token);
    } catch {
      return problemForStatus(c, 401);
    }

    if (!identity.subject.trim()) {
      return problemForStatus(c, 401);
    }

    c.set('actorId', identity.subject);
    return next();
  };
}

/** Closed default for transport tests and app composition without production config. */
export const rejectingTokenVerifier: AuthTokenVerifier = {
  verify: async () => {
    throw new Error('Authentication is not configured');
  },
};
