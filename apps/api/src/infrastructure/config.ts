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

export const apiConfig = {
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  hostname: process.env.HOST?.trim() || '127.0.0.1',
  port: parsePort(process.env.PORT),
} as const;
