export { activitiesModule } from './activities/index.js';
export { communitiesModule } from './communities/index.js';
export { discoveryModule } from './discovery/index.js';
export { identityModule } from './identity/index.js';
export { mediaModule } from './media/index.js';
export { notificationsModule } from './notifications/index.js';
export { participationModule } from './participation/index.js';
export { safetyModule } from './safety/index.js';

export const backendModuleNames = [
  'identity',
  'communities',
  'activities',
  'participation',
  'discovery',
  'media',
  'safety',
  'notifications',
] as const;

export type BackendModuleName = (typeof backendModuleNames)[number];
