# 2026-05-10 — Topography report export (template-reuse validation)


Extended the export pattern shipped earlier today (SWOT trio, ADR
`2026-05-10-atlas-swot-export-pipeline.md`) to a fourth Observe
module — **Topography & Base Map** — to validate that the recipe
generalises beyond SWOT.

Changes:

- **`packages/shared/src/schemas/export.schema.ts`** — added
  `'topography_report'` to `ExportType`; added `TopographyPayload`
  zod schema mirroring the dashboard's derived state (elevation
  summary, contours, high points, drainage lines, transects); added
  optionally to `CreateExportInput.payload`.
- **`apps/api/src/services/pdf/templates/topographyReport.ts`** (new) —
  hero · 4-column KPI strip with slope-severity rubric · feature
  inventory · 2×2 implications grid · transect + elevation-pin tables
  · recommended actions.
- **`apps/api/src/services/pdf/templates/index.ts`** — registered.
- **`apps/web/src/v3/observe/modules/topography/TopographyDashboard.tsx`** —
  `Export terrain report` button wired in the header. Payload built
  with conditional spreads to satisfy Zod's strict `.optional()`
  (skip undefined fields rather than emit them).

Validates the pattern: 4 files per new export, tsc clean, no DB
migration. Pattern recipe (4-step recipe) documented in the ADR for
future Observe modules (Earth · Water · Ecology, Macroclimate,
Sectors & Zones, etc.).

ADR: `wiki/decisions/2026-05-10-atlas-topography-export.md`.
