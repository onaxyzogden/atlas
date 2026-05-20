# 2026-05-11 — Module 7 peak-week formula unit-locked


**Motive.** The peak-week-pack arithmetic
`(annualHead × dressedKg) ÷ max(processingDays/5, 1)` is duplicated in
`ColdChainCoverageCard` and `MarketDistributionCard`. Drift between the
two would silently desynchronise both downstream rollups from the
throughput card — exactly the bug the 2026-05-10 sizing slice was meant
to prevent.

**Change.**
- Extracted `computePeakWeekKg` + `AgribusinessSizing` + `DEFAULT_SIZING`
  into pure module `apps/web/src/store/agribusinessSizing.ts` (no
  zustand import — vitest under node env can't construct the persist
  middleware without localStorage).
- Added `apps/web/src/store/__tests__/agribusinessStore.test.ts`: 6
  tests cover the ADR baseline (450 kg/wk), linear scaling on
  `annualHead` and `dressedKg`, 5-day-per-week processing cadence, the
  divide-by-zero clamp at `processingDays < 5`, and the live
  round-trip the prior session verified by preview eval (head=5000 →
  1125 kg/wk).
- Cards still inline the arithmetic by design (prior intentional
  revert preserved). Helper is the documented lock; cards are the
  runtime path. Re-threading the import is noted in the ADR as
  carried-forward scope.

**Verification.** `npx vitest run src/store/__tests__/agribusinessStore.test.ts` → 6/6 pass.

**Commit.** `b06ee21` on `feat/atlas-permaculture`. Pushed.
