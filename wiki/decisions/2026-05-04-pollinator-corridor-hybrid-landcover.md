# ADR — Pollinator Corridor: Hybrid Land-Cover Adapter (Phase 8.1-A)

**Date:** 2026-05-04
**Status:** Accepted
**Supersedes (in part):** [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md) D1 (recommendation locked); resolves all three carried open questions.
**Scope:** New `apps/api/src/services/pipeline/adapters/{NlcdLandCoverAdapter,AciLandCoverAdapter,WorldCoverLandCoverAdapter}.ts`; pipeline registry update with country resolver; ingest tooling under `apps/api/src/jobs/`; `summary_data.dataSources` schema additions.

---

## Context

The pollinator-opportunity processor today fabricates a 5×5 patch
grid from aggregate land-cover percentages — adjacent cells don't
preferentially share class, and connectivity role is computed on the
synthetic lattice rather than the spatial pattern on the ground.
[Scoping ADR D1](2026-05-02-raster-pollinator-corridor-scoping.md#d1-land-cover-source)
recommended a **hybrid** land-cover source (NLCD US, AAFC ACI Canada,
ESA WorldCover global fallback). External-data verifications have
landed in [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md):

- **NLCD** — public domain, 30 m, 16 classes, latest 2021.
- **AAFC ACI** — OGL-Canada 2.0, 30 m, ~70 classes, annual since 1985.
- **ESA WorldCover** — CC-BY 4.0, 10 m, 11 classes, 2020 + 2021 vintages.

## Decision

Lock the scoping ADR's D1 recommendation. Three adapters, one
country-resolved registry, **per-feature provenance** so vintage
drift is honest disclosure rather than a coverage gate.

1. **Three server-side adapters** under the existing `DataSourceAdapter`
   contract (per [`2026-04-21-tier1-pipeline-canonical-adapters.md`](2026-04-21-nwis-groundwater-adapter.md)):
   - `NlcdLandCoverAdapter` — US 50 states + Puerto Rico, primary.
   - `AciLandCoverAdapter` — Canada, primary. Preserves the
     ag-class detail (Pasture vs. Annual crops) that drives the
     `POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS`
     split.
   - `WorldCoverLandCoverAdapter` — global, fallback for any parcel
     outside NA.
2. **Country resolver** — pipeline registry consults the parcel's
   country code (already resolved in the Tier-1 prelude) before
   selecting the adapter. `US → NLCD`, `CA → ACI`, else `WorldCover`.
   Mirrors the existing country-branched pattern in
   `layerFetcher.ts`'s `land_cover` summary.
3. **Per-feature provenance.** Each land-cover feature returned to
   downstream consumers carries `source: "NLCD" | "ACI" | "WorldCover"`,
   `vintage: <year>`, and `licence_short: "USGS-PD" | "OGL-CA-2.0" | "CC-BY-4.0"`.
   `summary_data.dataSources[]` aggregates to a deduped list.
4. **Vintage mixing — no ecoregion gate.** Diagnosis reports surface
   per-source vintage in the footnote; no `dataDateMin` constraint.
   Pollinator opportunity is an advisory layer (not part of
   `computeScores.ts`), so honest disclosure beats coverage gating.
5. **Class normalisation.** A shared mapping in
   `packages/shared/src/ecology/landCoverClasses.ts` translates
   each adapter's native class IDs to a canonical Atlas class set
   that the pollinator weight tables consume. NLCD Anderson L2 +
   ACI ag classes map to the canonical set with full fidelity;
   WorldCover's "Cropland" class maps to a `crop_unspecified`
   bucket that the friction model treats as moderate-friction
   (between Pasture and Annual-crops). The unspecified bucket is
   the honest cost of WorldCover's coarseness.

## Resolution of carried open questions

Resolved here so 8.1-A is fully spec'd and 8.1-B can land cleanly:

| Question | Resolution |
|---|---|
| **Vintage mixing** (WorldCover 2021 + ACI annual in same snapshot) | Per-feature `vintage` + diagnosis-report footnote. No ecoregion `dataDateMin` constraint. |
| **Taxon-specific friction** (honeybee vs native bee vs butterfly per Sponsler & Johnson 2017) | Out of scope for Phase 8.1. Universal class-table friction in 8.1-B; taxon-specific rides on as a P2 follow-on if stakeholder review surfaces a gap. |
| **Buffered bbox for off-parcel land cover** | Default **2 km** buffer (mid-range native bee foraging, per Sponsler & Johnson 2017). Locked as `POLLINATOR_BUFFER_KM` in `corridorFriction.ts`. Configurable later if stakeholder review demands. |

## Consequences

**Positive.**
- Three adapters but one display-layer surface; per-feature
  provenance keeps mixed-source rendering principled.
- ACI's ag-class detail flows through to the friction model, so
  the pollinator-supportive vs. -limiting weighting actually
  discriminates between Pasture and Annual crops in CA.
- Vintage drift is surfaced honestly; no operator effort to keep
  layers in lockstep.

**Negative.**
- Three adapters to maintain. Mitigation: NLCD + WorldCover are
  fairly stable; ACI's annual cadence means a yearly refresh job
  but the schema is documented and stable across years.
- WorldCover-only parcels lose ag-class fidelity. Mitigation: the
  `crop_unspecified` bucket is the honest representation rather
  than fabricating detail.

**Neutral.**
- No `computeScores.ts` change. Pollinator opportunity stays
  advisory; scoring-parity guard remains meaningful.

## Implementation slicing

1. **8.1-A.1 — Adapter skeletons + class normalisation.** Three
   `DataSourceAdapter` implementations + `landCoverClasses.ts`
   canonical mapping + tests against the existing fixtures.
2. **8.1-A.2 — Country-resolver registry update.** Pipeline
   registry routes `US → NLCD`, `CA → ACI`, else `WorldCover`.
   Existing `layerFetcher.ts` country-branch falls through.
3. **8.1-A.3 — Per-feature provenance + dataSources schema.**
   `summary_data.dataSources[]` schema add; downstream consumers
   (EcologicalDashboard, Diagnose page) read the per-feature
   `source` for tooltip rendering.
4. **8.1-A.4 — Diagnosis-report copy.** Per-source attribution
   strings (per [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md))
   land in the report template's land-cover section.

8.1-A does **not** touch `PollinatorOpportunityProcessor` —
that's 8.1-B's job, and lands once 8.1-A is producing real
patches.

## References

- Scoping ADR: [`2026-05-02-raster-pollinator-corridor-scoping.md`](2026-05-02-raster-pollinator-corridor-scoping.md)
- External-data reference: [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
- Adapter pattern: [`2026-04-21-nwis-groundwater-adapter.md`](2026-04-21-nwis-groundwater-adapter.md)
- Existing weight tables: `packages/shared/src/ecology/pollinatorHabitat.ts`
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.1
- Foundational: [`2026-04-24-atlas-pollinator-ecoregion-corridor.md`](2026-04-24-atlas-pollinator-ecoregion-corridor.md)
