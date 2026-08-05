import { defineConfig } from 'drizzle-kit';

const directUrl = process.env.DATABASE_DIRECT_URL?.trim();

if (!directUrl) {
  throw new Error('DATABASE_DIRECT_URL is required for Drizzle commands');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: directUrl,
  },
  migrations: {
    schema: 'drizzle',
    table: '__drizzle_migrations',
  },
  schemaFilter: ['public'],
  extensionsFilters: ['postgis'],
});
