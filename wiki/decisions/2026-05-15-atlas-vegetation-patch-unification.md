---
title: Vegetation Patch unification — one Observe object + resolver bridge
date: 2026-05-15
status: accepted
stage: observe
module: earth-water-ecology
---

# ADR: Vegetation Patch unification

## Context

The "Ground cover" Observe tool in the Earth-Water-Ecology (EWE) group did
nothing when applied to a polygon drawn with the "Ecology zone" tool. The
cause was structural, not a hit-test edge case: the Ecology-zone tool wrote
an `EcologyZone` into `useEcologyStore` (carrying a 5-value `dominantStage`),
while the Ground-cover paint tool only point-in-polygon hit-tested
pre-existing `LandZone` polygons in `useZoneStore` and never queried the
ecology store. Two tools in one group operated on disjoint stores, with three
overlapping descriptors (`EcologyZone.dominantStage` 5-value,
`LandZone.successionStage` then-4-value, `LandZone.groundCover` 8-value).

Full design spec:
`docs/superpowers/specs/2026-05-15-vegetation-patch-unification-design.md`.

## Decision

**Approach C** — a new clean `VegetationPatch` Observe object plus a resolver
bridge.

- New `apps/web/src/store/vegetationStore.ts` — `VegetationPatch` =
  `{ id, projectId, geometry: Polygon, successionStage (5-value),
  groundCover (8-value), label?, notes?, createdAt }`; Zustand `persist`
  (`ogden-vegetation` v1) + `temporal`. `SuccessionStage`/`GroundCoverState`
  and their label/color tables stay canonical in `zoneStore` and are
  re-exported (no duplication). Exports `groundCoverFromStage`.
- One unified Observe tool **"Vegetation & cover"**
  (`observe.earth-water-ecology.vegetation`) replaces both old tools.
  `EcologyZoneTool.tsx` and `GroundCoverPaintTool.tsx` and their
  tool/dispatch/schema/registry/`POLYGON_KINDS` entries are deleted.
- New `apps/web/src/v3/plan/engine/vegetationResolver.ts`:
  `resolveZoneVegetation(zone, patches)` resolves each axis independently —
  zone manual value wins (`source:'override'`), else area-weighted dominant
  of overlapping patches via `turf.intersect`, else none.
  `deriveCurrentLandCover(projectId, patches)` feeds the SiteProfile
  `currentLandCover` facet. ZonePanel keeps its succession/cover selects as
  the override channel.
- Canonical succession scale is the richer 5-value
  `disturbed | pioneer | mid | late | climax`; all legacy `bare`-based
  filters become `disturbed`.
- Honors the Observe/Plan separation ([2026-04-30 namespaces ADR]) —
  observation is its own object; Plan facets are derived.

## Migration (one-time)

1. `ogden-ecology.ecologyZones` are drained into `ogden-vegetation` on first
   load (`dominantStage → successionStage` 1:1; `groundCover` seeded via
   `groundCoverFromStage`), then stripped from the ecology blob. Guarded by
   `migratedFromEcology`. The `ecologyStore` zones path + `ecologyZone`
   annotation schema are deleted; the store keeps `ecology` observations +
   `successionStageByProject`.
2. `ogden-zones` persist version bumped to 3; v2→v3 rewrites legacy
   `successionStage === 'bare'` → `'disturbed'`. Per-zone succession/cover
   fields are retained as the manual-override channel.

## Consequences

- Nine downstream readers route through the resolver (currentLandCover
  facet, auto-design affinity, zone ecology rollup, restoration priority,
  soil-risk hotspots, carbon-by-land-use with `STAGE_MULTIPLIER` extended to
  5 keys, site narrative, map render, detail/list/export).
- No `LandZone` Plan-design semantic change beyond reusing its
  succession/cover fields as the override channel.

## Verification

- `npm run typecheck` clean (memory-safe 8 GB node script — plain `tsc`
  OOMs on this repo).
- `npm test` — full Vitest suite 59 files / 815 tests green, including new
  `vegetationResolver.test.ts` (override/derive/none, `deriveCurrentLandCover`,
  `groundCoverFromStage`, `ogden-ecology→ogden-vegetation` absorb, zoneStore
  v2→v3 `bare→disturbed`).
- Dev server: unified tool present in the EWE group, old tools gone, no
  console errors from the change.
