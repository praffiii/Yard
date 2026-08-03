# Yard

Yard is a mobile-first web app for discovering and joining small local activity sessions. It is a TypeScript workspace with two separately buildable applications:

- `apps/web` — the TanStack Start and TanStack Router user-facing web application.
- `apps/api` — the Node.js Hono backend API with an Effect application boundary.

Yard is a lightweight layer for real-world activities such as pickup sports, study sessions, photo walks, language exchanges, and small community gatherings. The core loop is discovery, joining, host review of participant RSVPs, showing up, and building trust through real attendance. Yard describes meeting points; it does not book or manage venues.

## What makes Yard special?

The product is pre-launch and still learning its domain. Preserve these priorities as the system grows.

### 1. Real-world utility

Yard should help people find useful, low-commitment activities near them. Map and list discovery, time, distance, interest, and community context are product features—not generic CRUD screens.

### 2. Trust and privacy by default

Many participants may be strangers to the host. Authentication, authorization, participant RSVP approval, attendance, moderation, and location privacy are part of the product's core behavior. Do not trade these away for a convenient client-side shortcut.

### 3. Small systems over premature infrastructure

Keep the backend as one modular monolith. Do not add microservices, an internal event bus, generic CRUD layers, or background workers unless an accepted decision and a real constraint justify them. Prefer the smallest model that makes the correct behavior obvious.

### 4. Mobile-first, API-ready

The web application is the first client, but the backend API is an intentional boundary for future clients. Keep browser-safe HTTP/JSON contracts independent from TanStack Start and server-only implementation details.

## A note from Praffi

Build complex things as simply as possible. Do not preserve complexity just because it already exists, and do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then choose the smallest complete solution.

I like ambitious ideas, software that feels obvious, and simple terminology. If you have an idea, express it in the smallest model and clearest language that make the behavior unsurprising. When an implementation changes, adds, or invalidates an architectural or domain decision, update the relevant ADR in the same change so the ADR and code stay aligned. Amend or supersede an outdated ADR rather than silently contradicting it.

Use types when they clarify ownership and behavior. Prefer focused tests over broad test slop. Challenge scope creep and materially different architectural choices. These are good defaults; the task's explicit requirements can override them, but surface conflicts rather than silently weakening an important boundary.

## A small glossary

Use the vocabulary in `docs/glossary.md` when communicating, naming code, writing issues, and writing tests:

- **activity session** means the small, time-bounded gathering people discover and join.
- **host** means the person responsible for creating and coordinating an activity session.
- **participant** means a person who discovers a session and joins it.
- **RSVP** means a participant's request or commitment to attend, subject to capacity and host approval.
- **attendance** is separate from RSVP and records whether someone actually showed up.
- **meeting point** is where a session is expected to happen; it is not a venue reservation.
- **community** is an in-app group that provides discovery, membership, and trusted context for activities.
- **domain module** is an internal backend ownership boundary, not a separately deployed service.
- **API boundary** is the HTTP boundary between `apps/web` and `apps/api`; it is not a boundary between backend modules.
- **provider adapter** is the application-owned boundary around an external system such as Clerk, R2, Mapbox, or Resend.
- **DTO projection** is a caller-specific response shape; raw database rows are not API contracts.

## The ways to hurt yourself

1. **Destroying user work.** Inspect `git status` before editing. Do not use broad resets, cleans, overwrites, or process-kill patterns. Preserve unrelated changes and stop only processes you started or whose ownership you confirmed.
2. **Leaking state or secrets.** Never commit `.env` files, credentials, tokens, production data, or provider responses containing sensitive data. Use `.env.example` as the configuration reference. Do not point local work at production databases or providers; use isolated development state.
3. **Hard-coding important values.** Do not hard-code secrets, environment-specific URLs, provider identifiers, permissions, limits, or important domain rules. Keep configuration in environment/configuration, provider details in adapters, and domain rules in named code, schemas, or database constraints.
4. **Trusting the client.** Client controls are not authorization. Enforce authentication, authorization, capacity, lifecycle, and privacy rules in `apps/api`. Do not expose exact meeting points, private reports, real names, or provider secrets through an unauthorized projection.
5. **Bypassing ownership.** Do not import another API module's private files or tables, make routes access persistence directly, or create a generic repository layer to avoid naming the domain owner. Cross-module work uses a narrow public typed command or query interface.

