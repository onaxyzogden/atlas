# 2026-04-27 — Feasibility Command Center


Replaced the single-column `DecisionSupportPanel` on the Dashboard's
`feasibility` section with a verdict-led, two-column cockpit. The narrow
MapView right-rail still uses `DecisionSupportPanel`; this is page-level only.

### What changed (`feat/shared-scoring`)

- New [`FeasibilityCommandCenter`](../apps/web/src/features/decision/FeasibilityCommandCenter.tsx)
  composes: header → [`FeasibilityVerdictHero`](../apps/web/src/features/decision/FeasibilityVerdictHero.tsx)
  → [`BlockingIssuesStrip`](../apps/web/src/features/decision/BlockingIssuesStrip.tsx)
  → 2-col body (Fit & Readiness | Execution Reality) → Design Rules section →
  collapsible Methodology drawer → sticky [`FeasibilityDecisionRail`](../apps/web/src/features/decision/FeasibilityDecisionRail.tsx).
  All inner cards lazy-load via `Suspense`.
- New [`VisionFitAnalysisCard`](../apps/web/src/features/decision/VisionFitAnalysisCard.tsx)
  surfaces vision-vs-land fit alongside `BestUseSummaryCard` /
  `DomainFeasibilityCard` in the Fit column.
- Three new hooks under [`features/decision/hooks/`](../apps/web/src/features/decision/hooks/):
  `useFeasibilityVerdict` (verdict band + score), `useTriageItems` (ordered
  blocker list shared between Hero, BlockingIssuesStrip and DecisionRail),
  `useTypeFitRanking` (vision-fit ranking). These centralize logic that used
  to live inline in the panel cards.
- [`BestUseSummaryCard`](../apps/web/src/features/decision/BestUseSummaryCard.tsx)
  and [`WhatMustBeSolvedFirstCard`](../apps/web/src/features/decision/WhatMustBeSolvedFirstCard.tsx)
  thinned out (-293 lines combined) — heavy ranking/triage logic moved into
  the new hooks so the cards become render-only.
- [`CapitalIntensityCard`](../apps/web/src/features/decision/CapitalIntensityCard.tsx)
  radar `viewBox` widened to `-60 -30 320 260` so axis labels stop being
  clipped by the SVG box.
- [`DashboardRouter`](../apps/web/src/features/dashboard/DashboardRouter.tsx)
  swaps the `feasibility` case from `DecisionSupportPanel` to
  `FeasibilityCommandCenter` and threads `onSwitchToMap` through.
- [`vite.config.ts`](../apps/web/vite.config.ts) adds the
  `@ogden/shared/demand` subpath alias (more-specific entries must precede the
  bare `@ogden/shared` alias — Vite prefix-matches in order).

### Verification

- `tsc --noEmit` clean across the full session (every heartbeat exited 0).
- New components were authored against the existing scoring helpers — no
  duplicate score logic in the cockpit.

### Out of scope / deferred

- The `DecisionSupportPanel` is still mounted by the MapView right-rail. A
  future pass can decide whether the narrow panel should also adopt the new
  verdict + triage hooks.
- `OrganizationSettingsReadinessCard` already shipped in commit `017e7b2`
  and is not part of this entry.
