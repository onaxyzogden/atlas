# 2026-05-20 — Atlas Phase B: Design Map generator service

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase B (generative design map,
core missing capability)
**Commits:** `776901fa` (B.1), `89c233cf` (B.2.orchard), `3d4cd9ff`
(B.2.swale), `90a8b4e0` (B.2.paddock), `5e9c1956` (B.2.corridor), `c190ac59`
(B.3). B.4 closed as a gate-of-record (no commit).

## Context

The Apricot Lane stress-test scorecard names the **Design Map generator** as
the single largest missing capability in Atlas — the difference between a
parcel describer and a parcel orchestrator. Phase A closed the
decision-layer quick wins on a presentation surface that already largely
passed; Phase B builds the orchestration primitive the protocol was actually
asking for.

The generator is intentionally a **pure-function service** (no persistence,
no rendering): it consumes baselines already produced by the terrain /
watershed pipelines (parcel boundary, acres, contours, swale candidates,
optional riparian lines, enterprise mix) and returns
`CreateDesignFeatureInput[]` rows the existing design-feature layer can
render. No new map stack, no new schema, no new dependency.

Per user directive 2026-05-20: one conventional commit per numbered
sub-phase (B.1, B.2.orchard, B.2.swale, B.2.paddock, B.2.corridor, B.3),
each ending with `Co-Authored-By: Claude Opus 4.7
<noreply@anthropic.com>`. Fetch + divergence check after every commit, push
only at the B → B.5 boundary.

## Decisions

### B.1 — Scaffolding + dependency-free geometry primitives

- `apps/api/src/services/designMap/DesignMapGenerator.ts` — orchestrator
  with a public `generateDesignMap(input): { features, summary, warnings }`
  surface. B.1 ships the skeleton: a `'no algorithms registered'` warning
  until B.2 lands its first algorithm.
- `apps/api/src/services/designMap/geometry.ts` — **zero-dependency**
  primitives. Local equirectangular projection anchored on the parcel
  centroid latitude (correct for sub-km parcels at the target scale).
  Haversine distance, polygon signed area / centroid, point-in-polygon,
  polyline offset, **bisector-scaled inward ring buffer** (formula
  `d × (u1 + u2) / (1 + u1·u2)` so concave corners do not overshoot), and
  bbox helpers. No `turf.js`, no `proj4` — those would pin a heavy
  dependency we do not yet need.
- Colocated tests under `__tests__/geometry.test.ts` (23 cases) and
  `__tests__/DesignMapGenerator.test.ts` (orchestrator scaffolding).

**Why pure functions, not a class?** The orchestrator has no per-instance
state, no DB handle, no cache. A free function is cheaper to test, cheaper
to mock from the route layer, and matches the rest of the service tree
(`apps/api/src/services/terrain/algorithms/*`).

### B.2.orchard — orchards on contour

`algorithms/orchardOnContour.ts`. Each contour line is clipped to the
parcel by point-in-polygon, then emitted as a `path / farm_lane` feature
tagged `phaseTag: 'orchard'`. Tree count derives from spacing options
(default 3 m in-row, 8 m between rows). Returns a
`'no contours provided'` warning when the input layer is missing rather
than failing the whole run — the orchestrator surfaces it but still runs
the other algorithms.

### B.2.swale — keyline swales + sponge capacity

`algorithms/keylineSwales.ts`. Consumes the
`WatershedRefinementProcessor` candidate shape verbatim
(`{ start, end, lengthCells, meanSlope, elevation, suitabilityScore }`).
Each candidate becomes a `path / farm_lane / water` feature.
**Sponge-capacity model:** `depth × width × fillFactor × length` (defaults
0.4 m / 1.0 m / 0.6 / measured length), and the algorithm rejects
candidates whose midpoint is outside the parcel (sanity guard against
candidates that span beyond the boundary).

**Why run swales unconditionally when candidates are present?** Swales are
**infrastructure**, not an enterprise — the orchestrator gates on
`swaleCandidates.length > 0`, not on enterprise mix. That matches the
"infrastructure follows the watershed" framing in the protocol.

### B.2.paddock — paddock-grid algorithm + AU-day math

`algorithms/paddockGrid.ts`. Subdivides the parcel bbox into an N×M grid
(defaults 4 × 3 → 12 paddocks), buffers each cell inward by
`perimeterBufferM` (default 5 m) to leave room for fence + alley, and
emits `zone / livestock / grazing` features. AU-days computed as
`acres × auPerAcre × 365` (default capacity 0.5 AU/acre). Paddocks below
`minPaddockAcres` (default 1.0) are dropped to keep the layer realistic.

