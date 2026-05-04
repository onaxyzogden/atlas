# ADR: Raster Pollinator Corridor Analysis — Scoping

**Date:** 2026-05-02
**Status:** Accepted 2026-05-04 — D1 → [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md); D2 + D3 → [`2026-05-04-pollinator-corridor-polygonize-friction.md`](2026-05-04-pollinator-corridor-polygonize-friction.md); D4 + D5 → [`2026-05-04-pollinator-corridor-patch-graph-lcp.md`](2026-05-04-pollinator-corridor-patch-graph-lcp.md). All three carried open questions (vintage mixing, taxon-specific friction, buffered-bbox size) resolved in the 8.1-A accepted ADR. The scoping ADR's recommended Phase 8.1 implementation slicing is fully spec'd; only 8.1-D (methodology page) remains as a doc-only follow-up and 8.1-E (raster Dijkstra fidelity upgrade) as an optional P2.
**Scope:** `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts`,
`packages/shared/src/ecology/{pollinatorHabitat,corridorLCP}.ts`,
`project_layers.pollinator_opportunity`, downstream consumers
(EcologicalDashboard, Diagnose page).

---

## Context

`PollinatorOpportunityProcessor` today emits a 5×5 synthesised patch
grid (`apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts`
lines 19-32, 88-97, 307-328). Each cell's habitat class is sampled
deterministically from the *aggregate* land-cover %-distribution for
the parcel — adjacent cells do not preferentially share class.
Connectivity role (`core | stepping_stone | isolated | matrix`) is
computed from 4-neighbour grid adjacency on this synthesised lattice,
not from the actual spatial pattern of habitat patches on the ground.

The processor honestly documents this in three places — the file-level
docstring, the `assignClassesToCells` comment, and the runtime `caveat`
field on `summary_data`. EcologicalDashboard surfaces the caveat to
end users. The output is *not* wired into `computeScores.ts`, so
`verify-scoring-parity` stays at delta 0.000 regardless of how
faithful the patches are.

Phase 8.1 of `.claude/plans/few-concerns-shiny-quokka.md` calls for
upgrading this to "raster least-cost-path on a polygonized land-cover
surface." Five sub-decisions sit underneath that one line. This ADR
scopes them. **It does not commit to implementation** — it commits
the decision space so a later "accepted" ADR can land per
sub-decision and Phase 8.1 can ship in well-defined slices.

## Decision space

### D1. Land-cover source

| Source | Coverage | Resolution | Class detail | Update cadence | Licensing |
|---|---|---|---|---|---|
| ESA WorldCover | Global | 10 m | 11 classes | 2020, 2021 (annual roadmap) | CC-BY 4.0 |
| USGS NLCD | US 50 states + PR | 30 m | 16 classes (Anderson L2) | Every 2-3 yr (CONUS), latest 2021 | Public domain |
| AAFC ACI | Canada | 30 m | ~70 classes (annual ag detail) | Annual (1985-current) | Open Government Licence — Canada |

**Tradeoffs.**
- **Single global** (WorldCover) wins on operational simplicity — one
  adapter, one ingest path, no country branching. Loses agricultural
  class detail (a single "Cropland" class) which matters for the
  pollinator-supportive vs. -limiting weighting in
  `POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS`.
- **NLCD + ACI** keeps the existing `land_cover` adapter's
  country-branching shape and preserves ag-class fidelity (e.g. ACI
  distinguishes "Pasture/Forages" from "Annual crops" — the former is
  pollinator-supportive, the latter is limiting). Doubles the adapter
  surface and forces a country resolver before raster work begins.
- Hybrid: NLCD/ACI primary, WorldCover fallback for projects whose
  parcel falls outside North America.

**Recommendation:** Hybrid. The current `land_cover` summary already
country-branches; reusing that path keeps the friction-table tied to
the same class names the rest of the pipeline already knows.

### D2. Polygonization strategy

Two routes off a raster source:

1. **Pre-tiled vector ingest.** Run a one-time global polygonization
   into PostGIS (NLCD/ACI/WorldCover → multipolygons by class) and
   query by parcel bbox. Heavy storage (~hundreds of GB for CONUS at
   30 m), but per-project cost drops to a single
   `ST_Intersection(parcel, lc_polygons)`.
2. **On-demand raster fetch + clip.** Pull the raster tile(s)
   covering the parcel bbox at request time, polygonize in-process at
   the bbox scale, run LCP on the result. Lightweight on storage,
   higher per-request cost (~seconds-to-tens-of-seconds per project).

**Recommendation:** **On-demand**. Atlas runs Tier-3 jobs in BullMQ —
a 5-30 s polygonization step per project amortises over the rest of
the pipeline cost (already O(seconds) for hydrology + soil-regen) and
removes a global-scale storage commitment we don't have ops capacity
for.

### D3. Friction surface model

Each polygonised class → friction value (cost-per-metre-of-traversal
for a generic pollinator). Candidate models:

- **Theobald (2014) human-modification gradient.** Continuous 0-1
  index from anthropogenic features; friction = 1 + α·HM. Strong
  literature backing; HM raster is freely available.
- **Class-table mapping.** Direct lookup from the existing
  `POLLINATOR_SUPPORTIVE_WEIGHTS` (forest, wetland, pasture → low
  friction) / `POLLINATOR_LIMITING_WEIGHTS` (developed, intensive
  cropland → high friction). Stays consistent with the current habitat
  scoring; no new parameter table to defend.

