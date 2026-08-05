# Yard

Yard is a web app for people to discover and plan activities and communities nearby.

Yard is a small TypeScript workspace with two separately buildable applications:

- `apps/web` — TanStack Start and TanStack Router web shell.
- `apps/api` — Node.js Hono API with an Effect application boundary.

## Local workflow

Install the pinned workspace dependencies:

```sh
vp install
```

Run both applications:

```sh
vp run dev
```

Run the quality gate, tests, and builds:

```sh
vp check
vp run typecheck
vp test
vp run build
```

Run either application independently:

```sh
vp run --filter ./apps/web dev
vp run --filter ./apps/api dev
vp run --filter ./apps/web typecheck
vp run --filter ./apps/api typecheck
vp run --filter ./apps/web build
vp run --filter ./apps/api build
```

The API listens on `http://127.0.0.1:8787` by default. Its safe readiness
endpoint is:

```sh
curl http://127.0.0.1:8787/healthz
```

## Local PostgreSQL/PostGIS

The API uses a pooled PostgreSQL connection at runtime. Hosted deployments use
Neon's pooled driver; local development uses the pinned PostGIS service. The
compose initialization creates `yard_development` and the separate `yard_test`
database:

```sh
cp apps/api/.env.example apps/api/.env
docker compose --env-file apps/api/.env -f apps/api/compose.yaml up -d --wait postgres
set -a && . apps/api/.env && set +a
vp run --filter ./apps/api db:migrate
```

`DATABASE_URL` is the pooled runtime connection and
`DATABASE_DIRECT_URL` is the separate direct connection for Drizzle Kit
migrations and administration. `DATABASE_TEST_URL` is reserved for a separate
local test database. `/healthz` returns `200` only when the runtime database
probe succeeds and returns a safe `503` otherwise. Keep all connection strings
in environment configuration; never commit credentials or point local work at
production state.

Schema changes are explicit and forward-only:

```sh
vp run --filter ./apps/api db:generate
vp run --filter ./apps/api db:check
vp run --filter ./apps/api db:migrate
```

Review committed SQL migrations before applying them. Do not use schema push,
edit an applied migration, or run migrations during API startup. The initial
migration only enables PostGIS; Yard domain tables will be added by their
owning modules in later migrations.

For the focused migration test, create an isolated local PostgreSQL database,
set `DATABASE_TEST_URL`, and run:

```sh
vp run --filter ./apps/api db:test
```

The test applies the committed migration chain and verifies the PostGIS
extension and a spatial function. It does not use `DATABASE_URL` or
`DATABASE_DIRECT_URL` as a fallback.
