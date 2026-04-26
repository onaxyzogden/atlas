-- Migration 009: drop the lossy 4-column score projection on site_assessments.
--
-- Before this migration, site_assessments carried four dedicated numeric(4,1)
-- columns (suitability_score, buildability_score, water_resilience_score,
-- ag_potential_score) that were a projection of 4 of the 10 labels emitted by
-- the shared scorer in `@ogden/shared/scoring`. The projection was:
--
--   lossy     — discarded the other 6 labels (Habitat Sensitivity, Stewardship
--               Readiness, Community Suitability, Design Complexity, FAO Land
--               Suitability, USDA Land Capability) and their per-component
--               `score_breakdown: ScoreComponent[]` detail.
--   stringly  — depended on `ScoredResult.label` string matching an
--               `as const` map in SiteAssessmentWriter.ts; a rename on the
--               shared side would throw at write-time.
--
-- After this migration, the canonical source for per-label scores is the
-- `score_breakdown` jsonb column, which holds the full `ScoredResult[]` array
-- exactly as `computeAssessmentScores(...)` returns it. `overall_score` stays
-- as a denormalised convenience column (cheap to index/sort on) and is
-- computed from `computeOverallScore(scores)` in the writer's single code path.
--
-- Safety: confirmed at 2026-04-21 that `SELECT count(*) FROM site_assessments`
-- returns 0 in the dev DB — no rows to migrate, so this is a pure DDL change.
-- The shared scorer's canonical output shape (ScoredResult[]) lives in
-- `packages/shared/src/scoring/types.ts`; any future rename goes through that
-- file as the single point of truth.

ALTER TABLE site_assessments
  DROP COLUMN IF EXISTS suitability_score,
  DROP COLUMN IF EXISTS buildability_score,
  DROP COLUMN IF EXISTS water_resilience_score,
  DROP COLUMN IF EXISTS ag_potential_score;

COMMENT ON COLUMN site_assessments.score_breakdown IS
  'Canonical ScoredResult[] from @ogden/shared/scoring. Each element: {label, score, confidence, score_breakdown: ScoreComponent[], layerSources, computedAt, ...}. Source of truth for all per-label scores; overall_score is denormalised from computeOverallScore(breakdown).';

COMMENT ON COLUMN site_assessments.overall_score IS
  'Weighted-mean score in [0,100], numeric(4,1). Computed by shared computeOverallScore(ScoredResult[]) — not independently — so it is always in sync with score_breakdown.';
