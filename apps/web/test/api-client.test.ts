import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createApiClient,
  isProblemDetails,
  readProblemDetails,
  readWebApiUrl,
} from '../src/api/client.js';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientEntry = resolve(webRoot, 'src/api/client.ts');

describe('browser API boundary', () => {
  it('requires an absolute public API URL for authenticated browser requests', () => {
    expect(readWebApiUrl('https://api.example')).toBe('https://api.example');
    expect(() => readWebApiUrl(undefined)).toThrow('VITE_API_URL is required');
    expect(() => readWebApiUrl('/api')).toThrow('VITE_API_URL must be an absolute');
  });

  it('exposes the typed version route and parses safe Problem Details', async () => {
    const client = createApiClient('https://api.example');
    const response = await client.v1.$get(undefined, {
      fetch: async () =>
        new Response(JSON.stringify({ apiVersion: 'v1', service: 'yard-api' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      apiVersion: 'v1',
      service: 'yard-api',
    });

    const problemResponse = new Response(
      JSON.stringify({
        code: 'invalid_request',
        errors: [{ message: 'Invalid value', path: 'message' }],
        requestId: 'request-1',
        status: 400,
        title: 'Bad Request',
        type: 'https://yard.local/problems/invalid-request',
      }),
      { headers: { 'Content-Type': 'application/problem+json' } },
    );

    expect(isProblemDetails(await problemResponse.clone().json())).toBe(true);
    expect(await readProblemDetails(problemResponse)).toMatchObject({
      code: 'invalid_request',
      requestId: 'request-1',
      status: 400,
    });
  });

  it('attaches a fresh Clerk session token as a bearer header', async () => {
    let authorization: string | null = null;
    const client = createApiClient('https://api.example', async () => 'short-lived-token');
    const response = await client.v1.$get(undefined, {
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        authorization = new Headers(init?.headers).get('Authorization');
        return new Response(JSON.stringify({ apiVersion: 'v1', service: 'yard-api' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    expect(response.status).toBe(200);
    expect(authorization).toBe('Bearer short-lived-token');
  });

  it('does not send an empty bearer credential when Clerk has no session', async () => {
    let authorization: string | null = null;
    const client = createApiClient('https://api.example', async () => null);
    await client.v1.$get(undefined, {
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        authorization = new Headers(init?.headers).get('Authorization');
        return new Response(JSON.stringify({ apiVersion: 'v1', service: 'yard-api' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    expect(authorization).toBeNull();
  });

  it('bundles Hono transport without API server runtime dependencies', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: webRoot,
      build: {
        lib: { entry: clientEntry, formats: ['es'] },
        write: false,
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    const code = outputs
      .flatMap((bundle) => ('output' in bundle ? bundle.output : []))
      .map((chunk) => ('code' in chunk ? chunk.code : ''))
      .join('\n');

    expect(code).toContain('fetch');
    expect(code).not.toMatch(
      /apps\/api|@hono\/node-server|\beffect\b|\bdrizzle\b|\bneon\b|CLERK_SECRET_KEY|DATABASE_URL|ALLOWED_ORIGINS/i,
    );
  });
});
