# ADR: Multi-device project-bundle escape hatch + the partial-sync boundary

**Date:** 2026-05-16
**Status:** accepted

## Context

Pre-live-testing hardening (external, multi-device testers) surfaced a P0:
**partial-sync silent data loss across devices.**

`apps/web/src/lib/syncService.ts` is fully implemented and auth-wired
(`main.tsx` starts it on auth, stops it on logout; it calls real
`api.projects.*` / `api.designFeatures.*` endpoints — the earlier
"orphaned / no backend" agent claim was a verified error). The real gap is
**coverage**, not wiring: it round-trips only four slices —

- `projectStore` (projects)
- `zoneStore` (zones)
- `builtEnvironmentStoreV2` (structures)
- queued comments

The **entire rest of the v3 design surface is localStorage-only even when
authenticated**: design elements (`landDesign`), vegetation
(`vegetationStore`), every Observe annotation namespace
(hazards/sectors/ecology/pasture/conventional-crop/SWOT), project metadata
(`designStatus`, `designHorizonYears`, zone thresholds),
`regenerationPlanStore`, succession/temporal state — and ~70 persisted
`ogden-` stores in total. A tester does work on device A, opens device B
(authenticated) → project shell + zones + structures present, **everything
else gone, no warning**. There was no full-project export/import to use as a
manual escape hatch (`features/export/*` are report/PDF generators only).

Extending `syncService` to all ~70 stores is the correct long-term fix but is
far too large to gate the testing window on, and would itself risk the
"misses a slice → silent partial restore" failure if hand-enumerated.

## Decision

Ship a **bounded, dependency-free project-bundle escape hatch** and **warn the
steward before they rely on browser storage** — do *not* extend `syncService`
this pass (deferred to backlog as the real long-term fix).

- **`apps/web/src/lib/projectBundle.ts`** — snapshots the *entire* `ogden-`
  localStorage persistence namespace as opaque raw strings (each store's own
  zustand persist envelope `{state,version}`). Prefix-capture is **inherently
  complete** — it cannot miss a store because it does not enumerate stores at
  all. A tight 4-key denylist keeps non-portable keys out:
  `ogden-auth-token` (a bearer token must never travel),
  `ogden-atlas-matrix-toggles` (global view pref, not project data),
  `ogden-connectivity` (device state), `ogden-atlas-bundle-exported` (the
  data-safety banner flag is device-local). The denylist is deliberately
  tight: wrongly excluding a real store = silent partial restore (high
  impact); a stray cache key riding along = harmless (low impact).
- **Restore = overwrite + reload.** `applyBundle` removes all current portable
  keys first (exact restore — no stale slice from the importing device leaks
  in), writes the bundle's entries, never touches non-portable keys; the UI
  then reloads so every zustand persist store re-hydrates and runs its own
  `migrate`. `parseBundle` defensively filters to portable string entries only
  so a hand-edited bundle cannot smuggle in the auth token.
- **`ProjectBundleBar`** (`apps/web/src/v3/components/ProjectBundleBar.tsx`),
  mounted in `V3ProjectLayout` so it rides every v3 project route. It is *both*
  the export/import entry point *and* the data-safety banner: a prominent
  "your design lives in this browser" warning until a bundle has ever been
  exported (`hasExportedBundle()`), collapsing to a quiet line afterward while
  Export/Import stay reachable. Import shows an explicit "replace **all**
  projects and design data, cannot be undone, page will reload" confirm step
  (a bundle is opaque raw strings — a per-field diff is impossible, unlike the
  site-intel template importer).
- **No new npm deps** (consistent with local-first + the project's no-new-deps
  rule). Download reuses the established `triggerDownload` idiom.

## Consequences

- A multi-device tester can move/restore a *full* project (all ~70 stores)
  via one JSON file, and is warned before relying on browser storage.
- The *covered* slice (projects/zones/structures/comments) still genuinely
  survives the authenticated `syncService` round-trip — the bundle is the
  escape hatch for the **uncovered** majority, not a replacement for sync.
- Round-trip safety is pinned by `lib/__tests__/projectBundle.test.ts`
  (export → wipe → import = deep-equal; auth token never travels nor is
  clobbered; stale portable keys removed; bad JSON/schema/version rejected).
- **The partial-sync boundary is now explicit** (see updated
  `concepts/local-first-architecture.md`): the stale "backend exists but
  stores are not yet synced" claim was wrong — four slices *are* synced; the
  honest statement is "four slices sync, the rest is localStorage-only; the
  bundle is the multi-device path until full sync lands."
- **Deferred (backlog):** extend `syncService` to the full v3 store set — the
  real long-term fix. Bundle versioning is v1; a future schema bump must keep
  `parseBundle` rejecting `version > BUNDLE_VERSION`.
- Bundle is device-wide (all projects in the namespace), not per-project —
  correct for a "move my whole workspace to another device" escape hatch.
