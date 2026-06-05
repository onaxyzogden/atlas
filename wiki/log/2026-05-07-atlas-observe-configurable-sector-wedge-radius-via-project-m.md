# 2026-05-07 — Atlas OBSERVE configurable sector wedge radius via project metadata


Centralised the sector wedge outer radius behind a per-project setting.
NEW
[`apps/web/src/v3/observe/lib/sectorRadius.ts`](../apps/web/src/v3/observe/lib/sectorRadius.ts)
exports `DEFAULT_SECTOR_RADIUS_M = 250` and
`getSectorRadiusM(projectId)` — reads `useProjectStore.getState()` and
falls back to the default for unset / non-finite / non-positive values.
[`packages/shared/src/schemas/project.schema.ts`](../packages/shared/src/schemas/project.schema.ts)
gains one optional Zod field on `ProjectMetadata`:
`sectorRadiusM: z.number().positive().max(5000).optional()`. Because the
schema is `.passthrough()` and the DB column is jsonb, no migration is
required.

The renderer
([`ObserveAnnotationLayers.tsx`](../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx))
now subscribes to `metadata.sectorRadiusM` via a Zustand selector and
threads the resolved value into `wedgePolygon`. The exporter
([`annotationExport.ts`](../apps/web/src/v3/observe/lib/annotationExport.ts))
drops the module-level `SECTOR_RADIUS_M = 250` constant; `ExportContext`
gains `sectorRadiusM: number`, computed once per export pass via
`getSectorRadiusM(p.projectId)`.

UI is one numeric input ("Sector wedge radius — m", debounced 300 ms,
clamped `[10, 5000]`) inside the Sectors / Zones module slide-up
([`SectorRadiusControl.tsx`](../apps/web/src/v3/observe/components/SectorRadiusControl.tsx)
mounted in
[`SectorsDashboard.tsx`](../apps/web/src/v3/observe/modules/sectors-zones/SectorsDashboard.tsx)).
Empty input clears the override → fallback to 250 m.

Two new vitest specs in
[`annotationExport.test.ts`](../apps/web/src/v3/observe/lib/__tests__/annotationExport.test.ts):
configured radius vertex distance via `turf.distance` (∈ [480, 520] m
for `sectorRadiusM = 500`), plus a fallback table for invalid values.
Pre-existing 8 specs unchanged. `tsc --noEmit` clean, `vite build` clean
(57.91 s), 10 / 10 export specs pass.

ADR amended in place: see
[2026-05-07 OBSERVE symbology / export ADR](decisions/2026-05-07-atlas-observe-symbology-export.md)
for the full update subsection.
