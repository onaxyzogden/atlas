# 2026-04-21 — Tier-3 pipeline post-verification cleanup

**Status:** Accepted (tsc clean; Rodale end-to-end re-verified; parity Δ=0.000)
**Sprint:** 2026-04-21 follow-up to shared-scoring unification + schema lift
**Context source:** Wiki (entities/data-pipeline.md, concepts/scoring-engine.md, decisions/2026-04-21-site-assessments-schema-lift.md), plan file `you-are-executing-the-tingly-pelican.md`

---

## Context

The shared-scoring sprint and migration 009 landed an end-to-end green
pipeline run for Rodale Institute project `966fb6a3-6280-4041-9e74-71aae3f938be`:
one `site_assessments.is_current=true` row, `overall=50.0`, 10 ScoredResult
labels. Three residual warnings surfaced during verification:

1. **Microclimate race.** `compute_microclimate` was enqueued from
   `processTier1Job` alongside `compute_terrain`, so the first attempt always
   fired before `terrain_analysis` was written. BullMQ's `attempts: 3`
   exponential backoff saved it, but the first attempt reliably failed and
   left a noisy error trail. The original move was deliberate — terrain
   failure must not silently suppress microclimate — so the fix had to
   preserve that invariant.
2. **Watershed transient WCS XML errors.** `WatershedRefinementProcessor`
   hits the same USGS 3DEP WCS endpoint as terrain; the WCS occasionally
   returns XML on the first request. Watershed had `attempts: 2` with 10s
   exponential backoff — both retries could burn inside ~30s if the WCS
   stayed degraded. Seen once during verification.
3. **Label count 10 vs 11 expected.** Not a bug. The shared scorer emits
   10 labels for `country='US'` and 11 for `country='CA'`; the 11th
   (`Canada Soil Capability`) is US-gated out at
   [computeScores.ts:410](../../packages/shared/src/scoring/computeScores.ts:410).
   The "11 labels" expectation in the prior plan was wrong for a US project.

## Decision

1. **Move microclimate enqueue into `startTerrainWorker`'s `finally` clause.**
   Restructured the worker so its existing try/catch sits inside an outer
   `try { … } finally { … }`. The finally INSERTs the `data_pipeline_jobs`
   row and `microclimateQueue.add(...)` — fires on both success and failure
   paths. `MicroclimateProcessor` throws a clear error if `terrain_analysis`
   is missing, and `attempts: 3` still provides retry headroom for the
   narrow case where the `UPDATE 'complete'` commit races the microclimate
   read.

2. **Bump watershed `attempts: 2 → 3`** to match microclimate. Backoff stays
   `exponential, delay: 10000` — BullMQ's exponential progression (10s → 20s
   → 40s) gives the WCS ~70s to recover. No separate jitter key needed.

3. **Document the 10-label expectation.** The scorer behavior is correct.
   US projects emit 10 `ScoredResult` labels; the 11-label path activates
   only when `country='CA'` appends `Canada Soil Capability`. No code
   change.

## Why finally, not sequential-after-terrain-complete?

Counter-proposed: move the microclimate enqueue into `startTerrainWorker`'s
success branch only, so retries are unnecessary. Rejected because it breaks
the invariant that terrain failure must not silently suppress microclimate.
Microclimate can run on partial data (PET from NASA POWER does not strictly
require slope aspect); hard-coupling the two would regress coverage. The
`finally` preserves both outcomes: correctness on terrain success, graceful
degradation on terrain failure.

## Verification (2026-04-21)

- `cd apps/api && npx tsc --noEmit` → clean
- Cleared `data_pipeline_jobs` + `bull:tier1-data:deduplication`, re-triggered
  Rodale via `POST /api/v1/layers/project/:id/elevation/refresh`
- All 5 jobs (`fetch_tier1`, `compute_terrain`, `compute_watershed`,
  `compute_microclimate`, `compute_soil_regeneration`) terminated `complete`
  on first try — no intermediate `failed` rows
- `site_assessments`: v2, `is_current=true`, `overall=50.0`,
  `jsonb_array_length(score_breakdown)=10`
- `scripts/verify-scoring-parity.ts 966fb6a3-…` exits 0 with Δ=0.000
  (writer/scorer parity against real layer rescore)

## Files touched

| File | Change |
|---|---|
| `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` | `startTerrainWorker` wrapped in outer try/finally; microclimate enqueue moved into finally; `processTier1Job` microclimate block removed; watershed queue `attempts: 2 → 3` |

## Consequences

- First-attempt microclimate failures eliminated; noise in worker logs
  reduced by ~1 failed row per pipeline run.
- Watershed first-attempt WCS transient XML errors absorbed by the third
  retry without surfacing as `failed` in `data_pipeline_jobs`.
- The "terrain failure must not silently suppress microclimate" invariant
  remains enforced — now at a different layer (finally block vs. Tier-1
  fan-out).
- 10-label expectation documented; future verification scripts can assert
  `jsonb_array_length = 10` for US projects without flagging it as a
  regression.
