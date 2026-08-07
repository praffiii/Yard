import { strict as assert } from 'node:assert';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const apiEntry = resolve(rootDirectory, 'apps/api/dist/main.js');
const webEntry = resolve(rootDirectory, 'apps/web/.output/server/index.mjs');
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const skipBuild = process.argv.includes('--skip-build');
const apiPort = readPort(process.env.YARD_ACCEPTANCE_API_PORT, 8787);
const webPort = readPort(process.env.YARD_ACCEPTANCE_WEB_PORT, 3000);
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
const databaseUrl = readLocalDatabaseUrl(process.env.DATABASE_URL);
const offlinePublishableKey = 'pk_test_Y2xlcmsuZXhhbXBsZSQ';

const apiEnvironment = {
  ...process.env,
  ALLOWED_ORIGINS: webOrigin,
  CLERK_AUTHORIZED_PARTIES: webOrigin,
  CLERK_SECRET_KEY: 'sk_test_acceptance_only',
  DATABASE_RUNTIME_DRIVER: 'pg',
  DATABASE_URL: databaseUrl,
  HOST: '127.0.0.1',
  MAPBOX_ACCESS_TOKEN: 'pk_test_acceptance_only',
  PORT: String(apiPort),
  R2_ACCESS_KEY_ID: 'acceptance-only',
  R2_BUCKET: 'yard-acceptance',
  R2_ENDPOINT: 'https://account-id.r2.example.test',
  R2_PRESIGNED_URL_TTL_SECONDS: '300',
  R2_REGION: 'auto',
  R2_SECRET_ACCESS_KEY: 'acceptance-only',
  RESEND_API_KEY: 're_test_acceptance_only',
  RESEND_FROM_EMAIL: 'Yard <noreply@example.test>',
};

const webEnvironment = {
  CLERK_SECRET_KEY: 'sk_test_acceptance_only',
  HOME: process.env.HOME ?? rootDirectory,
  NODE_ENV: 'test',
  PATH: process.env.PATH ?? '',
  TMPDIR: process.env.TMPDIR ?? '/tmp',
  VITE_API_URL: apiOrigin,
  VITE_CLERK_PUBLISHABLE_KEY: offlinePublishableKey,
  VITE_MAPBOX_ACCESS_TOKEN: 'pk_test_acceptance_only',
  VITE_MAPBOX_STYLE_URL: 'mapbox://styles/mapbox/streets-v12',
};

function readLocalDatabaseUrl(value) {
  const databaseUrl =
    value?.trim() || 'postgresql://yard:yard_local_only@127.0.0.1:54329/yard_development';
  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('Clean-checkout acceptance requires a valid local DATABASE_URL');
  }

  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol) || !localHosts.has(hostname)) {
    throw new Error('Clean-checkout acceptance requires a local DATABASE_URL');
  }

  return databaseUrl;
}

function readPort(value, fallback) {
  const port = Number(value ?? fallback);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Acceptance port must be an integer between 1 and 65535: ${value}`);
  }

  return port;
}

async function runCommand(label, args, environment) {
  await new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(packageManager, args, {
      cwd: rootDirectory,
      env: environment,
      stdio: 'inherit',
    });

    child.once('error', rejectCommand);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveCommand();
        return;
      }

      rejectCommand(new Error(`${label} failed (${signal ?? `exit code ${code}`})`));
    });
  });
}

function startServer(label, command, args, environment) {
  const state = {
    code: undefined,
    error: undefined,
    exited: false,
    signal: undefined,
  };
  const child = spawn(command, args, {
    cwd: rootDirectory,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.once('error', (error) => {
    state.error = error;
  });
  child.once('exit', (code, signal) => {
    state.code = code;
    state.exited = true;
    state.signal = signal;
  });

  return { child, label, state };
}

async function stopServer(server) {
  if (server.state.exited) {
    return;
  }

  server.child.kill('SIGTERM');
  await waitForExit(server, 5_000);

  if (!server.state.exited) {
    server.child.kill('SIGKILL');
    await waitForExit(server, 1_000);
  }
}

async function waitForExit(server, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (!server.state.exited && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
}

async function waitForResponse(server, url, expectedStatus) {
  const deadline = Date.now() + 30_000;
  let lastFailure = 'no response';

  while (Date.now() < deadline) {
    if (server.state.error) {
      throw server.state.error;
    }

    if (server.state.exited) {
      throw new Error(
        `${server.label} exited before readiness (${server.state.signal ?? `code ${server.state.code}`})`,
      );
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });

      if (response.status === expectedStatus) {
        return response;
      }

      lastFailure = `HTTP ${response.status}`;
      await response.arrayBuffer();
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(`Timed out waiting for ${server.label} at ${url}: ${lastFailure}`);
}

async function verifyApi(apiServer) {
  const healthResponse = await waitForResponse(apiServer, `${apiOrigin}/healthz`, 200);
  assert.deepEqual(await healthResponse.json(), {
    service: 'yard-api',
    status: 'ok',
  });

  const versionResponse = await fetch(`${apiOrigin}/v1`);
  assert.equal(versionResponse.status, 200);
  assert.deepEqual(await versionResponse.json(), {
    apiVersion: 'v1',
    service: 'yard-api',
  });

  const errorResponse = await fetch(`${apiOrigin}/v1/does-not-exist`);
  assert.equal(errorResponse.status, 404);
  assert.equal(
    errorResponse.headers.get('content-type')?.split(';', 1)[0],
    'application/problem+json',
  );
  const errorBody = await errorResponse.json();
  assert.equal(errorBody.code, 'route_not_found');
  assert.equal(errorBody.status, 404);
  assert.equal(JSON.stringify(errorBody).includes('stack'), false);
}

async function verifyWeb(webServer) {
  const response = await waitForResponse(webServer, webOrigin, 200);
  const html = await response.text();

  assert.match(html, /<title>Yard<\/title>/);
  assert.match(html, /Find your people and make plans\./);
}

async function main() {
  if (!skipBuild) {
    await runCommand('API build', ['--filter', './apps/api', 'build'], process.env);
    await runCommand('web build', ['--filter', './apps/web', 'build'], webEnvironment);
  }

  await access(apiEntry);
  await access(webEntry);

  const apiServer = startServer('api', process.execPath, [apiEntry], apiEnvironment);
  const webServer = startServer('web', process.execPath, [webEntry], {
    ...webEnvironment,
    HOST: '127.0.0.1',
    PORT: String(webPort),
  });

  try {
    await verifyApi(apiServer);
    await verifyWeb(webServer);
    console.log('Clean-checkout acceptance passed.');
  } finally {
    await Promise.all([stopServer(apiServer), stopServer(webServer)]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
