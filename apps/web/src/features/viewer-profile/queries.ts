import { queryOptions } from '@tanstack/react-query';
import type { createViewerProfileApiClient } from '../../api/client.js';
import { ApiRequestError, readProblemDetails } from '../../api/client.js';

type ApiClient = ReturnType<typeof createViewerProfileApiClient>;
type ViewerProfileRequest = () => Promise<Response>;

export const viewerProfileKeys = {
  session: (sessionId: string) => ['identity', 'viewer-profile', sessionId] as const,
};

export async function fetchViewerProfile(
  apiClient: ApiClient,
  request: ViewerProfileRequest = () => apiClient.index.$get(),
) {
  const response = await request();

  if (!response.ok) {
    throw new ApiRequestError(response.status, await readProblemDetails(response));
  }

  return response.json();
}

/** Private viewer state is enabled only after Clerk has a signed-in session. */
export function viewerProfileQueryOptions(
  apiClient: ApiClient,
  sessionId: string,
  enabled: boolean,
  request?: ViewerProfileRequest,
) {
  return queryOptions({
    queryKey: viewerProfileKeys.session(sessionId),
    queryFn: () => fetchViewerProfile(apiClient, request),
    enabled: enabled && sessionId.length > 0,
    meta: { private: true },
  });
}
