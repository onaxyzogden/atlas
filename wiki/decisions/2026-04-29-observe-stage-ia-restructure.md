# ADR: OBSERVE Stage — IA Restructure (3-Stage Lens + Observe Hub + 8 Gap Surfaces)
**Date:** 2026-04-29
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (4 commits: `74b45a2`, `e2986db`, `103ce10`, `4c17d97`)
**Plan:** `~/.claude/plans/few-concerns-shiny-quokka.md`

## Context
Atlas previously exposed ~31 dashboards behind a sidebar that grouped by
`phase`, `domainGroup`, or a 5-stage taxonomy (`S1–S5`) defined in
`apps/web/src/features/navigation/taxonomy.ts`. Most "Observe" capability
(Site Intelligence, Terrain, Hydrology, Solar/Climate, Ecological, Soil)
already existed but was scattered with no landing surface, and was missing
several fundamentals from the permaculture observation framework: steward /
vision survey, indigenous & regional context, sector compass, A–B
cross-section, jar / percolation soil tests, food-chain logger, SWOT export.

The user is restructuring Atlas around the regenerative-design 3-stage cycle
(OBSERVE → PLAN → ACT) per `Regenerative Design Observation Stage.md`. This
ADR captures Stage 1 of 3.

## Decision

### Taxonomy
- Add `Stage3Key = 'observe' | 'plan' | 'act'` and `STAGE3_META` /
  `STAGE3_ORDER` alongside the existing `StageKey`. No `S1–S5` deletion —
  every `NavItem` now carries both `stage` and `stage3`.
- Mapping: `S1 + S2 → observe`; `S3 (design) + S4 → plan`; `S3 (operate) +
  S5 → act`. The S3 split was necessary because design vs. operations live
  in different stages of the new cycle.
- New `groupByStage3()` helper in `taxonomy.ts`; `uiStore.sidebarGrouping`
  default flipped to `'stage3'`. Old groupings remain available behind
  `GroupingToggle`.

### Hybrid retention (no retirements)
- New `ObserveHub` landing page summarises the 6 spec modules (Human Context,
  Macroclimate & Hazards, Topography & Base Map, Earth/Water/Ecology
  Diagnostics, Sectors & Microclimates, SWOT Synthesis) and links into
  existing detail dashboards. Nothing is retired; everything is reachable
  from both Hub and sidebar.
- Sidebar **Observe** accordion holds 17 items in spec order: Hub + 6
  existing dashboards + 9 new dashboardOnly surfaces (the 8 gap surfaces +
  the report exporter).

### Gap surfaces (8)
All client-only React surfaces, no API. Wired via `dashboardOnly: true`
NavItems and lazy-loaded in `DashboardRouter`:

1. `StewardSurveyCard` (Module 1)
2. `IndigenousRegionalCard` (Module 1)
3. `HazardsLogCard` (Module 2)
4. `CrossSectionTool` (Module 3) — coordinate-input transect editor + SVG
   profile chart with **synthetic elevation profile** labelled "live API
   pending"
5. `SoilTestsCard` (Module 4) — jar test + percolation + bedrock + roof
   catchment (1 mm × 1 m² = 1 L)
6. `FoodChainCard` (Module 4)
7. `SectorCompassCard` (Module 5) — SVG circular editor, compass-bearing
   polar conversion `((bearing − 90) × π / 180)`, 8 sector types
8. `SwotJournalCard` + `DiagnosisReportExport` (Module 6) — Markdown blob
   download + `window.print()` PDF fallback

### Store architecture (deviation from plan)
The plan said extend `siteDataStore`. siteDataStore is fetch-driven and
ephemeral (cached layer pulls); the new annotation surfaces persist
user-authored data. Created **new persisted store**
`store/siteAnnotationsStore.ts` (key `ogden-site-annotations`, v1)
mirroring the `nurseryStore` / `fieldworkStore` pattern. Holds:
`hazards`, `transects`, `sectors`, `ecology`, `successionStageByProject`,
`swot`. Plus helper `newAnnotationId(prefix)`.

Other store extensions (additive, optional fields, no migration):
- `visionStore` — `steward?: StewardProfile`, `regional?: RegionalContext`
- `soilSampleStore.SoilSample` — `jarTest?`, `percolationInPerHr?`,
  `depthToBedrockM?`, `roofCatchment?`

## Consequences
- **Two viable sidebar mental models** (S1–S5 power view, S3 default
  permaculture view) with zero data migration.
- **17 items under Observe** is long but acceptable because the Hub is the
  default landing — accordion items become detail-only.
- **Cross-section is illustrative only** until the elevation API lands.
  Tracked as a deferred follow-up; user-facing copy makes the synthetic
  source explicit.
- **Charting stays SVG-native** — no Recharts dependency added.
- **Print-to-PDF for v1 report export** — no `jspdf`/`pdf-lib`. Targets
  Chromium renderer.
- **`siteAnnotationsStore` is now the canonical home for user-authored
  spatial annotations.** Future modules (e.g., observation pins, design
  comments scoped to a stage) should extend this store rather than
  re-using `siteDataStore`.

## Verification
- `pnpm --filter @olos/web build` clean (24.05 s, PWA precache 510 entries
  / 13.6 MB) with bumped `NODE_OPTIONS=--max-old-space-size=8192`.
- `npx tsc --noEmit` zero new errors.
- 4 local commits on `feat/atlas-permaculture`; not yet pushed.

## Deferred
- Real elevation API → `CrossSectionTool` (currently `syntheticProfile`).
- `SectorOverlay` for `MapView` (sector arrows projected from project
  centroid).
- Map-drawn A→B picking via `DomainFloatingToolbar` draw-mode.
- Manual UI walkthrough + screenshots.
- PLAN and ACT internal restructures (pending those spec docs).
- True PDF generation library (print-to-PDF acceptable for v1).
