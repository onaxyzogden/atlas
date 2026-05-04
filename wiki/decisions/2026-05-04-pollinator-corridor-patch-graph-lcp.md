# ADR — Pollinator Corridor: Patch-Graph LCP + Connectivity Roles (Phase 8.1-C)

**Date:** 2026-05-04
**Status:** Accepted
**Supersedes (in part):** [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md) D4 + D5 (recommendations locked).
**Depends on:** [`2026-05-04-pollinator-corridor-polygonize-friction.md`](2026-05-04-pollinator-corridor-polygonize-friction.md) (8.1-B — must produce polygons + per-polygon friction before this slice runs).
**Scope:** Rework of `packages/shared/src/ecology/corridorLCP.ts` (the existing graph helper; currently consumed by the synthesised-grid path); `PollinatorOpportunityProcessor`'s `connectivityRole` derivation; `summary_data.geojson_data.corridorGeometries` addition; `EcologicalDashboard` rendering of corridor lines.

---

## Context

After 8.1-A (real land-cover features) and 8.1-B (real polygons +
per-polygon friction), the patches exist and have weights but
their `connectivityRole` (`core` / `stepping_stone` / `isolated` /
`matrix`) is still derived from a 5×5 lattice's 4-neighbour
adjacency. 8.1-C replaces that with a **graph-theoretic LCP** on
the polygonised patches.

