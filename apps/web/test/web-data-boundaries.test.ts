import { dehydrate, hydrate } from '@tanstack/react-query';
import { describe, expect, it } from 'vite-plus/test';
import { createPublicApiClient } from '../src/api/client.js';
import {
  apiStatusKeys,
  apiVersionQueryOptions,
  fetchApiVersion,
} from '../src/features/api-status/queries.js';
import { parseDiscoverySearch } from '../src/routes/index.js';
import { getRouter } from '../src/router.js';
import { createWebQueryClient, webDehydrateOptions } from '../src/query-client.js';

describe('web data boundaries', () => {
  it('creates an isolated QueryClient with safe mutation defaults', () => {
    const first = createWebQueryClient();
    const second = createWebQueryClient();

    first.setQueryData(['private', 'profile', 'user-a'], { displayName: 'Ada' });

    expect(second.getQueryData(['private', 'profile', 'user-a'])).toBeUndefined();
    expect(first.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(first.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('creates a request-scoped router QueryClient and hydration wrapper', () => {
    const first = getRouter();
    const second = getRouter();

    expect(first.options.context.queryClient).not.toBe(second.options.context.queryClient);
    expect(first.options.Wrap).toBeTypeOf('function');
    expect(first.options.dehydrate).toBeTypeOf('function');
  });

  it('keeps the public API status key owned by its web feature', () => {
    expect(apiStatusKeys.version()).toEqual(['api-status', 'version']);
  });

  it('hydrates a successful Hono query into a separate client cache', async () => {
    const queryClient = createWebQueryClient();
    await queryClient.fetchQuery(
      apiVersionQueryOptions(
        createPublicApiClient('https://api.example'),
        async () =>
          new Response(JSON.stringify({ apiVersion: 'v1', service: 'yard-api' }), {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );

    const hydratedClient = createWebQueryClient();
    hydrate(hydratedClient, dehydrate(queryClient, webDehydrateOptions));

    expect(hydratedClient.getQueryData(apiStatusKeys.version())).toEqual({
      apiVersion: 'v1',
      service: 'yard-api',
    });
  });

  it('keeps failed optional SSR probes out of hydration so the client starts loading', async () => {
    const queryClient = createWebQueryClient();
    await queryClient.prefetchQuery(
      apiVersionQueryOptions(
        createPublicApiClient('https://api.example'),
        async () =>
          new Response(
            JSON.stringify({
              code: 'internal_error',
              requestId: 'request-1',
              status: 500,
              title: 'Internal Server Error',
              type: 'https://yard.local/problems/internal-error',
            }),
            {
              headers: { 'Content-Type': 'application/problem+json' },
              status: 500,
            },
          ),
      ),
    );

    const hydratedClient = createWebQueryClient();
    hydrate(hydratedClient, dehydrate(queryClient, webDehydrateOptions));

    expect(hydratedClient.getQueryState(apiStatusKeys.version())).toBeUndefined();
  });

  it('converts API failures to safe client errors without exposing raw response text', async () => {
    await expect(
      fetchApiVersion(
        createPublicApiClient('https://api.example'),
        async () =>
          new Response(
            JSON.stringify({
              code: 'internal_error',
              detail: 'database credentials must not be shown',
              requestId: 'request-1',
              status: 500,
              title: 'Internal Server Error',
              type: 'https://yard.local/problems/internal-error',
            }),
            {
              headers: { 'Content-Type': 'application/problem+json' },
              status: 500,
            },
          ),
      ),
    ).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'API request failed (internal_error)',
      status: 500,
    });
  });

  it('normalizes shareable discovery state owned by the route URL', () => {
    expect(
      parseDiscoverySearch({
        category: 'sports',
        place: '  mapbox-place-1  ',
        sort: 'distance',
        view: 'list',
      }),
    ).toEqual({
      category: 'sports',
      place: 'mapbox-place-1',
      sort: 'distance',
      view: 'list',
    });

    expect(parseDiscoverySearch({ sort: 'unknown', view: 'canvas' })).toEqual({
      category: undefined,
      place: undefined,
      sort: 'soonest',
      view: 'map',
    });
  });
});
