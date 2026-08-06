import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { createWebQueryClient, webDehydrateOptions } from './query-client';
import type { WebRouterContext } from './router-context';

export function getRouter() {
  const queryClient = createWebQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient } satisfies WebRouterContext,
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    dehydrateOptions: webDehydrateOptions,
  });

  return router;
}
