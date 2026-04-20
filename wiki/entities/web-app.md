# Web App (Frontend)
**Type:** package
**Status:** active
**Path:** `apps/web/`

## Purpose
React SPA for property design, map visualization, dashboard analytics, financial modeling, and export. Local-first architecture with Zustand stores persisted to localStorage.

## Key Structure
```
src/
  components/
    ui/             — 16 reusable components (Button, Card, Modal, etc.)
    IconSidebar.tsx  — Main navigation sidebar
  features/
    dashboard/      — DashboardView, DashboardSidebar, DashboardRouter, 14 dashboard pages
    climate/        — SolarClimateDashboard
    economics/      — EconomicsPanel
    regulatory/     — RegulatoryPanel
    scenarios/      — ScenarioPanel
    financial/      — Financial engine (cost, revenue, cashflow, break-even, mission)
    export/         — InvestorSummaryExport, ProjectSummaryExport, EducationalBookletExport
    fieldwork/      — FieldworkPanel, FieldNoteExport
    map/            — Map view, drawing tools, layer controls
  store/            — 18 Zustand stores
  lib/              — layerFetcher, geoParsers, scoring engine, tokens.ts (TS token bridge)
  pages/            — Top-level route pages
```

## Dashboard Groups (DashboardSidebar)
Group colors are now design tokens (`--color-group-*` in `tokens.css`).

| Group | Token | Items |
|-------|-------|-------|
| Grazing & Livestock | `--color-group-livestock` | Paddock Design, Herd Rotation, Grazing Analysis, Inventory & Health Ledger |
| Forestry | `--color-group-forestry` | Planting Tool, Forest Hub, Carbon Diagnostic, Nursery Ledger |
| Hydrology & Terrain | `--color-group-hydrology` | Cartographic, Hydrology, Ecological, Terrain, Stewardship, Solar & Climate |
| Finance | `--color-group-finance` | Economics, Scenarios, Investor Summary |
| Compliance | `--color-group-compliance` | Regulatory |
| Reporting & Portal | `--color-group-reporting` | Reports & Export, Public Portal, Educational Atlas |
| General | `--color-group-general` | Biomass, Siting Rules, Settings, Archive |

## Zustand Stores (18)
All use `persist` middleware with localStorage. Key stores:
- `projectStore` — project CRUD, active project selection
- `zoneStore` — land zones (13 categories)
- `structureStore` — structures (20 types)
- `livestockStore` — paddocks + livestock species
- `cropStore` — crop areas (10 types)
- `pathStore` — paths/roads (11 types)
- `utilityStore` — utilities (15 types)
- `scenarioStore` — design scenario snapshots (v2, full dollars)
- `financialStore` — region, mission weights, overrides
- `fieldworkStore` — field notes, walk routes, punch lists
- `siteDataStore` — cached layer data
- `commentStore` — design comments

## Map / Geocoding
- Tile renderer: MapLibre GL (open-source)
- Tile provider: **MapTiler** (`VITE_MAPTILER_KEY`) — migrated from Mapbox 2026-04-11/12
- Style URLs: `https://api.maptiler.com/maps/{satellite|topo|streets|hybrid}/style.json?key=...`
- Geocoding: **MapTiler** (`https://api.maptiler.com/geocoding/{query}.json?key=...`) — used in `MapCanvas.tsx` and `StepBoundary.tsx`
- Terrain DEM: still `mapbox://` protocol in `TerrainControls.tsx` + `HydrologyPanel.tsx` — **pending migration**
- Token exported as `mapboxToken` from `maplibre.ts` (name preserved for import compatibility)

## Current State
- Map + drawing tools: **production-ready** (MapTiler tiles + geocoding live)
- Dashboard: 14 pages, mixed live/demo data
- Financial engine: **working** (client-side, ~8 sub-engines)
- Branch coverage (`computeScores.ts`): **84.61%** (138 tests passing, target >80% met 2026-04-12)
- All stores: **localStorage-only** (no backend sync — `serverId` field prepared but unused)
- Auth guard: **commented out** for dev convenience

