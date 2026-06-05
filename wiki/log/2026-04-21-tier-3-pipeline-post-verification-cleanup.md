# 2026-04-21 — Tier-3 pipeline post-verification cleanup

**Objective:** Close out three residual warnings from the end-to-end Rodale verification run following shared-scoring unification + migration 009.

### Completed
- **Microclimate race (Fix 1):** `startTerrainWorker` restructured so its existing try/catch sits inside an outer try/finally. Microclimate enqueue (`data_pipeline_jobs` INSERT + `microclimateQueue.add`) moved into the finally block, firing on both terrain success and failure. Original microclimate block removed from `processTier1Job`. The invariant "terrain failure must not silently suppress microclimate" is preserved at a different layer.
- **Watershed retries (Fix 2):** `WatershedRefinementProcessor` queue `attempts: 2 → 3` to absorb transient USGS 3DEP WCS XML responses. Backoff unchanged (exponential, 10s base → ~70s total headroom).
- **Label count (Fix 3, docs):** Confirmed 10 ScoredResult labels is correct for US projects; the 11-label path is CA-gated at `computeScores.ts:410` via `Canada Soil Capability`. No code change.

### Verification
- `npx tsc --noEmit` in apps/api — clean.
- `DELETE FROM data_pipeline_jobs WHERE project_id='966fb6a3-6280-4041-9e74-71aae3f938be';` + `redis-cli DEL bull:tier1-data:deduplication`; re-triggered via `POST /api/v1/layers/project/:id/elevation/refresh`.
- All 5 jobs (`fetch_tier1`, `compute_terrain`, `compute_watershed`, `compute_microclimate`, `compute_soil_regeneration`) terminated `complete` on first try — **no intermediate `failed` rows**, confirming fixes 1 + 2 landed cleanly.
- `site_assessments`: v2, `is_current=true`, `overall=50.0`, `jsonb_array_length(score_breakdown)=10`.
- `scripts/verify-scoring-parity.ts 966fb6a3-…` exits 0 with |delta|=0.000 (writer/scorer parity against real layer rescore).

### Deferred
- None — plan's Definition of Done fully met.

### Files changed
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — try/finally restructure + watershed attempts bump.

### Wiki updates
- New decision: `wiki/decisions/2026-04-21-tier3-pipeline-cleanup.md`
- `wiki/entities/data-pipeline.md` — new "Pipeline Fixes (Tier-3 cleanup, 2026-04-21)" section.
- `wiki/index.md` — decision link appended.

### Recommended next session
- Copy-writing for the 6 labels missing `SCORE_EXPLANATIONS` entries in `educationalBooklet.ts` (Habitat Sensitivity, Stewardship Readiness, Community Suitability, Design Complexity, FAO Land Suitability, USDA Land Capability) — surfaced in the earlier schema-lift decision as a deferred follow-up.
