import { useAuth } from '@clerk/tanstack-react-start';
import { useMemo } from 'react';
import { createApiClient, readWebApiUrl } from './client.js';

/** Creates a transport client that obtains a fresh Clerk token for each request. */
export function useApiClient(baseUrl: string = readWebApiUrl()) {
  const { getToken } = useAuth();

  return useMemo(() => createApiClient(baseUrl, getToken), [baseUrl, getToken]);
}
