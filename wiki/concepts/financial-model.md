# Financial Modeling Engine

## Summary
Client-side financial engine that computes costs, revenues, cashflow, break-even, and mission scoring from design features and regional benchmarks. All monetary values use `CostRange { low, mid, high }` — never a single point estimate.

## How It Works
Pipeline runs in `useFinancialModel(projectId)` hook:
1. Collect all features from 6 stores (zones, structures, paddocks, crops, paths, utilities)
2. Extract `SiteContext` from siteDataStore (growing season, hardiness zone, slope, aspect)
3. `computeAllCosts()` → cost line items by feature, category, and phase
4. `applyOverrides()` → user cost adjustments
5. `detectEnterprises()` → auto-detect enterprise types from feature mix
6. `computeRevenueStreams()` → revenue by enterprise with ramp schedules
7. `computeCashflow()` → 10-year projection with CostRange bands
8. `computeBreakEven()` → break-even year, 10-year ROI, peak negative cashflow
9. `computeMissionScore()` → weighted scores across financial/ecological/spiritual/community

## Key Types
- `CostRange`: `{ low, mid, high }` — all monetary values
- `CostLineItem`: name, sourceType, category, phase, cost, confidence, assumptions
- `RevenueStream`: name, enterprise, annualRevenue, rampSchedule, startYear, maturityYear
- `YearlyCashflow`: year, capitalCosts, operatingCosts, revenue, netCashflow, cumulativeCashflow
- `FinancialModel`: the complete output including all of the above + missionScore + assumptions

## Files
```
apps/web/src/features/financial/
  engine/
    types.ts            — all type definitions
    costEngine.ts       — computeAllCosts, per-feature cost functions
    revenueEngine.ts    — computeRevenueStreams
    cashflowEngine.ts   — computeCashflow (10-year)
    breakEvenEngine.ts  — computeBreakEven
    missionScoring.ts   — computeMissionScore
    enterpriseDetector.ts — detectEnterprises
    costDatabase.ts     — regional cost benchmarks
    revenueDatabase.ts  — regional revenue benchmarks
  hooks/
    useFinancialModel.ts — React hook (memoized)
```

## Regions
`CostRegion` enum: us-midwest, us-northeast, us-southeast, us-west, ca-ontario, ca-bc, ca-prairies. Each has its own cost/revenue benchmark database.

## Where It's Used
- `EconomicsPanel` — displays cashflow chart, cost breakdown
- `ScenarioPanel` — snapshots financial model into scenario store
- `InvestorSummaryExport` — renders financial summary for investors
- PDF templates (investor_summary, feature_schedule) — receives data via request body `payload.financial`

## Constraints
- All values in full dollars (not $K) — scenario store v2 migration handled this
- MissionWeights are user-configurable in financialStore
- No server-side computation — engine runs entirely in the browser
- For PDF export, the frontend must serialize the FinancialModel and send it as `payload.financial`
