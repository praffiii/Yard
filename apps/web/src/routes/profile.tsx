import { SignInButton, useAuth } from '@clerk/tanstack-react-start';
import { CircleNotch, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Badge } from '../components/ui/badge.js';
import { Button, buttonVariants } from '../components/ui/button.js';
import { useViewerProfileApiClient } from '../api/use-client.js';
import { viewerProfileQueryOptions } from '../features/viewer-profile/queries.js';
import { getViewerProfileViewState } from '../features/viewer-profile/view-state.js';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const apiClient = useViewerProfileApiClient();
  const query = useQuery(
    viewerProfileQueryOptions(apiClient, sessionId ?? '', isLoaded && isSignedIn === true),
  );
  const state = getViewerProfileViewState({
    authLoaded: isLoaded,
    signedIn: isSignedIn === true,
    pending: query.isPending,
    error: query.error,
    profile: query.data,
  });

  return (
    <div className="min-h-svh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <main className="mx-auto max-w-2xl">
        <a className="text-sm font-medium text-primary hover:underline" href="/">
          ← Back to discovery
        </a>
        <section className="mt-6 rounded-card border border-border bg-card p-5 shadow-card sm:p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-pill bg-secondary p-3 text-secondary-foreground">
              <UserCircle aria-hidden="true" size={28} weight="regular" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                Your Yard profile
              </p>
              <h1 className="mt-1 font-display text-title font-semibold">Profile</h1>
            </div>
          </div>

          {(state.kind === 'auth-loading' || state.kind === 'loading') && (
            <div aria-live="polite" className="mt-8 flex items-center gap-3 text-muted-foreground">
              <CircleNotch aria-hidden="true" className="animate-spin" size={22} />
              Loading your profile…
            </div>
          )}

          {state.kind === 'unauthenticated' && (
            <div className="mt-8">
              <p className="text-sm leading-6 text-muted-foreground">
                Sign in to view your private Yard profile.
              </p>
              <SignInButton mode="modal">
                <Button className="mt-4">Sign in</Button>
              </SignInButton>
            </div>
          )}

          {(state.kind === 'unavailable' || state.kind === 'error') && (
            <div className="mt-8 rounded-md border border-error-foreground/30 bg-error p-4">
              <div className="flex gap-3">
                <WarningCircle aria-hidden="true" className="mt-0.5 shrink-0" size={21} />
                <div>
                  <p className="font-medium">
                    {state.kind === 'unavailable'
                      ? 'Your profile is temporarily unavailable.'
                      : 'We could not load your profile.'}
                  </p>
                  <p className="mt-1 text-sm leading-6">Discovery is still available.</p>
                  <a
                    className={`${buttonVariants({ variant: 'outline', size: 'sm' })} mt-3`}
                    href="/"
                  >
                    Return to discovery
                  </a>
                </div>
              </div>
            </div>
          )}

          {(state.kind === 'incomplete' || state.kind === 'ready') && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={state.kind === 'ready' ? 'success' : 'warning'}>
                  {state.kind === 'ready' ? 'Complete' : 'Incomplete'}
                </Badge>
                <Badge variant={state.profile.accountStatus === 'active' ? 'success' : 'warning'}>
                  {state.profile.accountStatus}
                </Badge>
              </div>

              {state.kind === 'incomplete' && (
                <div className="mt-5 rounded-md border border-warning-foreground/25 bg-warning p-4">
                  <p className="font-medium text-warning-foreground">
                    Finish setting up your profile
                  </p>
                  <p className="mt-1 text-sm leading-6 text-warning-foreground">
                    Add your real name, display name, and profile photo when onboarding becomes
                    available.
                  </p>
                  <Button className="mt-4" disabled>
                    Continue onboarding
                  </Button>
                </div>
              )}

              <dl className="mt-6 divide-y divide-border rounded-md border border-border">
                <ProfileField label="Display name" value={state.profile.displayName} />
                <ProfileField label="Real name" value={state.profile.realName} />
                <ProfileField label="Profile photo" value={state.profile.profilePhoto.status} />
                <ProfileField label="Account status" value={state.profile.accountStatus} />
              </dl>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ProfileField({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium capitalize">{value ?? 'Not added'}</dd>
    </div>
  );
}
