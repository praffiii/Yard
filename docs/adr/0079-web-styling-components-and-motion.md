# ADR-0079: Web Styling, Components, Icons, and Motion

- Status: Accepted
- Date: 2026-08-03
- Updated: 2026-08-06

## Context

Yard's user-facing web application is mobile-first and includes map and list
discovery, filters, activity creation, participant approval, communities,
profiles, and privacy-sensitive states. The starter application currently uses
hand-written CSS, which is sufficient for a shell but does not provide a
consistent styling foundation or accessible interaction primitives for the
product UI.

The repository already contains a Yard design-system source with semantic
tokens, light and dark themes, typography roles, spacing, control sizing,
component examples, and icon usage. The web application needs to implement
that design system without adding a second frontend framework, a runtime UI
vendor lock-in, or a large unused component catalog.

The current shadcn source workflow supports Base UI as an accessible primitive
base. Yard chooses Base UI so copied components remain project-owned while
sharing the same primitive family as the rest of the web presentation stack.

## Decision

Use the following presentation stack in `apps/web`:

- **Tailwind CSS** is the styling foundation. Use it for responsive layout,
  utilities, and the web theme built from Yard's semantic design tokens.
- **shadcn/ui** is the component source layer. Components are copied into the
  project, owned by Yard, and added only when the product needs them.
- **Base UI** is the underlying accessible primitive layer for shadcn/ui.
  Use it for complex interactions such as dialogs, popovers, menus, sheets,
  and forms while keeping visual styling in Yard's theme.
- **Phosphor Icons** is the canonical web icon library. New web UI must not add
  Lucide icons. The existing design-source Lucide references are migrated to
  Phosphor as part of the styling implementation so the design source and web
  code do not prescribe different icon libraries.
- **Motion for React** is the animation library for interactive and layout
  motion. Use it for transitions such as sheets, dialogs, list reordering, and
  gesture-driven interactions. Use CSS transitions for simple hover, focus,
  color, and opacity changes.

Implement the design source as a web theme with explicit semantic tokens for
light and dark modes, typography, font roles, spacing, radii, control sizing,
focus states, and other interaction states. The exact font delivery mechanism
is an implementation detail, but the rendered font roles must be mapped
explicitly rather than silently falling back to unrelated system fonts. Use
Inter for body and interface text, Geist for display and brand text, and
self-host only the weights the web application uses.

Default theme selection follows the user's system preference. A user may
override that preference, and the override persists across sessions.

Configure Motion to respect the user's reduced-motion preference. Avoid
animating map rendering or large layout regions without a clear interaction
benefit, and keep animation behavior independent of the backend API. Define a
small shared motion-token set for common durations, easing, and spring behavior
instead of inventing timing values in each component.

Do not add GSAP, React Spring, AutoAnimate, a CSS-in-JS system, or a separate
runtime UI kit unless a later product requirement demonstrates a specific need.

## Consequences

Yard gets a consistent, responsive, project-owned design system with accessible
interaction primitives and a clear animation policy. The web application can
adopt shadcn components incrementally without turning the entire UI into a
third-party visual system.

The team must maintain the copied shadcn components, keep design tokens aligned
with the design source, and avoid mixing icon libraries. Tailwind classes can
become noisy when used without semantic components, so product UI should still
be composed from meaningful Yard components. Motion adds client-side behavior
and must be used selectively with reduced-motion handling.

This decision affects only `apps/web`. The backend API has no dependency on
Tailwind, shadcn/ui, Base UI, Phosphor Icons, or Motion.

## References

- [Yard design-system source](../design/design.pen)
- [ADR-0014: TanStack Full-Stack Web Framework](0014-tanstack-full-stack-web-framework.md)
- [ADR-0015: Vite+ Toolchain](0015-vite-plus-toolchain.md)
- [ADR-0051: Split Web Application and Backend API in One Monorepo](0051-split-web-and-api-monorepo.md)
- [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui with TanStack Start](https://ui.shadcn.com/docs/installation/tanstack)
- [Base UI](https://base-ui.com/react/overview/quick-start)
- [Phosphor Icons for React](https://github.com/phosphor-icons/react)
- [Motion for React](https://motion.dev/docs/react)
- [Motion accessibility guidance](https://motion.dev/docs/react-accessibility)
