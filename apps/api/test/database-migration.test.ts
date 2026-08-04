import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vite-plus/test';
import { createPostgresDatabase } from '../src/infrastructure/database/postgres-adapter.js';

const migrationDirectory = fileURLToPath(new URL('../drizzle', import.meta.url));
const migrationFile = fileURLToPath(new URL('../drizzle/0000_enable-postgis.sql', import.meta.url));

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
  it('contains only the reviewed PostGIS foundation migration', async () => {
    const sql = await readFile(migrationFile, 'utf8');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS postgis;');
    expect(sql.toUpperCase()).not.toContain('CREATE TABLE');
    expect(sql.toUpperCase()).not.toContain('DROP ');
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

      const [extension, version, spatial, migrationHistory, domainTables] = await Promise.all([
        database.db.execute("SELECT extname FROM pg_extension WHERE extname = 'postgis'"),
        database.db.execute('SELECT postgis_full_version() AS version'),
        database.db.execute('SELECT ST_AsText(ST_SetSRID(ST_MakePoint(0, 0), 4326)) AS point'),
        database.db.execute('SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations'),
        database.db.execute(
          `
            SELECT table_name AS "tableName"
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('users', 'communities', 'activities', 'rsvps')
          `,
        ),
      ]);

      expect(extension.rows).toEqual([{ extname: 'postgis' }]);
      expect(version.rows[0]?.version).toContain('POSTGIS');
      expect(spatial.rows).toEqual([{ point: 'POINT(0 0)' }]);
      expect(migrationHistory.rows).toEqual([{ count: '1' }]);
      expect(domainTables.rows).toEqual([]);

      await migrate(database.db, { migrationsFolder: migrationDirectory });

      const repeatedHistory = await database.db.execute(
        'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations',
      );

      expect(repeatedHistory.rows).toEqual([{ count: '1' }]);
    } finally {
      await database.close();
    }
  });
});
