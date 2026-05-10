# ADR — Atlas Topography Report Export

**Date:** 2026-05-10
**Status:** Accepted
**Context tags:** atlas, observe, topography, pdf-export, template-reuse

## Context

The SWOT export pipeline (ADR `2026-05-10-atlas-swot-export-pipeline.md`)
landed three new PDF templates and reintroduced three deleted CTA
buttons in a single coherent surface. The remaining open question was
whether the *pattern* — a per-module Zod payload schema +
`baseLayout()`-wrapped template + `api.exports.generate()` button
handler — is genuinely reusable for other Observe modules, or whether
it leaned on SWOT-specific shape.

This ADR validates the claim by extending the same pattern to **Module 3:
Topography & Base Map** in a single sitting.

## Decision

Add a fourth Observe export, `topography_report`, following the SWOT
pattern exactly. No abstraction extracted — duplication held until a
third Observe module asks for it.

**Surface:**
- New `Export terrain report` button in `TopographyDashboard`'s header.
- Posts the dashboard's derived state — sampled DEM elevation summary,
  contour / high-point / drainage-line / transect inventories — to
  `api.exports.generate()`.
- Server renders a `Topography Report` PDF and returns a `storageUrl`
  via the existing envelope shape.

**No new infrastructure** — same `project_exports` table, same
`StorageProvider`, same Puppeteer browser singleton, same
`baseLayout()` shell.

## Implementation

### Backend (3 files)

- **`packages/shared/src/schemas/export.schema.ts`** — extended
  `ExportType` enum with `'topography_report'`. Added new
  `TopographyPayload` zod schema mirroring the relevant slice of
  `topographyStore` (`elevationSummary`, `contours`, `highPoints`,
  `drainageLines`, `transects`); added optionally to
  `CreateExportInput.payload`.

- **`apps/api/src/services/pdf/templates/topographyReport.ts`** (new) —
  `renderTopographyReport(data: ExportDataBag): string`.
  - Gradient hero (Earth Green → Harvest Gold) summarising aspect,
    relief, and annotation totals.
  - 4-column KPI strip: mean slope · max slope · total relief ·
    predominant aspect — colour-coded against a slope-severity rubric.
  - Feature inventory table (contours / high points / drainage lines /
    transects with "what it unlocks" hints).
  - 2×2 design-implications grid: slope-severity card · drainage card ·
    aspect/solar card · buildable-anchors card.
  - Cross-section transect table — From → To, length, source API,
    confidence badge, sampled date.
  - Elevation-pin table (omitted when no pins).
  - Recommended-next-actions table with priority badges.
  - Empty-state via `notAvailable()` if `payload.topography` absent.

- **`apps/api/src/services/pdf/templates/index.ts`** — registered the
  new template in `TEMPLATE_REGISTRY`.

### Frontend (1 file)

- **`apps/web/src/v3/observe/modules/topography/TopographyDashboard.tsx`** —
  added `Download` lucide import, `useState`, `api` import. New
  `handleExport` builds the payload by stripping `undefined`-valued
  optional fields (matches Zod's `.optional()` semantics) and calls
  `api.exports.generate(id, { exportType: 'topography_report',
  payload: { topography: ... } })`. Result opened via
  `window.open(data.storageUrl, '_blank')`. Header gains
  `{ onExport, exporting }` props and a `Generating…` / `Export
  terrain report` button.

> No DB migration — `project_exports.export_type` is free-text at the
> DB level; only the Zod enum gates new values.

## Consequences

### Positive
- **Pattern validated.** The SWOT trio wasn't a one-off. Each new
  module costs ~1 schema extension + 1 template file + 1 dashboard
  edit + 1 registry line. No service changes.
- Fourth Observe export wired with real handler closes the
  inert-CTA-rule loop on one more module.
- Template reads cleanly under `baseLayout()`'s existing CSS — no
  new design-system tokens introduced.

### Negative
- `TopographyPayload` duplicates a subset of `topographyStore` types,
  same drift risk as `SwotPayload`. Acceptable until duplication
  reaches a third or fourth module — at that point a
  `packages/shared/src/store-mirrors/` indirection earns its keep.
- The dashboard's `handleExport` builds the payload inline with
  conditional spreads to satisfy Zod's strict `optional()` (not
  `nullable()`) treatment. Verbose; if a third module repeats the
  pattern, lift it into a `toExportPayload()` helper.

### Pattern lock
The recipe for adding any further Observe export is now:

1. Extend `ExportType` enum + add `<Module>Payload` zod schema in
   `export.schema.ts`.
2. Add `<Module>Report.ts` template in `apps/api/src/services/pdf/templates/`.
3. Register in `TEMPLATE_REGISTRY` in `templates/index.ts`.
4. Add `Export …` button + `handleExport` in the dashboard.

Four files. tsc clean across both apps. No DB migration.

## References
- SWOT export ADR: `wiki/decisions/2026-05-10-atlas-swot-export-pipeline.md`
- PDF service entity: `wiki/entities/pdf-export-service.md`
- Topography store: `apps/web/src/store/topographyStore.ts`
