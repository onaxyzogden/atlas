# 2026-04-27 — UI/UX upgrade: Land Verdict shell (Phases 2–6)


Shipped the `2026-04-27` UI/UX upgrade brief — converted the dense operator
dashboard into a verdict-led "regenerative command center." Plan source of
truth: [`docs/ui-ux-upgrade-brief.md`](../docs/ui-ux-upgrade-brief.md).

### What changed (`feat/shared-scoring`)

- **Phase 2 — Navigation taxonomy.** Added a third grouping mode `stage`
  (Understand / Identify Constraints / Design / Test Feasibility / Prepare
  the Report) to [`features/navigation/taxonomy.ts`](../apps/web/src/features/navigation/taxonomy.ts);
  `STAGE_META`, `STAGE_ORDER`, `groupByStage()` parallel the existing phase
  and domain helpers. [`uiStore`](../apps/web/src/store/uiStore.ts) defaults
  the sidebar grouping to `stage`. [`IconSidebar`](../apps/web/src/components/IconSidebar.tsx)
  and [`DashboardSidebar`](../apps/web/src/features/dashboard/DashboardSidebar.tsx)
  consume the stage taxonomy with the same accordion behavior. Top tabs in
  [`ProjectTabBar`](../apps/web/src/components/ProjectTabBar.tsx) renamed to
  `Overview · Design Map · Intelligence · Report`.
- **Phase 3 — Land Verdict hero.** New
  [`LandVerdictCard`](../apps/web/src/features/dashboard/LandVerdictCard.tsx)
  derives a verdict band (Strong Fit / Conditional / Caution / Not
  Recommended) from `computeOverallScore()`, surfaces main blocker + best-fit
  use, and exposes `View Constraints / Open Design Map / Generate Brief`
  CTAs. New [`CriticalConstraintAlert`](../apps/web/src/features/dashboard/CriticalConstraintAlert.tsx)
  renders below it only when a blocking flag exists. Both mounted at the top
  of [`DashboardView`](../apps/web/src/features/dashboard/DashboardView.tsx)
  for the default `site-intelligence` section.
- **Phase 4 — Decision Triad.** New
  [`DecisionTriad`](../apps/web/src/features/dashboard/DecisionTriad.tsx)
  promotes Risks / Opportunities / Limitations into a three-column row with
  the schema *Impact · Why it matters · Recommended action · Confidence ·
  Source.* Reuses `deriveRisks()` / `deriveOpportunities()` from
  `@ogden/shared/scoring`; recommended action is heuristic from
  severity+bucket since `evaluateRule` projects out the rule's `action`.
- **Phase 5 — Next Best Actions + persistent CTA.** New
  [`NextBestActionsPanel`](../apps/web/src/features/dashboard/NextBestActionsPanel.tsx)
  replaces the empty "Regenerative Metrics" placeholder on the Overview
  right rail in [`DashboardMetrics`](../apps/web/src/features/dashboard/DashboardMetrics.tsx).
  Priority queue: missing boundary → top blocker → top opportunity → run
  feasibility → generate brief, capped at 5 items. A persistent
  `Generate Brief` button now sits in the [`ProjectTabBar`](../apps/web/src/components/ProjectTabBar.tsx)
  right slot on every project tab.
- **Phase 6 — Mobile shell.** New
  [`MobileProjectShell`](../apps/web/src/pages/MobileProjectShell.tsx)
  activates via `useIsMobile()` (≤768px). Top app bar (back / project name /
  brief icon) → vertical hero stack on Overview (verdict, alert, triad,
  next-actions) → sticky `Generate Land Brief` above bottom nav → bottom nav
  with four tabs → horizontal swipe (60px threshold) between tabs. Reuses
  the existing `MapView` and `DashboardRouter` for non-Overview tabs.

### Verification

- `tsc --noEmit` clean.
- Live preview verified at 1440 (desktop right rail + tab bar CTA), 768
  (mobile shell + bottom nav), and 375 (mobile shell + sticky CTA + 4-tab
  swipe). Generate Brief opens the existing `ProjectSummaryExport` modal at
  every breakpoint.
- Pre-existing test failures in [`apps/web/src/tests/computeScores.test.ts`](../apps/web/src/tests/computeScores.test.ts)
  belong to the in-flight shared-scoring rollout and are out of scope.

### Out of scope / deferred

- Stewardship-readiness compute engine, silvopasture/agritourism scoring —
  surfaces are reserved on the upgrade brief but compute lives later.
- Map-layer redesign and public-portal redesign.
- Backend/API changes — this was a presentation-layer plan.
