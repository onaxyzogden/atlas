# 2026-05-07 — BUILD_FRESH per Scholar verdict


**Branch:** `feat/atlas-permaculture` · **Type:** feature · iteration step 1/8

First module in the Plan-stage Permaculture Scholar adjudication loop
(see `let-s-make-the-module-iterative-seahorse.md`). Scholar
(NotebookLM `5aa3dcf3-…`) ruled neither Atlas nor OGDEN sufficient —
Atlas is "filter list + SVG scrubber," OGDEN is "ecological theatre."
Sketch executed: site-match scoring on the Plant Database, spatial
guild centroid placement on a parcel diagram with a water-flow arrow,
six-layer (incl. root zone) cross-section across discrete succession
scenarios Year 1/5/10/20/30+ with per-layer light attenuation.

Files created (4): `apps/web/src/v3/plan/cards/plant-systems/`
`siteMatch.ts`, `PlantDatabaseSiteMatchCard.tsx`,
`GuildSpatialBuilderCard.tsx`, `CanopySuccessionCard.tsx`.
Files modified (2): `PlanModuleSlideUp.tsx` (3 lazy imports + 3
switch cases re-routed), `PlanChecklistAside.tsx` (plant-systems
WHY/HOW rewritten to cite Mollison ch.10 + OSU PDC).

Atlas legacy `features/plan/Plant*Card.tsx` retained — still imported
by `V3PlanPage.tsx` + `features/dashboard/DashboardRouter.tsx`;
consolidation is a follow-up ticket. Decision recorded in
[2026-05-07-atlas-plan-plants-scholar-build-fresh.md](decisions/2026-05-07-atlas-plan-plants-scholar-build-fresh.md).

Verification: `npm run typecheck` exit 0; `npm run build`
(`NODE_OPTIONS=--max-old-space-size=8192`) exit 0 in 52.74s.
