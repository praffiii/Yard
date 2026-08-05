import { describe, expect, it } from 'vite-plus/test';
import { createApp } from '../src/http/app.js';
import type { AuthTokenVerifier } from '../src/infrastructure/auth/clerk-adapter.js';

const app = createApp();
const contractVerifier: AuthTokenVerifier = {
  verify: async (token) => ({ subject: `user-for-${token}` }),
};
const resourceId = '00000000-0000-4000-8000-000000000001';

async function readProblem(response: Response) {
  expect(response.headers.get('content-type')).toBe('application/problem+json');

  return (await response.json()) as {
    type: string;
    title: string;
    status: number;
    code: string;
    requestId: string;
    detail?: string;
    errors?: Array<{ path: string; message: string }>;
  };
}

describe('versioned API contract', () => {
  it('returns a browser-safe version DTO under /v1', async () => {
    const response = await app.request('/v1');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({
      apiVersion: 'v1',
      service: 'yard-api',
    });
  });

  it('maps unknown /v1 routes to safe Problem Details', async () => {
    const response = await app.request('/v1/does-not-exist');
    const problem = await readProblem(response);

    expect(response.status).toBe(404);
    expect(problem).toMatchObject({
      type: 'https://yard.local/problems/not-found',
      title: 'Not Found',
      status: 404,
      code: 'route_not_found',
    });
    expect(problem.requestId).toBe(response.headers.get('x-request-id'));
    expect(problem.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(problem)).not.toContain('stack');
  });

  it('keeps unknown public routes outside the protected route group', async () => {
    let verifierCalls = 0;
    const contractApp = createApp({
      authVerifier: {
        verify: async (token) => {
          verifierCalls += 1;
          return { subject: `user-for-${token}` };
        },
      },
      includeContractFixture: true,
    });
    const response = await contractApp.request('/v1/does-not-exist');
    const problem = await readProblem(response);

    expect(response.status).toBe(404);
    expect(problem.code).toBe('route_not_found');
    expect(verifierCalls).toBe(0);
  });

  it('returns a safe 404 for unknown paths inside the protected group', async () => {
    const contractApp = createApp({
      authVerifier: contractVerifier,
      includeContractFixture: true,
    });
    const response = await contractApp.request('/v1/__contract/does-not-exist', {
      headers: { Authorization: 'Bearer contract-token' },
    });
    const problem = await readProblem(response);

    expect(response.status).toBe(404);
    expect(problem.code).toBe('route_not_found');
  });

  it('validates body, query, path, and header inputs with safe errors', async () => {
    const contractApp = createApp({
      authVerifier: contractVerifier,
      includeContractFixture: true,
    });
    const validHeaders = {
      Authorization: 'Bearer contract-token',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'contract-request-1',
    };
    const validPath = `/v1/__contract/${resourceId}`;

    const validResponse = await contractApp.request(`${validPath}?page=2`, {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ message: 'hello yard' }),
    });

    expect(validResponse.status).toBe(200);
    expect(await validResponse.json()).toEqual({
      idempotencyKeyPresent: true,
      kind: 'contract_probe',
      message: 'hello yard',
      page: 2,
      resourceId,
    });

    const invalidRequests = [
      {
        name: 'body',
        path: validPath,
        urlSuffix: '',
        body: JSON.stringify({ message: { secret: 'should-not-leak' } }),
        headers: validHeaders,
      },
      {
        name: 'query',
        path: validPath,
        urlSuffix: '?page=0',
        body: JSON.stringify({ message: 'hello yard' }),
        headers: validHeaders,
      },
      {
        name: 'path',
        path: '/v1/__contract/not-a-uuid',
        urlSuffix: '',
        body: JSON.stringify({ message: 'hello yard' }),
        headers: validHeaders,
      },
      {
        name: 'header',
        path: validPath,
        urlSuffix: '',
        body: JSON.stringify({ message: 'hello yard' }),
        headers: {
          ...validHeaders,
          'Idempotency-Key': 'x'.repeat(256),
        },
      },
    ];

    for (const request of invalidRequests) {
      const response = await contractApp.request(`${request.path}${request.urlSuffix}`, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      });
      const problem = await readProblem(response);

      expect(response.status, request.name).toBe(400);
      expect(problem).toMatchObject({
        type: 'https://yard.local/problems/invalid-request',
        title: 'Bad Request',
        status: 400,
        code: 'invalid_request',
      });
      expect(problem.requestId).toBe(response.headers.get('x-request-id'));
      expect(problem.errors?.length).toBeGreaterThan(0);
      expect(JSON.stringify(problem)).not.toContain('should-not-leak');
      expect(JSON.stringify(problem)).not.toContain('Expected');
    }
  });

  it('does not ship the test-only contract fixture', async () => {
    const response = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello yard' }),
    });
    const problem = await readProblem(response);

    expect(response.status).toBe(404);
    expect(problem.code).toBe('route_not_found');
  });

  it('maps malformed JSON to Problem Details', async () => {
    const contractApp = createApp({
      authVerifier: contractVerifier,
      includeContractFixture: true,
    });
    const response = await contractApp.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer contract-token',
        'Content-Type': 'application/json',
      },
      body: '{"message":',
    });
    const problem = await readProblem(response);

    expect(response.status).toBe(400);
    expect(problem.code).toBe('invalid_request');
    expect(problem.requestId).toBe(response.headers.get('x-request-id'));
  });

  it('keeps rate limiting provider-neutral and maps denials safely', async () => {
    const limitedApp = createApp({
      rateLimiter: {
        check: () => ({ allowed: false, retryAfterSeconds: 7 }),
      },
    });
    const response = await limitedApp.request('/v1');
    const problem = await readProblem(response);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('7');
    expect(problem).toMatchObject({
      type: 'https://yard.local/problems/rate-limited',
      title: 'Too Many Requests',
      status: 429,
      code: 'rate_limited',
    });
  });

  it('hides unexpected failures behind internal Problem Details', async () => {
    const failingApp = createApp({
      rateLimiter: {
        check: () => {
          throw new Error('provider secret should not leak');
        },
      },
    });
    const response = await failingApp.request('/v1');
    const problem = await readProblem(response);

    expect(response.status).toBe(500);
    expect(problem).toMatchObject({
      type: 'https://yard.local/problems/internal-error',
      title: 'Internal Server Error',
      status: 500,
      code: 'internal_error',
    });
    expect(JSON.stringify(problem)).not.toContain('provider secret');
  });

  it('allows the idempotency header through CORS preflight', async () => {
    const response = await app.request('/v1', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type, Idempotency-Key',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toContain('Idempotency-Key');
  });
});
