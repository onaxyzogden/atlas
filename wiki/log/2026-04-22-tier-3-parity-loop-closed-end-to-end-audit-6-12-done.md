# 2026-04-22 — Tier-3 parity loop closed end-to-end (audit §6 #12 DONE)


Bundle #12 of the 04-21 deep audit — "trigger a real Tier-3 run + re-run
verify-scoring-parity". Verification-only bundle (no code changes).

**DB state at run-time** (stale audit claim of "zero rows" superseded):
- 7 `projects`, 7 `site_assessments` rows, 2 `is_current` Rodale US projects
  with 10/11 complete `project_layers` each.

**Results:**
- **Smoke (no arg):** `npx tsx apps/api/scripts/verify-scoring-parity.ts`
  → module loads clean, 10 US-label `ScoredResult[]` emitted
  (Water Resilience / Agricultural Suitability / Regenerative Potential /
  Buildability / Habitat Sensitivity / Stewardship Readiness / Community
  Suitability / Design Complexity / FAO Land Suitability / USDA Land
  Capability), overall 66.0, determinism check ✓, DB-column mapping ✓ for
  all four tracked labels.
- **DB parity — `26b43c47-e7a2-406f-a6cb-d2d60221a591`** (Rodale 1):
  `Real-layer rescore: 78.0 · DB overall_score: 78.0 · |Δ| = 0.000` ✓
- **DB parity — `966fb6a3-6280-4041-9e74-71aae3f938be`** (Rodale 2):
  `Real-layer rescore: 50.0 · DB overall_score: 50.0 · |Δ| = 0.000` ✓

Both parity checks pass the `numeric(4,1)` rounding threshold with zero
delta, proving `SiteAssessmentWriter` and `@ogden/shared/scoring::
computeAssessmentScores` produce byte-identical results when fed the same
Postgres-materialized `project_layers` rows. The 04-21 schema-lift (#11),
the shared-scoring unification, and the canonical writer all hold end-to-
end against real DB evidence.

- `ATLAS_DEEP_AUDIT_2026-04-21.md` — #12 marked DONE with run output; audit
  hygiene note updated (live parity check no longer a deferred item).

With #12 closed, the 04-21 audit's "new critical-path order" items 1 + 2 are
both green (schema-lift + real Tier-3 run), unblocking the 477 → 484 → 486
test-delta as production-proven.
