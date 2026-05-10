# ADR — Atlas Earth · Water · Ecology Report Export

**Date:** 2026-05-10
**Status:** Accepted
**Context tags:** atlas, observe, earth-water-ecology, pdf-export, template-reuse, recipe-validation

## Context

Two prior ADRs from today shipped the per-module PDF export pattern
on the Atlas Observe stage:

- `2026-05-10-atlas-swot-export-pipeline.md` — three SWOT exports (Journal · Diagnosis Report · Synthesis), reintroducing three deleted CTAs.
- `2026-05-10-atlas-topography-export.md` — fourth export validating the pattern on Module 3, and explicitly locking the 4-file recipe.

The remaining open question was whether the recipe still holds on the
**densest** Observe surface, where one dashboard reads from three
domain stores (soil samples, water systems, ecology) plus four
site-data layers (watershed, soils, wetlands, critical habitat). If
the recipe survives that, "rule of three" is satisfied and any
remaining Observe module can be wired by following steps 1–4 without
re-deriving architecture.

This ADR applies the recipe to **Module 4: Earth · Water & Ecology
Diagnostics**.

## Decision

Add a fifth Observe export, `earth_water_ecology_report`, following
the locked recipe exactly. No abstraction extracted — duplication
held even at the third repetition because the per-module payload
shapes still differ enough that a generic mirror would obscure more
than it removes.

**Surface:**
- Inert `Export report` button (with a decorative `ChevronDown`
  dropdown affordance and no menu) at
  `EarthWaterEcologyDashboard.tsx:143-146` rewritten to a real handler.
  The `ChevronDown` is removed — there is one export type, not a menu.
- Button posts the dashboard's derived state — soil samples, water
  systems trio (earthworks · storage · watercourses), ecology
  observations + zones, and the four site-data layer summaries — to
  `api.exports.generate()`.
- Server renders an `Earth · Water · Ecology Report` PDF and returns
  `storageUrl` via the existing envelope shape.
- The neighbouring `This season ▾` button stays inert; flagged here
  as a future inert-CTA deletion candidate (no backing surface).

**No new infrastructure.** Same `project_exports` table, same
`StorageProvider`, same Puppeteer singleton, same `baseLayout()` shell.

## Implementation

### Backend (3 files)

- **`packages/shared/src/schemas/export.schema.ts`** — extended
  `ExportType` with `'earth_water_ecology_report'`. Added
  `EarthWaterEcologyPayload` with four slices:
  - `soilSamples` — date · label · depth · pH · OM% · texture · CEC ·
    EC · bulk density · biological activity · perc rate · depth to
    bedrock · `hasJarTest` · `hasRoofCatchment` · notes · lab ·
    location. Nested lab-test objects collapse to presence booleans
    so the request stays small.
  - `waterSystems` — `{ earthworks, storageInfra, watercourses }`
    mirroring `useWaterSystemsStore` per-id triples.
  - `ecology` — observations + zones + optional `successionStage`.
  - `siteLayers` — opaque `z.record(z.unknown())` summary blobs for
    watershed + soils, plus boolean flags for wetlands and critical
    habitat presence (computed from layer summaries in the handler).

- **`apps/api/src/services/pdf/templates/earthWaterEcologyReport.ts`**
  (new) — `renderEarthWaterEcologyReport(data: ExportDataBag): string`.
  - Gradient hero (Earth Green → Cool teal, `#ECFDF5 → #ECFEFF`)
    summarising soil-sample, water-feature, and observation counts.
  - 4-column KPI strip: avg pH · avg organic matter · water-feature
    total · ecology-observation total. Colour-coded against pH /
    OM / count rubrics.
  - Soil-sample table — date · label · depth · pH (colour-coded) ·
    OM% · texture · biological activity · notes.
  - Field-test inventory mini-grid: jar tests count · percolation
    tests (count + avg in/hr) · roof-catchment samples count.
  - Water-systems section with three sub-tables:
    - Earthworks: type, length, notes, logged.
    - Storage: type, capacity, coords, notes.
    - Watercourses: kind, perennial flag, notes, logged.
  - Ecology section: observation table (species · trophic · date ·
    notes) + zone count with site-wide stage badge if set.
  - 2×2 site-layer synthesis: watershed flow direction · wetlands
    proximity · critical-habitat overlap · soils-layer summary.
  - Recommended actions table — heuristic priority badges derived
    from data ("Trace watercourses" if zero, "Map riparian buffer"
    if wetlands present, etc.).
  - Empty-state via `notAvailable()` if `payload.earthWaterEcology`
    absent.

