# Pre-launch deployment

Yard keeps the web application and API as separate deployables:

- Vercel hosts `apps/web`.
- Render hosts the stateless Node.js `apps/api` service.
- Neon provides the hosted PostgreSQL/PostGIS database.
- R2, Mapbox, Clerk, and Resend remain behind API-owned provider adapters.

The committed [`apps/web/vercel.json`](../apps/web/vercel.json) and
[`render.yaml`](../render.yaml) are deployment templates, not credential
stores.

## Vercel web deployment

Create the Vercel project with `apps/web` as its Root Directory. The
configuration runs only the web package's build command. The Nitro Vite plugin
emits the TanStack Start server output that Vercel can run as functions; do not
point Vercel at the API build or database.

Set these browser-safe values in Vercel Project Settings for the relevant
environments:

- `VITE_API_URL` — the HTTPS origin of the Render API, without a path
- `VITE_CLERK_PUBLISHABLE_KEY` — the public Clerk publishable key
- `VITE_MAPBOX_ACCESS_TOKEN` and `VITE_MAPBOX_STYLE_URL` — public map settings

The `VITE_` prefix means a value is readable by every browser visitor. Never
put a database URL, Clerk secret key, R2 credential, Resend key, or other server
secret in a `VITE_` variable or in `vercel.json`. If TanStack Start server
middleware needs a server-only Clerk value, configure it separately in Vercel
runtime settings; it must not be part of the browser bundle or committed
configuration.

Set the API's `ALLOWED_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` to the exact
Vercel origin (including scheme and excluding a trailing slash). CORS is not an
authorization mechanism; the API still verifies bearer tokens for protected
routes.

## Render API deployment

Create the service from [`render.yaml`](../render.yaml). It deliberately:

- uses the Node runtime and pins `NODE_VERSION` to the repository version;
- sets `HOST=0.0.0.0` and takes `PORT` from Render instead of hard-coding a
  local port;
- builds and starts only `apps/api`;
- checks `/healthz` before accepting traffic;
- keeps durable state in Neon/R2 rather than the Render filesystem; and
- declares server configuration and credentials as Render-managed values with
  `sync: false`.

Configure these server-only values in Render's environment settings:

- `DATABASE_URL` — pooled Neon runtime connection
- `DATABASE_DIRECT_URL` — direct Neon connection for the release migration
- `CLERK_SECRET_KEY`, `CLERK_AUTHORIZED_PARTIES`, and `ALLOWED_ORIGINS`
- `MAPBOX_ACCESS_TOKEN`
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

Use `DATABASE_RUNTIME_DRIVER=neon` in Render. The API does not store sessions,
uploads, queues, or other durable state in process memory or on local disk, so
it remains safe to restart or scale horizontally.

## Release and migration order

The Render blueprint runs this as its explicit pre-deploy release command:

```sh
pnpm --filter @yard/api db:migrate
```

Drizzle uses `DATABASE_DIRECT_URL`, and its output is retained in Render's
deploy logs. A failed migration stops the deployment; it is not silently
ignored. Migrations are never run by `apps/api` startup and are not run once
per API instance. Review the forward-only SQL before releasing, verify the
health check after deployment, and keep a rollback or corrective migration plan
for incompatible schema changes.

A deployment verification should cover, without product workflows:

1. the web shell renders from the Vercel deployment;
2. Render returns `200` from `/healthz` with its database reachable;
3. `/v1` returns the version DTO and unknown paths return safe Problem Details;
4. focused tests verify authentication, validation, browser-safe transport, and
   lazy provider adapters; and
5. the migration release command completes before the API is promoted.
