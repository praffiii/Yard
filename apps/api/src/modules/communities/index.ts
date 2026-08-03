export const communitiesModule = {
  name: 'communities',
  owns: ['community lifecycle', 'membership', 'invitations'] as const,
} as const;
