# Atlas — Sectors, Microclimates & Zones Export + EWE inert-CTA sweep
**Date:** 2026-05-10
**Status:** accepted

## Context

Six Observe-stage PDF exports have shipped under the locked 4-file
recipe (SWOT trio, Topography, Earth · Water · Ecology, Macroclimate).
Two threads to close in this session:

1. **EWE inert-CTA sweep.** The Earth · Water · Ecology dashboard
   shipped with three inert CTA surfaces that we deferred while wiring
   the export: a six-tab section bar (Overview / Soil / Water /
   Ecology / Lab Results / Trends), a `This season ▾` dropdown, and a
   four-tab species filter (All / Flora / Fauna / Fungi). None of
   these had a live target — they violate the symmetric inert-CTA
   rule (delete or wire).
2. **Seventh Observe export.** Sectors, Microclimates & Zones is the
   next densest unshipped Observe surface (two stores —
   `externalForcesStore.sectors` + `zoneStore.zones` — plus climate
   layer for prevailing wind, all already rendered to the dashboard).

## Decision

Ship the **`sectors_zones_report`** export under the same recipe, and
in the same commit complete the **EWE sweep** (all three inert
surfaces removed, no replacements). Both changes are additive on the
schema and non-destructive in the dashboard — the live Export button
on EWE is preserved by promoting it out of the doomed tabs row into
its own actions row.

### EWE sweep — what came out

- `TabsAndActions` → renamed `ExportActions`. Six-tab nav nuked; only
  the (live) Export button remains, kept inside the same
  `diagnostic-tabs-row` container so CSS layout is unchanged.
- `This season ▾` (CalendarDays + ChevronDown) button deleted. Lucide
  `CalendarDays` and `ChevronDown` imports dropped.
- `EcologyCard`'s four-tab species filter (All / Flora / Fauna /
  Fungi) deleted. `SpeciesObservationList` is now the entire body of
  the card — it already renders all observations.
- `EcologyCard` props simplified: `boundary` and `caption` were
  unused after the tab strip went, so both removed at the call site
  and the interface. Net: a `<EcologyCard observations={…} />` call.

No replacements. The deletions match the precedent in the
2026-05-10 Observe always-inert CTA audit ADR.

### Sectors & Zones export — 4-file recipe

#### 1. Schema (`packages/shared/src/schemas/export.schema.ts`)

- `ExportType` enum gains `'sectors_zones_report'`.
- New `SectorsZonesPayload`:

```ts
SectorsZonesPayload = z.object({
  sectors: z.array(z.object({ id, type, bearingDeg, arcDeg,
                              intensity?, notes? })),
  zones:   z.array(z.object({ id, name, category, areaM2,
                              primaryUse?, secondaryUse?, notes?,
                              invasivePressure?, successionStage?,
                              seasonality?, permacultureZone? })),
  sectorCounts: { total, wind, sun, fire, noise, wildlife, view },
  zoneCounts:   { total, byCategory: Record<string, number>, totalAreaM2 },
  prevailingWind?: string,
});
```

Added `sectorsZones: SectorsZonesPayload.optional()` to
`CreateExportInput.payload`.

#### 2. Template (`apps/api/src/services/pdf/templates/sectorsZonesReport.ts`)

- Gradient hero (`#ECFDF5 → #EFF6FF`, Earth Green → sky) summarising
  arrow count, zone count, total zoned area, prevailing wind.
- 4-column KPI strip: arrows · zones · high-risk sectors · prevailing
  wind.
- Sector inventory table: type · bearing (N/NE/E/…) · arc · intensity
  badge · notes.
- Sectors-by-type mini-grid: wind / sun / fire / view / noise /
  wildlife.
- Zone inventory table: name · category · area (m² → ha auto) · PC
  zone (Z0–Z5) · invasive · succession · use. Sorted by area desc.
- Zones-by-category grid (sorted by count).
- Heuristic recommended actions covering: fire-defensible buffers,
  windbreak buffer zones, sun-zone food production, sector→zone
  translation gap, zone→sector translation gap,
  medium-or-higher invasive intervention.
- `notAvailable()` empty state if `payload.sectorsZones` absent.

#### 3. Register (`templates/index.ts`)

Import + entry: `sectors_zones_report: renderSectorsZonesReport`.

#### 4. Dashboard wiring (`SectorsDashboard.tsx`)

- Added `useState`, `Download`, `api`, and `pickTruthy` from
  `@ogden/shared` imports.
- `handleExport` builds the payload — uses `pickTruthy` for
  string-ish optionals (`intensity`, `notes`, `primaryUse`, …) and
  inline conditional spreads for the few numeric/enum-with-zero
  fields (`permacultureZone`, `invasivePressure`, …) where truthy
  semantics aren't safe.
- `SectorsHero` gains `onExport` + `exporting` props and an Export
  button beside the title; label flips to `Generating…` mid-flight.

No DB migration — same precedent as every Observe export to date.

## Files

```
packages/shared/src/schemas/export.schema.ts                                    enum + SectorsZonesPayload
apps/api/src/services/pdf/templates/sectorsZonesReport.ts                       NEW template (~350 lines)
apps/api/src/services/pdf/templates/index.ts                                    register
apps/web/src/v3/observe/modules/sectors-zones/SectorsDashboard.tsx              handleExport + button
apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx  inert-CTA sweep
wiki/decisions/2026-05-10-atlas-sectors-zones-export.md                         NEW ADR
wiki/entities/pdf-export-service.md                                             table + note
wiki/log.md                                                                     prepend entry
wiki/index.md                                                                   link ADR
```

## Verification

1. `cd apps/api && tsc --noEmit` — exit 0.
2. `cd apps/web && tsc --noEmit` — exit 0 before and after the sweep.
3. Manual smoke (preview, `mtc` project):
   - `/v3/project/mtc/observe` → Sectors panel → dashboard → click
     `Export sectors report`. Label flips to `Generating…`; new tab
     opens with PDF. Sector + zone tables populated.
   - Open EWE dashboard — confirm six-tab nav gone, "This season"
     button gone, species sub-tabs gone, Export button still works.
4. Empty-state path: project with no sectors + no zones → PDF
   renders `notAvailable()` card with explicit Sectors-module hint.

## Consequences

- **Seven** Observe exports now shipped — covering all five of the
  reviewed Observe modules (SWOT being cross-stage). Remaining
  unshipped Observe surfaces (Module 1 Built Environment + Module 6
  Resources & Inputs + Module 7 Boundaries) are lower-density and
  can wait.
- EWE dashboard now has zero inert CTAs. The symmetric rule holds:
  "delete OR wire," no decorative middle ground.
- `pickTruthy` continues to absorb the bulk of optional-string fields
  cleanly; the four "field-name-remap or zero-is-meaningful" cases on
  zones stay inline (matching the EWE precedent for `hasJarTest` /
  `hasRoofCatchment`).
- Schema additions are non-breaking — clients without
  `sectorsZones` payloads continue to parse as before.

## References

- ADR 2026-05-10 (Topography export, recipe lock)
- ADR 2026-05-10 (Earth · Water · Ecology export)
- ADR 2026-05-10 (Macroclimate export + `pickDefined` lift)
- ADR 2026-05-10 (Observe always-inert CTA audit — precedent for
  delete-over-wire on decorative interactivity)
