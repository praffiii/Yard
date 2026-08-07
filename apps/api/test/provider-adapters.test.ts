import { Effect } from 'effect';
import { describe, expect, it } from 'vite-plus/test';
import { createProviderAdapters } from '../src/infrastructure/provider-adapters.js';
import type { DatabaseClient } from '../src/infrastructure/database/client.js';
import { ProviderServices, applicationLayer, runApplication } from '../src/runtime/application.js';

const safeProviderEnvironment = {
  MAPBOX_ACCESS_TOKEN: 'pk_test_safe_value',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_BUCKET: 'yard-development',
  R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  RESEND_API_KEY: 're_test_safe_value',
  RESEND_FROM_EMAIL: 'Yard <noreply@example.test>',
};

describe('provider adapter composition', () => {
  it('lazily creates all adapters without contacting live providers', () => {
    const providers = createProviderAdapters(safeProviderEnvironment);

    expect(providers.getImageProcessor()).toBe(providers.getImageProcessor());
    expect(providers.getMapProvider()).toBe(providers.getMapProvider());
    expect(providers.getObjectStorage()).toBe(providers.getObjectStorage());
    expect(providers.getTransactionalEmail()).toBe(providers.getTransactionalEmail());
  });

  it('provides the configured provider boundary through the application layer', async () => {
    const providers = createProviderAdapters(safeProviderEnvironment);
    const database: DatabaseClient = {
      close: async () => undefined,
      db: {} as DatabaseClient['db'],
      kind: 'client',
      ping: async () => undefined,
    };

    const resolvedProviders = await runApplication(
      Effect.gen(function* () {
        return yield* ProviderServices;
      }),
      applicationLayer(database, providers),
    );

    expect(resolvedProviders).toBe(providers);
  });
});
