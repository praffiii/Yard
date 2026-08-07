import { and, eq } from 'drizzle-orm';
import { Data, Effect, Schema } from 'effect';
import type { YardDatabase } from '../../infrastructure/database/client.js';
import { users, type AccountStatus, type UserRow } from './database-tables.js';
import { ViewerProfileSchema, type ViewerProfile } from './schemas.js';
import { generateUuidV7 } from './uuid-v7.js';

export type ResolvedViewer = Readonly<{
  yardUserId: string;
  accountStatus: Exclude<AccountStatus, 'deleted'>;
}>;

export type IdentityService = Readonly<{
  resolveAuthenticatedViewer: (
    authProvider: string,
    authSubject: string,
  ) => Promise<ResolvedViewer | null>;
  getViewerProfile: (yardUserId: string) => Promise<ViewerProfile>;
}>;

export class IdentityPersistenceError extends Data.TaggedError('IdentityPersistenceError')<{
  cause: unknown;
}> {}

/** Effect application operation that resolves/provisions the trusted Yard actor. */
export function resolveAuthenticatedViewer(
  identity: IdentityService,
  authProvider: string,
  authSubject: string,
) {
  return Effect.tryPromise({
    try: () => identity.resolveAuthenticatedViewer(authProvider, authSubject),
    catch: (cause) => new IdentityPersistenceError({ cause }),
  });
}

/** Viewer-specific identity query; its DTO includes private owner-visible fields. */
export function getViewerProfile(identity: IdentityService, yardUserId: string) {
  return Effect.tryPromise({
    try: () => identity.getViewerProfile(yardUserId),
    catch: (cause) => new IdentityPersistenceError({ cause }),
  });
}

function projectViewerProfile(user: UserRow): ViewerProfile {
  return Schema.decodeUnknownSync(ViewerProfileSchema)({
    id: user.id,
    realName: user.realName,
    displayName: user.displayName,
    profilePhoto: { status: user.profilePhotoStatus ?? 'none' },
    accountStatus: user.accountStatus,
    profileComplete:
      user.realName !== null && user.displayName !== null && user.profilePhotoStatus === 'ready',
  });
}

/** Identity-owned persistence boundary used by authentication and identity queries. */
export function createIdentityService(db: YardDatabase): IdentityService {
  return {
    async resolveAuthenticatedViewer(authProvider, authSubject) {
      const existing = (
        await db
          .select()
          .from(users)
          .where(and(eq(users.authProvider, authProvider), eq(users.authSubject, authSubject)))
          .limit(1)
      )[0];

      if (existing) {
        return resolvedViewer(existing);
      }

      const inserted = await db
        .insert(users)
        .values({
          id: generateUuidV7(),
          authProvider,
          authSubject,
        })
        .onConflictDoNothing({ target: [users.authProvider, users.authSubject] })
        .returning();

      const user =
        inserted[0] ??
        (
          await db
            .select()
            .from(users)
            .where(and(eq(users.authProvider, authProvider), eq(users.authSubject, authSubject)))
            .limit(1)
        )[0];

      return user ? resolvedViewer(user) : null;
    },

    async getViewerProfile(yardUserId) {
      const user = (await db.select().from(users).where(eq(users.id, yardUserId)).limit(1))[0];

      if (!user || user.accountStatus === 'deleted') {
        throw new Error('Viewer identity is unavailable');
      }

      return projectViewerProfile(user);
    },
  };
}

function resolvedViewer(user: UserRow): ResolvedViewer | null {
  return user.accountStatus === 'deleted'
    ? null
    : { yardUserId: user.id, accountStatus: user.accountStatus };
}
