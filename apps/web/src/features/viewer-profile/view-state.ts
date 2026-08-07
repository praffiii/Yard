import { ApiRequestError } from '../../api/client.js';
import type { fetchViewerProfile } from './queries.js';

export type ViewerProfile = Awaited<ReturnType<typeof fetchViewerProfile>>;

export type ViewerProfileViewState =
  | { kind: 'auth-loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'incomplete'; profile: ViewerProfile }
  | { kind: 'ready'; profile: ViewerProfile };

export function getViewerProfileViewState(input: {
  authLoaded: boolean;
  signedIn: boolean;
  pending: boolean;
  error: unknown;
  profile?: ViewerProfile;
}): ViewerProfileViewState {
  if (!input.authLoaded) return { kind: 'auth-loading' };
  if (!input.signedIn || (input.error instanceof ApiRequestError && input.error.status === 401)) {
    return { kind: 'unauthenticated' };
  }
  if (input.pending) return { kind: 'loading' };
  if (input.error instanceof ApiRequestError && input.error.status >= 500) {
    return { kind: 'unavailable' };
  }
  if (input.error || !input.profile) return { kind: 'error' };
  return input.profile.profileComplete
    ? { kind: 'ready', profile: input.profile }
    : { kind: 'incomplete', profile: input.profile };
}
