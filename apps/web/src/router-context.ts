import type { QueryClient } from '@tanstack/react-query';

export type WebRouterContext = Readonly<{
  queryClient: QueryClient;
}>;
