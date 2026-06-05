# 2026-05-18 — D3: covenant-bounded budget/cost on the WorkItem spine

**Status:** Implemented & verified (typecheck / vitest / `vite build`);
**uncommitted** on `feat/atlas-permaculture` pending explicit commit
instruction. Live-preview screenshot verification disclosed-blocked by the
known MapLibre/WebGL hang — routing verified statically instead.
**Context source:** Approved Session Execution Plan for Sub-project D3,
executing the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]). Builds on the
single-writer spine and mirrors the D1/D2 provenance seam
([[2026-05-18-atlas-d1-dependency-critical-path]],
[[2026-05-18-atlas-d2-resourcing]]). The spine carried `costUSD` (manual
point estimate) but no actual-spend ledger, no planned/actual rollup, no
budget surface on the canonical spine — only the legacy PhaseTask
`actualsStore` / `BudgetActualsCard` path. D3 is that slice.

## Decision

Four user-confirmed binding decisions:

1. **Spine actuals store + retire legacy.** Net-new `workItemBudgetStore`
   (`ogden-work-item-actuals`, projectId-tagged, no DB migration) recording
   an actual `CostRange` band + `actualHrs` per `WorkItem.id`. The legacy
   PhaseTask `actualsStore` (`ogden-act-actuals`) and `BudgetActualsCard`
   are **retired-not-deleted**: deprecation headers added, fully un-mounted
   from every Act route, files preserved for audit (no-deletion-in-revamps
   covenant).
2. **Full CostRange both sides.** Planned and actual cost are
   `CostRange {low,mid,high}`. `CostRangeSchema` promoted to a shared
   `packages/shared/src/schemas/costRange.schema.ts` (plain `z.number()` —
   **not** `.nonnegative()`: `export.schema.ts` reuses it for legitimately
   negative `netCashflow`/`cumulativeCashflow`; byte-identical promotion).
3. **New dedicated Budget Act card** (`act-budget`) — its own manifest
   entry, not an extension of `BudgetActualsCard` (which is retired).
4. **Approach-B `costRangeAuto`.** Provenance-separated `costRangeAuto?`
   beside the manual `costUSD`; `replaceGoalCompassCosts` mirrors
   `replaceGoalCompassResources` **1:1**; Goal Compass seeds a planned-cost
   baseline from the intervention catalog while steward edits survive
   regeneration. `.optional()` (not `.default([])`) ⇒ no literal-site churn.

## Scope delivered

- **Shared schema** `costRange.schema.ts` (new) — `CostRangeSchema =
  z.object({ low,mid,high : z.number() })`; `export.schema.ts` now imports
  it (`const CostRange = CostRangeSchema`); exported from `@ogden/shared`.
