export const activitiesModule = {
  name: 'activities',
  owns: ['activity lifecycle', 'schedule', 'meeting point'] as const,
} as const;
