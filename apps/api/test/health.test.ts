import { describe, expect, it } from 'vite-plus/test';
import { app } from '../src/http/app.js';

describe('health endpoint', () => {
  it('returns a safe readiness response outside the versioned API namespace', async () => {
    const response = await app.request('/healthz');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({
      service: 'yard-api',
      status: 'ok',
    });

    const versionedHealth = await app.request('/v1/healthz');

    expect(versionedHealth.status).toBe(404);
    expect(versionedHealth.headers.get('content-type')).toBe('application/problem+json');
    expect(await versionedHealth.json()).toMatchObject({
      code: 'route_not_found',
      status: 404,
    });
  });
});
