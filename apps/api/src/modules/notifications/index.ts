export const notificationsModule = {
  name: 'notifications',
  owns: ['in-app notifications', 'preferences', 'email delivery intent'] as const,
} as const;
