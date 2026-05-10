# 2026-05-10 — `apps/atlas-ui` archived out of the workspace

## Status

Accepted.

## Context

`apps/atlas-ui` was lifted from the OGDEN prototype on 2026-05-03
(see [2026-05-03-atlas-ui-lift.md]) and pulled in MILOS UI primitives on
2026-05-04 (see [2026-05-04-milos-primitives-into-atlas-ui.md]). It is a
React 19 + Vite 7 workspace with its own `package.json` and 11 OBSERVE
pages wired through a typed `builtin-sample.js`.

The 2026-05-09 pre-test friction audit
([2026-05-09-atlas-pre-test-audit.md]) flagged it as a P1 — a *stranded
prototype*:

- It was a workspace member, so `pnpm dev` from the repo root spawned
  it alongside `apps/web`.
- Its `test` / `typecheck` / `lint` scripts were stubs ("not configured
  yet").
- No documented integration story — when did atlas-ui get promoted,
  deprecated, or absorbed?

Active v3 work lives in `apps/web/src/v3/` (Observe → Plan → Act
lifecycle, ~30 modules across the three stages, fully typed against
`@ogden/shared`). Atlas-ui's OBSERVE pages duplicate that surface.

## Decision

**Archive, not promote/merge.** Remove `apps/atlas-ui` from the pnpm
workspace; keep the folder in-repo for reference.

Concretely:

1. `pnpm-workspace.yaml` switched from glob `apps/*` to an explicit list
   (`apps/api`, `apps/web`) so atlas-ui is no longer linked.
2. `apps/atlas-ui/ARCHIVED.md` added at the folder root explaining the
   status and how to resurrect.
3. `pnpm dev` from the repo root no longer spawns atlas-ui.

## Consequences

**Pros.**

- One fewer dev server competing for ports / file watchers.
- No more accidental work sinking into atlas-ui — every PR-time
  contributor is now visibly directed to `apps/web/src/v3/`.
- The stub `lint` / `typecheck` / `test` scripts no longer falsely
  appear in `turbo run …` output as "passing" no-ops.

**Cons.**

- Atlas-ui still has a `workspace:*` dependency on `@ogden/shared`. If a
  future contributor runs `pnpm install` *inside* `apps/atlas-ui/`,
  the link will fail until the folder is re-added to the workspace.
  This is exactly the friction we want — it forces an explicit decision
  rather than silent re-activation.

**Resurrection path.** Add `apps/atlas-ui` back to
`pnpm-workspace.yaml` and run `pnpm install` from the repo root.

## References

- [2026-05-03-atlas-ui-lift.md] — original lift from OGDEN prototype
- [2026-05-04-milos-primitives-into-atlas-ui.md] — MILOS UI absorption
- [2026-05-09-atlas-pre-test-audit.md] — friction audit (P1 finding)
- [/apps/atlas-ui/ARCHIVED.md] — folder-level marker
