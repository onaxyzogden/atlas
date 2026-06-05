# 2026-05-23 — B3.x per-move rotation materials kit (salt / mineral / water-haul + fencing)

**Branch.** `feat/atlas-permaculture`. Closes the per-move `materialsAuto`
open item deferred by both
[2026-05-20 B3 spine-push ADR](../decisions/2026-05-20-atlas-b3-rotation-sequence-spine-push.md)
and
[2026-05-20 B3.x promotion-criteria ADR](../decisions/2026-05-20-atlas-b3-x-rotation-promotion-criteria.md).
Full design context in
[2026-05-23 ADR](../decisions/2026-05-23-atlas-b3-x-rotation-move-materials-kit.md).

**What changed.**

- [apps/web/src/features/livestock/rotationMoveMaterials.ts](../../apps/web/src/features/livestock/rotationMoveMaterials.ts)
  (new, ~135 LOC): `MaterialRate` interface; `MATERIAL_RATES` catalog (salt
  0.03 kg/AU/day, loose mineral 0.085 kg/AU/day, water-haul 45 L/AU/day, each
  with a cited `source`); `ROTATION_FENCING_EQUIPMENT` string;
  `paddockAnimalUnits(paddock)` (reuses the `rotationCapacityMath` `auLoad`
  primary-species heuristic verbatim); `buildRotationMoveKit({ paddock,
  grazeDays })` — per consumable, `total = round2(AU × grazeDays × rate)`
  packaged as a `MaterialLine` with the absolute total + breakdown in `notes`
  and `quantityPerAcre` left unset; returns only the fencing line when AU ≤ 0
  or grazeDays ≤ 0.
- [apps/web/src/features/livestock/__tests__/rotationMoveMaterials.test.ts](../../apps/web/src/features/livestock/__tests__/rotationMoveMaterials.test.ts)
  (new, 11 tests): `paddockAnimalUnits` AU math (2.5 AU for cattle) + the
  three zero paths (no stocking, no species, primary-species-only); kit
  assembly (3 consumables + fencing, rounded totals in notes, unset
  `quantityPerAcre`, linear graze-day scaling 225 L → 450 L, AU=0 /
  grazeDays=0 skip paths); `MATERIAL_RATES` catalog hygiene.
- [apps/web/src/features/livestock/rotationSequenceSpineSync.ts](../../apps/web/src/features/livestock/rotationSequenceSpineSync.ts):
  import `buildRotationMoveKit`; at the row-construction site (was
  `materialsAuto: []` / `equipmentRequiredAuto: []`) call the builder with the
  resolved paddock + `e.grazeDays` and spread the result. No signature change,
  no other logic touched.
- [apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts](../../apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts):
  +2 tests (stocked paddock seeds salt/mineral/water lines + a fencing entry;
  unstocked paddock seeds only the fencing line) plus preservation-test
  assertions that overridden rows keep their materials and fresh rows carry
  the kit. 14 → 16 tests.

**Why inline, not a new store action.** `replaceRotationSequenceRows` already
rebuilds every non-overridden rotation-sequence row wholesale on each push and
preserves `overridden` rows untouched, so the kit is computed at row
construction inside the seeder — no new store action, no new dispatch, no
`CriteriaForecastTab` change. This differs from the cover-crop precedent
(`replaceCoverCropResources`), which needed a separate action only because its
resources recompute independently of row seeding.

**Why the absolute total lives in `notes`.** `quantityPerAcre` would imply a
per-acre seed rate; these are per-move provisioning totals. `rollUpBom` keeps
`undefined` and only sums numeric values, so the BOM "qty/acre" column stays
blank for these rows with no NaN risk, and the human-readable total
(`"≈ 450 L total — 2.5 AU × 4 graze-days × 45 L/AU/day"`) lives in the row
notes.

**Why the primary-species AU heuristic.** `AU = stockingDensity × areaHa ×
AU_FACTORS[species[0]]`, identical to the shipped `rotationCapacityMath`
`auLoad`. Sidesteps the multi-species head-split problem the same way the
carrying-capacity surface already does, so the kit and the capacity read agree
on grazing load. Refinement is a later slice.

**Verification.**
- `node ../../node_modules/vitest/vitest.mjs run rotationMoveMaterials` —
  11/11 green.
- `node ../../node_modules/vitest/vitest.mjs run rotationSequenceSpineSync` —
  16/16 green (14 prior + 2 new).
- Full apps/web vitest sweep — green (+13 new cases over the prior 1592).
- `tsc --noEmit` — only pre-existing errors remain (`StepBoundary.tsx`
  `ReactNode`; `HostUnion*` test-file types); none reference the
  rotation-materials surface.
- Covenant grep over the new/edited source — only negative-assertion docstring
  guards match.
- Branch divergence checked against `@{u}` before push.

**Covenant posture.** Strictly-additive: one new pure module + tests, one
inline call-site edit. No schema bump (`materialsAuto` / `equipmentRequiredAuto`
already exist), no enum change, no new store action, no new card, no
`MODULE_CARDS` row, no migration. No `costRangeAuto` → no price data enters at
all. Vocabulary: salt / mineral / water-haul / fencing / rotation move /
graze-days / animal-units.

**Out of scope.** TrackerCard cellGroup-grouped render polish; multi-species
head-split AU refinement; per-move `laborHrsAuto` for fence setup/teardown;
any cost surface.