**Gating:** `enterprises.includes('livestock')`. If the caller does not
declare a livestock enterprise the paddock algorithm is skipped entirely
— no features, no AU-days in the summary.

### B.2.corridor — habitat corridors

`algorithms/habitatCorridors.ts`. Two corridor families:

1. **Perimeter buffer (always emitted on a valid parcel)** — a donut
   polygon between the boundary and an inward-buffered ring forms the
   windbreak / hedgerow / wildlife strip. Width is `perimeterBufferM`
   (default 15 m). Emitted as a `zone / conservation / habitat`
   polygon-with-hole.
2. **Riparian corridors (when provided)** — each input `LineString` is
   offset to two parallel lines and stitched into a strip polygon of
   width `riparianBufferM` (default 20 m). `riparianLines` stays
   **optional** because the watershed layer's `drainage_divide` features
   are polygons (from `binaryMaskToGeoJSON`), not LineStrings. The B.5.1
   route will pass `undefined` here and the perimeter fallback satisfies
   the protocol's "candidate corridors" requirement.

**Why run corridors unconditionally?** Same logic as swales — corridors
are **ecological infrastructure**, not an enterprise. The protocol's
Phase 2 scorecard "biodiversity stacking" row is satisfied by the
perimeter band alone; riparian strips are additive when a clean line
extraction lands later. **Decision:** no slope-aware spine generator in
this pass — it requires a "draw centreline through parcel" primitive
`geometry.ts` does not yet have, and the perimeter band already passes
the gate.

### B.3 — orchestrator integration + cross-algorithm contracts

Three integration tests in `__tests__/DesignMapGenerator.test.ts`:

1. **Full-stack run** — 900 m square + 3 contours + 1 swale candidate +
   1 riparian line + `['orchard', 'livestock']` produces non-zero rows in
   every summary scalar and every algorithm's `subtype` appears in the
   feature set.
2. **`sortOrder` banding contract** — orchard 100s, swale 200s, paddock
   300s, corridor 400s. Each algorithm reserves its own band so the map
   layer renders in a stable z-order regardless of insertion sequence.
3. **Warning aggregation** — orchard's "no contours provided" warning
   surfaces exactly once (not duplicated, not dropped) when the rest of
   the run succeeds.

No production code change in B.3 — the orchestrator's existing
`warnings.push(...subResult.warnings)` already aggregated correctly; the
tests pin the contract.

### B.4 — Gate sweep

- `pnpm --filter @ogden/api run lint` (tsc `--noEmit`): clean.
- `pnpm --filter @ogden/api run test`: 624 passed / 3 skipped (58 files).
- 66 of those are the new `designMap` suite (23 geometry + 7 orchard + 8
  swale + 8 paddock + 7 corridor + 13 orchestrator).

No code fix was required to reach green, so per the global "no empty
commit" policy B.4 lands as a **gate of record** in this ADR + the phase
log entry — no commit object. The phase boundary push (B → B.5) carries
six commits, not seven.

## Out of scope (deferred)

- **Slope-aware corridor spines.** Needs a parcel-centreline primitive
  in `geometry.ts`. Perimeter fallback covers the gate.
- **Riparian line extraction from `drainage_divide`.** The mask layer is
  polygons, not lines; a clean line extraction is its own task. B.5.1
  passes `undefined` for `riparianLines`.
- **Persistence + UI triggers.** That is the B.5 sub-phase: API route,
  web `apiClient`, dry-run modal, toolbar + Next Best Action triggers.

## Verification

- API tsc: clean.
- API tests: 624 passed / 3 skipped (58 files), including the 66-case
  designMap suite.
- Orchestrator gate test: a 900 m square + 3 contours + `['orchard',
  'livestock']` yields orchards (`farm_lane`), paddocks (`livestock`),
  and corridors (`conservation`) in a single run.

## Next

Phase B.5 — wire the generator behind a Fastify route
(`POST /design-map/project/:projectId/generate`), a web `apiClient`
method, a dry-run `DesignMapGeneratorModal`, and trigger entries in
`DomainFloatingToolbar` + `NextBestActionsPanel`. Push the six Phase B
commits at the B → B.5 boundary after `git fetch` + divergence check.

## Related

- Plan — Apricot Lane Stress Test: Gap Analysis + Closure (RESTART
  2026-05-20)
- [[2026-05-20-atlas-phase-a-apricot-lane-decision-layer]] — preceding
  decision-layer phase
- Log — [2026-05-20-phase-b-design-map-generator](../log/2026-05-20-phase-b-design-map-generator.md)