**Recommendation:** Class-table, derived from the existing weights
(invert: `friction = 1 - supportive_weight + limiting_weight`).
Defensible, auditable, no new dependency. Theobald can ride on as a
P2 enhancement once the class-table version is in production.

### D4. Least-cost-path algorithm

- **Raster Dijkstra** on the friction surface (4- or 8-connectivity).
  Standard. Implementation surface: ~150-300 LOC in pure TS or pull
  in a maintained library (e.g. `pathfinding`, but raster-shaped
  variants are sparse on npm).
- **A\* with friction-aware heuristic.** Faster on large parcels;
  needs an admissible heuristic — Euclidean × min-friction works.
- **Graph-theoretic on polygonised patches.** Build an adjacency graph
  of polygonised patches, weight edges by inter-patch distance × edge
  friction. Coarser than raster but lines up with the existing
  `connectivityRole` ('core' / 'stepping_stone' / 'isolated' /
  'matrix') taxonomy.

**Recommendation:** Start with **graph-theoretic on polygonised
patches** — it's the smallest delta from today's output (the existing
roles are graph concepts already), and the patch graph has
O(patches) nodes, not O(pixels). Raster Dijkstra rides on as a
fidelity upgrade if we need true LCP geometry rather than patch-level
roles.

### D5. Output shape + scoring contract

`summary_data` already carries `corridorReadiness`, `patchCount`,
`patchesByQuality`, `patchesByRole`, `confidence`, `dataSources`,
`computedAt`, `caveat`. The upgrade should:

- **Keep** the same field names so existing dashboard consumers don't
  break.
- **Drop** `gridSize` (no grid in the new world) — replaced by
  `polygonCount` + `medianPatchAreaHa`.
- **Reword** `caveat` to describe the new methodology (or remove
  entirely once methodology is documented in the dashboard).
- **Add** a `corridorGeometries` array under `geojson_data`: one
  LineString per stepping-stone-to-core edge in the patch graph.

**Scoring contract:** `pollinator_opportunity` continues to **not**
participate in `computeScores.ts`. The 8 weighted dimensions stay
stable; this remains a diagnostic / advisory layer. ADR locks this in
to keep the scoring-parity guard meaningful.

## Implementation slicing

The accepted-ADR sequence Phase 8.1 should ship as:

1. **8.1-A** — D1: hybrid NLCD/ACI/WorldCover land-cover adapter. No
   pollinator-processor changes yet; just the new source.
2. **8.1-B** — D2 + D3: on-demand polygonization + class-table
   friction (`packages/shared/src/ecology/corridorFriction.ts`).
   `PollinatorOpportunityProcessor` swaps `assignClassesToCells` for
   `polygonizeBbox`. Output stays grid-shaped but driven by real
   patches; `caveat` is reworded.
3. **8.1-C** — D4: graph-theoretic LCP on the polygonised patches.
   `connectivityRole` becomes a real graph property. New
   `corridorGeometries` array on `geojson_data`.
4. **8.1-D** — Dashboard caveat removal + methodology page in
   `wiki/concepts/pollinator-corridor-method.md`.
5. **8.1-E** *(optional)* — Raster Dijkstra fidelity upgrade if
   stakeholder review of 8.1-C surfaces a gap the patch-graph can't
   close.

## Open questions (carry into the accepted ADR)

- **WorldCover refresh cadence vs. AAFC annual.** Acceptable to mix
  a 2021-vintage WorldCover layer with a 2024 ACI layer in the same
  Atlas snapshot? If not, we need a `dataDateMin` constraint per
  ecoregion.
- **Pollinator-specific friction.** The class-table model treats all
  pollinators identically. Honeybees vs. native bees vs. butterflies
  have very different traversal preferences (Sponsler & Johnson 2017).
  In-scope for 8.1, or P2 follow-on?
- **Edge effects from off-parcel land cover.** A 2 ha parcel
  surrounded by intensive cropland has zero corridor potential
  irrespective of on-parcel quality. Need a buffered-bbox polygonize
  (parcel + N km buffer) to capture this. Buffer size should
  default to pollinator foraging range (~1.5-3 km for native bees).

## References

- Theobald, D.M. (2014) "Estimating natural landscape changes from
  1992 to 2030 in conterminous US." *Landscape Ecology* 29, 1411-1424.
- Sponsler, D.B. & Johnson, R.M. (2017) "Mechanistic modeling of
  pesticide exposure: The missing keystone of honey bee toxicology."
  *Environmental Toxicology and Chemistry* 36(4).
- ESA WorldCover: <https://esa-worldcover.org>
- NLCD: <https://www.usgs.gov/centers/eros/science/national-land-cover-database>
- AAFC ACI: <https://open.canada.ca/data/en/dataset/ba2645d5-4458-414d-b196-6303ac06c1c9>
- Existing weight tables:
  `packages/shared/src/ecology/pollinatorHabitat.ts`
- Existing graph helper: `packages/shared/src/ecology/corridorLCP.ts`
- Plan entry: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.1
- Related:
  - `2026-04-24-atlas-pollinator-ecoregion-corridor.md` — original
    pollinator-layer ADR establishing the patch-grid shape.
  - `2026-05-02-section-response-envelope.md` — same pattern of
    scoping-ADR-then-accepted-ADR-per-slice.