[Scoping ADR D4](2026-05-02-raster-pollinator-corridor-scoping.md#d4-least-cost-path-algorithm)
weighed three algorithms and recommended **graph-theoretic on
polygonised patches** (vs. raster Dijkstra and A\*). The patch
graph has O(patches) nodes, not O(pixels) — orders of magnitude
cheaper than raster LCP, and lines up with the existing
`connectivityRole` taxonomy. Raster Dijkstra rides on as 8.1-E if
stakeholder review surfaces a fidelity gap.

[Scoping ADR D5](2026-05-02-raster-pollinator-corridor-scoping.md#d5-output-shape--scoring-contract)
specified the output additions: drop `gridSize`, add
`corridorGeometries` to `geojson_data`, keep field names so
existing consumers don't break. 8.1-B already started that
transition; 8.1-C completes it.

## Decision

### D4 — Graph-theoretic patch LCP

1. **Reuse `corridorLCP.ts`'s graph shape but feed it real patches.**
   Today the helper accepts a list of patch records + an
   adjacency relation; the synthesised grid populates it with 25
   cells and 4-neighbour edges. 8.1-C feeds it the
   `polygonizeBbox` output (typically tens-to-hundreds of patches)
   with edges defined by **patch-pair adjacency in the polygon
   layer** (touching or within `MIN_GAP_M = 50` of each other) —
   ~50 m being a generous "still flyable" gap for a native bee
   crossing a road verge.
2. **Edge weight = inter-patch distance × edge-friction.**
   Inter-patch distance is centroid-to-centroid meters; edge
   friction is the **mean** of the two adjacent patches' friction
   values (per `corridorFriction.ts`). Simpler than line-integral
   over the gap polygon, defensible, cheap.
3. **`connectivityRole` derivation:**
   - **`core`** — patch with `area >= CORE_AREA_HA = 1.0` AND
     graph degree ≥ 3.
   - **`stepping_stone`** — patch on at least one shortest path
     between two `core` patches (compute with multi-source
     Dijkstra, mark patches that lie on any returned path).
   - **`isolated`** — patch with no edges OR shortest-path
     distance to nearest `core` exceeds `MAX_FORAGING_M = 3000`
     (per Sponsler & Johnson 2017).
   - **`matrix`** — everything else.
4. **Algorithm choice locked: Dijkstra (graph, not raster).**
   The patch graph is small enough that the heuristic complexity
   of A\* doesn't earn its keep. Standard `priorityQueue + visited`
   shape; ~80-150 LOC in pure TS, no library.

### D5 — Output shape

1. **`summary_data.patchesByRole` populated from the real graph.**
   Existing field name preserved.
2. **`summary_data.geojson_data.corridorGeometries`** added: array
   of `Feature<LineString, { fromPatchId, toPatchId, costMeters }>`,
   one per `stepping_stone → core` shortest-path edge. The
   dashboard renders these as the actual corridor overlay.
3. **`summary_data.caveat` removed** once 8.1-D ships the
   methodology page in `wiki/concepts/pollinator-corridor-method.md`.
   8.1-C alone re-words the caveat to point at the temporary
   methodology summary in the dashboard.
4. **Scoring contract still unchanged.** `pollinator_opportunity`
   stays advisory; `computeScores.ts` doesn't read these new
   fields. Scoring-parity guard remains meaningful.

## Consequences

**Positive.**
- `connectivityRole` becomes a real graph property derivable from
  the actual spatial pattern on the ground, not a 5×5 lattice
  artefact.
- `corridorGeometries` give the dashboard a concrete corridor
  overlay — stakeholders see the lines, not just role-buckets.
- Algorithm is cheap (graph with O(patches), not O(pixels));
  fits comfortably inside the existing Tier-3 BullMQ budget.

**Negative.**
- Centroid-to-centroid edge distance under-estimates real
  traversal cost on irregular patches. Mitigation: 8.1-E (raster
  Dijkstra) is the documented upgrade if stakeholder review
  surfaces this as a meaningful gap.
- `MIN_GAP_M = 50`, `CORE_AREA_HA = 1.0`, `MAX_FORAGING_M = 3000`
  are tunable constants. Mitigation: locked in
  `corridorFriction.ts` with citation comments; configurable in a
  later ADR if stakeholder feedback demands.

**Neutral.**
- Synthesised-grid code path can be removed once 8.1-C is in
  production, OR retained as the timeout-fallback path from 8.1-B.
  Decision deferred to 8.1-D (methodology page review).

## Implementation slicing

1. **8.1-C.1 — Adjacency builder + tests.** Pure function:
   `buildPatchAdjacency(polygons, MIN_GAP_M)` returns
   `Edge[]`. Fixtures from the 8.1-B fixtures (US/CA/global).
2. **8.1-C.2 — Graph Dijkstra + connectivity-role derivation.**
   `computeConnectivityRoles(patches, edges, friction)` returns
   `{ patchId → role }` plus the shortest-path tree.
3. **8.1-C.3 — `corridorGeometries` emission.** Walk the
   shortest-path tree; emit one `LineString` per
   `stepping_stone → core` edge with `costMeters`.
4. **8.1-C.4 — Processor wiring + dashboard read.**
   `PollinatorOpportunityProcessor` swaps the synthesised
   `connectivityRole` derivation for the new graph helpers;
   `EcologicalDashboard` reads `corridorGeometries` and renders
   on the map.
5. **8.1-C.5 — Caveat re-word.** Short methodology blurb in the
   dashboard (placeholder until 8.1-D ships).

## Open follow-ups (non-blocking)

- **8.1-D** — methodology page in
  `wiki/concepts/pollinator-corridor-method.md`; remove dashboard
  caveat once published.
- **8.1-E (optional)** — raster Dijkstra fidelity upgrade if
  stakeholder review of 8.1-C surfaces a gap the patch-graph
  can't close. Already mentioned in the scoping ADR as a possible
  follow-on; no commitment.
- **Configurable constants.** `MIN_GAP_M`, `CORE_AREA_HA`,
  `MAX_FORAGING_M` may need per-ecoregion overrides; defer until
  stakeholder feedback or a second ecoregion ADR demands it.

## References

- Scoping ADR: [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md)
- 8.1-A predecessor: [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md)
- 8.1-B predecessor: [`2026-05-04-pollinator-corridor-polygonize-friction.md`](2026-05-04-pollinator-corridor-polygonize-friction.md)
- Existing graph helper: `packages/shared/src/ecology/corridorLCP.ts`
- Foundational: [`2026-04-24-atlas-pollinator-ecoregion-corridor.md`](2026-04-24-atlas-pollinator-ecoregion-corridor.md)
- Foraging-range source: Sponsler, D.B. & Johnson, R.M. (2017)
  "Mechanistic modeling of pesticide exposure: The missing
  keystone of honey bee toxicology." *Environmental Toxicology
  and Chemistry* 36(4).
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.1
