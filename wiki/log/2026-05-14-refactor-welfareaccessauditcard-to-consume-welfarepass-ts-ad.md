# 2026-05-14 — Refactor WelfareAccessAuditCard to consume welfarePass.ts + add tests


**Branch.** `feat/atlas-permaculture` · sequel to `c33f4293`.

**Goal.** Close the deferred follow-up from the previous wiring
commit: collapse the two copies of the welfare-band math into one,
and add unit coverage for the new helper.

**Changes.**

- `apps/web/src/features/livestock/welfarePass.ts` now exports
  `evaluatePaddockWelfare()` (full per-paddock detail — three
  `AxisFinding`s plus `worst`) and the shared types
  `AxisFinding` / `PaddockWelfareEval` / `WelfareBand` /
  `worstWelfareBand`. The boolean `paddockPassesWelfare` and the
  project-scoped `welfareSummaryForProject` collapse to thin wrappers
  over the detail evaluator.
- `apps/web/src/features/livestock/WelfareAccessAuditCard.tsx` loses
  ~140 lines: `polygonCentroid`, `distanceM`, `nearestStructureOfTypes`,
  `nearestUtilityOfTypes` (which was already unused), `nearestWaterAny`,
  `worstBand`, the `SHADE_STRUCTURES` / `SHELTER_STRUCTURES` sets, and
  the local `AxisFinding` / `PaddockEval` / `Band` types — all
  imported from `./welfarePass.js` now. The `evals` useMemo collapses
  to a single `evaluatePaddockWelfare()` call per paddock. The card
  retains `BAND_LABEL` / `BAND_RANK` (display-only sort) / `fmtDistance`
  / `axisDetail` / `remediationFor` — presentation-only strings, not
  domain logic.
- New `apps/web/src/features/livestock/__tests__/welfarePass.test.ts`
  with 12 vitest cases: `worstWelfareBand` ordering,
  `evaluatePaddockWelfare` (missing inputs, partial placement,
  worst-of-three, degenerate geometry), `paddockPassesWelfare` (all
  good / fair / empty), and `welfareSummaryForProject` (empty /
  50% / 100%). Mirrors the `waterSource.test.ts` fixture pattern.

**Verification.** `tsc --noEmit` clean. `vitest run` — 739/739 pass
across 50 files (12 new). Preview on the mtc project's Criteria
forecast tab: `livestock-paddocks-active-count = 4`,
`livestock-welfare-pass-pct = 70 / 85 / 95` at Y1/Y3/Y5 — identical
to the pre-refactor numbers, predicate behavior preserved.

**Deferred.** Four-band tally (good/fair/poor/missing) is not yet
exposed from welfarePass; the card's `summary` useMemo stays inline.
Other livestock cards with their own band math (e.g.
`LivestockWelfarePhasingCard`) are candidates for a next-pass
consolidation.
