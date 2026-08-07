export { users, accountStatuses, profilePhotoStatuses } from './database-tables.js';
export type { AccountStatus, ProfilePhotoStatus } from './database-tables.js';
export { ViewerProfileSchema } from './schemas.js';
export type { ViewerProfile } from './schemas.js';
export { createIdentityService, getViewerProfile, resolveAuthenticatedViewer } from './service.js';
export type { IdentityService, ResolvedViewer } from './service.js';

export const identityModule = {
  name: 'identity',
  owns: ['account mapping', 'authentication boundary', 'profile'] as const,
} as const;
