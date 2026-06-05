# 2026-04-25 — §22 OperatingRunwayCard shipped (rode along in commit `ae87618`)


Annual revenue-vs-cost burn-down card mounted on `EconomicsPanel` Overview
tab between Scenario Comparison and Investment by Category. Complements the
existing cumulative cashflow chart, which only surfaces the trajectory; this
card surfaces the per-year deficit/surplus picture that operators plan
against, plus a bridge-capital number.

**Files:**
- `apps/web/src/features/economics/OperatingRunwayCard.tsx` (273 lines)
- `apps/web/src/features/economics/OperatingRunwayCard.module.css` (239 lines)
- `apps/web/src/features/economics/EconomicsPanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `cashflow-sequence-chart-break-even`
  (§22) `partial` → `done`

**Logic:**
- Reads `cashflow: YearlyCashflow[]` and `breakEven` already returned by
  `useFinancialModel`. Pure presentation — no engine changes.
- Per-year row computes `net = revenue − capital − operating` (mid scenario).
- A **bridge year** is any year with `net < 0`. Bridge capital = sum of bridge
  deficits × 1.10 contingency.
- KPIs: Bridge capital, Worst single year, Year operating costs are first
  covered by revenue, Year-10 net (steady-state lens).
- SVG chart: stacked downward bars (capital + operating) and upward bars
  (revenue) per year, with bridge years background-tinted amber and a BE
  marker at the cumulative break-even year.
- Tone-coded badge: `SELF-FUNDING` / `N BRIDGE YR(S)` / `N BRIDGE YRS`.

**Coordination note:** parallel session's commit `ae87618 feat(rules): guest
privacy card` swept my four files into a single commit before I could stage
them independently. The OperatingRunwayCard ship is intact in HEAD; this log
entry documents the cohabitation. Same pattern as §8 ride-along.

Type-check clean (`tsc --noEmit` exit 0).
