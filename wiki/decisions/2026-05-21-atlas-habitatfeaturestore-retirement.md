# ADR — Atlas: Full Retirement of the Legacy `habitatFeatureStore`

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Sub-project:** A2 habitat-feature path — legacy-store cleanup
**Status:** Accepted — shipped in commit `c25d667d` (code retirement) and
this ADR.
**Related:** [[2026-05-21-atlas-habitat-features-unification]],
[[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]],
[[2026-05-19-atlas-b5-beneficial-organism-habitat]]

---

## Context

The 2026-05-21 habitat-features unification
([[2026-05-21-atlas-habitat-features-unification]]) promoted the legacy
habitat types into first-class `DesignElement` kinds under a `'habitat'`
`DesignCategory`. The old Zustand `habitatFeatureStore` held geometry-less
tallies ("3 owl boxes", "100 m hedgerow") and was left in place as a
**soft-deprecated read path**, with that ADR's scope table and consequences
recording:

> *"Full retirement of the legacy store is a separate ADR once branch
> stability returns."*

The unification is now complete and verified through Slice 8-F. This ADR
closes that deferral: it deletes the legacy store and its last live consumer
so the codebase has a **single source of truth** for habitat features — the
unified `DesignElement` path. This is a deletion / cleanup change, not a
feature.

A note on a stale claim: the unification ADR's Slice 4 described a selector
that "projects across both the legacy `habitatFeatureStore` and the unified
design-elements." In practice that dual-read was never wired —
`habitatCommitments.ts` reads **only** `DesignElement`s. So removing the
legacy store removes a dead read path, not a live one.

## Decision

Delete `habitatFeatureStore` and `FeatureInventoryPanel` outright, and
unregister the store from the undo-coordinator and sync-manifest. No
migration of the legacy persisted data is performed.

## Posture

- **Additive-where-it-matters; covenant-grounded.** Stewardship
  sovereignty is preserved: the steward places features deliberately; the
  system never auto-infers geometry. The legacy store's records carry **no
  geometry** — faithfully auto-placing them on the map would require
  inventing locations the steward never made, which the covenant forbids.
  Therefore **no migration**.
- **No financial framing.** No riba / gharar / CSRA / salam / investor /
  financing / cost-of-capital plumbing touched. This change only deletes.

## Scope decisions

| Decision | Choice |
|---|---|
| Legacy `habitatFeatureStore` retired | **Yes — file deleted** |
| Migrate legacy persisted records into `DesignElement`s | **No** — records are geometry-less; placing them would invent steward locations (covenant). Per steward decision the data is throwaway test data |
| `FeatureInventoryPanel` (A2) | **Removed entirely** — A3 `BiodiversityMonitorCard` already surfaces placed-commitment counts from `DesignElement`s; the panel was redundant, not a capability |
| Orphaned `localStorage['ogden-habitat-features']` key | **Left inert** — once the store + sync entry are gone there is no `rehydrate()` and no sync; the key is dead weight. No permanent cleanup shim is added (one-shot throwaway code is an anti-pattern); clear manually in devtools if desired |
| `selectPlacedHabitatCommitments` / `selectHabitatCommitments` | **Kept** — still consumed by A3 `BiodiversityMonitorCard` + the colocated `habitatCommitments.test.ts` |
| Economics `habitatFeature: ProgramSubtotal` field | **Untouched** — same name, different concept (the stewardship-programs cashflow rollup's per-program subtotal); unrelated to the legacy store |

## Files

**Code retirement (commit `c25d667d`):**
- `apps/web/src/store/habitatFeatureStore.ts` — **deleted** (whole file)
- `apps/web/src/features/plan/habitatAllocation/FeatureInventoryPanel.tsx`
  — **deleted** (whole file)
- `apps/web/src/features/plan/HabitatAllocationCard.tsx` — removed the panel
  import + the `<section>` that mounted it (and the now-unused
  `apiProjectId`); tidied the hero lede + docstring that referenced the
  inventory
- `apps/web/src/store/undoCoordinatorStore.ts` — removed the import, the
  `'habitatFeature'` `UndoableStoreName` union member, and the `STORES`
  map entry
- `apps/web/src/lib/syncManifest.ts` — removed the import + the
  `blob('ogden-habitat-features', …)` registration
- `apps/web/src/features/biodiversity/habitatCommitments.ts` — docstring
  only: dropped the stale `FeatureInventoryPanel` "Used by" reference (no
  logic change — already reads only `DesignElement`s)

## Verification

1. **Typecheck:** `cd apps/web && tsc --noEmit` (8 GB heap) — only the
   pre-existing foreign errors remain (`StepBoundary.tsx`,
   `SelectionFloater.test.tsx`, `HostUnion*.test.tsx`); no new errors and
   specifically no "cannot find module `habitatFeatureStore`" dangling
   import.
2. **Tests green:** `vitest run src/features/biodiversity src/features/plan`
   — 143/143 across 11 files; the surviving `habitatCommitments.test.ts`
   (10) + biodiversity monitor unaffected.
3. **Dead-import sweep:** grep `habitatFeatureStore` /
   `useHabitatFeatureStore` / `FeatureInventoryPanel` / `'habitatFeature'`
   / `ogden-habitat-features` across `apps/web/src` → only two comment-only
   historical references remain (`elementCatalog.ts`, `habitatCommitments.ts`
   docstring), no live code.
4. **Build:** `vite build` (8 GB heap) — succeeds; the bundler resolved all
   module chunks, confirming no stray import survived. (The full
   `npm run build` script is gated by the pre-existing foreign `tsc` errors
   and additionally OOM'd on default heap, so `vite build` was run directly
   for the stray-import signal.)
5. **Covenant grep** across changed files — zero hits for
   `riba|gharar|csra|salam|investor|financing|cost-of-capital`.

## Consequences

- **Single source of truth for habitat features.** Every habitat commitment
  is now a placed `DesignElement`; there is no parallel geometry-less store.
- **A2 loses its standalone feature-inventory panel.** The
  `HabitatAllocationCard` keeps its "Land set aside" gauge; placed-commitment
  counts are read in A3 `BiodiversityMonitorCard` via
  `selectPlacedHabitatCommitments`.
- **Legacy persisted data is discarded.** Per steward decision all current
  projects are test data; the `localStorage['ogden-habitat-features']` key is
  inert and unread after this change. No export, no migration.
- **Closes the unification ADR's deferral.** The
  [[2026-05-21-atlas-habitat-features-unification]] scope row and
  soft-deprecation consequence bullet are struck through and point here.
- **Rebase-storm discipline held.** A concurrent session's commit
  `f568fb42` swept the staged deletions in and `6fb588fb` reverted them
  mid-flight; the deletions were re-established and committed with explicit
  paths the moment verification passed, per
  `~/.claude/memory/feedback_commit_immediately_on_rebased_branches.md`.
