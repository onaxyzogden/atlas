# Plan · Module 5 · MaterialFlow quantity capture (dashboard data spine)

**Date:** 2026-05-22
**Stage:** Plan
**Module:** 5 — Soil Fertility & Closed-Loop
**Status:** Partially landed — Phases 1–2 committed; dashboard wiring (Phases 3–7) deferred
**Branch:** `feat/atlas-permaculture`
**Plan file:** `~/.claude/plans/i-d-like-for-this-async-quasar.md` (follow-up revision)
**Supersedes context of:** `wiki/decisions/2026-05-21-atlas-plan-module5-wastevector-dashboard-view.md` (visual shell)

## Context

The 2026-05-21 `WasteVectorDashboardView` shipped as a six-panel bento on
hardcoded sample arrays. Wiring it to live data exposed a blocker: **`MaterialFlow`
carried no quantitative fields** (only `materialKind`, source/sink ids + labels,
geometry, phase, enterprise, notes). Five of the six dashboard KPIs (organic
waste captured, compost output, NPK recovery, water reuse, energy value) and the
stream-inventory `value` had no derivable source; only loop-efficiency % was
computable (from the `ClosedLoopGraphCard` orphan/dangling validation surface).

The steward chose to **extend `MaterialFlow` first** rather than wire only the
panels that fit the current schema — knowingly the larger blast radius, because
it also touches the authoring form.

## Decision

Add six **optional** monthly-throughput fields to `MaterialFlow` and let the
waste-vector authoring form capture them, so the dashboard's quantitative panels
have a real data spine. Optionality is load-bearing: legacy flows and flows
authored without opening the new sub-section round-trip unchanged, and KPI
derivations fold over `?? 0` rather than coercing missing data to zero.

### Phase 1 — Schema (committed `0e5f3310`)

`apps/web/src/store/closedLoopStore.ts` — `MaterialFlow` gains:
`massKgPerMonth?`, `volumeLPerMonth?`, `energyKwhPerMonth?`,
`nutrientNKgPerMonth?`, `nutrientPKgPerMonth?`, `nutrientKKgPerMonth?` (all
`number | undefined`). No action-signature changes — `addMaterialFlow` /
`updateMaterialFlow` already spread the input object opaquely. The `persist`
middleware reads missing keys as `undefined`, so no migration was required
(schemaVersion stays at 2).

### Phase 2 — Form capture (committed `92e5a169`)

`apps/web/src/features/plan/WasteVectorListView.tsx` — the "Add vector" form
gains a collapsed-by-default `<details>` "Quantities (optional)" sub-section with
six numeric inputs (Mass / Volume / Energy / N / P / K). A `parsePositive()`
guard returns `undefined` for empty / NaN / zero / negative, so blank cells stay
un-persisted instead of writing `0`. Each list row gains a compact quantity meta
column. First-load UX is unchanged because the sub-section is collapsed.

## Deferred (Phases 3–7 of the plan — not started)

The dashboard itself still renders the 2026-05-21 sample arrays. Outstanding:

- **Phase 3** — KPI strip: `useMemo`-derived 6-chip array from project-scoped
  `materialFlows` (5 quantitative sums + loop-efficiency %); em-dash empty
  state; drop the decorative `delta`/`trend` fields (no time-series source).
- **Phase 4** — flow map (materialFlows ↔ fertilityInfra adjacency, two-column
  fallback when no processors), stream inventory, processing methods.
- **Phase 5** — risks (adapt `ClosedLoopGraphCard` validation) + a static
  `RISK_TO_INTERVENTION` map for the interventions panel.
- **Phase 6** — visual verification (preview blocked behind `/login` while local
  `@ogden/api` is down) + lint + build.
- **Phase 7** — this ADR + log (now done for Phases 1–2).
- Scenarios row stays on sample data with a `(sample)` tag — `scenarioStore` has
  no closed-loop snapshot; deferred to its own plan.

## Selector-stability discipline (2026-04-26)

The deferred dashboard wiring must subscribe to the raw `materialFlows` /
`fertilityInfra` slices and derive project-filtered views with `useMemo` keyed
on `(allSlice, project.id)` — mirroring `WasteVectorListView` and
`ClosedLoopGraphCard`. Inlining `.filter()` in the Zustand selector breaks
`Object.is` and render-loops.

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — EXIT 0 against the two touched files;
  the three reported errors are all pre-existing and out of scope
  (`StepBoundary.tsx:365`, two `HostUnion*` test files).
- Phase 2 commit reports `pnpm vitest run src/features/plan` 29 passed.
- Branch state at session close: local `feat/atlas-permaculture` == origin
  (0 ahead / 0 behind). Both commits survived an out-of-band rebase that
  rewrote their hashes (Phase 1 `cf26d963`→`0e5f3310`, Phase 2 committed by the
  external sync as `92e5a169`); content preserved and pushed.

## Note on the out-of-band rebase

Per `[[feedback-commit-immediately-on-rebased-branches]]`, work on this branch
is committed slice-by-slice. This session's mid-flight rebase rewrote my commit
hashes and even re-committed my uncommitted Phase 2 working-tree edits under an
externally-authored message — but unlike the 2026-05-21 habitat-feature episode,
no commits were *dropped*. The branch now carries the work and is in sync with
origin.