## Performance (Sprint BJ — 2026-04-20)
- `lib/debounce.ts` — 15-line debounce helper (no lodash)
- `lib/perfProfiler.tsx` — dev-only `<SectionProfiler>` around React's `<Profiler>`; logs renders over 16 ms; tree-shaken in prod via `import.meta.env.DEV`
- `SiteIntelligencePanel` wrapped in `React.memo` + 4 pure sub-components (`AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle`) memoized
- Module-level `EMPTY_LAYERS` constant stabilizes the layers fallback identity
- `ProjectPage.tsx` boundary-change effect debounced at 400 ms; unmount aborts any in-flight fetch
- `siteDataStore` has a per-project `AbortController` registry + exported `abortFetchForProject(id)`; `fetchAllLayers` now accepts an `AbortSignal` via `FetchLayerOptions` and races its `Promise.allSettled` against it (in-flight HTTP continues silently; store discards via `aborted: true` sentinel)

## Sub-Component Extraction (Sprints BK + BL + BM + BN + BO + BP — 2026-04-20)
- `components/panels/sections/` — directory hosting extracted, memo-wrapped sections:
  - `_shared.tsx` — `AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle` (Sprint BJ memo'd leaves relocated here)
  - `_helpers.ts` — pure helpers (`severityColor`, `capConf`, `getScoreColor`, `getHydroColor`, `getSoilPhColor`, `getCompactionColor`, `formatComponentName`)
  - `ScoresAndFlagsSection.tsx` (BK) — blocking flags, overall suitability card, Tier 3 status, Live Data panel
  - `CropMatchingSection.tsx` (BK) — FAO EcoCrop match list with category filter pills + expandable breakdowns + companion pairs
  - `RegulatoryHeritageSection.tsx` (BK) — Sprint BC/BF/BH regulatory rollup (easements, heritage, ALR, EA triggers, setbacks, mineral/water rights, ag use-value, EcoGifts)
  - `HydrologyIntelligenceSection.tsx` (BK) — Sprint F hydrology card + Sprint J wind + Sprint K solar rows
  - `GroundwaterSection.tsx` (BL) — Sprint M depth-to-water card (USGS NWIS / Ontario PGMN)
  - `WaterQualitySection.tsx` (BL) — Sprint M water quality (pH, DO, nitrate, turbidity)
  - `SoilIntelligenceSection.tsx` (BL) — Sprint G soil rollup (pH, OM, CEC, texture, bulk density, ksat, CaCO3, coarse fragments, rooting depth, carbon stock, WRB)
  - `DesignIntelligenceSection.tsx` (BL) — 10-subsystem design rollup: passive solar, windbreak, water harvesting (swales + ponds), septic, shadow modeling, RWH sizing, pond volume, fire risk zoning, footprint optimization, compost siting
  - `InfrastructureAccessSection.tsx` (BM) — Sprint K/L/W access distances (hospital, masjid, market, grid, road, water, farmers-market, town, WDPA protected area)
  - `EnvironmentalRiskSection.tsx` (BM) — Sprint BG air/earthquake + Sprint BI Superfund / UST / LUST / brownfields / landfills / mine-hazard / FUDS rollup (8 hazard subsystems, 10 props, internal `hasAny` short-circuit)
  - `EcosystemServicesSection.tsx` (BM) — Sprint BE Cat 7 ecosystem valuation (de Groot 2012) + wetland function classification. Non-toggleable.
  - `ClimateProjectionsSection.tsx` (BM) — Sprint BE Cat 5 IPCC AR6 mid-century projections (SSP2-4.5 + SSP5-8.5). Non-toggleable.
  - `HydrologyExtensionsSection.tsx` (BN) — Sprint BD Cat 4 aquifer (USGS Principal Aquifer) + water stress (WRI Aqueduct 4.0) + seasonal flooding (USGS NWIS monthly stream stats). Non-toggleable.
  - `EnergyIntelligenceSection.tsx` (BN) — Sprint BD Cat 9 geothermal (GSHP) + solar-battery storage rollup. Non-toggleable.
  - `SiteSummaryNarrativeSection.tsx` (BN) — consolidated Site Summary paragraph + "What This Land Wants" card + Design Recommendations AI multi-card + AI loading spinner. Switches between AI narrative (with confidence badge) and deterministic fallback per sub-block.
  - `AssessmentScoresSection.tsx` (BN) — 7-axis assessment-score list with per-score expandable sub-component breakdown (sub-bars, source-layer chips, per-component confidence badges, computed timestamp). Expansion state owned by parent via `expandedScore` + `onToggleExpandedScore` useCallback.
  - `FuzzyFaoSection.tsx` (BO) — Sprint BF Cat 1a Zadeh 1965 / ALUES fuzzy membership — defuzzified class + aggregate bars across S1/S2/S3/N1/N2. Typed via `FuzzyFAOResult`.
  - `AhpWeightsSection.tsx` (BO) — Sprint BF Cat 1b Saaty 1980 AHP weights (8 priorities) + consistency-ratio row. Always renders. Typed via `AhpResult`.
  - `RegionalSpeciesSection.tsx` (BO) — Sprint BF Cat 6b+6c regional invasive + pollinator-friendly native species (ISSG / regional floras).
  - `CanopyStructureSection.tsx` (BO) — Sprint BF Cat 7 biome-modelled canopy-height estimate. Typed via `CanopyHeightResult`.
  - `LandUseHistorySection.tsx` (BO) — Sprint BF Cat 8 NLCD 2001-2021 multi-epoch rollup (epochs, top transitions, disturbance flags + buildability penalty chip).
  - `OpportunitiesSection.tsx` (BO) — Main Opportunities list with show-all toggle + per-flag AI narrative enrichment. Flag shape: `AssessmentFlag` from `@ogden/shared`. Parent adds `onToggleShowAllOpps` useCallback.
  - `ConstraintsSection.tsx` (BO) — Key Constraints list, symmetric with Opportunities. Critical-severity icon/badge branching kept inside. Parent adds `onToggleShowAllRisks` useCallback.
  - `DataLayersSection.tsx` (BO) — final per-layer label/value/confidence rollup at panel footer. Typed via `DataLayerRow[]`.
  - `SiteContextSection.tsx` (BP) — composite toggleable aggregating 5 optional sub-metrics (Sprints O/P/BB): Crop Validation (USDA NASS CDL), Biodiversity + IUCN Habitat (GBIF), SoilGrids (ISRIC 250m), Critical Habitat (USFWS ESA), Storm Events (FEMA). Structural composite prop shape (5 sub-metric interfaces inline) + `siteContextOpen` + `onToggleSiteContext`. Outer `hasAny` short-circuit lives inside the section.
  - `CommunitySection.tsx` (BP) — Sprint V US Census ACS demographics card (rural class, pop. density, median income, median age). Toggleable via `communityOpen` + `onToggleCommunity`. Structural `DemographicsMetrics` interface inline.
  - `GaezSection.tsx` (BP) — Sprint BI FAO GAEZ v4 5-arc-min agro-climatic suitability (best crop + management, primary suitability class, attainable yield, top-3 crops). Non-toggleable; covers both `enabled` and `!enabled` branches. Structural `GaezMetrics` + `GaezTop3Crop` interfaces inline.
- Pattern: each section is `memo(function X(props) { ... })` wrapped in `<SectionProfiler id="site-intel-{slug}">`, receives state via props (no store subscription inside), exports its own prop interfaces. Toggle handlers `useCallback`-wrapped in parent for stable prop identity. Type strategy: for anonymous `useMemo` parent metrics, declare structural `interface` inline in the section; for lib-level computations with exported result types, `import type`. Non-toggleable sections (Ecosystem, Climate, Hydrology Ext, Energy, Site Summary cluster, all 5 Sprint BO mid-cards, Data Layers, GAEZ) skip the open-state + useCallback overhead entirely.
- `SiteIntelligencePanel.tsx` reduced 4086 → ~1492 lines (−2594 net, **~63%**, across BK+BL+BM+BN+BO+BP). 25 sections now live under `sections/`. Remaining panel body is pure orchestration + `useMemo` layer-metric declarations (~500-1210). Further reduction would require relocating those `useMemo`s to a custom hook (`useSiteIntelligenceMetrics(layers)`) — **executed in Sprint BQ**.

## Hook Consolidation + CSS Migration (Sprint BQ — 2026-04-20)
- `hooks/useSiteIntelligenceMetrics.ts` — new custom hook (`useSiteIntelligenceMetrics(layers, project)`) consolidates 37 layer-reading metric `useMemo`s into a single memoized block. Each original metric is preserved verbatim inside an IIFE; the hook returns a keyed object (`hydroMetrics`, `infraMetrics`, `soilMetrics`, `groundwaterMetrics`, `waterQualityMetrics`, `superfundMetrics`, `criticalHabitatMetrics`, `biodiversityMetrics`, `soilGridsMetrics`, `ustLustMetrics`, `brownfieldMetrics`, `landfillMetrics`, `mineHazardMetrics`, `fudsMetrics`, `easementMetrics`, `heritageMetrics`, `alrMetrics`, `aquiferMetrics`, `waterStressMetrics`, `seasonalFloodingMetrics`, `stormMetrics`, `cropValidationMetrics`, `airQualityMetrics`, `earthquakeMetrics`, `demographicsMetrics`, `proximityMetrics`, `fuzzyFao`, `speciesIntelligence`, `canopyHeight`, `landUseHistoryMetrics`, `mineralRightsMetrics`, `waterRightsMetrics`, `agUseValueMetrics`, `ecoGiftsMetrics`, `windEnergy`, `solarPV`, `gaezMetrics`). Return type exported as `SiteIntelligenceMetrics = ReturnType<typeof useSiteIntelligenceMetrics>`. Dependency array keyed on `[layers, project.acreage, project.country, project.provinceState, project.parcelBoundaryGeojson]` — union of all original individual-memo deps.
- `SiteIntelligencePanel.tsx` consumes the hook via destructuring so every remaining reference (`hydroMetrics`, `heritageMetrics`, etc.) resolves to the same identifier as before (zero consumer edits required). Imports `computeHydrologyMetrics` / `computeWindEnergy` / `parseHydrologicGroup` / `HYDRO_DEFAULTS` / `HydroMetrics` / `WindEnergyResult` / `estimateCanopyHeight` / `computeFuzzyFAOMembership` / `classifyAgUseValue` / `fmtGal` / `findCompanions` relocated out of the panel into the hook.
- `SiteIntelligencePanel.tsx` cumulative: 4086 → **827 lines (−3259, ~80%)**. `useMemo` count 62 → 28. Non-metric `useMemo`s that stay (consume hook output + project geometry): `designIntelligence`, `energyIntelligence`, `climateProjections`, `ecosystemIntelligence`, `eiaTriggers`, `typicalSetbacks`, `cropMatches`, `companionCache`, `ahpResult`, plus the pre-BJ computed-scores reducers (`assessmentScores`, `overallScore`, `topOpportunities`, `topConstraints`, `siteSummary`, `landWants`, `dataLayerRows`, `liveData`, `layerCompleteness`, `tier3Status`, `blockingFlags`, `lastFetched`).
- `styles/panel.module.css` — added 10 utility classes for the inline-style migration: `.rightAlign`, `.flexBetween`, `.itemLabel`, `.detailText`, `.borderBottomNone`, `.fs11`, `.innerPad`, `.cursorDefault`, `.colStretchPad`, `.separatorThin`. The last 4 were added during a second pass after `Counter`-ranking the remaining inline-style patterns.
- Inline-style migration across 22 of 27 section files: **378 → 198 `style={{…}}` objects (−180, ~48% reduction)**. Biggest reducers: `DesignIntelligenceSection` 65→27, `RegulatoryHeritageSection` 46→22, `SoilIntelligenceSection` 18→7, `HydrologyIntelligenceSection` 18→9, `SiteContextSection` 15→7, `CommunitySection` 10→4, `GroundwaterSection` 9→5. Remaining inline styles are legitimately dynamic — score-badge `background`/`color` runtime interpolation from `confidence.high/medium/low`, `semantic.sidebarActive`/`sidebarIcon` JS-token colors (not CSS vars in this codebase), computed widths, runtime grid templates.
- Verification: `npx tsc --noEmit` clean after each phase, `npm run build` succeeds (22.02 s). Behavioral semantics preserved (hook `useMemo` trigger set = union of original 37 individual `useMemo`s' triggers). Deferred: `useSiteIntelligenceMetrics.test.ts` fixture snapshot (optional, metrics are verbatim copies); `semantic.*` → CSS-variable migration in `tokens.css` (would unlock ~30 more inline-style removals but requires token-system refactor, separate sprint).

## Triage BB–BJ Regressions (Sprint BT — 2026-04-20)
- Landed ~3,000 lines of previously uncommitted coherent sprint work spanning **Sprints BB–BJ** (biodiversity, contamination, hydrology-extensions, prior land use, regulatory/heritage, FAO GAEZ, abort-signal plumbing). Triage concluded both diffs (`apps/web/src/lib/computeScores.ts` +151, `apps/web/src/lib/layerFetcher.ts` +2,686) were production-quality with coherent patterns, no stubs, no TODO rot.
- Bug fix: `raceWithSignal` (`apps/web/src/lib/layerFetcher.ts` line 158) — Promise executor previously captured only `resolve` and the `.then`-rejection handler did `throw err`, which silently dropped rejections and hung all dedup-chained callers. One-line fix: `(resolve, reject) => { … (err) => { …; reject(err); } }`.
- Test-shape catch-up: `apps/web/src/tests/computeScores.test.ts` — `computeAssessmentScores` returns 10 scores for US (8 weighted + FAO Land Suitability + USDA Land Capability) and 11 for CA (+Canada Soil Capability). Tests previously asserted length 7, predating `computeCommunitySuitability` and the formal classifiers. Updated 7 length assertions, extended the label set, scoped the rating enum to weighted scores (`scores.slice(0, 8)`), and passed `country='CA'` to activate the Canada Soil Capability branch.
- Test-timeout increase: 3 `fetchAllLayers` tests promoted from default 5,000 ms to 15,000–20,000 ms to accommodate the 30+ live-API fetchers iterating with network mocks. CA test already had an explicit override from a prior sprint.
- Verification: **361/361 tests passing** (up from 351/361); `npm run build` clean; `npx tsc --noEmit` clean.

## Panel Chunk Split + Hook Test (Sprint BS — 2026-04-20)
- `apps/web/vite.config.ts` — `manualChunks` migrated from object form to function form. New app-side splits: `ecocrop-db` (FAO EcoCrop JSON + subset wrapper, ~947 kB / 109 kB gzip), `panel-sections` (27 memoized section components, ~101 kB / 20 kB gzip), `panel-compute` (`designIntelligence` + `regulatoryIntelligence` + `energyIntelligence` + `climateProjections` + `ecosystemValuation` + `cropMatching` + `companionPlanting` + `fuzzyMCDM` + `hydrologyMetrics` + `canopyHeight` + `waterRightsRegistry` + `computeScores` + `useSiteIntelligenceMetrics` hook, ~153 kB / 49 kB gzip).
- `SiteIntelligencePanel` lazy-loaded chunk: **1,144 kB → 15.82 kB shell** (gzip 159 kB → 5.22 kB) — 72× reduction on the shell; full payload now 4 chunks loading in parallel (~1,217 kB / gzip ~183 kB total, ~15% uncompressed overhead for cache granularity). Ecocrop dataset is stable across deploys so subsequent visits hit the CDN cache.
- `apps/web/src/tests/useSiteIntelligenceMetrics.test.ts` — new Vitest suite around the BQ hook boundary. Covers 37-key shape check, empty-layers robustness, representative-hydration on `mockLayersUS()`, memoization identity for stable inputs, and recompute on dep-array changes. Uses happy-dom environment override via `@vitest-environment happy-dom` file directive (project default is node; avoids spreading DOM env across the whole test suite).

## Semantic Token CSS Bridge (Sprint BR — 2026-04-20)
- Recon discovered `apps/web/src/styles/tokens.css` already defines `--color-sidebar-active: #c4a265` and `--color-sidebar-icon: #9a8a74` — exact hex matches of the TS `semantic.sidebarActive` / `semantic.sidebarIcon` exports. The BQ-deferred "token-system refactor" therefore collapsed to a direct utility-class migration rather than a token-surface rework.
- `styles/panel.module.css` — added 12 new utility classes driven by the existing CSS vars: (solo patterns) `.tokenActive`, `.tokenIcon`, `.tokenIconFs11Mt2`, `.tokenIconFs10Italic`, `.tokenIconFs12Leading`, `.tokenIconFs11Leading`, `.tokenActiveFs10Bold`; (composite atoms) `.fs9`, `.fs10`, `.mt2`, `.mr2`, `.tokenIconGrid2`. All color references go through `var(--color-sidebar-*)` so tokens.css stays authoritative.
- Inline-style migration: **198 → 159 `style={{…}}` objects panel-wide (−39, additional ~20% on top of BQ)**. `semantic.sidebar*` inline-style occurrences: 71 → 26 (−45, ~63%). Regex-driven script handled three className-position cases (before/after/absent) and template-string merging to preserve existing class expressions. Phase 2 changed 20 section files, Phase 3 changed 5 more for composite straggler patterns.
- Unused-import cleanup: `HydrologyExtensionsSection.tsx`, `ClimateProjectionsSection.tsx`, `EnergyIntelligenceSection.tsx` had all `semantic.*` code references swapped — `semantic` dropped from their tokens.js imports.
- Verification: `npx tsc --noEmit` clean, `npm run build` succeeds (22.02 s, panel chunk 1,144.14 kB / gzip 158.66 kB — unchanged vs BQ; class-name concats net-zero in bundled output). Remaining 26 `semantic.*` inline refs are runtime-dynamic (badge colors from `confidence.*`, conditional-color spans) and intentionally kept inline.
- Cumulative: panel + 27 sections carry **159 inline styles** (down from pre-BQ ~378 on sections alone). `panel.module.css` grew by 28 classes across BQ+BR (16 + 12), each tagged by sprint.
