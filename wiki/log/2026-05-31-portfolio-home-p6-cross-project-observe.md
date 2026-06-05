# 2026-05-31 — Portfolio Home P6: cross-project Observe comparison

**Backfilled 2026-05-31 from commit history** (commit `070d4026`) — code-committed in a prior session but never logged at the time; reconstructed from the commit body + `--stat` for epic-record completeness.

**Branch.** `feat/atlas-permaculture` (commit `070d4026`, 9 files +1143/−2; not pushed). Phase 6 of the OLOS Portfolio Home epic — the §6 cross-project Observe comparison surface at `/v3/portfolio/observe-compare`. Builds on P5 ([[log/2026-05-31-portfolio-home-p5-cross-project-relationships]]).

**Disclosed divergence from the plan.** The plan scoped P6 as "full-stack" (a batch read endpoint or per-project fan-out). It shipped **frontend-only**: the surface derives entirely from the client-side Phase-4 `useObserveDataPointStore` (numeric measurements + capture timestamps) — **no backend read, no migration, no mutation**. Strictly read-only.

**What shipped.**
- **`observeCompareModel.ts`** — pure helpers (`selectableProjectIds`, `domainIntersection`, `buildComparison`): series keyed by **calendar date** (not cycle), numeric-vs-status auto-detect, per-project baseline/current/change/trend, climate context via the P4 `deriveClimateContext`.
- **`ComparisonChart.tsx`** — inline multi-series SVG, X = calendar date, baseline rings, numeric/status y-axis.
- **`PortfolioObserveComparePage.tsx`** (+ css) — project chips (**min 2 / max 5** enforced), shared-domain selector (intersection), chart, summary table with climate badges, excluded-no-data notice.
- **Route** `/v3/portfolio/observe-compare` with `validateSearch` (`?from&domain`).
- **Entry points** — per-project Observe `DomainDetailHeader` "Compare with other projects"; portfolio left-rail "Compare Observe data" footer. (Owner-tier gating of these entry points is added in P7.)

**Verified.** web `tsc` clean for these files (pre-existing errors in unrelated Plan-spine files were out of scope at the time; the tree type-checks clean as of P8 — see [[log/2026-05-31-portfolio-home-p8-acceptance]]).

**Discipline.** Append-only commit on the rebased branch ([[project-branch-rebase]]); not pushed. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Continues [[log/2026-05-31-portfolio-home-p5-cross-project-relationships]]; followed by P7 ([[log/2026-05-31-portfolio-home-p7]]); ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entity [[entities/web-app]].
