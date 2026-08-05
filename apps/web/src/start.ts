import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createStart } from '@tanstack/react-start';

/** Provides Clerk's server session boundary to TanStack Start without exposing its credentials. */
export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware()],
}));
