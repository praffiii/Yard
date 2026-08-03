import { describe, expect, it } from 'vite-plus/test';
import { createServer } from '../src/runtime/server.js';

describe('api startup', () => {
  it('serves health over a real Node HTTP listener', async () => {
    const server = createServer(0);

    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('The API listener did not expose a TCP address');
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        service: 'yard-api',
        status: 'ok',
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
