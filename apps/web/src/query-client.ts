import { QueryClient, type Query } from '@tanstack/react-query';

/** Only completed queries are serialized into the browser hydration payload. */
export const webDehydrateOptions = {
  shouldDehydrateQuery: (query: Query) => query.state.status === 'success',
};

/** Creates an in-memory QueryClient owned by one browser session or SSR request. */
export function createWebQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
