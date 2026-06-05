# ADR — Atlas B3.x: per-move rotation materials kit (salt / mineral / water-haul + fencing)

**Date:** 2026-05-23
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B3.x (closes the per-move `materialsAuto` open item left by
[[2026-05-20-atlas-b3-rotation-sequence-spine-push]] and
[[2026-05-20-atlas-b3-x-rotation-promotion-criteria]])
**Status:** Accepted — shipped in commits (this slice)
**Related:** [[2026-05-18-atlas-b3-rotational-grazing-sequencer]],
[[2026-05-20-atlas-b3-rotation-sequence-spine-push]],
[[2026-05-20-atlas-b3-x-rotation-promotion-criteria]],
[[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]],
[[2026-05-19-atlas-b3-1-rotational-grazing-hardening]]

---

## Context

B3 shipped the `source: 'rotation-sequence'` WorkItem family and the
`pushRotationSequenceToSpine` orchestrator; B3.x then wired those rows into
livestock-stage readiness gates. Both ADRs explicitly deferred one open item:
the **per-move salt / mineral / water-haul `materialsAuto` kit**.

Until this slice `seedRotationSequenceWorkItems`
([apps/web/src/features/livestock/rotationSequenceSpineSync.ts](../../apps/web/src/features/livestock/rotationSequenceSpineSync.ts))
hardcoded `materialsAuto: []` and `equipmentRequiredAuto: []` on every
projected move. Each move therefore landed on the spine with **no provisioning
detail** — the ResourcingCard BOM (`rollUpBom`) showed nothing for rotation,
and a steward planning a season of moves had no read of the salt, mineral,
water, and temporary fencing the season actually requires.

This slice makes each projected rotation move carry an agronomic provisioning
kit: two consumable `materialsAuto` lines (free-choice salt + loose mineral),
one water-haul `materialsAuto` line, and one `equipmentRequiredAuto` line
(portable electric fencing). Consumable quantities scale by the paddock's
animal-unit (AU) load × graze-days. **Strictly-additive — no schema bump, no
new store action, no covenant surface.**

## Decision

### New pure module — `rotationMoveMaterials.ts`

- **`MATERIAL_RATES`** catalog: per-AU-per-day rates for salt (0.03 kg),
  loose mineral (0.085 kg), and water-haul (45 L), each carrying a `source`
  citation (NRC *Nutrient Requirements of Beef Cattle*, 8th rev. ed. 2016, for
  free-choice salt + mineral intake; USDA-NRCS *National Range and Pasture
  Handbook* for water intake). A single representative AU-basis figure per line
  — free-choice intake is roughly body-size proportional, so a single AU basis
  is defensible across the app's coarse species taxonomy (same simplification
  `AU_FACTORS` itself makes). This is a **coarse planning heuristic, not a
  nutrition assay** — same honesty posture as `rotationCapacityMath`'s
  docstring and B2.1's compost-yield line.
- **`ROTATION_FENCING_EQUIPMENT`** — single equipment string, "Portable
  electric fence (reel + step-in posts + energizer)".
- **`paddockAnimalUnits(paddock)`** — reuses the EXACT primary-species
  heuristic the private `auLoad` in
  [rotationCapacityMath.ts](../../apps/web/src/features/livestock/rotationCapacityMath.ts)
  uses: `stockingDensity (head/ha) × (areaM2 / 10_000) ×
  AU_FACTORS[species[0]]`. Returns 0 when there is no stocking density, no
  species, or an unknown primary species — sidesteps the multi-species
  head-split problem the same way the shipped capacity math does.
- **`buildRotationMoveKit({ paddock, grazeDays })`** — pure. Per consumable,
  total = `round2(AU × grazeDays × ratePerAuPerDay)`, packaged as a
  `MaterialLine` with the absolute total + `AU × days × rate` breakdown in
  `notes`. Returns `{ materials: [], equipment: [fencing] }` when AU ≤ 0 or
  grazeDays ≤ 0 (skip-when-empty; the fencing line is always emitted because
  the move needs a perimeter regardless of stocking).

### Quantity basis — absolute total in `notes`, `quantityPerAcre` unset

The human-readable per-move total lives in each `MaterialLine.notes`
(e.g. `"≈ 450 L total — 2.5 AU × 4 graze-days × 45 L/AU/day"`).
`quantityPerAcre` is left **unset** — confirmed safe: `rollUpBom`
([packages/shared/src/lib/resourcingConflicts.ts](../../packages/shared/src/lib/resourcingConflicts.ts))
keeps `undefined` and only sums numeric values (no NaN), so the BOM "qty/acre"
column simply stays blank for these rows. These are per-move provisioning
amounts, not per-acre seed rates.

### Inline population — no new store action

