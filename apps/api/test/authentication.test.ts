import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vite-plus/test';
import { authenticationMiddleware } from '../src/http/auth-middleware.js';
import { createApp } from '../src/http/app.js';
import { identityMiddleware } from '../src/http/identity-middleware.js';
import { problemForStatus } from '../src/http/problems.js';
import { requestIdMiddleware } from '../src/http/request-id.js';
import type { ApiEnv } from '../src/http/request-context.js';
import type { AuthTokenVerifier } from '../src/infrastructure/auth/clerk-adapter.js';
import type { IdentityService } from '../src/modules/identity/index.js';

const yardUserId = '00000000-0000-7000-8000-000000000001';
const testIdentityService: IdentityService = {
  resolveAuthenticatedViewer: async () => ({ yardUserId, accountStatus: 'active' }),
  getViewerProfile: async () => ({
    id: yardUserId,
    realName: null,
    displayName: null,
    profilePhoto: { status: 'none' },
    accountStatus: 'active',
    profileComplete: false,
  }),
};

const resourceId = '00000000-0000-4000-8000-000000000001';

async function readProblem(response: Response) {
  expect(response.headers.get('content-type')).toBe('application/problem+json');
  return (await response.json()) as Record<string, unknown>;
}

describe('browser-to-API authentication', () => {
  it('rejects missing and malformed bearer credentials with safe Problem Details', async () => {
    const verifier: AuthTokenVerifier = {
      verify: async () => ({ subject: 'user_test' }),
    };
    const app = createApp({
      authVerifier: verifier,
      identityService: testIdentityService,
      includeContractFixture: true,
    });
    const headers = { 'Content-Type': 'application/json' };

    for (const authorization of [undefined, 'Basic credentials', 'Bearer', 'Bearer token extra']) {
      const requestHeaders = authorization ? { ...headers, Authorization: authorization } : headers;
      const response = await app.request(`/v1/__contract/${resourceId}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ message: 'hello yard' }),
      });
      const problem = await readProblem(response);

      expect(response.status).toBe(401);
      expect(problem).toMatchObject({
        code: 'unauthenticated',
        status: 401,
        type: 'https://yard.local/problems/unauthenticated',
      });
      expect(JSON.stringify(problem)).not.toContain('credentials');
      expect(JSON.stringify(problem)).not.toContain('token');
    }
  });

  it('does not convert downstream handler errors into authentication failures', async () => {
    const app = new Hono<ApiEnv>()
      .use('*', requestIdMiddleware)
      .use('*', authenticationMiddleware({ verify: async () => ({ subject: 'user_verified' }) }))
      .get('/protected', () => {
        throw new HTTPException(400);
      });
    app.onError((error, c) =>
      error instanceof HTTPException ? problemForStatus(c, error.status) : problemForStatus(c, 500),
    );

    const response = await app.request('/protected', {
      headers: { Authorization: 'Bearer clerk-session-token' },
    });
    const problem = await readProblem(response);

    expect(response.status).toBe(400);
    expect(problem).toMatchObject({ code: 'invalid_request', status: 400 });
  });

  it('rejects provider failures without exposing provider details', async () => {
    const providerFailure = 'clerk provider secret should not leak';
    const app = createApp({
      authVerifier: {
        verify: async () => {
          throw new Error(providerFailure);
        },
      },
      identityService: testIdentityService,
      includeContractFixture: true,
    });
    const token = 'short-lived-token';
    const response = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'hello yard' }),
    });
    const problem = await readProblem(response);

    expect(response.status).toBe(401);
    expect(JSON.stringify(problem)).not.toContain(providerFailure);
    expect(JSON.stringify(problem)).not.toContain(token);
  });

  it('passes a verified subject to the protected route and never accepts a client user ID', async () => {
    const verifiedTokens: string[] = [];
    const verifier: AuthTokenVerifier = {
      verify: async (token) => {
        verifiedTokens.push(token);
        return { subject: 'user_verified' };
      },
    };
    const app = createApp({
      authVerifier: verifier,
      identityService: testIdentityService,
      includeContractFixture: true,
    });
    const response = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer clerk-session-token',
        'Content-Type': 'application/json',
        'X-User-ID': 'client-controlled-user',
      },
      body: JSON.stringify({ message: 'hello yard' }),
    });

    expect(response.status).toBe(200);
    expect(verifiedTokens).toEqual(['clerk-session-token']);
    expect(await response.json()).toMatchObject({ kind: 'contract_probe' });

    const missingAuthResponse = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'client-controlled-user',
      },
      body: JSON.stringify({ message: 'hello yard' }),
    });

    expect(missingAuthResponse.status).toBe(401);
  });

  it('does not pass a provider subject as a Yard user ID to rate limiting', async () => {
    const yardUserIds: Array<string | undefined> = [];
    const app = createApp({
      authVerifier: { verify: async () => ({ subject: 'user_verified' }) },
      identityService: testIdentityService,
      rateLimiter: {
        check: ({ yardUserId }) => {
          yardUserIds.push(yardUserId);
          return { allowed: true };
        },
      },
      includeContractFixture: true,
    });

    const unauthenticatedResponse = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello yard' }),
    });

    expect(unauthenticatedResponse.status).toBe(401);
    expect(yardUserIds).toEqual([]);

    const response = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer clerk-session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'hello yard' }),
    });

    expect(response.status).toBe(200);
    expect(yardUserIds).toEqual([yardUserId]);
  });

  it('keeps the verified provider subject separate from Yard identity context', async () => {
    const app = new Hono<ApiEnv>()
      .use('*', requestIdMiddleware)
      .use('*', authenticationMiddleware({ verify: async () => ({ subject: 'user_verified' }) }))
      .get('/protected', (c) =>
        c.json({
          verifiedAuthSubject: c.get('verifiedAuthSubject'),
          yardUserId: c.get('yardUserId'),
        }),
      );

    const response = await app.request('/protected', {
      headers: { Authorization: 'Bearer clerk-session-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      verifiedAuthSubject: 'user_verified',
      yardUserId: undefined,
    });
  });

  it('replaces provider context with only the resolved Yard actor context', async () => {
    const app = new Hono<ApiEnv>()
      .use('*', requestIdMiddleware)
      .use('*', authenticationMiddleware({ verify: async () => ({ subject: 'provider-secret' }) }))
      .use('*', identityMiddleware(testIdentityService))
      .get('/protected', (c) =>
        c.json({
          verifiedAuthSubject: c.get('verifiedAuthSubject'),
          yardUserId: c.get('yardUserId'),
          accountStatus: c.get('accountStatus'),
        }),
      );

    const response = await app.request('/protected', {
      headers: { Authorization: 'Bearer clerk-session-token' },
    });

    expect(await response.json()).toEqual({
      yardUserId,
      accountStatus: 'active',
    });
  });

  it('restricts CORS to configured origins without making CORS authorization', async () => {
    const app = createApp({
      allowedOrigins: ['https://yard.example'],
      authVerifier: { verify: async () => ({ subject: 'user_verified' }) },
      identityService: testIdentityService,
      includeContractFixture: true,
    });

    const allowedPreflight = await app.request('/v1/__contract', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://yard.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });
    expect(allowedPreflight.status).toBe(204);
    expect(allowedPreflight.headers.get('access-control-allow-origin')).toBe(
      'https://yard.example',
    );

    const deniedPreflight = await app.request('/v1/__contract', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });
    expect(deniedPreflight.status).toBe(204);
    expect(deniedPreflight.headers.get('access-control-allow-origin')).toBeNull();

    const authenticatedFromDeniedOrigin = await app.request(`/v1/__contract/${resourceId}`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer clerk-session-token',
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ message: 'hello yard' }),
    });
    expect(authenticatedFromDeniedOrigin.status).toBe(200);
    expect(authenticatedFromDeniedOrigin.headers.get('access-control-allow-origin')).toBeNull();
  });
});
