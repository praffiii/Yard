import { ClerkProvider } from '@clerk/tanstack-react-start';
import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import '../styles.css';

export const Route = createRootRoute({
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
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ClerkProvider>
  );
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
