# 2026-04-29 — OBSERVE Stage IA restructure (Stage 1 of 3)


**Trigger.** Plan `~/.claude/plans/few-concerns-shiny-quokka.md` — collapse
Atlas's 5-stage taxonomy to the regenerative-design 3-stage cycle
(Observe → Plan → Act), ship an Observe Hub landing surface, and build the
8 gap surfaces from the permaculture observation framework.

**Branch.** `feat/atlas-permaculture` — 4 local commits (`74b45a2`,
`e2986db`, `103ce10`, `4c17d97`); not pushed.

**Phase 1 — taxonomy collapse.** `features/navigation/taxonomy.ts` gains
`Stage3Key`, `STAGE3_META`, `STAGE3_ORDER`, `groupByStage3()`. Every
`NavItem` now carries both `stage` (S1–S5) and `stage3` (observe/plan/act).
`uiStore.sidebarGrouping` default flipped to `'stage3'`; old groupings
remain via `GroupingToggle`. Mapping: S1+S2 → observe, S3 design + S4 →
plan, S3 operate + S5 → act.

**Phase 2 — Observe Hub.** `features/observe/ObserveHub.tsx` —
2-col landing page summarising the 6 spec modules (Human Context,
Macroclimate & Hazards, Topography, Diagnostics, Sectors, SWOT). Each
module card pulls a 3-line summary from `visionStore`, `siteDataStore`,
`soilSampleStore`, and the new `siteAnnotationsStore`, with an "Open
detail →" CTA driving `useUIStore.setActiveDashboardSection`.

**Phase 3 — sidebar regrouping.** Observe accordion holds 17 items in spec
order: Hub + Site Intelligence + Terrain + Hydrology + Solar/Climate +
Ecological + Cartographic + 8 new dashboardOnly surfaces + report exporter.
PLAN/ACT absorb existing dashboards via `stage3` tags only — internal
restructures deferred to those spec docs.

**Phase 4 — 8 gap surfaces.**
- 4a `StewardSurveyCard` + `IndigenousRegionalCard` — extends `visionStore`
  with `steward?: StewardProfile` (lifestyle, skill chips, vision) and
  `regional?: RegionalContext` (indigenous place names, network registry).
- 4b `HazardsLogCard` — historical hazard events (10 types).
- 4c `CrossSectionTool` — coordinate-input transect editor + SVG profile
  chart (PROFILE_W=720, PROFILE_H=180, SAMPLE_COUNT=100). Synthetic
  elevation profile via deterministic seed; UI labels it "live API
  pending". Map-drawn A→B picking deferred.
- 4d `SoilTestsCard` (jar test sand/silt/clay sum-validated, percolation,
  bedrock depth, roof catchment) + `FoodChainCard` (5 trophic levels +
  succession stage). Roof yield: `areaM2 × precipMm × coeff` litres
  (1 mm × 1 m² = 1 L).
- 4e `SectorCompassCard` — SVG circular editor (COMPASS_SIZE=360,
  RADIUS=150). `polar(bearingDeg, r)` converts compass bearing
  (N=0, clockwise) to SVG x/y via `((bearing − 90) × π / 180)`. 8 sector
  types (sun summer/winter, wind prevailing/storm, fire, noise, wildlife,
  view) with distinct wedge colors. `SectorOverlay` for MapView deferred.
- 4f `SwotJournalCard` — 4-column board (S=green / W=red / O=blue / T=gold)
  with per-column inline add. `DiagnosisReportExport` — composes Markdown
  report (sections 1-6 mirroring spec) from all stores; Blob download +
  `window.print()` PDF fallback. No PDF library added.

**Store deviation.** Plan said extend `siteDataStore`, but it's
fetch-driven and ephemeral. Created new persisted store
`store/siteAnnotationsStore.ts` (key `ogden-site-annotations`, v1) for
user-authored annotations, mirroring `nurseryStore`/`fieldworkStore`
pattern. Holds: `hazards`, `transects`, `sectors`, `ecology`,
`successionStageByProject`, `swot`. Helper:
`newAnnotationId(prefix)`. ADR
[`2026-04-29-observe-stage-ia-restructure.md`](decisions/2026-04-29-observe-stage-ia-restructure.md)
+ entity [`site-annotations-store.md`](entities/site-annotations-store.md)
record the rationale.

