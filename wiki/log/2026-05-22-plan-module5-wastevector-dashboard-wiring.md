# 2026-05-22 — Plan · Module 5 · WasteVector dashboard wiring (Phases A–F)

**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/i-d-like-for-this-async-quasar.md` (follow-up revision)
**ADR:** `wiki/decisions/2026-05-22-atlas-plan-module5-wastevector-dashboard-wiring.md`
**Commit:** `ccd30abf`

## What landed

The consumption side of the data spine. `WasteVectorDashboardView` previously
rendered ten inline sample arrays and never received `project`. It now scopes to
live data and derives five of its six panels from the project's `materialFlows` +
`fertilityInfra`. The scenarios row stays sample-backed, explicitly `(sample)`-tagged.

- **Phase A** — `WasteVectorTool` passes `project`; the dashboard subscribes to the
  raw `materialFlows` / `fertilityInfra` slices and derives project-scoped arrays
  via `useMemo` keyed on `(slice, project.id)` (selector-stability, 2026-04-26).
  Pure helpers added: `sum`, `efficiency`, `fmt`, `resolveEndpoint`, `streamUnit`.
- **Phase B** — KPI strip = 6 store-derived chips (organic waste, compost output,
  NPK recovery **kg/mo absolute**, water reuse, energy value, loop efficiency %);
  delta/trend dropped (no time-series); em-dash until a field carries data. Stream
  inventory = one row per material kind present, cap 6 + "+N more" overflow.
- **Phase C** — SVG flow map = `useMemo` adjacency keyed `(flows, projectInfra,
  endpointOptions)` so Bézier positions stay reference-stable; 3-column when
  fertility infra exists (processor column pre-seeded from infra), 2-column
  fallback otherwise; 8-node/col cap, label-sorted, edge colour by material kind;
  loop-efficiency badge. Processing methods = one row per fertility infra type.
- **Phase D** — extracted **`useClosedLoopValidation.ts`** (the locked "full
  parity" choice): node-assembly + inDeg/outDeg + orphan/dangling/isolated
  validation lifted verbatim from `ClosedLoopGraphCard` (incl. the
  `usePhaseStoreCappedEntities` Yeomans capping). The card now consumes the hook
  (diff is exactly the swap); the dashboard's risks + interventions panels consume
  the same hook → the two surfaces can never disagree on counts. Severity→pill:
  dangling-water high, orphan / no-feedstock / dangling-other medium, isolated low;
  static `RISK_TO_INTERVENTION` map; cap 4; shared empty-state copy.
- **Phase E** — scenarios row keeps its `SCENARIOS` array with an explicit
  `(sample)` hint. The nine other sample arrays were inline placeholders (not
  reusable stage components) and were removed in-scope.

## Files

- `apps/web/src/features/plan/WasteVectorTool.tsx` (modified — pass `project`)
- `apps/web/src/features/plan/WasteVectorDashboardView.tsx` (modified — Phases A–E)
- `apps/web/src/features/plan/useClosedLoopValidation.ts` (new — shared hook)
- `apps/web/src/v3/plan/cards/soil-fertility/ClosedLoopGraphCard.tsx` (modified — consume hook)

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — clean against the four touched files; only
  the three known pre-existing/out-of-scope errors remain (`StepBoundary.tsx:365`,
  `HostUnionContextMenu.test.tsx:58`, `HostUnionDrilldownCard.test.tsx:25`).
- `pnpm vitest run src/features/plan` — 29 passed (unchanged baseline).
- `vite build` — green (~31s).
- Parity check — confirmed by reading the `ClosedLoopGraphCard` diff: pure hook swap.
- Live preview not attempted — still behind `/login` with local `@ogden/api` down.

## Branch note

Per `[[feedback-commit-immediately-on-rebased-branches]]`, committed the verified
slice immediately (`ccd30abf`), staging only the four owned files by explicit
path. `git fetch` + divergence check before commit: local == origin (0/0).
Foreign WIP in the working tree (`capitalPartner*`, `EconomicsPanel*`,
`ZoneSomSidebar*`, `UtilityPointTool*`, several `v3/plan` files) left unstaged.
