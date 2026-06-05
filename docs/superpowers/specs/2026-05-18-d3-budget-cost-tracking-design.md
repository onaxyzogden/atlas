# D3 — Budget & Cost Tracking Design (retroactive, as-built + hardening)

**Date:** 2026-05-18
**Sub-project:** D3 (Budget & cost tracking), 3rd slice of Sub-project D
per the ratified D0–D5 roadmap
([[2026-05-18-atlas-land-os-positioning-and-d-roadmap]]).
**Status:** design approved; spec for retroactive formalization of an
implementation that already exists, complete and verified, in the
working tree (mirrors the D2 retroactive-spec path).

## Goal

Covenant-bounded project budget/cost tracking on the canonical WorkItem
spine: a planned-cost baseline (Goal-Compass-seeded, steward-overridable)
versus a steward-authored actual-spend ledger, rolled up per work item,
per phase, and per project, with render-only over-budget/drift badges.
Success = a steward can track an Apricot-Lane-complexity build's
budget-vs-actual without an external tool, with zero new persistence
migrations and zero covenant drift, while the legacy PhaseTask budget
path is retired-not-deleted.

## Covenant boundary (non-negotiable)

Strictly **project cost/budget tracking and operating analytics only**.
Quoted verbatim from the roadmap ADR: "D3/D5 are project cost/budget
tracking and operating analytics only; capital formation, financing,
advance-purchase, investor/equity, and yield-as-return framing stay in
Sub-project C under Scholar Council. No riba/gharar framing in any D
surface."

Explicitly out of D3: cost-of-capital, financing, advance-purchase,
investor/equity, yield-as-return, CSRA (struck 2026-05-04 on *bayʿ mā
laysa ʿindak* grounds), salam. Any drift toward financing/capital is
rejected back to Scholar-gated Sub-project C — never patched into a D
surface. `InvestorSummaryExport` / financial-engine investor surfaces
are untouched. The word "cost"/"budget"/"actual" as *operating
analytics* is in scope; capital/financing *framing* is the boundary.
This boundary is asserted by a test: `budgetVariance.test.ts` pins a
no-financing-token negative regex
(`/interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i`)
over `JSON.stringify(analyzeBudget(...))`. Variance/drift is derived at
render only — **never** written to `WorkItem.status` (single-writer
spine, consistent with D0.1/D1/D2).

## Architecture

Mirrors the D0/D1/D2 spine discipline exactly. Provenance-separated
`*Auto` beside manual; effective = manual-wins-then-auto.

### 1. Schema — `packages/shared`

- `schemas/costRange.schema.ts` (new). `CostRangeSchema = z.object({
  low, mid, high : z.number() })` — plain `z.number()`, **not**
  `.nonnegative()`: `export.schema.ts` reuses it for legitimately
  negative `netCashflow`/`cumulativeCashflow` (byte-identical
  promotion). Exported from `@ogden/shared`.
