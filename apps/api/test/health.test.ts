import { describe, expect, it } from 'vite-plus/test';
import { app } from '../src/http/app.js';

describe('health endpoint', () => {
  it('returns a safe readiness response', async () => {
    const response = await app.request('/healthz');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: 'yard-api',
      status: 'ok',
    });
  });
});
