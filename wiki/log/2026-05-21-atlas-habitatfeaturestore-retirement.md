# 2026-05-21 — Legacy `habitatFeatureStore` full retirement

Closes the soft-deprecation deferral recorded in the
[2026-05-21 habitat-features unification ADR](../decisions/2026-05-21-atlas-habitat-features-unification.md).
Its own ADR:
[[decisions/2026-05-21-atlas-habitatfeaturestore-retirement]].

## What landed (commit `c25d667d`)

- **Deleted** `apps/web/src/store/habitatFeatureStore.ts` — the
  geometry-less Zustand tally store (123 lines; `persist` name
  `ogden-habitat-features` + zundo `temporal`).
- **Deleted** `apps/web/src/features/plan/habitatAllocation/FeatureInventoryPanel.tsx`
  — the store's last live consumer (the A2 add/remove tally form).
- `apps/web/src/features/plan/HabitatAllocationCard.tsx` — removed the
  panel import + the `<section>` that mounted it (and the now-unused
  `apiProjectId`); tidied the hero lede + docstring that referenced the
  inventory. The "Land set aside" gauge is untouched.
- `apps/web/src/store/undoCoordinatorStore.ts` — removed the import, the
  `'habitatFeature'` `UndoableStoreName` union member, and the `STORES`
  map entry (added back in `a2a7c8b1`).
- `apps/web/src/lib/syncManifest.ts` — removed the import + the
  `blob('ogden-habitat-features', …)` cross-device sync registration.
- `apps/web/src/features/biodiversity/habitatCommitments.ts` — docstring
  only: dropped the stale `FeatureInventoryPanel` "Used by" reference. No
  logic change — the selectors already read only `DesignElement`s.

## Why

The unification promoted habitat features into first-class `DesignElement`
`'habitat'` kinds. The legacy store was kept as a soft-deprecated read path
"until branch stability returns." It is now redundant: A3
`BiodiversityMonitorCard` already surfaces placed-commitment counts from
`DesignElement`s via `selectPlacedHabitatCommitments`. Keeping a parallel
geometry-less store is a second source of truth with no consumer worth
preserving.

## No migration (covenant)

The legacy records carry **no geometry**. Faithfully auto-placing them on
the map would require inventing locations the steward never made, which the
stewardship-sovereignty covenant forbids. Per steward decision all current
projects are throwaway test data, so the persisted
`localStorage['ogden-habitat-features']` key is simply discarded. Once the
store + sync entry are gone the key is inert (no `rehydrate()`, no sync); no
permanent cleanup shim is added (one-shot throwaway code is an anti-pattern)
— clear it manually in devtools if desired.

## Surviving surface (not dead code)

- `selectPlacedHabitatCommitments` / `selectHabitatCommitments` in
  `habitatCommitments.ts` — still consumed by `BiodiversityMonitorCard` +
  the colocated `habitatCommitments.test.ts`.
- The economics `habitatFeature: ProgramSubtotal` field (cashflow rollup)
  — same name, unrelated concept; untouched.

## Verification

- **Typecheck** (`tsc --noEmit`, 8 GB heap) — only the pre-existing foreign
  errors remain (`StepBoundary.tsx`, `SelectionFloater.test.tsx`,
  `HostUnion*.test.tsx`); no dangling `habitatFeatureStore` import.
- **Tests** (`vitest run src/features/biodiversity src/features/plan`) —
  143/143 across 11 files.
- **Dead-import grep** across `apps/web/src` — only two comment-only
  historical references remain (`elementCatalog.ts`, `habitatCommitments.ts`
  docstring), no live code.
- **`vite build`** (8 GB heap) — succeeds; bundler resolved all chunks. (The
  full `npm run build` is gated by pre-existing foreign `tsc` errors and
  OOM'd on default heap, so `vite build` was run directly for the
  stray-import signal.)
- **Covenant grep** across changed files — zero hits.

## Rebase-storm note

A concurrent session's commit `f568fb42` swept the pre-staged deletions in
and `6fb588fb` reverted them mid-flight (both habitat files restored). The
deletions were re-established and committed with explicit paths the moment
verification passed, per `feedback_commit_immediately_on_rebased_branches`.
