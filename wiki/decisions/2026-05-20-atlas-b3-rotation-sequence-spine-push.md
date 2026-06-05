# ADR — Atlas B3: rotation-sequence spine push (seed projected moves to WorkItems)

**Date:** 2026-05-20
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B3 (spine-push leg of the rotational-grazing
sequencer — closes the D-stage gap left by [[2026-05-18-atlas-b3-rotational-grazing-sequencer]])
**Status:** Accepted — shipped in commits (this slice)
**Related:** [[2026-05-18-atlas-b3-rotational-grazing-sequencer]],
[[2026-05-19-atlas-b3-1-rotation-adherence-editor]],
[[2026-05-19-atlas-b3-1-rotational-grazing-hardening]],
[[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]],
[[2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]],
[[2026-05-18-atlas-d0-workitem-spine]]

---

## Context

B3 shipped `projectRotationSequence` / `computeMoveCalendar` and a
read-only `RotationSequenceCard` — paddocks + `RotationPlan`
(cellGroups, daysPerCell, restDays, cycles) deterministically project
a `MoveCalendarEntry[]` with `moveInDateISO`, `moveOutDateISO`,
`grazeDays`, and `restDaysUntilNextGraze`. The missing D-stage leg
was **spine composition**: those projected moves never reached the
WorkItem spine, so BudgetCard, TrackerCard, and FieldProofPanel
couldn't see them and no `precedesAuto` dependency edges existed to
chain moves within a cellGroup.

This slice closes that gap by mirroring the cover-crop spine-push
template proven in
[[2026-05-20-atlas-b5-2-x-b-cover-crop-seed-cost-labor-rollup]] and
[[2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]]: a new
`source: 'rotation-sequence'` WorkItem family, a single
`pushRotationSequenceToSpine(projectId)` orchestrator, and wire-up
into the three B3.1 adherence editors plus an explicit "Sync
schedule" button on `RotationSequenceCard`. Strictly-additive;
single-writer preserved; no covenant surface.

## Decision

### New WorkItem family — `source: 'rotation-sequence'`

Schema additions (additive, no breaking changes):

- `WorkItemSource` enum gains `'rotation-sequence'` (8th value,
  after `'cover-crop'`).
- `WorkItem.generatedFromRotationMove?: string` provenance field
  adjacent to `generatedFromCoverCropWindow`. Composite format:
  `<cellGroup>__<paddockId>__<sequenceOrder>__<cycleIndex>`.
- `syncManifest['ogden-work-items'].schemaVersion`: 3 → 4
  (additive enum + optional field; no migration needed).

WorkItem shape per projected move:

```
id: rs__${cellGroup}__${paddockId}__${sequenceOrder}__${cycleIndex}
source: 'rotation-sequence'
overridden: false
title: `Rotation move: ${paddockName} (graze ${grazeDays}d)`
scheduledStart: moveInDateISO
scheduledEnd: moveOutDateISO
linkedFeatureId: paddockId
materialsAuto: []                  // no per-move agronomic inputs
equipmentRequiredAuto: []
dependsOn: [], dependsOnAuto: []
precedesAuto: [next-row-in-cellGroup or []]
generatedFromRotationMove: provenanceId
```

### Single-writer gate

Only the two new store actions write
`source === 'rotation-sequence' && !overridden` rows:

- `replaceRotationSequenceRows(projectId, rows)` — filter retains
  every row where **not** (`projectId` match && `source === 'rotation-sequence'`
  && `!overridden`), then appends the new rows.
- `replaceRotationSequenceDependencies(projectId, depMap)` — same
  preservation gate; writes `precedesAuto` only on un-overridden
  rotation-sequence rows; idempotent same-array short-circuit.

All other families (cover-crop, intervention, planting,
livestock-move-event, nursery-batch, goal-compass) remain untouched.

### `precedesAuto` chaining within cellGroup

Within each `cellGroup`, the row with sequence position N lists the
row with position N+1 in its `precedesAuto`. Cross-cellGroup edges
are deliberately omitted — cellGroups graze independently; chaining
them would impose a false ordering. Last row in each group emits no
edge.

### Orchestrator wire-up

`pushRotationSequenceToSpine(projectId)` is invoked from four call
sites:

1. **`RotationSequenceCard`** "Sync schedule" button (new) —
   explicit user-driven push, sibling to the read-only badge.