The kit is computed at row-construction time inside
`seedRotationSequenceWorkItems` (one `buildRotationMoveKit` call per projected
move, spread into `materialsAuto` / `equipmentRequiredAuto`).
`replaceRotationSequenceRows` already rebuilds every non-overridden
rotation-sequence row wholesale on each push and preserves `overridden` rows
untouched, so **no new store action, no new dispatch, no `CriteriaForecastTab`
change** is needed — unlike the cover-crop precedent (which needed a separate
`replaceCoverCropResources` only because its resources recompute independently
of row seeding). Overridden rows keep their materials via the existing
replacement gate.

## Scope decisions (explicit non-goals)

- **No `costRangeAuto`** — materials only; no price catalog, no covenant
  exposure. No cost data enters the surface at all.
- **No `quantityPerAcre` population** — absolute total in `notes`.
- **No multi-species head split** — primary-species AU heuristic, identical to
  the shipped `rotationCapacityMath` `auLoad`. Refinement is a later slice.
- **No new store action / no `CriteriaForecastTab` change** — inline at seed
  time; rows rebuild on every push.
- **No mutation of `speciesData.ts`** — rates live in the new catalog module.
- **No per-move `laborHrsAuto`** — provisioning only.
- **No schema bump** — `materialsAuto` / `equipmentRequiredAuto` already exist
  on `WorkItem`; `MaterialLine` shape unchanged.

## Covenant posture

Strictly-additive: one new pure module + tests, one inline call-site edit. No
schema bump, no enum change, no new store action, no store-write surface, no
new card, no `MODULE_CARDS` row, no migration. Vocabulary: "salt", "mineral",
"water-haul", "fencing", "rotation move", "graze-days", "animal-units". No
riba / gharar / CSRA / salam / investor / financing / cost-of-capital /
payback / ROI / yield-as-return framing. No `costRangeAuto` → no price data
enters at all.

## Verification

- Targeted vitest: `rotationMoveMaterials.test.ts` — 11/11 pass
  (`paddockAnimalUnits` AU math + zero paths; `buildRotationMoveKit` three
  consumables + fencing, rounded totals in notes, unset `quantityPerAcre`,
  linear graze-day scaling, AU=0 / grazeDays=0 skip paths; catalog hygiene —
  every rate carries a positive per-AU-per-day figure and a non-empty source).
- Spine-sync vitest: `rotationSequenceSpineSync.test.ts` — 16/16 pass (was
  14; +2 kit assertions: stocked paddock yields salt/mineral/water lines + a
  fencing entry; unstocked paddock yields only the fencing line; overridden
  rows still preserved unchanged by `replaceRotationSequenceRows`).
- Full apps/web vitest sweep: pass (was 1592 before this slice; +13 new cases).
- `tsc --noEmit`: only pre-existing errors remain (`StepBoundary.tsx`
  `ReactNode`; `HostUnion*` test-file types); no new errors reference the
  rotation-materials surface.
- Covenant grep: the only hits are negative-assertion guards (the docstrings
  in `rotationMoveMaterials.ts` and `rotationSequenceSpineSync.ts` explicitly
  disclaim the vocabulary).
- Branch divergence checked against `@{u}` before any push.

## Critical files

- New: [apps/web/src/features/livestock/rotationMoveMaterials.ts](../../apps/web/src/features/livestock/rotationMoveMaterials.ts)
- New: [apps/web/src/features/livestock/__tests__/rotationMoveMaterials.test.ts](../../apps/web/src/features/livestock/__tests__/rotationMoveMaterials.test.ts)
- Edited: [apps/web/src/features/livestock/rotationSequenceSpineSync.ts](../../apps/web/src/features/livestock/rotationSequenceSpineSync.ts) — import + kit at row construction
- Edited (additive tests): [apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts](../../apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts)
- Reused: [apps/web/src/features/livestock/rotationCapacityMath.ts](../../apps/web/src/features/livestock/rotationCapacityMath.ts) (AU heuristic), [apps/web/src/features/livestock/speciesData.ts](../../apps/web/src/features/livestock/speciesData.ts) (`AU_FACTORS`), [packages/shared/src/schemas/workItem.schema.ts](../../packages/shared/src/schemas/workItem.schema.ts) (`MaterialLine`), [packages/shared/src/lib/resourcingConflicts.ts](../../packages/shared/src/lib/resourcingConflicts.ts) (`rollUpBom`)

## Open work

- B3.x — TrackerCard render polish for cellGroup-grouped move sequences
  (currently lands as flat list).
- Later — multi-species head-split AU refinement (replaces the primary-species
  heuristic shared with `rotationCapacityMath`).
- Later — per-move `laborHrsAuto` for setup/teardown of temporary fencing.
