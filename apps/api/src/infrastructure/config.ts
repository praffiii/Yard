function parsePort(value: string | undefined) {
  const port = Number(value ?? '8787');

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535');
  }

  return port;
}

function parseAllowedOrigins(value: string | undefined) {
  return (value ?? 'http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export type DatabaseRuntimeDriver = 'neon' | 'pg';

export type DatabaseRuntimeConfig = {
  readonly driver: DatabaseRuntimeDriver;
  /** The pooled connection used by the running API. */
  readonly url: string;
};

export function readDatabaseRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseRuntimeConfig {
  const url = environment.DATABASE_URL?.trim();

  if (!url) {
    throw new Error('DATABASE_URL is required for the API runtime');
  }

  const driver = environment.DATABASE_RUNTIME_DRIVER?.trim() || 'pg';

  if (driver !== 'neon' && driver !== 'pg') {
    throw new Error('DATABASE_RUNTIME_DRIVER must be either neon or pg');
  }

  return { driver, url };
}

export const databaseConfig = {
  healthProbeTimeoutMs: 2_000,
} as const;

export const apiConfig = {
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  hostname: process.env.HOST?.trim() || '127.0.0.1',
  port: parsePort(process.env.PORT),
} as const;
