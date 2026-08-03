export const safetyModule = {
  name: 'safety',
  owns: ['reports', 'blocks', 'moderation actions'] as const,
} as const;
