# 2026-05-22 — Planting-plan export + merged species schedule (PDC Phase B)

**Status.** Accepted. Phase B of the "make Atlas the only tool a
student uses to produce an OSU PDC portfolio" roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`).

**Branch.** `feat/atlas-permaculture`

**Commit.** `7175f060`

## Context

The roadmap's Phase B was scoped as "seed a species dataset (B1) → build
a guild/companion builder (B2) → export a planting-plan diagram (B3)."
Exploration of the v3 Plan stage (2026-05-22) **overturned that premise:**
B1 and B2 already exist and are wired in.

- **B1 (species data) — already built.** `apps/web/src/data/plantCatalog.ts`
  (200+ perennial-first entries: `layer`, `hardinessZones`,
  `lightNeeds`/`waterNeeds`, `spacingM`, `companions`/`incompatible`, …) +
  `ecocropSubset.ts` (2071 FAO annuals). Lookups: `findEntry(id)` /
  `findSpecies(id)`. Suitability ranking in `siteMatch.ts`, surfaced by
  `PlantDatabaseSiteMatchCard`.
- **B2 (guild/companion builder) — already built.** `usePolycultureStore`
  holds `Guild` (anchor + `members: GuildMember[]`) and `SpeciesPick[]`;
  mounted v3 cards (`GuildSpatialBuilderCard`, `GuildIntegrityCard`,
  `CanopySuccessionCard`, …) + on-map `GuildTool`. Companion logic in
  `lib/companionPlanting.ts` + `guildIntegrityMath.ts`. Crop polygons in
  `useCropStore` (`CropArea`: `species: string[]`, `type`, `areaM2`,
  spacing).

**The genuine gap was B3 only** — `planting_plan` existed *nowhere in
source* (only in generated `graphify-out/` artifacts). No PDF template,
not in the `ExportType` union, no web trigger.

**Confirmed scope (user, 2026-05-22):** export + verify; the schedule is
merged from **both** guilds *and* crop areas; the trigger is a 4th entry
in the existing A5 `MapSheetExportControl` dropdown — the same captured-map
pattern, no new mount.

## The load-bearing decision: a separate `plantingPlan` payload key + a merged schedule

### Why a separate payload key, not an overload of `mapSheet`

`PlantingPlanPayload = MasterPlanPayload.extend({ schedule })` — it reuses
the captured-map base (`mapImages` + `legend` + `narrative`) and adds the
species schedule. It is wired into `CreateExportInput.payload` as its **own
key** (`plantingPlan`), *not* by overloading the existing `mapSheet` key.

**Rejected — reuse `mapSheet`.** Adding `schedule` to `MasterPlanPayload`
in place would have widened the contract that the three already-shipped
captured-map templates (`master_plan` / `base_map_sheet` / `zone_map_sheet`)
read. A separate key keeps those three contracts byte-identical and lets
the planting-plan template read exactly one well-typed shape. The cost is a
second optional key on `CreateExportInput`; the benefit is zero blast radius
on shipped exports.

### Why the schedule merges BOTH design sources

A PDC Week 7–8 planting plan is the union of the *designed perennial system*
(guilds — canopy/shrub/herb layering) and the *cultivated annual/orchard
areas* (crop polygons). Either alone is an incomplete plant list. The merge
is therefore the contract, not an option:

- **Guilds** → one row per *distinct* member `speciesId` per guild (anchor
  included), counted. `findEntry(speciesId)` resolves
  `species`/`latinName`/`layer`/`spacingM.inRow`; `source = guild.name`,
  `sourceKind: 'guild'`, `count` = members of that species in the guild.
- **Crop areas** → one row per entry in `cropArea.species[]`. `findEntry`
  resolves known ids; **unknown strings pass through as raw text** (crop
  species are free-form, not all catalog ids). `layer` falls back to a
  crop-type→layer map (`CROP_TYPE_LAYER`: orchard/food_forest/silvopasture/
  windbreak/shelterbelt → canopy; nursery → shrub; row_crop/garden_bed/
  market_garden/pollinator_strip → herbaceous). `source = cropArea.name`,
  `sourceKind: 'crop_area'`, `spacingM = cropArea.treeSpacingM ?? undefined`,
  `areaM2 = cropArea.areaM2`.

The `sourceKind` discriminant is what lets the server template group the
table Guilds-first-then-Crop-areas and pick the right size cell (`count×`
for guilds, area for crop areas).

### The `PlantingScheduleRow` contract

```ts
export const PlantingScheduleRow = z.object({
  species: z.string(),              // resolved common name, else raw text
  latinName: z.string().optional(),
  layer: z.string().optional(),     // guild layer OR crop-type-derived
  source: z.string(),               // guild name OR crop-area name
  sourceKind: z.enum(['guild', 'crop_area']),
  count: z.number().optional(),     // guild member count
  spacingM: z.number().optional(),  // catalog spacingM.inRow OR cropArea.treeSpacingM
  areaM2: z.number().optional(),    // crop-area area
});
```

