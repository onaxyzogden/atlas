# 2026-05-20 — Phase B: Design Map generator service

Branch `feat/atlas-permaculture` advanced from `3ebf999b` → `c190ac59`
(six commits ahead of origin pending push).

## Context

Phase A closed the decision-layer Apricot-Lane gaps; Phase B builds the
**core missing capability** the protocol identified — a generative service
that proposes candidate `path` + `zone` features from terrain + watershed
baselines. Without it, Atlas can describe a parcel but cannot orchestrate
it. Per-sub-phase commits, push only at the phase boundary.

## Commits

- **`776901fa`** — `feat(designMap): B.1 scaffolding + dependency-free
  geometry primitives`
  - `apps/api/src/services/designMap/DesignMapGenerator.ts` (orchestrator
    skeleton; returns empty features + `'no algorithms registered'`
    warning until B.2 lands)
  - `apps/api/src/services/designMap/geometry.ts` (local equirectangular
    projection, haversine, polygon area/centroid, point-in-polygon,
    polyline offset, **bisector-scaled** inward ring buffer, bbox)
  - `apps/api/src/services/designMap/index.ts` (barrel)
  - `apps/api/src/services/designMap/__tests__/geometry.test.ts` (23 cases)
  - `apps/api/src/services/designMap/__tests__/DesignMapGenerator.test.ts`
    (orchestrator scaffolding tests)
- **`89c233cf`** — `feat(designMap): B.2.orchard — orchard rows on contour`
  - `algorithms/orchardOnContour.ts` (point-in-polygon contour clipping,
    `path / farm_lane / orchard` features, tree-count from spacing)
  - `__tests__/orchardOnContour.test.ts` (7 cases)
- **`3d4cd9ff`** — `feat(designMap): B.2.swale — keyline swales + sponge
  capacity`
  - `algorithms/keylineSwales.ts` (`path / farm_lane / water` features,
    `depth × width × fillFactor × length` capacity model, midpoint-in-
    parcel sanity)
  - `__tests__/keylineSwales.test.ts` (8 cases)
  - Orchestrator wires swales **unconditionally** when candidates present.
- **`90a8b4e0`** — `feat(designMap): B.2.paddock — paddock-grid algorithm +
  AU-day math`
  - `algorithms/paddockGrid.ts` (N×M bbox subdivision, inward perimeter
    buffer, `zone / livestock / grazing` features, `acres × capacity ×
    365` AU-days)
  - `__tests__/paddockGrid.test.ts` (8 cases)
  - Orchestrator gates on `enterprises.includes('livestock')`.
- **`5e9c1956`** — `feat(designMap): B.2.corridor — habitat corridors +
  perimeter buffer fallback`
  - `algorithms/habitatCorridors.ts` (perimeter donut polygon, optional
    riparian strip buffers, `zone / conservation / habitat` features)
  - `__tests__/habitatCorridors.test.ts` (7 cases)
  - Orchestrator runs corridors **unconditionally**; summary gains
    `totalCorridorAcres`.
- **`c190ac59`** — `test(designMap): B.3 — orchestrator cross-algorithm
  integration tests`
  - Full-stack run, `sortOrder` banding contract, warning-aggregation
    distinctness check. No production code change.

## B.4 — Gate sweep

- `pnpm --filter @ogden/api run lint` (tsc `--noEmit`): clean.
- `pnpm --filter @ogden/api run test`: 624 passed / 3 skipped (58 files).
- 66 of those are the new `designMap` suite (23 geometry + 7 orchard + 8
  swale + 8 paddock + 7 corridor + 13 orchestrator).
- No code fixes were needed to reach green, so per the global "no empty
  commit" policy B.4 lands as a gate of record in this log entry and in
  the phase ADR — no commit object.

## Verification

- API tsc: clean.
- API tests: 624 / 3 skipped (58 files).
- Orchestrator gate test: 900 m square fixture + 3 contours + livestock
  yields orchards (`farm_lane`), paddocks (`livestock`), and corridors
  (`conservation`) together.

## Decision

See [decisions/2026-05-20-atlas-phase-b-design-map-generator.md](../decisions/2026-05-20-atlas-phase-b-design-map-generator.md).

## Next

Phase B.5 — wire the generator behind a Fastify route
(`POST /design-map/project/:projectId/generate`) and a web modal +
toolbar / Next-Best-Action trigger. Push the six Phase B commits at the
B → B.5 boundary after fetch + divergence check.
