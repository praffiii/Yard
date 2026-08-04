import { serve } from '@hono/node-server';
import { apiConfig } from '../infrastructure/config.js';
import { createDatabaseClient, type DatabaseClient } from '../infrastructure/database/client.js';
import { createApp } from '../http/app.js';
import type { AppType } from '../http/app.js';

export type ApiApp = AppType;

export type StartServerOptions = {
  readonly database?: DatabaseClient;
  readonly port?: number;
};

export function createServer(api: ApiApp, port = apiConfig.port) {
  return serve({
    fetch: api.fetch,
    hostname: apiConfig.hostname,
    port,
  });
}

export function startServer(options: StartServerOptions = {}) {
  const database = options.database ?? createDatabaseClient();
  const api = createApp({ database });
  const server = createServer(api, options.port);
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
