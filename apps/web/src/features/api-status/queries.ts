import { queryOptions } from '@tanstack/react-query';
import { ApiRequestError, readProblemDetails } from '../../api/client.js';
import type { createApiClient } from '../../api/client.js';

export type ApiClient = ReturnType<typeof createApiClient>;
export type ApiFetch = typeof fetch;

/** Query keys for the public API-status feature; no user scope affects this response. */
export const apiStatusKeys = {
  all: ['api-status'] as const,
  version: () => [...apiStatusKeys.all, 'version'] as const,
};

/** Reads the public version endpoint through the browser-safe Hono client. */
export async function fetchApiVersion(client: ApiClient, fetchImpl: ApiFetch = globalThis.fetch) {
  const response = await client.v1.$get(undefined, { fetch: fetchImpl });

  if (!response.ok) {
    throw new ApiRequestError(response.status, await readProblemDetails(response));
  }

  return response.json();
}

/** Query options shared by the route loader and the rendered shell. */
export function apiVersionQueryOptions(client: ApiClient, fetchImpl: ApiFetch = globalThis.fetch) {
  return queryOptions({
    queryKey: apiStatusKeys.version(),
    queryFn: () => fetchApiVersion(client, fetchImpl),
    retry: false,
  });
}
