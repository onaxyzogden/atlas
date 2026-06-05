# 2026-05-22 — Planting-plan export (PDC Phase B)

**Branch:** `feat/atlas-permaculture`
**Commit:** `7175f060`
**ADR:** [[2026-05-22-atlas-planting-plan-merged-schedule]]
**Roadmap:** `~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`

## What & why

Phase B of the OSU-PDC roadmap is the plant / guild / planting-plan layer
for Weeks 7–8. **Exploration up front overturned the roadmap's premise:**
B1 (curated species data) and B2 (guild / companion builder) **already exist
and are wired into the v3 Plan stage** — `plantCatalog.ts` (200+ perennials)
+ `ecocropSubset.ts` (2071 FAO annuals), `usePolycultureStore` guilds with a
full mounted card suite (`GuildSpatialBuilderCard`, `GuildIntegrityCard`,
`CanopySuccessionCard`, …) + the on-map `GuildTool`, companion logic in
`companionPlanting.ts` / `guildIntegrityMath.ts`, crop polygons in
`useCropStore`. The **only** genuine gap was **B3 — the `planting_plan`
export** (the term existed only in generated `graphify-out/` artifacts, never
in source). So Phase B reduced to: build the missing export + verify the
existing pick-species → guild → export flow.

**Confirmed scope (user, 2026-05-22):** export + verify; schedule merged from
**both** guilds *and* crop areas; trigger = a new entry in the existing A5
`MapSheetExportControl` dropdown (the same captured-map pattern, no new mount).

## Approach — reuse the A5 captured-map pattern exactly

Client captures the live MapLibre canvas → ships a base64 PNG + a derived
species schedule in `payload.plantingPlan` → a new server template composes
them. No new infra; mirrors `master_plan` / `base_map_sheet` / `zone_map_sheet`.

## Slices (single commit `7175f060`)

- **Shared schema** (`packages/shared/src/schemas/export.schema.ts`) —
  `'planting_plan'` added to the `ExportType` enum; new `PlantingScheduleRow`
  + `PlantingPlanPayload` (= `MasterPlanPayload.extend({ schedule })` — reuses
  map image + legend + narrative); `plantingPlan` wired into
  `CreateExportInput.payload` as a **separate key** (not `mapSheet`) so the
  base/zone/master contracts stay untouched.
- **Server template** (`apps/api/src/services/pdf/templates/plantingPlan.ts`,
  new) — copies the `mapSheet.ts` thin-sibling structure (local
  `isImageDataUrl` / `renderMapImage` / `renderLegend` + `baseLayout` helpers,
  per the existing duplication precedent rather than a shared-module refactor)
  + a species schedule `<table>` grouped Guilds-then-Crop-areas, columns
  Species (common + latin) · Layer · Source · Spacing · Area/Qty. Registered
  `planting_plan: renderPlantingPlan` in the exhaustive `TEMPLATE_REGISTRY`.
- **Web** (`apps/web/src/v3/plan/MapSheetExportControl.tsx`) — 4th dropdown
  entry "Planting Plan"; `SheetExportType` split into `MapSheetType` (the 3
  existing) ∪ `'planting_plan'` so `buildMapSheetPayload` keeps its narrow
  type. New pure exported `buildPlantingSchedule(guilds, cropAreas)` merges
  the two sources (guild rows dedupe member species + count, anchor included;
  crop rows derive layer from `CropAreaType` and carry area) with
  `findEntry` catalog name/spacing resolution (raw passthrough on miss). New
  `buildPlantingPlanPayload` returns `{ plantingPlan: … }`; `handleExport`
  branches on `planting_plan`. DesignPage mount unchanged.

## Reuse (no new infra)

`captureMapImage`, `api.exports.generate`, `MapControlPopover`, `buildLegend`
+ `useZoneStore`, `usePolycultureStore`, `useCropStore`, `findEntry`,
`baseLayout` helpers, the `isImageDataUrl` injection guard.

## Verification

- **api** `plantingPlan.pdfTemplate.test.ts` — 3/3 (image + legend + grouped
  schedule renders; `javascript:` dataUrl dropped by the guard; not-available
  path). **web** `MapSheetExportControl.test.ts` — 10/10 (5 prior + 5 new:
  catalog resolution, member dedupe+count, crop layer/area + raw passthrough,
  both-source merge, `plantingPlan` payload shape).
- **api tsc** exit 0. **web tsc** (8 GB node script): zero errors in the new
  files; the 3 known pre-existing unrelated errors remain (`StepBoundary.tsx`,
  two `HostUnion*` tests). A 4th file in the error list,
  `apiClient.clientError.test.ts`, is **foreign uncommitted WIP** (the
  client-error telemetry change, commit `004e4ad7` + working-tree edits) — not
  this slice. Staged the 6 files by name; foreign WIP preserved.
- **Deferred (stated, not claimed):** live Plan-view export-to-PDF screenshot —
  reaching the dropdown needs auth + seeded project + headless WebGL + MapTiler
  key, the same wall Phase A/A5 sat behind. Covered meanwhile by unit tests +
  typecheck.

## Follow-ups

- When a live preview env is available, screenshot the dropdown + Planting Plan
  export → download (closes the deferred e2e for the whole captured-map family).
- The local `isImageDataUrl`/`renderMapImage`/`renderLegend` triplet is now
  duplicated across `mapSheet.ts` / `masterPlan.ts` / `plantingPlan.ts` — a
  shared `capturedMapHelpers.ts` lift is a candidate if a 4th map template lands.
- **Phase C** — finish Plan-stage authoring (Weeks 4/9), independent.
