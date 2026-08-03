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

The application skeleton does not require database, provider, or secret
configuration. Database and provider integrations belong to follow-up work.
