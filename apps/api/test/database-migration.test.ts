import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vite-plus/test';
import { createPostgresDatabase } from '../src/infrastructure/database/postgres-adapter.js';
import { users } from '../src/modules/identity/database-tables.js';
import { createIdentityService } from '../src/modules/identity/service.js';

const migrationDirectory = fileURLToPath(new URL('../drizzle', import.meta.url));
const foundationMigrationFile = fileURLToPath(
  new URL('../drizzle/0000_enable-postgis.sql', import.meta.url),
);
const identityMigrationFile = fileURLToPath(
  new URL('../drizzle/0001_create-identity-users.sql', import.meta.url),
);

function readLocalTestUrl() {
  const value = process.env.DATABASE_TEST_URL?.trim();

  if (!value) {
    return undefined;
  }

  const url = new URL(value);
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');

  if (!localHosts.has(hostname) || !url.pathname.endsWith('_test')) {
    throw new Error('DATABASE_TEST_URL must target a local database whose name ends with _test');
  }

  return value;
}

const testDatabaseUrl = readLocalTestUrl();

async function resetTestDatabase(database: ReturnType<typeof createPostgresDatabase>) {
  await database.db.execute('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await database.db.execute('DROP EXTENSION IF EXISTS postgis CASCADE');
  await database.db.execute('DROP SCHEMA public CASCADE');
  await database.db.execute('CREATE SCHEMA public');
}

describe('database migration foundation', () => {
  it('contains reviewed forward-only PostGIS and identity migrations', async () => {
    const [foundationSql, identitySql] = await Promise.all([
      readFile(foundationMigrationFile, 'utf8'),
      readFile(identityMigrationFile, 'utf8'),
    ]);

    expect(foundationSql).toContain('CREATE EXTENSION IF NOT EXISTS postgis;');
    expect(foundationSql.toUpperCase()).not.toContain('CREATE TABLE');
    expect(identitySql).toContain('CREATE TABLE "users"');
    expect(identitySql).toContain('users_auth_provider_auth_subject_unique');
    expect(identitySql).toContain('users_account_status_check');
    expect(identitySql).toContain('timestamp with time zone');
    expect(`${foundationSql}\n${identitySql}`.toUpperCase()).not.toContain('DROP ');
    expect(`${foundationSql}\n${identitySql}`).not.toMatch(/profile_complete|verified|email/i);
  });

  if (!testDatabaseUrl) {
    it.skip('applies the migration chain and exposes PostGIS with DATABASE_TEST_URL');
    return;
  }

  it('applies the migration chain and exposes PostGIS', async () => {
    const database = createPostgresDatabase(testDatabaseUrl);

    try {
      await resetTestDatabase(database);
      await migrate(database.db, { migrationsFolder: migrationDirectory });

      const [extension, version, spatial, migrationHistory, userColumns, userConstraints] =
        await Promise.all([
          database.db.execute("SELECT extname FROM pg_extension WHERE extname = 'postgis'"),
          database.db.execute('SELECT postgis_full_version() AS version'),
          database.db.execute('SELECT ST_AsText(ST_SetSRID(ST_MakePoint(0, 0), 4326)) AS point'),
          database.db.execute('SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations'),
          database.db.execute(
            `
              SELECT column_name AS "columnName", data_type AS "dataType", is_nullable AS "nullable"
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'users'
              ORDER BY ordinal_position
            `,
          ),
          database.db.execute(
            `
              SELECT constraint_name AS "constraintName"
              FROM information_schema.table_constraints
              WHERE table_schema = 'public' AND table_name = 'users'
              ORDER BY constraint_name
            `,
          ),
        ]);

      expect(extension.rows).toEqual([{ extname: 'postgis' }]);
      expect(version.rows[0]?.version).toContain('POSTGIS');
      expect(spatial.rows).toEqual([{ point: 'POINT(0 0)' }]);
      expect(migrationHistory.rows).toEqual([{ count: '2' }]);
      expect(userColumns.rows.map((column) => column.columnName)).toEqual([
        'id',
        'auth_provider',
        'auth_subject',
        'account_status',
        'real_name',
        'display_name',
        'profile_photo_key',
        'profile_photo_status',
        'profile_photo_width',
        'profile_photo_height',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
      expect(userColumns.rows.find((column) => column.columnName === 'id')).toMatchObject({
        dataType: 'uuid',
        nullable: 'NO',
      });
      expect(userConstraints.rows.map((constraint) => constraint.constraintName)).toEqual(
        expect.arrayContaining([
          'users_account_status_check',
          'users_auth_provider_auth_subject_unique',
          'users_pkey',
          'users_profile_photo_status_check',
          'users_ready_profile_photo_check',
        ]),
      );

      const identity = createIdentityService(database.db);
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () =>
          identity.resolveAuthenticatedViewer('clerk', 'concurrent-subject'),
        ),
      );
      const ids = new Set(concurrent.map((viewer) => viewer?.yardUserId));
      expect(ids.size).toBe(1);
      expect([...ids][0]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );

      const repeated = await identity.resolveAuthenticatedViewer('clerk', 'concurrent-subject');
      expect(repeated?.yardUserId).toBe([...ids][0]);
      const different = await identity.resolveAuthenticatedViewer('clerk', 'different-subject');
      expect(different?.yardUserId).not.toBe(repeated?.yardUserId);

      const count = await database.db.select({ count: sql<number>`count(*)::int` }).from(users);
      expect(count).toEqual([{ count: 2 }]);

      await database.db
        .update(users)
        .set({
          realName: 'Ada Lovelace',
          displayName: 'Ada',
          profilePhotoKey: 'users/profile/avatar',
          profilePhotoStatus: 'ready',
          profilePhotoWidth: 512,
          profilePhotoHeight: 512,
          accountStatus: 'suspended',
        })
        .where(eq(users.id, repeated!.yardUserId));
      await expect(identity.getViewerProfile(repeated!.yardUserId)).resolves.toMatchObject({
        realName: 'Ada Lovelace',
        displayName: 'Ada',
        profilePhoto: { status: 'ready' },
        accountStatus: 'suspended',
        profileComplete: true,
      });

      await database.db
        .update(users)
        .set({ accountStatus: 'deleted', deletedAt: new Date() })
        .where(eq(users.id, repeated!.yardUserId));
      await expect(
        identity.resolveAuthenticatedViewer('clerk', 'concurrent-subject'),
      ).resolves.toBeNull();
      const afterTombstone = await database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      expect(afterTombstone).toEqual([{ count: 2 }]);

      await migrate(database.db, { migrationsFolder: migrationDirectory });

      const repeatedHistory = await database.db.execute(
        'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations',
      );

      expect(repeatedHistory.rows).toEqual([{ count: '2' }]);
    } finally {
      await database.close();
    }
  });
});
