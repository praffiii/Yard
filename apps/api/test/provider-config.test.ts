import { describe, expect, it } from 'vite-plus/test';
import { readMapboxConfig, readR2Config, readResendConfig } from '../src/infrastructure/config.js';

describe('external provider configuration', () => {
  it('reads provider settings independently from API startup configuration', () => {
    expect(
      readMapboxConfig({
        MAPBOX_ACCESS_TOKEN: 'pk_test_mapbox',
      }),
    ).toEqual({
      accessToken: 'pk_test_mapbox',
    });

    expect(
      readR2Config({
        R2_ACCESS_KEY_ID: 'access-key',
        R2_BUCKET: 'yard-development',
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_SECRET_ACCESS_KEY: 'secret-key',
      }),
    ).toEqual({
      accessKeyId: 'access-key',
      bucket: 'yard-development',
      endpoint: 'https://account.r2.cloudflarestorage.com',
      presignedUrlTtlSeconds: 300,
      region: 'auto',
      secretAccessKey: 'secret-key',
    });

    expect(
      readResendConfig({
        RESEND_API_KEY: 're_test_resend',
        RESEND_FROM_EMAIL: 'Yard <noreply@yard.example>',
      }),
    ).toEqual({
      apiKey: 're_test_resend',
      fromEmail: 'Yard <noreply@yard.example>',
    });
  });

  it('rejects incomplete or unsafe provider settings without exposing secrets', () => {
    expect(() => readMapboxConfig({})).toThrow('MAPBOX_ACCESS_TOKEN is required');
    expect(() => readResendConfig({ RESEND_API_KEY: 're_secret_value' })).toThrow(
      'RESEND_FROM_EMAIL is required',
    );
    expect(() =>
      readR2Config({
        R2_ACCESS_KEY_ID: 'access-key',
        R2_BUCKET: 'yard-development',
        R2_ENDPOINT: 'not-a-url',
        R2_SECRET_ACCESS_KEY: 'r2_secret_value',
      }),
    ).toThrow('R2_ENDPOINT must be a valid HTTP or HTTPS URL');
    expect(() =>
      readR2Config({
        R2_ACCESS_KEY_ID: 'access-key',
        R2_BUCKET: 'yard-development',
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_PRESIGNED_URL_TTL_SECONDS: '30',
        R2_SECRET_ACCESS_KEY: 'r2_secret_value',
      }),
    ).toThrow('R2_PRESIGNED_URL_TTL_SECONDS must be between 60 and 900 seconds');

    expect(() =>
      readR2Config({
        R2_ACCESS_KEY_ID: 'access-key',
        R2_BUCKET: 'yard-development',
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_SECRET_ACCESS_KEY: 'r2_secret_value',
      }),
    ).not.toThrow('r2_secret_value');
  });
});