- `schemas/workItem.schema.ts` (modified). Adds `costRangeAuto:
  CostRangeSchema.optional()` beside the existing manual `costUSD`.
  `.optional()` (not `.default([])`) + the existing top-level
  `.passthrough()` ⇒ persisted rows hydrate clean with **no DB
  migration** and **no literal-site churn** (A-series additive
  covenant; lighter than D2's `.default([])`).
- `schemas/export.schema.ts` (modified). Now imports the promoted
  schema (`const CostRange = CostRangeSchema`) — no behavioural change.
- `index.ts` (modified). Exports `./schemas/costRange.schema.js` and
  `./lib/budgetVariance.js`.

### 2. Pure engine — `packages/shared/src/lib/budgetVariance.ts` (new)

No React, no store imports. `effectivePlanned` (manual `costUSD` →
degenerate band **wins**, else `costRangeAuto`, else zero band),
`addRange`, `varianceBands` (actual − planned band-wise), `budgetDrift`
(`actual.mid > planned.high`, render-only), `analyzeBudget(items,
actualsByItemId)` → `{ byItemId, byPhase (key '' = phase-less), total }`
returning `BudgetCell { planned, actual, variance: CostRange;
actualHrs; drift }`. Defensive zero-band; never reads/writes
`WorkItem.status`.

### 3. Actuals store — `apps/web/src/store/workItemBudgetStore.ts` (new)

Zustand+persist `ogden-work-item-actuals` (version 1, projectId-tagged,
no migrate). `BudgetActual { workItemId, projectId, actual: CostRange,
actualHrs, updatedAt, notes? }`; `upsertActual` (keyed
projectId+workItemId, bumps `updatedAt`), `removeActual`,
`getProjectActuals`. **Steward-authored — no Goal-Compass preservation
contract** (distinct from the spine-seed path). Orphans-by-design (no
cascade-delete). Registered in `syncManifest.ts` as
`blob('ogden-work-item-actuals', useWorkItemBudgetStore,
'projectId-tagged', 1, tagged('actuals'))`.

### 4. Spine-seed trilogy completion

- `workItemStore.ts` — `replaceGoalCompassCosts(projectId,
  costsByItemId)` mirrors `replaceGoalCompassResources` **1:1**: writes
  `costRangeAuto` only on rows where `source === 'goal-compass' &&
  !overridden`; never touches manual `costUSD`, overridden rows, or
  other sources/projects. Idempotent via band-equality short-circuit
  (incl. both-absent → same reference).
- `goalCompassSpineSync.ts` — pure `seedGoalCompassCosts(items, catalog
  = INTERVENTION_CATALOG)`: band = catalog `costRangeUSD` (as-authored,
  **no acreage scaling**) + flat
  `maintenanceSchedule.costUSDPerOccurrence`; skips
  no-intervention/unknown/no-cost. Wired after
  `replaceGoalCompassResources` in `pushGoalCompassToSpine`. Completes
  the D1-deps / D2-resources / D3-costs trilogy.

### 5. Surface — `apps/web/src/features/act/BudgetCard.tsx` (new)

Joins the spine planned baseline × `workItemBudgetStore` actuals through
`analyzeBudget`. Four blocks: project total band; per-phase rollup;
per-work-item variance + render-only over-budget badge + inline
low/mid/high/hrs actual editor; orphan actuals (audit, explicit
remove). New dedicated `act-budget` manifest entry — **not** an
extension of the retired `BudgetActualsCard`.

### 6. Retire-not-delete legacy

`actualsStore.ts` (`ogden-act-actuals`) and `BudgetActualsCard.tsx`
carry `@deprecated RETIRED by Sub-project D3` headers, are fully
un-mounted from every Act route (`act-budget-actuals` → `act-budget`
re-pointed across `v3/act/types.ts`, `ActModuleSlideUp.tsx`,
`DashboardRouter.tsx`, `ActHub.tsx`, `navigation/taxonomy.ts`,
`stage-navigator/stageModules.ts`), and preserved for audit
(no-deletion-in-revamps covenant). Zero remaining live
`act-budget-actuals` / `BudgetActualsCard` references (grep-verified).

## Targeted hardening (test list, as-built)

The as-built suites already pin the high-value boundaries — verified
green this session, no gap requiring net-new pins:

1. `budgetVariance.test.ts` (7) — `effectivePlanned`
   manual-wins/auto/zero; band-wise per-phase + total rollup;
   `varianceBands`; `budgetDrift` under/at/over boundary; no-`status`-
   mutation invariant; **covenant no-financing-token regex**.
2. `workItemStore.costs.test.ts` (3) — preservation-contract gate +
   idempotence hard gate (no `costUSD`/overridden/cross-project write).
3. `workItemBudgetStore.test.ts` (3) — upsert keyed by
   projectId+workItemId, remove, per-project isolation.
4. `seedGoalCompassCosts.test.ts` (4) — catalog band + maintenance
   flat add; skip no-cost/unknown; no acreage scaling.

## Verification

- `packages/shared` tsc exit 0, clean.
- `apps/web` whole-project tsc with
  `$env:NODE_OPTIONS='--max-old-space-size=8192'` — green = no NEW
  error vs pre-D3 baseline (pre-existing out-of-band debt is not a D3
  regression).
- Four suites green: `budgetVariance` (7), `workItemBudgetStore` (3),
  `workItemStore.costs` (3), `seedGoalCompassCosts` (4) = 17/17.
- Covenant audit: forbidden-lexicon grep over engine + `BudgetCard`
  rendered surface — zero matches outside the negative-assertion test.
- `BudgetActualsCard` confirmed un-mounted (no `renderActCard`/manifest
  route), preserved for audit.
- `BudgetCard` is plain React deep behind the Act module slide-up —
  tsc + the suites are the authoritative gate. No browser screenshot
  claimed if the surface cannot be reached (screenshot-honesty rule;
  MapLibre/WebGL hang precedent from D1/D2).

## Commit posture

Explicit-path staging **only** — never `git add -A`/`.`. The working
tree carries heavy concurrent out-of-band D0 streams; each D3 file is
staged by exact path, per-file diff inspected for D3 scope. The
registration-touch files (`stageModules.ts`, `ActHub.tsx`,
`DashboardRouter.tsx`, `taxonomy.ts`, `actualsStore.ts`,
`v3/act/*`) were verified diff-clean (pure `act-budget-actuals` →
`act-budget` repointing + deprecation headers). `wiki/index.md` /
`wiki/log.md` are dirty with D0 work — owned by the D0 stream; the D3
session-close touches only `wiki/log.md` (prepend) and the standalone
D3 ADR, leaving `wiki/index.md` for the D0 owner (mirrors the D2/B3
ADR precedent). Branch divergence checked (fetch +
`git rev-list --left-right --count HEAD...@{u}`); no force-push.

## Scope / risk boundary

- **Covenant (highest):** any cost-of-capital/financing/investor/
  yield-as-return field or framing is out — rejected to Sub-project C
  (Scholar-gated), never patched in D. Enforced by the engine
  no-financing-token regex + a release-gate covenant grep over engine
  + card output.
- **Additive only:** new isolated `ogden-work-item-actuals` slice (no
  migrate); `costRangeAuto?` is `.optional()` + `.passthrough()` ⇒ no
  DB migration, no literal-site churn; registration append-only; no
  `WorkItem.status` auto-mutation.
- **Preservation contract:** `replaceGoalCompassCosts` is a 1:1
  structural mirror of the proven `replaceGoalCompassDependencies` /
  `replaceGoalCompassResources` — no parallel logic that could drift.
- **Spine-supersede:** `BudgetActualsCard`/`actualsStore` retired not
  deleted — preserved for audit, un-mount grep-verified.
- **No-clobber:** D3 coexists with concurrent out-of-band D0 streams;
  strict explicit-path staging mandatory.
