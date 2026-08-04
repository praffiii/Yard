import { describe, expect, it } from 'vite-plus/test';
import { readDatabaseRuntimeConfig } from '../src/infrastructure/config.js';

describe('database connection configuration', () => {
  it('requires the pooled runtime URL without falling back to the direct URL', () => {
    expect(() =>
      readDatabaseRuntimeConfig({
        DATABASE_DIRECT_URL: 'postgresql://direct.example/yard',
      }),
    ).toThrow('DATABASE_URL is required');
  });

  it('selects the hosted Neon adapter only when configured explicitly', () => {
    expect(
      readDatabaseRuntimeConfig({
        DATABASE_RUNTIME_DRIVER: 'neon',
        DATABASE_URL: 'postgresql://pooled.example/yard',
      }),
    ).toEqual({
      driver: 'neon',
      url: 'postgresql://pooled.example/yard',
    });
  });

  it('defaults local runtime configuration to the pooled PostgreSQL adapter', () => {
    expect(
      readDatabaseRuntimeConfig({
        DATABASE_URL: 'postgresql://127.0.0.1/yard',
      }),
    ).toEqual({
      driver: 'pg',
      url: 'postgresql://127.0.0.1/yard',
    });
  });
});
