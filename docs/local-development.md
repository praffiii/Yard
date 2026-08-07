# Local development

Yard is a pnpm workspace managed by Vite+. The web application and API are
separate deployables with one browser-to-API boundary.

## Prerequisites

- Node.js `24.18.1` from [`.node-version`](../.node-version)
- pnpm `10.33.0`
- Vite+ (`vp`); `vp install` can install the pinned workspace runtime when it
  is available through the local toolchain
- Docker Desktop for the local PostgreSQL/PostGIS service

Install dependencies from the repository root:

```sh
vp install
```

For a CI-style, lockfile-enforcing install, use:

```sh
pnpm install --frozen-lockfile
```

## Environment

Copy the committed examples; never copy credentials from a hosted environment:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The API reads its environment when it starts. Export the local API values in
the current shell before running API commands:

```sh
set -a && . apps/api/.env && set +a
```

The examples contain safe placeholders. They are enough for builds and tests
because provider adapters are lazy; a real Clerk, Mapbox, R2, Resend, or Neon
account is not needed for the foundation verification flow.

### Application boundaries

- `apps/web` owns routes, rendering, browser interactions, and the typed Hono
  client. Only `VITE_*` values are bundled into browser code.
- `apps/api` owns authentication, authorization, validation, domain operations,
  database access, and provider adapters. `CLERK_SECRET_KEY`, database URLs,
  and provider credentials remain server-only.
- The browser calls the API at the absolute `VITE_API_URL` origin. CORS and
  Clerk bearer-token verification are enforced by the API; client controls are
  not authorization.

## Database and migrations

Start the isolated local PostGIS service:

```sh
docker compose --env-file apps/api/.env -f apps/api/compose.yaml up -d --wait postgres
```

Apply the reviewed migration chain as an explicit step:

```sh
vp run --filter ./apps/api db:migrate
```

Do not use schema push, edit an applied migration, or run migrations from API
startup. Check and generate migrations with:

```sh
vp run --filter ./apps/api db:check
vp run --filter ./apps/api db:generate
```

The focused migration test uses the separate `DATABASE_TEST_URL` database. It
must be local and end in `_test`; it never falls back to a runtime URL:

```sh
vp run --filter ./apps/api db:test
```

## Run the applications

Run both applications together:

```sh
vp run dev
```

Or run them independently:

```sh
vp run --filter ./apps/api dev
vp run --filter ./apps/web dev
```

The API readiness endpoint is `http://127.0.0.1:8787/healthz`. It returns
`200` only when the runtime database probe succeeds and `503` otherwise.

## Verification

Run the normal Vite+ quality workflow:

```sh
vp check
vp run typecheck
vp test
vp run --filter ./apps/api build
vp run --filter ./apps/web build
```

The clean-checkout acceptance runner builds both applications by default,
starts their production artifacts with safe local values, checks the web shell,
checks `/healthz`, checks the version endpoint and safe API error response, and
uses no live provider account:

```sh
pnpm run verify:acceptance
```

It expects the local database from the earlier steps and rejects non-local
`DATABASE_URL` values. Pass `YARD_ACCEPTANCE_API_PORT` or
`YARD_ACCEPTANCE_WEB_PORT` when the default ports are already in use. Representative authentication, validation, and provider
boundary behavior is covered by the focused API tests:

```sh
vp test run \
  apps/api/test/authentication.test.ts \
  apps/api/test/api-contract.test.ts \
  apps/api/test/provider-adapters.test.ts \
  apps/web/test/api-client.test.ts
```

Stop the database when it is no longer needed:

```sh
docker compose --env-file apps/api/.env -f apps/api/compose.yaml down
```