## Check every boundary

Before calling a feature complete, check the entries that apply and state any deliberate non-applicability:

- **Applications.** Does the change affect `apps/web`, `apps/api`, or both? A web feature is not complete if its API contract, authentication, error state, or loading state is missing.
- **Domain modules.** Assign each rule and table to its owner: `identity`, `communities`, `activities`, `participation`, `discovery`, `media`, `safety`, or `notifications`.
- **HTTP contracts.** API work follows the versioned HTTP/JSON boundary, typed Hono client usage, runtime validation in the API, resource-oriented actions, and privacy-aware DTOs. Do not put server runtime code in the browser bundle.
- **Effect application layer.** Use Effect in `apps/api` for complex workflows, typed errors, dependency provision, resource safety, and controlled asynchronous work. Keep Hono as the HTTP boundary, do not introduce Effect in `apps/web` by default, and keep small pure functions as ordinary TypeScript when Effect does not add clarity.
- **Web presentation.** `apps/web` uses Tailwind with Yard's semantic design tokens, project-owned shadcn/ui components backed by Radix when needed, Phosphor Icons, and Motion for React. Use shared motion tokens and reduced-motion behavior; use CSS for simple transitions. Do not add a second UI kit or competing icon/animation library.
- **Web state.** TanStack Query owns API-backed server state and Hono RPC remains the transport boundary. TanStack Router search parameters own shareable discovery state, React local state owns ephemeral UI state, and Clerk owns authentication state. Do not add a global client store or persist private Query cache by default; avoid optimistic updates for safety-sensitive mutations.
- **Providers.** Clerk, PostgreSQL/PostGIS through Drizzle and Neon, Cloudflare R2, Mapbox, and Resend each belong behind the appropriate infrastructure adapter. Provider SDK types and credentials must not spread through domain modules.
- **State transitions.** Stateful behavior uses explicit domain commands and resource actions such as `publishActivity`, `approveRsvp`, `withdraw`, `cancel`, and `checkIn`, not arbitrary status updates. Consider the reverse path, terminal states, concurrency, idempotency, and derived state.
- **Transactions and side effects.** Durable domain changes that must be atomic share one database transaction. External provider side effects happen after commit and need explicit failure/idempotency handling.
- **Privacy and safety.** Check visibility, blocks, reports, moderation scope, exact versus approximate locations, and participant approval whenever a response or workflow exposes people or places.
- **Documentation.** Read and update the relevant ADR, glossary, schema inventory, endpoint inventory, or README when behavior or architecture changes. If an implementation conflicts with an accepted ADR, call it out before proceeding.

## Local development

Use the pinned workspace toolchain: Node `24.18.1`, pnpm `10.33.0`, and Vite+.

Install dependencies:

```sh
vp install
```

Run both applications:

```sh
vp run dev
```

Run an application independently:

```sh
vp run --filter ./apps/web dev
vp run --filter ./apps/api dev
```

The API listens on `http://127.0.0.1:8787` by default. Use the safe readiness endpoint:

```sh
curl http://127.0.0.1:8787/healthz
```

Do not start development services against production state. Track processes you start and stop them by their captured PID; never kill processes by a broad name or path match.

## Verifying

Use the smallest proof that the change works:

- API behavior changes ship with focused tests in `apps/api/test`.
- Run focused typechecks, tests, and builds for the application you changed first.
- For changes crossing the workspace boundary, run the full workspace checks when practical:

  ```sh
  vp check
  vp run typecheck
  vp test
  vp run build
  ```

