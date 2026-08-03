export const participationModule = {
  name: 'participation',
  owns: ['RSVP', 'capacity', 'attendance'] as const,
} as const;
