# ADR — Pollinator Corridor: On-Demand Polygonization + Class-Table Friction (Phase 8.1-B)

**Date:** 2026-05-04
**Status:** Accepted
**Supersedes (in part):** [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md) D2 + D3 (recommendations locked).
**Depends on:** [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md) (8.1-A — hybrid land-cover adapter must produce real features before this slice replaces the synthesised grid).
**Scope:** New `packages/shared/src/ecology/{corridorFriction,polygonizeBbox}.ts`; rework of `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts` (`assignClassesToCells` → `polygonizeBbox`); existing weight tables in `packages/shared/src/ecology/pollinatorHabitat.ts` re-used (no new parameter table).

---

## Context

8.1-A lands the data: NLCD/ACI/WorldCover features arrive at the
processor with per-feature class + provenance. 8.1-B replaces the
**synthesised 5×5 patch grid** in `PollinatorOpportunityProcessor`
with real polygons clipped from the actual land-cover raster, then
attaches a friction value to each polygon so 8.1-C can run a
graph-theoretic LCP on the result.

[Scoping ADR D2](2026-05-02-raster-pollinator-corridor-scoping.md#d2-polygonization-strategy)
recommended on-demand raster fetch + clip (vs. pre-tiled vector
ingest). [D3](2026-05-02-raster-pollinator-corridor-scoping.md#d3-friction-surface-model)
recommended class-table friction derived from the existing
`POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS`
tables (vs. Theobald HM gradient). Both recommendations carried
into this accepted ADR.

## Decision

### D2 — On-demand polygonization

1. **`polygonizeBbox(parcel, bufferKm = 2)` in `packages/shared/src/ecology/polygonizeBbox.ts`.**
   Pulls the land-cover raster tile(s) covering parcel + buffer
   from the 8.1-A adapter's response, polygonizes by class
   in-process, returns `Feature<Polygon, { classId, source, vintage }>[]`.
2. **Buffer locked at `POLLINATOR_BUFFER_KM = 2`** (named constant
   exported from `corridorFriction.ts`). Mid-range native bee
   foraging per Sponsler & Johnson 2017. Edge-effects from
   off-parcel land cover are captured without ballooning the bbox.
3. **Tier-3 only.** The polygonize step runs inside the existing
   BullMQ Tier-3 job. Per-project cost budget: 5-30 s; if a single
   call exceeds 60 s, the processor logs the parcel ID + bbox and
   falls back to the legacy synthesised-grid path with a
   `caveat: "polygonize_timeout"` flag.
4. **No global-scale storage commitment.** Tile cache is per-job
   tmpdir, evicted on job completion. Re-ingesting the same parcel
   re-fetches; that's the correct trade given Atlas's current ops
   capacity.

### D3 — Class-table friction

1. **`corridorFriction.ts` derives friction from existing weight
   tables** — no new parameter table to defend in stakeholder
   review:
   ```ts
   // friction in [0, 2]; 0 = perfect corridor, 2 = total barrier
   friction(classId) =
     1 - POLLINATOR_SUPPORTIVE_WEIGHTS[classId]
       + POLLINATOR_LIMITING_WEIGHTS[classId];
   ```
   The arithmetic gives 0 for "fully supportive, zero limiting"
   classes (forest, wetland, native pasture) and approaches 2 for
   "fully limiting, zero supportive" classes (developed,
   intensive cropland).
2. **`crop_unspecified` bucket** (WorldCover-only parcels, per
   8.1-A) gets a moderate friction = 1.0 (between Pasture and
   Annual-crops). The unspecified bucket is the honest cost of
   WorldCover's coarseness.
3. **Universal pollinator** — no taxon discrimination. Honeybees
   vs. native bees vs. butterflies have different traversal
   preferences (Sponsler & Johnson 2017), but a universal
   class-table is the correct first cut. Taxon-specific friction
   is a P2 follow-on if/when stakeholder review surfaces a gap.
4. **Theobald HM gradient deferred to P2.** The canonical raster
   (Kennedy 2020 ESSD, CC-BY 4.0; figshare + Data Basin) is
   captured in [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
   for the future enhancement ADR. Not in scope for 8.1-B.

### Output shape

`PollinatorOpportunityProcessor` continues to emit `summary_data`
shaped per [scoping ADR D5](2026-05-02-raster-pollinator-corridor-scoping.md#d5-output-shape--scoring-contract):

- **Drop** `gridSize` (no grid in the new world).
- **Add** `polygonCount`, `medianPatchAreaHa`, `bufferKm`.
- **Reword** `caveat` from the synthesised-grid disclaimer to a
  short methodology note (or drop entirely once 8.1-D ships the
  methodology page).
- **`patchesByQuality` + `patchesByRole` stay** — 8.1-C will
  populate `patchesByRole` from a real graph; 8.1-B leaves it as
  a class-derived bucket.

**Scoring contract unchanged.** `pollinator_opportunity` does not
participate in `computeScores.ts`. The scoring-parity guard
remains meaningful.

## Consequences

**Positive.**
- Real patches replace the synthesised grid; connectivity claims
  in the diagnosis report start lining up with the actual spatial
  pattern on the ground.
- Friction model derives from one parameter table the team
  already maintains. No second source of truth.
- Buffer captures edge effects without bloating per-call cost.

**Negative.**
- 5-30 s polygonize step per Tier-3 job. Mitigation: timeout +
  legacy-grid fallback so a slow-tile parcel never blocks the
  pipeline.
- WorldCover's `crop_unspecified` carries a synthetic friction
  midpoint; stakeholders looking at WorldCover-only parcels see
  coarser corridor logic. Mitigation: per-feature `source` is
  visible in the dashboard tooltip; users can read coarseness off
  provenance.

**Neutral.**
- No `computeScores.ts` change.
- Theobald HM gradient remains in the wiki concept doc for the
  future P2 enhancement; not blocked.

## Implementation slicing

1. **8.1-B.1 — `polygonizeBbox` + tests.** Library function +
   fixtures from a couple of representative parcels (one US/NLCD,
   one CA/ACI, one global/WorldCover). Pure function, no
   pipeline wiring yet.
2. **8.1-B.2 — `corridorFriction` derivation + tests.** Wire to
   existing `POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS`;
   ensure `crop_unspecified` returns the documented midpoint.
3. **8.1-B.3 — Processor swap.** Replace `assignClassesToCells`
   call site in `PollinatorOpportunityProcessor` with
   `polygonizeBbox`. Add timeout + legacy-grid fallback path.
4. **8.1-B.4 — `summary_data` schema update.** Drop `gridSize`;
   add `polygonCount`, `medianPatchAreaHa`, `bufferKm`. Update
   `EcologicalDashboard` reads. Re-word caveat.

## Open follow-ups (non-blocking)

- **8.1-C** — patch-graph LCP that consumes the polygonize +
  friction output. Already scoped; ready to promote next.
- **Theobald HM enhancement.** P2 ADR if stakeholder review of
  the universal-friction corridor surfaces a need.
- **Taxon-specific friction.** Same — P2 if stakeholder review
  surfaces a need.

## References

- Scoping ADR: [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md)
- 8.1-A predecessor: [`2026-05-04-pollinator-corridor-hybrid-landcover.md`](2026-05-04-pollinator-corridor-hybrid-landcover.md)
- External-data reference: [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
- Existing weight tables: `packages/shared/src/ecology/pollinatorHabitat.ts`
- Existing graph helper: `packages/shared/src/ecology/corridorLCP.ts` (consumed by 8.1-C, not 8.1-B)
- Foundational: [`2026-04-24-atlas-pollinator-ecoregion-corridor.md`](2026-04-24-atlas-pollinator-ecoregion-corridor.md)
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.1
