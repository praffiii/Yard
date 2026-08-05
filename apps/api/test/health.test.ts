import { describe, expect, it } from 'vite-plus/test';
import { createApp } from '../src/http/app.js';
import { healthyDatabase } from './database-fixtures.js';

const app = createApp();

describe('health endpoint', () => {
  it('returns a safe readiness response when the database is reachable', async () => {
    const api = createApp({ database: healthyDatabase });
    const response = await api.request('/healthz');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({
      service: 'yard-api',
      status: 'ok',
    });

    const versionedHealth = await api.request('/v1/healthz');

    expect(versionedHealth.status).toBe(404);
    expect(versionedHealth.headers.get('content-type')).toBe('application/problem+json');
    expect(await versionedHealth.json()).toMatchObject({
      code: 'route_not_found',
      status: 404,
    });
  });

  it('fails readiness safely when the database probe fails', async () => {
    const secret = 'postgresql://yard:password-sentinel@private.example/yard';
    const api = createApp({
      database: {
        kind: 'health',
        ping: async () => {
          throw new Error(secret);
        },
      },
    });
    const response = await api.request('/healthz');
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(body).not.toContain(secret);
    expect(body).not.toContain('password-sentinel');
    expect(JSON.parse(body)).toEqual({
      service: 'yard-api',
      status: 'unavailable',
    });
  });

  it('fails closed when no database is configured', async () => {
    const response = await app.request('/healthz');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      service: 'yard-api',
      status: 'unavailable',
    });
  });
});