- Do not use sleeps or polling to make asynchronous tests pass. Wait for the actual server, response, or resource lifecycle event.
- Do not use browser or computer automation unless the user explicitly requests it.
- Documentation-only changes do not require runtime tests; inspect the final diff and references instead.

## Pull requests and commits

- Do not commit or open a pull request unless explicitly asked.
- Use conventional commit and pull-request titles.
- A pull-request description must include **Summary**, **What**, **Why**, and **Validation** sections.
- Never add AI attribution, tooling trailers, or generated-by footers.
- Keep one concern per pull request. Do not bundle unrelated cleanup with a feature or fix.

## How it works

The web application owns UI routes, rendering, browser interactions, and the typed client for the API. The backend API owns the trusted product boundary: it authenticates requests, validates inputs, applies authorization, runs domain commands and queries, and returns privacy-appropriate DTOs.

Hono owns HTTP transport and response mapping. Effect is used inside the API application layer for complex workflows, typed errors, dependency provision, resource safety, and controlled asynchronous work. Domain modules own their invariants and persistence. Infrastructure owns database setup, runtime wiring, and external provider adapters. Small pure domain functions may remain ordinary TypeScript when Effect would not add clarity.

The backend remains a modular monolith. There is one web-to-API boundary in the MVP, not internal HTTP between modules and not a service mesh.

## Where code lives

- `apps/web` — TanStack Start/Router UI, browser interactions, and typed API client.
- `apps/web/src/routes` — web routes; `apps/web/src/routeTree.gen.ts` is generated and should not be hand-edited.
- `apps/api/src/http` — Hono transport composition, request parsing, middleware, and response mapping.
- `apps/api/src/modules` — domain modules, commands, queries, schemas, DTO projections, authorization, persistence, and invariants.
- `apps/api/src/infrastructure` — database configuration and external provider adapters.
- `apps/api/src/runtime` — Effect composition, application bootstrap, and Node server wiring.
- `apps/api/test` — focused API and startup tests.
- `docs/adr` — accepted and proposed architectural decisions; read the relevant files before changing architecture.
- `docs/adr/0079-web-styling-components-and-motion.md` — web presentation, component, icon, theme, and motion decisions.
- `docs/adr/0080-web-data-fetching-and-client-state-boundaries.md` — web server-state, URL-state, local-state, authentication-state, and cache ownership decisions.
- `docs/agents` — issue-tracker and domain-documentation instructions.
- `docs/glossary.md` — canonical product and engineering vocabulary.
- `docs/api-endpoint-inventory.md` and `docs/database-schema-inventory.md` — inventories that must stay aligned with implemented contracts and schema decisions.

## Taste

- Keep orchestration at named domain boundaries and complexity at adapter boundaries.
- Prefer inferred types and narrow interfaces. Avoid `any`, vague `utils`/`common` buckets, speculative abstractions, and generic CRUD APIs.
- Use explicit domain commands and queries for stateful behavior.
- Comments should explain how a function or boundary is used, not narrate every line.
- Fix problems at their source instead of suppressing errors, warnings, authorization failures, or type failures.
- Prefer forward-only, reviewed database migrations and database constraints for durable invariants.

## Internal documentation

### Issue tracker

Issues and planning artifacts live in the Linear Yard team (`YARD`). See `docs/agents/issue-tracker.md`. Use the Linear MCP tools for issue operations and preserve the documented team, state, label, parent, and blocking conventions.

### Domain docs

Read ADRs relevant to the area being explored. Use `docs/glossary.md` terminology. If an implementation contradicts an accepted ADR, surface the conflict explicitly and update the ADR when the decision changes. See `docs/agents/domain.md` for the complete workflow.

## Additional tips

- When requirements are ambiguous, inspect the codebase and relevant ADRs first; ask only when alternatives have materially different product or architectural consequences.
- Do not reformat or revert unrelated user changes.
- Keep the implementation smaller than the explanation whenever the domain allows it.
