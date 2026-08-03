import { serve } from '@hono/node-server';
import { apiConfig } from '../infrastructure/config.js';
import { app } from '../http/app.js';

export function createServer(port = apiConfig.port) {
  return serve({
    fetch: app.fetch,
    hostname: apiConfig.hostname,
    port,
  });
}

export function startServer() {
  const server = createServer();
  const shutdown = () => server.close(() => process.exit(0));

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}