- **`apps/api/src/services/pdf/templates/index.ts`** — registered the
  new template (`earth_water_ecology_report:
  renderEarthWaterEcologyReport`).

### Frontend (1 file)

- **`apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx`** —
  added `useState`, `api`, and three additional layer helpers
  (`getWetlandsLayer`, `getCriticalHabitatLayer`, `getSoilsLayer`) to
  the imports. New `handleExport` walks the per-project filtered
  store arrays, converts each to the schema shape with conditional
  spreads to satisfy Zod strict `.optional()`, computes the site-layer
  presence flags from layer summaries, and calls
  `api.exports.generate(id, { exportType: 'earth_water_ecology_report',
  payload: { earthWaterEcology: ... } })`. Result opened via
  `window.open(data.storageUrl, '_blank')`.
  Inner `TabsAndActions` now accepts `{ onExport, exporting }` props,
  the inert `Export report` button is wired with `onClick` +
  `disabled`, the trailing `ChevronDown` is removed, and the label
  flips to `Generating…` while the request is in flight.

> No DB migration — `project_exports.export_type` is free-text at the
> DB level; only the Zod enum gates new values. Matches SWOT +
> Topography precedent.

## Consequences

### Positive
- **Recipe locked.** Three modules now wired (SWOT trio · Topography ·
  Earth · Water · Ecology) — the cost per module is genuinely 1
  schema extension + 1 template file + 1 dashboard edit + 1 registry
  line. tsc clean across both apps. No service changes.
- One inert-CTA loop closed: the long-standing `Export report`
  dropdown affordance on `TabsAndActions` is real and points at one
  destination instead of an unbuilt menu.
- Site-layer summaries flow into the PDF without forcing the schema
  to know each layer's shape — `z.record(z.unknown())` keeps the
  contract narrow while letting templates render defensively per
  cell.

### Negative
- `EarthWaterEcologyPayload` is the largest mirror schema yet (four
  slices, ~20 fields on `soilSamples` alone). Drift risk grows
  proportionally. Acceptable as the third repetition under the
  "rule of three" — but the fourth module to ship this pattern
  earns a `packages/shared/src/store-mirrors/` indirection rather
  than another inline schema.
- The dashboard's `handleExport` is verbose (conditional-spread
  walks on three stores). Same trade-off Topography accepted; a
  shared `toExportPayload()` helper now has three callers asking
  for it and is the cheapest refactor available on the next
  Observe module.
- The `This season ▾` button is still inert. Flagged for deletion
  unless a real season-filter surface lands.

### Pattern lock (unchanged from Topography ADR)
1. Extend `ExportType` enum + add `<Module>Payload` zod schema in
   `export.schema.ts`.
2. Add `<Module>Report.ts` template in `apps/api/src/services/pdf/templates/`.
3. Register in `TEMPLATE_REGISTRY` in `templates/index.ts`.
4. Add `Export …` button + `handleExport` in the dashboard.

Five files (4 code + 1 ADR) plus three wiki touch-ups. tsc clean.
No DB migration.

## References
- Topography export ADR: `wiki/decisions/2026-05-10-atlas-topography-export.md`
- SWOT export ADR: `wiki/decisions/2026-05-10-atlas-swot-export-pipeline.md`
- PDF service entity: `wiki/entities/pdf-export-service.md`
- Stores: `apps/web/src/store/{soilSampleStore,waterSystemsStore,ecologyStore}.ts`
- Derivations: `apps/web/src/v3/observe/modules/earth-water-ecology/derivations.ts`
