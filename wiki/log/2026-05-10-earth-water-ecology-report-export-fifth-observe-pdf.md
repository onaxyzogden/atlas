# 2026-05-10 — Earth · Water · Ecology Report export (fifth Observe PDF)


Third application of the per-module export recipe locked in the
Topography ADR earlier today — extended to the densest Observe
surface (Module 4: Earth · Water & Ecology Diagnostics), which reads
from three domain stores plus four site-data layers.

Recipe step-by-step:
- Extended `ExportType` enum + added `EarthWaterEcologyPayload` zod
  schema (four slices: `soilSamples`, `waterSystems`, `ecology`,
  `siteLayers`) in `packages/shared/src/schemas/export.schema.ts`.
- New template `apps/api/src/services/pdf/templates/earthWaterEcologyReport.ts`
  — gradient hero, 4-column KPI strip (avg pH / OM / water-features /
  observations), soil-sample table, field-test mini-grid (jar / perc /
  roof), water-systems trio sub-tables, ecology section, 2×2 site-layer
  synthesis, recommended-actions table with heuristic priorities.
- Registered in `templates/index.ts`.
- Wired previously inert `Export report` button in
  `EarthWaterEcologyDashboard.tsx` (removed the decorative `ChevronDown`
  affordance — there is no menu).

tsc clean across `apps/api` and `apps/web`. No DB migration.

Recipe verdict — at three repetitions, cost per new module remains
~4 files, tsc clean, no service changes. Rule of three met; next
Observe module to ship the pattern earns a shared
`packages/shared/src/store-mirrors/` indirection rather than another
inline schema.

ADR: `wiki/decisions/2026-05-10-atlas-earth-water-ecology-export.md`.
