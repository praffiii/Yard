import { serve } from '@hono/node-server';
import {
  apiConfig,
  readApiRuntimeConfig,
  type ApiRuntimeConfig,
} from '../infrastructure/config.js';
import { createClerkTokenVerifier } from '../infrastructure/auth/clerk-adapter.js';
import { createDatabaseClient, type DatabaseClient } from '../infrastructure/database/client.js';
import { createApp } from '../http/app.js';
import type { AppType } from '../http/app.js';

export type ApiApp = AppType;

export type StartServerOptions = {
  readonly config?: ApiRuntimeConfig;
  readonly database?: DatabaseClient;
  readonly port?: number;
};

export function createServer(api: ApiApp, port = apiConfig.port, hostname = apiConfig.hostname) {
  return serve({
    fetch: api.fetch,
    hostname,
    port,
  });
}

export function startServer(options: StartServerOptions = {}) {
  const config = options.config ?? readApiRuntimeConfig();
  const database = options.database ?? createDatabaseClient();
  const api = createApp({
    allowedOrigins: config.allowedOrigins,
    authVerifier: createClerkTokenVerifier(config.auth),
    database,
  });
  const server = createServer(api, options.port ?? config.port, config.hostname);
  const shutdown = () =>
    server.close(async (error) => {
      let exitCode = error ? 1 : 0;

      try {
        await database.close();
      } catch {
        console.error('Failed to close the database connection during shutdown');
        exitCode = 1;
      }

      process.exit(exitCode);
    });

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}
