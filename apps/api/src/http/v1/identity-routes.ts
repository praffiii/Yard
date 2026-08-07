import { Hono } from 'hono';
import { Effect, Schema } from 'effect';
import type { ApiEnv } from '../request-context.js';
import {
  getViewerProfile,
  ViewerProfileSchema,
  type IdentityService,
} from '../../modules/identity/index.js';

/** Thin transport adapter for the identity-owned viewer query. */
export function createIdentityRoutes(identity: IdentityService) {
  return new Hono<ApiEnv>().get('/', async (c) => {
    const yardUserId = c.get('yardUserId');

    if (!yardUserId) {
      throw new Error('Resolved Yard identity is missing');
    }

    const profile = await Effect.runPromise(getViewerProfile(identity, yardUserId));
    c.header('Cache-Control', 'private, no-store');
    return c.json(Schema.decodeUnknownSync(ViewerProfileSchema)(profile), 200);
  });
}
