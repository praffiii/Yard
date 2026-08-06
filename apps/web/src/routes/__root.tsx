import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start';
import { useQueryClient } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { WebRouterContext } from '../router-context';
import '../styles.css';

export const Route = createRootRouteWithContext<WebRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Yard' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

  if (!publishableKey) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required for the web application');
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <SessionQueryBoundary>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </SessionQueryBoundary>
    </ClerkProvider>
  );
}

/** Clears remote data when Clerk changes accounts so private cache entries cannot cross sessions. */
function SessionQueryBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [, rerender] = useState(0);
  const previousUserId = useRef(userId);
  const sessionChanged = previousUserId.current !== userId;

  useEffect(() => {
    if (!sessionChanged) {
      return;
    }

    previousUserId.current = userId;
    queryClient.clear();
    rerender((value) => value + 1);
  }, [queryClient, rerender, sessionChanged, userId]);

  // Keep the old tree out of the render while the cache is being cleared.
  return sessionChanged ? null : children;
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
