import type { DatabaseHealth } from '../src/infrastructure/database/client.js';

export const healthyDatabase: DatabaseHealth = {
  kind: 'health',
  ping: async () => undefined,
};
