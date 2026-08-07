import { describe, expect, it } from 'vite-plus/test';
import { createApp } from '../src/http/app.js';
import type { IdentityService, ViewerProfile } from '../src/modules/identity/index.js';

const viewerA = '018f0f8a-6bd7-7abc-8def-1234567890ab';

function profile(overrides: Partial<ViewerProfile> = {}): ViewerProfile {
  return {
    id: viewerA,
    realName: null,
    displayName: null,
    profilePhoto: { status: 'none' },
    accountStatus: 'active',
    profileComplete: false,
    ...overrides,
  };
}

function appFor(identityService: IdentityService) {
  return createApp({
    authVerifier: { verify: async () => ({ subject: 'clerk-subject-secret' }) },
    identityService,
  });
}

describe('GET /v1/me', () => {
  it('resolves Clerk identity before rate limiting and returns the safe incomplete profile', async () => {
    const calls: string[] = [];
    const identityService: IdentityService = {
      resolveAuthenticatedViewer: async (provider, subject) => {
        calls.push(`resolve:${provider}:${subject}`);
        return { yardUserId: viewerA, accountStatus: 'active' };
      },
      getViewerProfile: async (yardUserId) => {
        calls.push(`query:${yardUserId}`);
        return profile();
      },
    };
    const app = createApp({
      authVerifier: { verify: async () => ({ subject: 'clerk-subject-secret' }) },
      identityService,
      rateLimiter: {
        check: ({ yardUserId }) => {
          calls.push(`rate:${yardUserId}`);
          return { allowed: true };
        },
      },
    });

    const response = await app.request('/v1/me', {
      headers: { Authorization: 'Bearer valid-session' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(calls).toEqual([
      'resolve:clerk:clerk-subject-secret',
      `rate:${viewerA}`,
      `query:${viewerA}`,
    ]);
    expect(body).toEqual(profile());
    expect(JSON.stringify(body)).not.toMatch(/clerk|subject|provider|email|credential|photoKey/i);
  });

  it('allows a suspended viewer to read safe account standing and derives completion', async () => {
    const completed = profile({
      realName: 'Ada Lovelace',
      displayName: 'Ada',
      profilePhoto: { status: 'ready' },
      accountStatus: 'suspended',
      profileComplete: true,
    });
    const response = await appFor({
      resolveAuthenticatedViewer: async () => ({ yardUserId: viewerA, accountStatus: 'suspended' }),
      getViewerProfile: async () => completed,
    }).request('/v1/me', { headers: { Authorization: 'Bearer valid-session' } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(completed);
  });

  it('maps a deleted local account to the same safe unauthenticated response', async () => {
    const response = await appFor({
      resolveAuthenticatedViewer: async () => null,
      getViewerProfile: async () => profile(),
    }).request('/v1/me', { headers: { Authorization: 'Bearer still-valid-session' } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ code: 'unauthenticated', status: 401 });
    expect(JSON.stringify(body)).not.toContain('deleted');
  });

  it('maps unexpected identity persistence failures to safe Problem Details', async () => {
    const response = await appFor({
      resolveAuthenticatedViewer: async () => {
        throw new Error('postgres password and query must stay private');
      },
      getViewerProfile: async () => profile(),
    }).request('/v1/me', { headers: { Authorization: 'Bearer valid-session' } });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(body).toMatchObject({
      code: 'internal_error',
      requestId: response.headers.get('x-request-id'),
      status: 500,
    });
    expect(JSON.stringify(body)).not.toMatch(/postgres|password|query/i);
  });
});
