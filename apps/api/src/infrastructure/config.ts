function parsePort(value: string | undefined) {
  const port = Number(value ?? '8787');

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535');
  }

  return port;
}

const localDevelopmentOrigin = 'http://127.0.0.1:3000';

function parseAllowedOrigins(value: string | undefined, variableName: string, required: boolean) {
  const rawOrigins = value?.trim();

  if (!rawOrigins) {
    if (required) {
      throw new Error(`${variableName} is required and must contain at least one origin`);
    }

    return [localDevelopmentOrigin];
  }

  const origins = [
    ...new Set(
      rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ];

  if (origins.length === 0) {
    throw new Error(`${variableName} is required and must contain at least one origin`);
  }

  for (const origin of origins) {
    let parsedOrigin: URL;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`${variableName} must contain valid HTTP or HTTPS origins`);
    }

    if (
      (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(`${variableName} must contain valid HTTP or HTTPS origins`);
    }
  }

  return origins;
}

export type ClerkAuthConfig = {
  readonly secretKey: string;
  readonly authorizedParties: readonly string[];
};

export function readAllowedOrigins(environment: NodeJS.ProcessEnv = process.env) {
  return parseAllowedOrigins(environment.ALLOWED_ORIGINS, 'ALLOWED_ORIGINS', true);
}

export function readClerkAuthConfig(environment: NodeJS.ProcessEnv = process.env): ClerkAuthConfig {
  const secretKey = environment.CLERK_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for API authentication');
  }

  const authorizedParties = parseAllowedOrigins(
    environment.CLERK_AUTHORIZED_PARTIES,
    'CLERK_AUTHORIZED_PARTIES',
    true,
  );

  return { authorizedParties, secretKey };
}

export type ApiRuntimeConfig = {
  readonly allowedOrigins: readonly string[];
  readonly auth: ClerkAuthConfig;
  readonly hostname: string;
  readonly port: number;
};

export function readApiRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiRuntimeConfig {
  return {
    allowedOrigins: readAllowedOrigins(environment),
    auth: readClerkAuthConfig(environment),
    hostname: environment.HOST?.trim() || '127.0.0.1',
    port: parsePort(environment.PORT),
  };
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

/** Safe defaults used by in-memory transport tests; the server validates env config before startup. */
export const apiConfig = {
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS, 'ALLOWED_ORIGINS', false),
  hostname: process.env.HOST?.trim() || '127.0.0.1',
  port: parsePort(process.env.PORT),
} as const;
