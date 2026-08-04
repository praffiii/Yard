import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiClient, isProblemDetails, readProblemDetails } from '../src/api/client.js';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientEntry = resolve(webRoot, 'src/api/client.ts');

describe('browser API boundary', () => {
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
    expect(code).not.toMatch(/apps\/api|@hono\/node-server|\beffect\b|\bdrizzle\b|\bneon\b/i);
  });
});
