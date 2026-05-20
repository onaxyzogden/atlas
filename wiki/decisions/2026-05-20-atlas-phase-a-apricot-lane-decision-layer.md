# 2026-05-20 — Atlas Phase A: Apricot Lane stress-test decision-layer closes

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase A (decision-layer quick wins)
**Commits:** `b729abcb` (A.2), `acf42b1f` (A.3)

## Context

The Apricot Lane stress-test protocol asks whether Atlas can move from a passive
data dashboard to an active regenerative command center able to orchestrate a
200+ acre degraded site and solve a permaculture project's subsidy problem with
patient, halal capital. Phase A targets the decision-layer quick wins where
Atlas's presentation layer already largely passes the protocol — closing the
remaining gaps without rebuilding intact surfaces.

A prior session attempted Phase A and recorded it as complete, but a fresh
on-disk audit (branch rebased externally to `f83df5c1`, B4 guild-member work
landed instead) showed no Phase A artifacts persist. The user directed a
restart with **one conventional commit per sub-phase** (no end-of-phase
batching), `Co-Authored-By: Claude Opus 4.7`, fetch+check-divergence after
every commit, and push only at phase boundaries.

## Decisions

### A.1 — Consolidated Intelligence Summary card → **OBSOLETE**

The original plan assumed v2's fragmented panel architecture. The v3 Observe
IA already consolidates intelligence via `LandVerdictCard` +
`ObserveChecklistAside`. There is no top-of-view slot to mount a new card into,
and adding one would regress the v3 layout. **Skip; do not implement.**

### A.2 — Monetize ecosystem services in Capital Partner Summary

Wire `computeEcosystemValuation()` into the Capital Partner Summary export as
a **Natural-Capital Appreciation (informational)** section. Framing is
explicit: *appreciation of stewarded land value, not yield on contributed
capital, not revenue to capital partners*. Covenant-safe per fiqh constraint
against *bayʿ mā laysa ʿindak* — Islam does not permit the sale of what one
does not yet possess.

Implementation:
- `packages/shared/src/schemas/export.schema.ts` — optional `naturalCapital`
  field on `FinancialPayload`: `{ totalUsdHaYr, totalUsdYr, dominantService,
  narrative }`.
- `apps/web/src/lib/ecosystemValuation.ts` — new
  `selectEcosystemValuationFromLayers({ layers, propertyAcres,
  socialCostCarbonUsdPerTon? })` helper. Pulls `land_cover`, `wetlands_flood`,
  `soils`, `crop_validation` layers; computes Sprint R carbon-seq inline
  (matches `computeScores.ts` formula); calls `computeEcosystemValuation()`.
- `apps/web/src/features/export/CapitalPartnerSummaryExport.tsx` — invoke the
  selector against `siteData.layers`, include `naturalCapital` in the export
  request payload when present.
- `apps/api/src/services/pdf/templates/capitalPartnerSummary.ts` — new
  `naturalCapitalSection` rendered between mission and capital channels: three
  metric cards (per-ha value, site total, dominant service) plus narrative
  paragraph. Explicit non-revenue framing in the section's lead.

### A.3 — Mobile Observe stack <30s glance reorder

Promoted `NextBestActionsPanel` directly after `LandVerdictCard` in
`MobileProjectShell.tsx` so Verdict + first Next Best Action are above the
fold. `CriticalConstraintAlert` and `DecisionTriad` now follow.

Constraint observed (per [[feedback-mobile-overview-stack]]): stack stays
flat — no `<details>` wrappers, no `IntelligenceSummaryCard` mount, no
compact mode on `NextBestActionsPanel`. The reorder is purely the four JSX
children's order.

## Verification

- Shared package build: clean.
- API tsc: clean.
- API tests: 558 passed, 3 skipped (51 files).
- Web tsc: A-touched files clean (`ecosystemValuation.ts`,
  `CapitalPartnerSummaryExport.tsx`, `MobileProjectShell.tsx`,
  `capitalPartnerSummary.ts`). Pre-existing `precedesAuto` errors in
  `workItemStore.migration.ts` and `goalCompass` tests are out of A scope.
- Web tests: full suite green up to environmental worker-OOM on a large file
  (unrelated to A changes). No A-touched paths contain test files (A.2 is
  plumbing, A.3 is JSX reorder — neither warrants new tests per scope).

## Consequences

- Capital Partner Summary now communicates ecosystem-services value as a
  distinct, covenant-safe line item, addressing the protocol's natural-capital
  row of the scorecard.
- Mobile Observe glance test (<30s) should now succeed on the seeded fixture
  when it lands — both decision artifacts (verdict + action) render before
  scroll.
- Phase A.1 retired as obsolete and crossed off the plan; future plan
  revisions should not reintroduce it.
- Phases B, B.5, C, D remain to be redone from scratch in future sessions.

## References

- Plan file: `c-users-my-own-axis-downloads-validatio-quiet-simon.md`
- Source protocol: `Validation Protocol_ OGDEN Land OS vs. Apricot Lane Model.md`
- Related: [[feedback-mobile-overview-stack]], [[project_branch_rebase]],
  [[project_lifecycle_retirement]]
