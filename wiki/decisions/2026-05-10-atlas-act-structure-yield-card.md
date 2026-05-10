# Atlas Act — Structure-anchored yield card

**Date:** 2026-05-10
**Branch:** `feat/atlas-machinery-backend` (rider commit)

## Context

The Act-stage `Harvest log` Quick-Log surface lets stewards log a
harvest from a structure (greenhouse pilot use-case) via
`ActStructurePopover.actions.startHarvestLog`. Those entries land in
`harvestLogStore` with `sourceKind === 'structure'` and a
`structureId` — but the read-side card grouping was crop-area-only,
so structure-source entries fell into an empty-`cropAreaId` bucket
and silently never rendered. Phase-3 deferred follow-up.

## Decision

New `StructureYieldCard` mirroring `LivestockYieldCard`:

- Reads `harvestLogStore` filtered to `sourceKind === 'structure'`.
- Groups by `structureId`; resolves structure label via
  `useStructureStore` + `STRUCTURE_TEMPLATES`.
- Slotted into the `harvest` Act module
  ([apps/web/src/v3/act/types.ts](../../apps/web/src/v3/act/types.ts))
  beside `Harvest log`; lazy-loaded in
  [ActModuleSlideUp](../../apps/web/src/v3/act/ActModuleSlideUp.tsx).
- Structure-agnostic: future harvest-capable structure types
  (bee box, mushroom log array, ...) surface automatically via
  `getActionsForType` with no read-side change.

## Why a separate card

Crop-area harvests and structure harvests share the store but differ
in how a steward thinks about them — crop area is "what bed",
structure is "which greenhouse". Mixing them in one grouped view
would force the steward to mentally separate them every time. Two
sibling cards in the same module give the right at-a-glance view
per source.

## Verification

- Structure-source entries now render grouped by structureId.
- Crop-area entries on the existing `Harvest log` card unchanged.
- No structure entries → empty state ("No structure-anchored
  harvests yet").

## Related

- 2026-04-29 act-stage-ia-restructure — original Act module shape.
- LivestockYieldCard — pattern source for structure-yield grouping.
