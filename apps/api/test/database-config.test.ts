import { describe, expect, it } from 'vite-plus/test';
import {
  readApiRuntimeConfig,
  readClerkAuthConfig,
  readDatabaseRuntimeConfig,
} from '../src/infrastructure/config.js';

describe('API runtime configuration', () => {
  it('requires explicit origins and Clerk verification settings', () => {
    expect(() => readApiRuntimeConfig({})).toThrow('ALLOWED_ORIGINS is required');
    expect(() => readApiRuntimeConfig({ ALLOWED_ORIGINS: 'https://yard.example' })).toThrow(
      'CLERK_SECRET_KEY is required',
    );
  });

  it('validates origins without including credential values in errors', () => {
    expect(() =>
      readClerkAuthConfig({
        CLERK_SECRET_KEY: 'sk_test_secret_value',
        CLERK_AUTHORIZED_PARTIES: 'not-an-origin',
      }),
    ).toThrow('CLERK_AUTHORIZED_PARTIES must contain valid HTTP or HTTPS origins');

    expect(() => readApiRuntimeConfig({ ALLOWED_ORIGINS: '*' })).toThrow(
      'ALLOWED_ORIGINS must contain valid HTTP or HTTPS origins',
    );
    expect(() => readApiRuntimeConfig({ ALLOWED_ORIGINS: ' , ' })).toThrow(
      'ALLOWED_ORIGINS is required and must contain at least one origin',
    );
  });

  it('returns separate validated web origins and Clerk authorization settings', () => {
    expect(
      readApiRuntimeConfig({
        ALLOWED_ORIGINS: 'https://yard.example, https://admin.yard.example',
        CLERK_SECRET_KEY: 'sk_test_secret_value',
        CLERK_AUTHORIZED_PARTIES: 'https://yard.example',
        HOST: '0.0.0.0',
        PORT: '9000',
      }),
    ).toEqual({
      allowedOrigins: ['https://yard.example', 'https://admin.yard.example'],
      auth: {
        authorizedParties: ['https://yard.example'],
        secretKey: 'sk_test_secret_value',
      },
      hostname: '0.0.0.0',
      port: 9000,
    });
  });
});

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
