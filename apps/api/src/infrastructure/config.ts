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

function readRequired(environment: NodeJS.ProcessEnv, variableName: string) {
  const value = environment[variableName]?.trim();

  if (!value) {
    throw new Error(`${variableName} is required`);
  }

  return value;
}

function readHttpUrl(environment: NodeJS.ProcessEnv, variableName: string) {
  const value = readRequired(environment, variableName);
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid HTTP or HTTPS URL`);
  }

  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.origin !== value) {
    throw new Error(`${variableName} must be a valid HTTP or HTTPS URL`);
  }

  return value;
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

export type MapboxConfig = Readonly<{
  accessToken: string;
}>;

export type R2Config = Readonly<{
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  presignedUrlTtlSeconds: number;
  region: string;
  secretAccessKey: string;
}>;

export type ResendConfig = Readonly<{
  apiKey: string;
  fromEmail: string;
}>;

const r2PresignedUrlTtlSeconds = {
  default: 300,
  maximum: 900,
  minimum: 60,
} as const;

export function readMapboxConfig(environment: NodeJS.ProcessEnv = process.env): MapboxConfig {
  return { accessToken: readRequired(environment, 'MAPBOX_ACCESS_TOKEN') };
}

export function readR2Config(environment: NodeJS.ProcessEnv = process.env): R2Config {
  const rawTtl = environment.R2_PRESIGNED_URL_TTL_SECONDS?.trim();
  const presignedUrlTtlSeconds = rawTtl ? Number(rawTtl) : r2PresignedUrlTtlSeconds.default;

  if (
    !Number.isInteger(presignedUrlTtlSeconds) ||
    presignedUrlTtlSeconds < r2PresignedUrlTtlSeconds.minimum ||
    presignedUrlTtlSeconds > r2PresignedUrlTtlSeconds.maximum
  ) {
    throw new Error(
      `R2_PRESIGNED_URL_TTL_SECONDS must be between ${r2PresignedUrlTtlSeconds.minimum} and ${r2PresignedUrlTtlSeconds.maximum} seconds`,
    );
  }

  return {
    accessKeyId: readRequired(environment, 'R2_ACCESS_KEY_ID'),
    bucket: readRequired(environment, 'R2_BUCKET'),
    endpoint: readHttpUrl(environment, 'R2_ENDPOINT'),
    presignedUrlTtlSeconds,
    region: environment.R2_REGION?.trim() || 'auto',
    secretAccessKey: readRequired(environment, 'R2_SECRET_ACCESS_KEY'),
  };
}

export function readResendConfig(environment: NodeJS.ProcessEnv = process.env): ResendConfig {
  return {
    apiKey: readRequired(environment, 'RESEND_API_KEY'),
    fromEmail: readRequired(environment, 'RESEND_FROM_EMAIL'),
  };
}

/** Safe defaults used by in-memory transport tests; the server validates env config before startup. */
export const apiConfig = {
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS, 'ALLOWED_ORIGINS', false),
  hostname: process.env.HOST?.trim() || '127.0.0.1',
  port: parsePort(process.env.PORT),
} as const;
