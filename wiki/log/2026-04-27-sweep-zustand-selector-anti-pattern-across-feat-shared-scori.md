# 2026-04-27 — Sweep: Zustand selector anti-pattern across `feat/shared-scoring`


After the `ClimateShiftScenarioCard` fix below, swept the rest of the
branch for the same shape. Found 37 array-returning `.filter()` calls
inside Zustand selectors across 10 cards — all dormant infinite-loop
bugs that only haven't crashed because their dashboards aren't all
rendered yet.

Cards fixed (all now follow the `allX` + `useMemo` pattern):
- ai-design-support: AlternativeLayoutRationale, AssumptionGapDetector,
  EcologicalRiskWarnings, FeaturePlacementSuggestions, NeedsSiteVisit,
  PhasedBuildStrategy, WhyHerePanels (28 instances)
- economics: EnterpriseRevenueMix, OverbuiltForRevenueWarning,
  RevenueRampProjection (9 instances)

Portal cards (`ShareLinkReadiness`, `StakeholderReviewMode`) also use
`s.X.filter(...)` inside selectors but return `.length` (a primitive),
which Object.is compares safely — left as-is.

Applied via codemod (regex match on
`useXStore((s) => s.PROP.filter((p) => p.projectId === IDREF))`).
`pnpm tsc --noEmit` clean.