**Other store extensions** (additive optional fields, no migration):
- `visionStore` — `steward?`, `regional?` + `updateSteward`,
  `updateRegional`, `addNetworkContact`, `removeNetworkContact`.
- `soilSampleStore.SoilSample` — `jarTest?`, `percolationInPerHr?`,
  `depthToBedrockM?`, `roofCatchment?`.

**Verification.**
- `vite build` clean (24.05 s, PWA precache 510 entries / 13.6 MB) with
  bumped `NODE_OPTIONS=--max-old-space-size=8192` (default heap ~3.6 GB
  was OOMing tsc).
- `npx tsc --noEmit` zero new errors.
- Manual UI walkthrough + screenshots deferred.

### Deferred / out-of-scope

- **Push** the 4 local commits on `feat/atlas-permaculture` — awaiting
  manual walkthrough preference.
- **Real elevation API** for `CrossSectionTool` — currently synthetic.
- **`SectorOverlay` for MapView** — sector arrows projected from project
  centroid; backlog item.
- **Map-drawn A→B picking** via `DomainFloatingToolbar` draw-mode.
- **PLAN and ACT internal restructures** — pending those spec docs.
- **True PDF generation** (jspdf/pdf-lib) — print-to-PDF acceptable for v1.

### Recommended next session

- Manual end-to-end walkthrough on a fresh project (steward → hazards →
  transect → soil tests → sectors → SWOT → report). Capture screenshots
  for the LAUNCH-CHECKLIST.
- PLAN and ACT internal restructures (pending those spec docs).

### Same-day follow-ups (closed in this sprint)

After the initial 5 commits landed, all three deferred code items from the
ADR were closed in the same session:

- **`48a7990` — Live elevation API.** `CrossSectionTool` now POSTs to
  `/api/v1/elevation/profile` (NRCan HRDEM / 3DEP via the existing reader)
  with the A→B as a 2-vertex LineString and `sampleCount: 100`. Falls back
  to `syntheticProfile` only when the call throws or DEM has no coverage.
  `Transect` type extended with `sourceApi?`, `confidence?`,
  `totalDistanceM?`. UI button shows "Sampling DEM…" while in flight; chart
  footer chip shows source + confidence ("NRCan HRDEM Lidar DTM (1m) ·
  confidence: high") and only marks "illustrative only" when synthetic.

- **`20d9b79` — SectorOverlay for MapView.** New
  `features/map/SectorOverlay.tsx` reads `siteAnnotationsStore.sectors`
  filtered by `projectId`, builds polygon wedges via `turf.destination`
  from the parcel centroid, paints with the same palette as
  `SectorCompassCard`. Wedge radius scales with parcel diagonal
  (`turf.bbox × 0.75`, min 500 m). `mapStore` gains `sectorOverlayVisible`
  + setter; `LeftToolSpine` gets a Lucide-Compass spine button slot;
  `MapView` mounts both the overlay and the toggle. Quietly no-ops when
  no parcel boundary or no sectors. `style.load` re-sync survives basemap
  swaps.

- **`e726001` — Map-drawn A→B → observe transect.** The map-side
  `features/map/CrossSectionTool.tsx` now exposes a "Save as transect"
  button on its profile panel. After the user draws a line and the DEM
  sample lands, first/last coord of the drawn LineString → `pointA`/
  `pointB`; samples + sourceApi + confidence + totalDistanceM all carry
  through into a persisted `Transect`, so the same data the user drew on
  the map is immediately available in the hub-side observe surface (no
  re-draw, no re-sample). Saved-state shows green "Saved ✓" so the same
  line can't be persisted twice.

Cumulative: 8 commits on `feat/atlas-permaculture`, PR
[#6](https://github.com/onaxyzogden/atlas/pull/6) updated. Build green
across all three follow-ups (last build 23.23 s, 511 PWA precache entries
/ 13.6 MB).
