# Vegetation Patch Unification — Design

**Date:** 2026-05-15
**Status:** Implemented
**Branch:** `feat/atlas-permaculture`

## Problem

The "Ground cover" Observe tool in the Earth, Water & Ecology (EWE)
group did nothing when applied to a polygon drawn with the "Ecology
zone" tool. The cause was structural, not a hit-test edge case:

- The **Ecology zone** tool drew its own polygon → an `EcologyZone` in
  `useEcologyStore`, carrying `dominantStage` (5-value succession).
- The **Ground cover** paint tool only point-in-polygon hit-tested
  pre-existing `LandZone` polygons in `useZoneStore` and wrote
  `groundCover` onto them. It never queried `useEcologyStore`.

Two tools in one group operated on disjoint stores, with no single
place to describe one patch of land's vegetation. There were three
overlapping descriptors: `EcologyZone.dominantStage` (5-value),
`LandZone.successionStage` (was 4-value), and `LandZone.groundCover`
(8-value structural).

## Decision

**Approach C** — a new clean `VegetationPatch` Observe object plus a
resolver bridge.

- One Observe tool ("Vegetation & cover") and one object
  (`VegetationPatch`) capturing both successional stage and structural
  ground cover for an observed patch.
- A single resolver feeds all downstream consumers, **but ZonePanel
  keeps a per-zone manual override** that wins over the derived value
  when explicitly set.
- Canonical succession scale is the richer **5-value**:
  `disturbed | pioneer | mid | late | climax`.
- Honors the Observe/Plan separation (ADR 2026-04-30): observation is
  its own object; Plan facets are derived.

## Data model

`apps/web/src/store/vegetationStore.ts` — Zustand store persisted as
`ogden-vegetation` (`temporal` + `persist`, same pattern as
`zoneStore`).

```ts
interface VegetationPatch {
  id: string;
  projectId: string;
  geometry: GeoJSON.Polygon;
  successionStage: SuccessionStage;   // 5-value
  groundCover: GroundCoverState;      // 8-value structural
  label?: string;
  notes?: string;
  createdAt: string;
}
```

`SuccessionStage` / `GroundCoverState` and their label/color tables are
canonical in `zoneStore` and re-exported from `vegetationStore` (no
duplication).

## Migration (one-time)

1. **EcologyZone → VegetationPatch**: on first load `vegetationStore`
   absorbs legacy `ecologyZones` out of the persisted `ogden-ecology`
   blob (`dominantStage → successionStage` 1:1; `groundCover` seeded
   from stage via `groundCoverFromStage`: `climax|late → forest`,
   `disturbed → bare-soil`, else `sparse-grasses`), then strips them
   from the ecology blob. Guarded by `migratedFromEcology`. The
   `ecologyStore` zones path and `ecologyZone` annotation schema are
   deleted; the store retains observations + `successionStageByProject`.
2. **LandZone succession scale**: `ogden-zones` persist version bumped
   to 3; v2→v3 migrate rewrites legacy `bare → disturbed`. Per-zone
   `successionStage`/`groundCover` fields are retained as the **manual
   override** channel.

## Unified Observe tool

The `ecology-zone` and `ground-cover` entries in the
`earth-water-ecology` group are replaced by one tool **"Vegetation &
cover"** (`observe.earth-water-ecology.vegetation`): polygon draw →
`createWithDefaults(FIELD_SCHEMAS.vegetation, …)` →
`AnnotationFormSlideUp` (succession select, ground-cover select, label,
notes). `EcologyZoneTool.tsx` and `GroundCoverPaintTool.tsx` are
deleted, along with their tool/dispatch/schema/registry entries.

## Resolver + manual override

`apps/web/src/v3/plan/engine/vegetationResolver.ts`:

- `resolveZoneVegetation(zone, patches) → { successionStage,
  groundCover, source }` — each axis resolves independently: zone
  override wins; else area-weighted dominant of overlapping
  `VegetationPatch` polygons (turf intersection); else null. `source`
  is `'override' | 'derived' | 'none'`.
- `deriveCurrentLandCover(projectId, patches)` — project-wide dominant
  cover by patch area; feeds the SiteProfile `currentLandCover` facet.

ZonePanel keeps its succession/cover selects as the override channel.

## Consumer rewiring

Nine readers route through the resolver: currentLandCover facet
(`observePrefill`, via `deriveCurrentLandCover` with a zone-groundCover
fallback), auto-design affinity (`GenerateSiteDesignBar`), zone ecology
rollup, restoration priority, soil-risk hotspots, carbon-by-land-use
(`STAGE_MULTIPLIER` extended to 5 keys), site narrative, map render
(`ObserveAnnotationLayers`), and the detail card / annotation list /
export. All `bare`-based filters became `disturbed`.

## Verification

- `npm run typecheck` (memory-safe; plain `tsc` OOMs on this repo).
- `npm test` (Vitest): full suite plus new `vegetationResolver.test.ts`
  — override-wins, area-weighted derive, no-patch fallback,
  `groundCoverFromStage`, EcologyZone→VegetationPatch absorb, and
  `bare→disturbed` zone migration.
- Dev-server check: unified tool present in the EWE group, old tools
  gone, no console errors from the change.

## Out of scope

- No changes to `LandZone` Plan-design semantics beyond reusing its
  succession/cover fields as the override channel.