- **Spine schema** `workItem.schema.ts` — added
  `costRangeAuto: CostRangeSchema.optional()` beside `costUSD`. `.optional()`
  + existing `.passthrough()` ⇒ persisted rows hydrate clean, **no DB
  migration**, **no literal-site updates** (unlike D2's `.default([])`).
- **Actuals store** `apps/web/src/store/workItemBudgetStore.ts` (new) —
  Zustand+persist `ogden-work-item-actuals`, `BudgetActual { workItemId,
  projectId, actual: CostRange, actualHrs, updatedAt, notes? }`,
  `upsertActual` (keyed by projectId+workItemId, bumps `updatedAt`),
  `removeActual`, `getProjectActuals`. Steward-authored — **no
  Goal-Compass preservation contract**. Orphans-by-design (no
  cascade-delete). Registered in `syncManifest.ts` as
  `blob('ogden-work-item-actuals', …, 'projectId-tagged', 1,
  tagged('actuals'))` (coverage-guard clean).
- **Store action** `workItemStore.ts` — `replaceGoalCompassCosts(projectId,
  costsByItemId)` mirrors the `replaceGoalCompassResources` preservation
  filter **1:1**: writes `costRangeAuto` only on rows where
  `source === 'goal-compass' && !overridden`; never touches manual
  `costUSD`, overridden rows, or other sources/projects. Idempotent via
  band-equality short-circuit (incl. both-absent → same reference).
- **Cost seeding** `goalCompassSpineSync.ts` — pure
  `seedGoalCompassCosts(items, catalog = INTERVENTION_CATALOG)`: band =
  catalog `costRangeUSD` (carried as-authored, **no acreage scaling**) +
  flat `maintenanceSchedule.costUSDPerOccurrence` per component; skips
  no-intervention/unknown/no-cost. Wired after
  `replaceGoalCompassResources` in `pushGoalCompassToSpine`.
- **Pure engine** `packages/shared/src/lib/budgetVariance.ts` (new, no
  React/store) — `effectivePlanned` (manual `costUSD` → degenerate band
  **wins**, else `costRangeAuto`, else zero), `addRange`, `varianceBands`
  (actual − planned band-wise), `budgetDrift` (`actual.mid >
  planned.high`, render-only), `analyzeBudget` → `{ byItemId, byPhase
  (key '' = phase-less), total }`. Never reads/writes `WorkItem.status`.
  Exported from `@ogden/shared`.
- **Surface** `apps/web/src/features/act/BudgetCard.tsx` (new) — joins
  spine planned baseline × `workItemBudgetStore` actuals through
  `analyzeBudget`. Blocks: project total, per-phase rollup, per-work-item
  variance + render-only over-budget badge + inline low/mid/high/hrs
  actual editor, orphan actuals (audit, explicit remove). Manifest:
  `act-budget-actuals` → `act-budget` re-pointed across **all** mount
  points — `v3/act/types.ts` `MODULE_CARDS.build`,
  `ActModuleSlideUp.tsx` (lazy + `renderActCard`),
  `DashboardRouter.tsx` (lazy + case), `ActHub.tsx`,
  `navigation/taxonomy.ts`, `stage-navigator/stageModules.ts`. Zero
  remaining live `act-budget-actuals` / `BudgetActualsCard` references
  (grep-verified).

## Covenant & scope boundary

Strictly project cost/budget tracking. **Explicitly out:**
cost-of-capital, financing, advance-purchase, investor/equity, or
yield-as-return computation — those stay in Scholar-gated Sub-project C.
No riba/gharar/CSRA/salam/investor/financing framing on any D3 surface.
`InvestorSummaryExport` / financial-engine investor surfaces untouched.
Variance/drift derived at render only — never a `WorkItem.status` write
(single-writer spine). No DB migration. D4/D5 surfaces out.

## Verification

- `pnpm --filter @ogden/shared typecheck` + `--filter web typecheck`
  exit 0, **fully clean** (the 2 disclosed pre-existing
  `useFlowEndpointOptions` Paddock errors did not surface this run).
- Vitest: `@ogden/shared` **247/247 (17 files)** incl.
  `budgetVariance.test.ts` 7 (effectivePlanned manual-wins/auto/zero,
  band-wise per-phase+total rollup, varianceBands, drift under/at/over,
  no-`status`-mutation invariant, covenant no-financing-token regex);
  web **1215/1215 (112 files)** incl. `workItemBudgetStore.test.ts` 3,
  `workItemStore.costs.test.ts` 3 (preservation+idempotence hard gate),
  `seedGoalCompassCosts.test.ts` 4. **Zero failures** — the previously
  disclosed `syncManifest` debt did **not** recur (new store registered).
- `vite build` exit 0 (`✓ built in 38.90s`, PWA 720 precache entries).
  First attempt OOM'd on the default Node heap (environment, not code —
  `tsc` had already passed); succeeded with
  `NODE_OPTIONS=--max-old-space-size=8192`.
- Live preview screenshot verification **disclosed-blocked** by the known
  MapLibre/WebGL hang (per the approved plan's fallback, not faked).
  Routing integrity verified statically: grep confirms zero live
  `act-budget-actuals` references and consistent `act-budget` → `BudgetCard`
  wiring across all six mount points; web `tsc` exit 0 proves the card +
  store + engine are type-sound.

## Notes & deferred

- Live exercise of the card render + Goal-Compass
  regenerate-preserves-manual-`costUSD` flow **deferred** — proven by
  construction (byte-identical shared mappers) + the
  preservation/idempotence + seeding hard-gate unit tests. Recommended as
  the first step of a future session with a generated-plan fixture project
  and a working preview screenshot path.
- **Uncommitted** pending explicit instruction (user commits only on
  request). D0/D1 `6211caff`; D2 `63313677`.
- Continues the D-series. D4 (field proof) is its own
  brainstorm→spec→plan cycle.
