# Atlas — Built Environment Export (8th Observe export)
**Date:** 2026-05-10
**Status:** accepted

## Context

Seven Observe-stage PDF exports have shipped under the locked 4-file
recipe (SWOT trio, Topography, Earth · Water · Ecology, Macroclimate,
Sectors & Zones). Three Observe modules remained unshipped: Built
Environment (Module 1), Resources & Inputs (Module 6), Boundaries
(Module 7).

A separate Built Environment V2 unification thread is mid-flight in
the working copy (V1 `builtEnvironmentStore` being converted into a
facade over `builtEnvironmentStoreV2`). The V2 work is **deliberately
preserving the V1 read shape** so reader sites compile unchanged —
which means an export wired against V1 today keeps working after the
V2 unification lands.

## Decision

Ship the **`built_environment_report`** export under the same recipe,
wired against the V1 reader shape (`useBuiltEnvironmentStore`).
Additive on the schema, non-destructive in the dashboard.

### 4-file recipe

#### 1. Schema (`packages/shared/src/schemas/export.schema.ts`)

- `ExportType` enum gains `'built_environment_report'`.
- New `BuiltEnvironmentPayload`:

```ts
BuiltEnvironmentPayload = z.object({
  buildings:        z.array(z.object({ id, subtype, label?, notes?, areaM2?, createdAt })),
  wells:            z.array(z.object({ id, kind, position, depthM?, flowLpm?, label?, notes?, createdAt })),
  septics:          z.array(z.object({ id, kind, label?, notes?, areaM2?, createdAt })),
  powerLines:       z.array(z.object({ id, placement, lengthM, label?, notes?, createdAt })),
  buriedUtilities:  z.array(z.object({ id, kind, lengthM, label?, notes?, createdAt })),
  fences:           z.array(z.object({ id, kind, lengthM, label?, notes?, createdAt })),
  gates:            z.array(z.object({ id, position, label?, notes?, createdAt })),
  existingDriveways:z.array(z.object({ id, surface, lengthM, label?, notes?, createdAt })),
  counts:  { total, buildings, wells, septics, powerLines, buriedUtilities, fences, gates, existingDriveways },
  totals:  { buildingAreaM2, septicAreaM2, powerLineLengthM, buriedUtilityLengthM,
             fenceLengthM, drivewayLengthM, meanWellDepthM, overheadPowerCount },
  healthPct: z.number(),
});
```

Added `builtEnvironment: BuiltEnvironmentPayload.optional()` to
`CreateExportInput.payload`.

#### 2. Template (`apps/api/src/services/pdf/templates/builtEnvironmentReport.ts`)

- Gradient hero (`#ECFDF5 → #FEF3C7`, Earth Green → amber) summarising
  asset count, utility length, access length, module health.
- 4-column KPI strip: total assets · buildings · water+waste · utilities.
- **Buildings table** — area-sorted, subtype labelled.
- **Water & waste section** — wells (with mean-depth callout) + septic
  subtables.
- **Utilities section** — power lines (with overhead fall-zone flag) +
  buried utilities (with explicit earthworks-veto warning).
- **Access & boundaries section** — fences, driveways, gates.
- **Design implications cards** — buried lines, overhead corridor,
  well capacity, fence-line subdivision — coloured by tone
  (red/gold/green).
- **Recommended actions** — heuristic priorities: pin missing kinds
  (buildings, wells, buried utilities), walk fences, drop gates, plus
  a "ready to feed Plan stage" callout when health ≥ 70%.
- `notAvailable()` empty state if `payload.builtEnvironment` absent.

#### 3. Register (`templates/index.ts`)

Import + entry: `built_environment_report: renderBuiltEnvironmentReport`.

#### 4. Dashboard wiring (`BuiltEnvironmentDashboard.tsx`)

- Added `useState`, `Download`, `api`, and `pickTruthy` from
  `@ogden/shared` imports.
- `handleExport` builds the payload — uses `pickTruthy` for
  `label`/`notes` pairs and inline conditional spreads for the
  optional numeric fields (`areaM2`, `depthM`, `flowLpm`) where
  zero-is-meaningful semantics aren't safe.
- Added an `Export built-environment report` button to the
  `module-title-row` header; label flips to `Generating…` mid-flight.

No DB migration — same precedent as every Observe export to date.

## Files

```
packages/shared/src/schemas/export.schema.ts                                 enum + BuiltEnvironmentPayload
apps/api/src/services/pdf/templates/builtEnvironmentReport.ts                NEW template (~480 lines)
apps/api/src/services/pdf/templates/index.ts                                 register
apps/web/src/v3/observe/modules/built-environment/BuiltEnvironmentDashboard.tsx  handleExport + button
wiki/decisions/2026-05-10-atlas-built-environment-export.md                  NEW ADR
wiki/entities/pdf-export-service.md                                          table + note
wiki/log.md                                                                  prepend entry
wiki/index.md                                                                link ADR
```

## Verification

1. `cd apps/api && tsc --noEmit` — exit 0.
2. `cd apps/web && tsc --noEmit` — only pre-existing WIP errors in
   `builtEnvironmentStore.ts` (V2 facade conversion in progress, not
   touched in this session).
3. Manual smoke (preview, `mtc` project):
   - `/v3/project/mtc/observe` → Built Environment panel → dashboard
     → click `Export built-environment report`. Label flips to
     `Generating…`; new tab opens with PDF. Buildings, wells,
     utilities, fences tables populated.
4. Empty-state path: project with no built-environment assets → PDF
   renders `notAvailable()` card with explicit Built-Environment-module hint.

## Consequences

- **Eight** Observe exports now shipped. Remaining unshipped Observe
  surfaces: Module 6 Resources & Inputs, Module 7 Boundaries.
- Wired against V1 reader shape — survives the pending V2 unification
  unchanged because V2 preserves V1 subscription shapes by design.
- `pickTruthy` continues to absorb `label`/`notes` cleanly; numeric
  optionals stay inline (matching the EWE / Sectors precedent for
  fields where zero or false could be legitimate values).
- Schema additions are non-breaking — clients without
  `builtEnvironment` payloads continue to parse as before.

## References

- ADR 2026-05-10 (Sectors & Zones export — last 4-file recipe application)
- ADR 2026-05-10 (Macroclimate export + `pickDefined` lift)
- ADR 2026-05-10 (Earth · Water · Ecology export)
- ADR 2026-05-10 (Topography export, recipe lock)
- ADR 2026-05-10 (Built Environment unification — V2 facade in flight)
