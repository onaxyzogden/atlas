# 2026-05-21 — Master-plan / composite map export (PDC Phase A)

**Status.** Accepted. Phase A of the "make Atlas the only tool a
student uses to produce an OSU PDC portfolio" roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`).

**Branch.** `feat/atlas-permaculture`

## Context

Assessment of Atlas against the OSU Permaculture Design Certificate
(Andrew Millison, 21 assignments / 10 weeks → portfolio via Canvas +
peer-review blog) found Atlas already covers ~70–75% of the design
work and is *superior* to the standard PDC toolkit on the analysis
weeks (climate, site, water, soil, ecology — it ships a Sector Compass
by the course's exact name and auto-fetches SSURGO/NOAA/3DEP/NHD).

Three gaps block a student from producing the *entire* portfolio
inside Atlas. In leverage order: (1) **no composite / master-plan map
export** — the gradeable visual artifact for Weeks 2, 4, 9, 10 is an
annotated map sheet, and Atlas drew every feature and fetched every
layer but exported only tables + narrative, never the rendered design
map; (2) thin plant/guild/planting-plan layer (Weeks 7–8); (3)
Plan-stage authoring is mid-build. This ADR closes gap #1 — the #1
blocker.

## The load-bearing decision: client-capture, not server-render

**Chosen:** the web client captures the live MapLibre canvas to a
base64 PNG and ships it inside the export `payload`; a new server
template composes that image with the project's zone roster, legend,
narrative, and feature inventory into the A4 PDF.

**Rejected — server-side map renderer.** A headless MapLibre/Mapbox
render on the API side would have meant standing up a second WebGL
runtime (or a tile-stitching pipeline), re-fetching every overlay the
client already has loaded, and reconciling style/zoom/viewport state
across the network. The client *already* holds the exact rendered
view the steward is looking at — drawn zones, sectors, structures, the
chosen basemap, the current pan/zoom. Capturing it is one
`canvas.toDataURL()` call. The existing export pipeline (Puppeteer
HTML→A4 PDF→S3) needs no new infrastructure; the captured image is
just another field on the `payload`, mirroring how `topography_report`
already references pre-baked raster URLs.

This reuses 100% of the export infra and guarantees the PDF shows
*what the steward saw*, which is exactly the grading contract for an
annotated-map deliverable.

## Implementation

### A1 — Map canvas capture (web)

- `apps/web/src/v3/components/DesignMap.tsx` — added
  `preserveDrawingBuffer: true` to the `new maplibregl.Map({...})`
  constructor. **Required:** without it the WebGL backbuffer is
  cleared before `toDataURL` runs and yields a blank image.
- `apps/web/src/v3/plan/captureMapImage.ts` (NEW) —
  `captureMapImage(map, options)`. Forces a render frame
  (`triggerRepaint` → `once('idle')`) so the latest tiles + overlay
  layers are present in the drawing buffer, reads `getCanvas()`, then
  downscales via an offscreen canvas if the longest edge exceeds
  `maxEdgePx` (default 2400; keeps the base64 payload bounded).
  Default `image/png` for crisp vector overlays.

### A2 — Export schema (shared)

- `packages/shared/src/schemas/export.schema.ts` — added
  `master_plan`, `base_map_sheet`, `zone_map_sheet` to the
  `ExportType` union; defined `MapSheetImage` (`dataUrl` + optional
  `caption`/`widthPx`/`heightPx`), `MapLegendEntry`
  (`label`/`color`/`kind: fill|line|point`), and `MasterPlanPayload`
  (`mapImages` min 1, optional `legend`, `narrative`, `zones[]`,
  `prevailingWind`); wired `mapSheet: MasterPlanPayload.optional()`
  into `CreateExportInput.payload`. Re-exported via the `@ogden/shared`
  barrel.

### A3 — Templates (api)

- `apps/api/src/services/pdf/templates/masterPlan.ts` (NEW) —
  `renderMasterPlan`. Composes: hero header, captured-map section,
  legend grid, design narrative (split on blank lines), zone roster
  table with total row, feature-inventory KPI cards by `feature_type`,
  and a phasing table (only when >1 phase). Zone roster prefers
  `payload.mapSheet.zones`, else derives from `designFeatures`
  (`feature_type === 'zone'`, reading `properties.areaM2 /
  permacultureZone / primaryUse`).
- `apps/api/src/services/pdf/templates/mapSheet.ts` (NEW) —
  `renderBaseMapSheet` ('Base Map') + `renderZoneMapSheet` ('Zone
  Map'), thin variants delegating to a private `renderSheet` (image +
  legend + optional narrative, no inventory tables). Satisfies W2 Base
  Map and W4 Map Current Zones directly.
- `apps/api/src/services/pdf/templates/index.ts` — registered all
  three in `TEMPLATE_REGISTRY` (the registry is exhaustive over
  `ExportType`, so an unregistered new type fails the TS build —
  registration is mandatory, not optional).

### A4 — Web action

- `apps/web/src/v3/plan/MasterPlanExportButton.tsx` (NEW) — floating
  Plan-stage control mounted inside the `DesignMap` render-prop so it
  holds the live `maplibregl.Map`. Captures the canvas, assembles the
  zone roster + dedup'd category legend from `useZoneStore`, and POSTs
  via the same `api.exports.generate(projectId, { exportType:
  'master_plan', payload })` path `ReportingPanel` uses. The
  `ReportingPanel` itself has no access to the live map instance —
  hence the button lives in the `DesignPage` render-prop.
- `apps/web/src/v3/pages/DesignPage.tsx` — imports and mounts
  `<MasterPlanExportButton map={map} projectId={project.id} />`.

## Security — data-URL injection guard

The captured image is interpolated into HTML as `<img src="...">`
without escaping the data URL (escaping a base64 URL would corrupt
it). To prevent HTML/script injection through a forged `dataUrl`,
both templates gate every image through
`isImageDataUrl(s) = /^data:image\/(png|jpeg|jpg|webp);base64,/.test(s)`.
Non-image strings (e.g. `javascript:alert(1)`) are dropped entirely —
they never reach the markup. Captions and narrative *are* escaped via
the shared `esc` helper. This is locked by a unit test.

## Tests / verification

- `apps/api/src/tests/masterPlan.pdfTemplate.test.ts` (NEW, 7 tests,
  all green) — image embed + legend + client zone roster;
  derive-zones-from-`designFeatures` fallback; injection guard rejects
  `javascript:alert(1)`; not-available path; base/zone map-sheet
  titles; not-available fallback.
- All packages typecheck (web via
  `node --max-old-space-size=8192 .../tsc --noEmit`; 3 pre-existing
  unrelated web errors confirmed untouched).
- **Visual proof.** A temporary Puppeteer harness rendered a
  representative captured map (satellite gradient + 4 labelled zone
  polygons) through `renderMasterPlan` to a real A4 PDF + full-page
  PNG using the same Puppeteer settings `PdfExportService` uses. The
  screenshot confirmed the captured map, 4-entry legend, narrative,
  zone roster with totals, feature-inventory KPIs, and phasing table
  all render correctly. Harness deleted after verification (not
  committed).

## Verification deferrals

- **True browser e2e** (auth + seeded project + headless WebGL
  capture + MapTiler key) was judged high-risk/high-effort for this
  environment. Stated explicitly per project CLAUDE.md "say so rather
  than assuming success." The Puppeteer render exercises the actual
  production HTML→PDF path; the capture util's WebGL dependency
  (`preserveDrawingBuffer`) is a one-line init flag with a documented
  failure mode (blank image) rather than a logic path needing a test.

## Commits

- `b2c8c2f8` — A2/A3 schema + templates
- `ffa66469` — A1 capture util
- `0d43ed51` — A4 export button
- `972a7ae7` — A3 template tests

## Roadmap status

Phase A **shipped**. Server side already delivers `base_map_sheet` /
`zone_map_sheet` (A5 only needs thin web buttons reusing the same
capture). Phase B (plant/guild/planting-plan, Weeks 7–8) and Phase C
(finish Plan-stage authoring, Weeks 4/9) not started.

## Out of scope (by design)

- Replacing Canvas or the peer-review blog — that is the course LMS.
- Server-side map rendering (see decision above).
- A scale bar / north arrow composited *into* the capture — the
  template carries a `prevailingWind` field and legend; a true
  cartographic scale bar is a v2 follow-up.
- Uploading the capture to S3 first and passing a URL (the base64
  payload is bounded by the 2400px downscale + the existing 50MB body
  limit; revisit only if payloads bloat).
