# 2026-05-22 — Plan · Module 5 · MaterialFlow quantity capture (dashboard data spine, Phases 1–2)

**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/i-d-like-for-this-async-quasar.md` (follow-up revision)
**ADR:** `wiki/decisions/2026-05-22-atlas-plan-module5-wastevector-quantity-capture.md`

## What landed

Began wiring the `WasteVectorDashboardView` (2026-05-21 visual shell) to live
data. Exploration surfaced a blocker — `MaterialFlow` had no quantitative fields
— so per steward direction the schema was extended *first*, before any dashboard
binding.

- **Phase 1 (`0e5f3310`)** — `MaterialFlow` gains six optional monthly-throughput
  fields: `massKgPerMonth`, `volumeLPerMonth`, `energyKwhPerMonth`,
  `nutrientNKgPerMonth`, `nutrientPKgPerMonth`, `nutrientKKgPerMonth`. All
  optional; no migration (persist reads missing keys as `undefined`); no action
  signature changes.
- **Phase 2 (`92e5a169`)** — `WasteVectorListView` "Add vector" form gains a
  collapsed "Quantities (optional)" sub-section (Mass / Volume / Energy / N / P /
  K). `parsePositive()` keeps blanks un-persisted; list rows show a compact
  quantity meta column. First-load UX unchanged.

## Files

- `apps/web/src/store/closedLoopStore.ts` (modified — schema)
- `apps/web/src/features/plan/WasteVectorListView.tsx` (modified — form + list)
- `wiki/decisions/2026-05-22-atlas-plan-module5-wastevector-quantity-capture.md` (new)
- `wiki/log/2026-05-22-plan-module5-wastevector-quantity-capture.md` (new)

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — EXIT 0 for the touched files; the three
  reported errors are pre-existing/out-of-scope (`StepBoundary.tsx:365`, two
  `HostUnion*` test files).
- Phase 2 commit reports `pnpm vitest run src/features/plan` 29 passed.
- Live preview verification not attempted — dashboard still renders sample data
  (wiring deferred) and the preview is behind `/login` (local `@ogden/api` down).

## Deferred (Phases 3–7 of the plan)

Dashboard panels (KPI strip, flow map, stream inventory, processing methods,
risks, interventions) still render the 2026-05-21 sample arrays. Next session:
derive the KPI strip + stream inventory from project-scoped `materialFlows`
(`useMemo`, selector-stability per 2026-04-26), then the SVG flow map
(materialFlows ↔ fertilityInfra adjacency), then risks/interventions from the
`ClosedLoopGraphCard` validation surface. Scenarios row stays sample-tagged.

## Branch / rebase note

A mid-session out-of-band rebase rewrote both commits' hashes (Phase 1
`cf26d963`→`0e5f3310`) and re-committed the uncommitted Phase 2 edits under an
externally-authored message (`92e5a169`). Unlike the 2026-05-21 habitat episode,
**no commits were dropped** — content preserved. Local now == `origin/feat/atlas-permaculture`
(0 ahead / 0 behind).