The merge logic (`buildPlantingSchedule(guilds, cropAreas)`) is a **pure,
exported** function in `MapSheetExportControl.tsx` — no map/DOM access — so
the both-source merge, member dedupe+count, catalog resolution, raw
passthrough, and crop-type layer derivation are all unit-testable without a
live MapLibre instance.

## Implementation

### B-1 — Shared schema (`packages/shared/src/schemas/export.schema.ts`)

- `'planting_plan'` added to the `ExportType` enum.
- `PlantingScheduleRow` + `PlantingPlanPayload` (= `MasterPlanPayload.extend
  ({ schedule })`) defined after `MasterPlanPayload`.
- `plantingPlan: PlantingPlanPayload.optional()` wired into
  `CreateExportInput.payload` as a separate key. Re-exported via the
  `@ogden/shared` barrel automatically (`export *` on the schema module).

### B-2 — Server template (`apps/api/src/services/pdf/templates/plantingPlan.ts`, NEW)

- Copies the `mapSheet.ts` thin-sibling structure: local `isImageDataUrl` /
  `renderMapImage` / `renderLegend` helpers + `baseLayout`/`esc`/`fmtDate`/
  `fmtNumber`/`notAvailable` from `baseLayout.js` (follows the existing
  duplication precedent between `mapSheet.ts` and `masterPlan.ts` rather than
  refactoring a shared module in this slice).
- Reads `payload?.plantingPlan`; empty/absent → `notAvailable(...)`. Hero
  shows species/guild/crop counts. Composes captured map image(s) → legend →
  species schedule `<table>` grouped by `sourceKind` (Guilds first, then
  Crop areas), columns Species (common + latin) · Layer · Source · Spacing ·
  Area/Qty.
- Registered `planting_plan: renderPlantingPlan` in the exhaustive
  `TEMPLATE_REGISTRY` (a missing `ExportType` key fails the TS build — the
  safety net).

### B-3 — Web trigger (`apps/web/src/v3/plan/MapSheetExportControl.tsx`)

- `'planting_plan'` added to `SheetExportType` (kept distinct from the
  narrower `MapSheetType` that `buildMapSheetPayload` accepts); a 4th
  `SHEET_EXPORTS` row renders the dropdown item automatically.
- `CROP_TYPE_LAYER` map + pure exported `buildPlantingSchedule` +
  `buildPlantingPlanPayload`. `handleExport` branches on `planting_plan`.
  DesignPage mount unchanged (the control already holds the live map).

## Security

Same data-URL injection guard as Phase A: the captured `dataUrl` is
interpolated unescaped into `<img src>`, so `renderMapImage` gates it through
`isImageDataUrl` (png/jpeg/jpg/webp base64 only) — forged `javascript:` URLs
are dropped. Species/source/caption text is `esc`-escaped. Locked by a unit
test.

## Tests / verification

- `apps/api/src/tests/plantingPlan.pdfTemplate.test.ts` (NEW, 3/3) — embeds
  map + legend + grouped schedule; injection guard drops a non-image
  dataUrl; not-available path.
- `apps/web/src/v3/plan/__tests__/MapSheetExportControl.test.ts` (10/10 — 5
  prior + 5 new) — catalog resolution, member dedupe+count, crop layer/area +
  raw passthrough, both-source merge, `plantingPlan` payload shape.
- api `tsc` exit 0. web `tsc` (8 GB node script): zero errors in the new
  files; the 3 known pre-existing unrelated errors remain (`StepBoundary.tsx`,
  two `HostUnion*` tests). A 4th file in the error list,
  `apiClient.clientError.test.ts`, is **foreign uncommitted WIP** (the
  client-error telemetry change) — not this slice; preserved.

## Verification deferrals

- **Live Plan-view export-to-PDF screenshot** — reaching the dropdown needs
  auth + seeded project + headless WebGL + MapTiler key, the same wall Phase
  A/A5 sat behind. Stated, not claimed (per project CLAUDE.md). Covered
  meanwhile by the web + api unit tests and typecheck.

## Follow-ups

- The local `isImageDataUrl`/`renderMapImage`/`renderLegend` triplet is now
  duplicated across `mapSheet.ts` / `masterPlan.ts` / `plantingPlan.ts` — a
  shared `capturedMapHelpers.ts` lift is a candidate if a 4th map template
  lands.
- **Phase C** — finish Plan-stage authoring (Weeks 4/9), independent.

## Related

- Log: [[log/2026-05-22-planting-plan-export-pdc-phase-b]]
- Phase A ADR: [[decisions/2026-05-21-atlas-master-plan-map-export]]
- Entity: [[entities/pdf-export-service]]
