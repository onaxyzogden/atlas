# 2026-05-10 — Regional-cost citation backfill (Phase 4.1)


**Context.** Phase 4.1 of the pre-test friction audit
([wiki/decisions/2026-05-09-atlas-pre-test-audit.md]) flagged 76 rows
across `apps/web/src/features/financial/engine/regionalCosts/` carrying
`citation: null, confidence: 'low'` — 35 in `US_MIDWEST.ts`, 41 in
`CA_ONTARIO.ts` (the audit doc pointed at a stale path
`packages/shared/src/regionalCosts/`; corrected in the ADR). Operator
decision: **option A — source backfill pass**, not a UI banner and not
defer.

**Change.**

- Sourced 8 primary/secondary references and embedded them as
  citation constants (URL + access date) in both files: NRCS EQIP FY2025
  payment schedules, NREL ATB 2024 residential battery, American Trails
  trail-cost guide, Angi 2026 rural-road guide, HomeAdvisor 2025 septic
  cost data, OMAFRA Publication 60 — 2025 Field Crop Budgets, OBC 2024
  Part 8 sewage compendium + Septic Replacement Ontario calculator,
  USDA SARE Agroforestry Handbook.
- **OMAFRA Pub 827 → Pub 60 correction.** The previous file referenced
  "OMAFRA Publication 827 — Cost of Production budgets." Pub 827 does
  not exist; the canonical OMAFRA series is Pub 60 — Field Crop
  Budgets (2025 edition). Constant renamed `OMAFRA` →
  `OMAFRA_PUB60_2025` and all references updated; file header
  documents the correction.
- **35 of 76 rows backfilled** (46 %). The remaining 41 stay
  `confidence: 'low'` but now each carries a sharper rationale (amenity
  / design-intent landscaping; retail-priced or DIY infrastructure;
  Ontario region-specific gaps where MECP / Hydro One aggregations don't
  exist publicly) instead of the old "placeholder — varies"
  boilerplate.

**Verification.**
- `npx vitest run src/tests/financial/costDatabase.test.ts` → 7/7
  passing.
- `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
  --noEmit` → 3 errors in unrelated SWOT files (pre-existing in working
  tree, not in the files this commit touches).
- `grep -c "citation:\s*null"` → US_MIDWEST 35→19, CA_ONTARIO 41→22,
  total 76→41.
- ADR: [wiki/decisions/2026-05-10-regional-cost-citation-backfill.md].

**Deferred.** Audit phase 4.2 (deferred-TODO sweep — guild centroid,
succession slider, GAEZ scenario picker, hydrology stubs, public-portal
cache) still open. Future-work hooks recorded in the ADR: Hydro One
Distribution Connection Schedule (Ontario `infrastructure`), MECP Well
Records aggregation (Ontario `well_pump`), state-level NRCS schedules
(IA/IL/WI/MN/IN) for US Midwest specificity.