2. **`OvergrazedEditor.save()`** — after `upsertCell(targetGrazeDays)`,
   shorten-move flow.
3. **`RestEditor.save()`** — after `upsertCell(targetRestDays)`,
   extend-rest flow.
4. **`UnplannedPaddockEditor.save()`** — after `upsertCell(new
   cell)`, insert-one-off-move flow.

No auto-push on `paddockStore` / `rotationPlanStore` mutations —
push is always explicit or piggybacks an editor Save. Prevents
thrash on every paddock-name typo.

## Scope decisions (explicit non-goals)

- **No new `MODULE_CARDS` row.** `RotationSequenceCard` already
  mounts at sectionId `plan-livestock-rotation-sequence`; the Sync
  button is added inline.
- **No costs or resources auto-rows.** Livestock moves carry no
  per-move agronomic inputs in the current data model. Future
  slice if salt/mineral/water-haul kits become per-move concerns.
- **No `LivestockMoveEvent` mutation.** Those are observe-stage
  recorded events, not Plan-stage projections.
- **No goal-tree criterion / readiness gating.** Spine rows + edges
  only; promotion-criteria wiring is a future B3.x slice.
- **No cross-cellGroup `precedesAuto` edges.**
- **No `WorkItem.overridden` UI in this slice.**

## Covenant posture

Strictly-additive. New source enum value, new optional provenance
field, two new store actions, one orchestrator module, one button,
three Save-handler one-liners. No riba / gharar / CSRA / salam /
investor / financing / cost-of-capital / payback / ROI vocabulary.
Copy: "Rotation move", "graze", "rest", "schedule". The
livestock-move family carries the same agronomic-only framing as the
existing cover-crop, planting, and nursery-batch families.

## Verification

- Targeted vitest: `rotationSequenceSpineSync.test.ts` —
  14/14 cases pass (seeder, dependency helper, orchestrator
  integration including preservation-gate, cross-source
  independence, idempotent re-push).
- Full apps/web vitest sweep: **1562/1562 pass** (was 1548 before
  this slice; +14 new cases).
- `tsc --noEmit`: pre-existing `precedesAuto` shape errors in
  `workItemStore.migration.ts` and `seedGoalCompass*` tests from
  [[2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]] remain;
  no new errors reference the B3 surface.
- Covenant grep: the only hits are negative-assertion guards (the
  docstring in `rotationSequenceSpineSync.ts` explicitly disclaims
  the vocabulary; the editors covenant test asserts absence).
- Branch divergence: `0/0` against `@{u}` before any push.

## Critical files

- New: [apps/web/src/features/livestock/rotationSequenceSpineSync.ts](../../apps/web/src/features/livestock/rotationSequenceSpineSync.ts)
- New: [apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts](../../apps/web/src/features/livestock/__tests__/rotationSequenceSpineSync.test.ts)
- Edited: [packages/shared/src/schemas/workItem.schema.ts](../../packages/shared/src/schemas/workItem.schema.ts) — enum + provenance field
- Edited: [apps/web/src/lib/syncManifest.ts](../../apps/web/src/lib/syncManifest.ts) — schemaVersion 3→4
- Edited: [apps/web/src/store/workItemStore.ts](../../apps/web/src/store/workItemStore.ts) — two `replaceRotationSequence*` actions
- Edited: [apps/web/src/features/livestock/RotationSequenceCard.tsx](../../apps/web/src/features/livestock/RotationSequenceCard.tsx) — Sync button
- Edited: [apps/web/src/features/livestock/RotationSequenceCard.module.css](../../apps/web/src/features/livestock/RotationSequenceCard.module.css) — `.headActions` + `.syncBtn`
- Edited: [apps/web/src/features/livestock/editors/OvergrazedEditor.tsx](../../apps/web/src/features/livestock/editors/OvergrazedEditor.tsx)
- Edited: [apps/web/src/features/livestock/editors/RestEditor.tsx](../../apps/web/src/features/livestock/editors/RestEditor.tsx)
- Edited: [apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx](../../apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx)

## Open work

- B3.x — promotion-criteria wiring (`source: 'rotation-sequence'`
  rows participate in livestock-stage readiness gates).
- B3.x — per-move salt / mineral / water-haul `materialsAuto` kit if
  agronomic inputs become per-move concerns.
- B3.x — TrackerCard render polish for cellGroup-grouped move
  sequences (currently lands as flat list).
