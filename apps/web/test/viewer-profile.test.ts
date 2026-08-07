import { dehydrate } from '@tanstack/react-query';
import { describe, expect, it } from 'vite-plus/test';
import { ApiRequestError, createViewerProfileApiClient } from '../src/api/client.js';
import {
  fetchViewerProfile,
  viewerProfileKeys,
  viewerProfileQueryOptions,
} from '../src/features/viewer-profile/queries.js';
import { getViewerProfileViewState } from '../src/features/viewer-profile/view-state.js';
import { createWebQueryClient, webDehydrateOptions } from '../src/query-client.js';

const profile = {
  id: '018f0f8a-6bd7-7abc-8def-1234567890ab',
  realName: null,
  displayName: null,
  profilePhoto: { status: 'none' as const },
  accountStatus: 'active' as const,
  profileComplete: false,
};

describe('viewer profile web boundary', () => {
  it('does not enable /me fetching without a Clerk session and scopes keys by session', () => {
    const apiClient = createViewerProfileApiClient('https://api.example');

    expect(viewerProfileQueryOptions(apiClient, '', false).enabled).toBe(false);
    expect(viewerProfileQueryOptions(apiClient, 'session-a', true).queryKey).toEqual(
      viewerProfileKeys.session('session-a'),
    );
    expect(viewerProfileKeys.session('session-a')).not.toEqual(
      viewerProfileKeys.session('session-b'),
    );
  });

  it('fetches the browser-safe viewer projection through the authenticated client seam', async () => {
    const result = await fetchViewerProfile(
      createViewerProfileApiClient('https://api.example'),
      async () =>
        new Response(JSON.stringify(profile), {
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    expect(result).toEqual(profile);
    expect(JSON.stringify(result)).not.toMatch(/subject|provider|email|credential|photoKey/i);
  });

  it('never dehydrates private profile state and removes it when the session cache is cleared', async () => {
    const queryClient = createWebQueryClient();
    const key = viewerProfileKeys.session('session-a');
    await queryClient.fetchQuery(
      viewerProfileQueryOptions(
        createViewerProfileApiClient('https://api.example'),
        'session-a',
        true,
        async () => new Response(JSON.stringify(profile)),
      ),
    );

    expect(dehydrate(queryClient, webDehydrateOptions).queries).toEqual([]);

    queryClient.clear();
    expect(queryClient.getQueryData(key)).toBeUndefined();
  });

  it('presents auth, incomplete, ready, unavailable, and unexpected states explicitly', () => {
    const base = { authLoaded: true, signedIn: true, pending: false, error: null };

    expect(getViewerProfileViewState({ ...base, authLoaded: false, profile })).toEqual({
      kind: 'auth-loading',
    });
    expect(getViewerProfileViewState({ ...base, signedIn: false, profile })).toEqual({
      kind: 'unauthenticated',
    });
    expect(getViewerProfileViewState({ ...base, pending: true })).toEqual({ kind: 'loading' });
    expect(getViewerProfileViewState({ ...base, profile })).toMatchObject({ kind: 'incomplete' });
    expect(
      getViewerProfileViewState({ ...base, profile: { ...profile, profileComplete: true } }),
    ).toMatchObject({ kind: 'ready' });
    expect(getViewerProfileViewState({ ...base, error: new ApiRequestError(503) })).toEqual({
      kind: 'unavailable',
    });
    expect(getViewerProfileViewState({ ...base, error: new Error('unexpected') })).toEqual({
      kind: 'error',
    });
    expect(getViewerProfileViewState({ ...base, error: new ApiRequestError(401) })).toEqual({
      kind: 'unauthenticated',
    });
  });
});
