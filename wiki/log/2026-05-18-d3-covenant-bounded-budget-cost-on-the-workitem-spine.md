# 2026-05-18 — D3: covenant-bounded budget/cost on the WorkItem spine


**Branch.** `feat/atlas-permaculture`. **Uncommitted** (user commits only
on explicit request).

Executed the approved Sub-project D3 plan (P1–P7) — the covenant-bounded
budget/cost layer on the single-writer WorkItem spine. ADR:
[[decisions/2026-05-18-atlas-d3-budget-cost]].

- **P1** — promoted `CostRangeSchema` to shared
  `costRange.schema.ts` (plain `z.number()`, byte-identical — preserves
  negative cashflow bands in `export.schema.ts`); added
  `costRangeAuto: CostRangeSchema.optional()` to the WorkItem spine
  (Approach-B, `.optional()` ⇒ no migration, no literal-site churn);
  exported from `@ogden/shared`.
- **P2** — net-new `workItemBudgetStore` (`ogden-work-item-actuals`,
  projectId-tagged, steward-authored, orphans-by-design); registered in
  `syncManifest` (coverage-guard clean); store test 3/3.
- **P3** — `replaceGoalCompassCosts` mirroring the D2 resource
  preservation filter 1:1 (idempotent, band-equality short-circuit);
  preservation+idempotence test 3/3.
- **P4** — pure `seedGoalCompassCosts` (catalog `costRangeUSD` + flat
  `costUSDPerOccurrence`, no acreage scaling); wired into
  `pushGoalCompassToSpine`; seeding test 4/4.
- **P5** — pure `budgetVariance` engine (`effectivePlanned` manual-wins,
  `analyzeBudget` byItemId/byPhase/total, render-only `budgetDrift`,
  never touches `WorkItem.status`); 7/7 incl. no-status + covenant
  no-financing invariants; exported from `@ogden/shared`.
- **P6** — new `BudgetCard.tsx` (project total / per-phase rollup /
  per-item variance + drift badge + inline low/mid/high/hrs editor /
  orphan actuals); `act-budget-actuals` → `act-budget` re-pointed across
  all six mount points (types/ActModuleSlideUp/DashboardRouter/ActHub/
  taxonomy/stageModules); legacy `BudgetActualsCard` + `actualsStore`
  deprecation-headered, un-mounted, preserved (no-deletion covenant).
- **P7** — shared+web `tsc` exit 0 (fully clean); `@ogden/shared`
  **247/247**, web **1215/1215**, zero failures (syncManifest debt did
  not recur); `vite build` ok (8 GB heap, env not code). Live screenshot
  verification disclosed-blocked by the MapLibre/WebGL hang — routing
  verified statically (grep: zero live legacy refs; consistent
  `act-budget` wiring).
