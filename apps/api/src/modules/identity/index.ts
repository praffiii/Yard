export const identityModule = {
  name: 'identity',
  owns: ['account mapping', 'authentication boundary', 'profile'] as const,
} as const;
