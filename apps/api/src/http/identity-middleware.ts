import { Effect } from 'effect';
import type { MiddlewareHandler } from 'hono';
import { problemForStatus } from './problems.js';
import type { ApiEnv } from './request-context.js';
import { resolveAuthenticatedViewer, type IdentityService } from '../modules/identity/index.js';

/** Resolves the verified Clerk subject to the application-owned Yard actor. */
export function identityMiddleware(identity: IdentityService): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const authSubject = c.get('verifiedAuthSubject');

    if (!authSubject) {
      return problemForStatus(c, 401);
    }

    const viewer = await Effect.runPromise(
      resolveAuthenticatedViewer(identity, 'clerk', authSubject),
    );

    if (!viewer) {
      return problemForStatus(c, 401);
    }

    // Provider identity is a one-middleware handoff, not downstream actor context.
    c.set('verifiedAuthSubject', undefined);
    c.set('yardUserId', viewer.yardUserId);
    c.set('accountStatus', viewer.accountStatus);
    return next();
  };
}
