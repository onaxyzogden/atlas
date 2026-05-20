# Log — B3 rotation-sequence spine push

**Date:** 2026-05-20
**Branch:** `feat/atlas-permaculture`
**ADR:** [[2026-05-20-atlas-b3-rotation-sequence-spine-push]]

## Summary

Closed the D-stage gap on the B3 rotational-grazing sequencer:
projected `MoveCalendarEntry[]` now seeds a new
`source: 'rotation-sequence'` family of WorkItems with provenance
`<cellGroup>__<paddockId>__<sequenceOrder>__<cycleIndex>`, dates
mapped 1:1 from the projection, and `precedesAuto` chained linearly
within each cellGroup. Push is explicit (Sync button on
`RotationSequenceCard`) or piggybacks the three B3.1 editor Save
handlers (overgrazed / rest / unplanned-paddock).

## Commits (per-task explicit-path)

1. `feat(shared): WorkItem source +'rotation-sequence' + generatedFromRotationMove provenance; syncManifest 3→4`
2. `feat(livestock): seedRotationSequenceWorkItems — pure projection→WorkItem[] seeder`
3. `feat(livestock): seedRotationSequenceDependencies — within-cellGroup precedesAuto chaining`
4. `feat(store): workItemStore replaceRotationSequence{Rows,Dependencies} actions`
5. `feat(livestock): pushRotationSequenceToSpine orchestrator + integration tests (14/14 green)`
6. `feat(livestock): wire spine push into RotationSequenceCard Sync button + 3 B3.1 adherence editor Save handlers`
7. `docs(wiki): B3 spine-push — ADR + log entry + index pointer`

## Verification

- Targeted vitest (`rotationSequenceSpineSync.test.ts`): 14/14 green.
- Full apps/web vitest sweep: **1562/1562** (was 1548).
- `tsc --noEmit` apps/web: pre-existing `precedesAuto` shape errors
  inherited from
  [[2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]]; no new
  errors reference the B3 surface.
- Covenant grep: the only matches are negative-assertion guards in
  the spine-sync docstring and the editors covenant test.
- Branch divergence `git rev-list --left-right --count HEAD...@{u}`:
  `0/0` — safe to push.

## Posture

Strictly-additive. Single-writer preserved (cover-crop,
goal-compass, intervention, planting, livestock-move-event, and
nursery-batch families untouched). No covenant surface.

## Deferred (explicit non-goals)

- No `MODULE_CARDS` row (card already mounted).
- No per-move `materialsAuto` cost rows (data model has no per-move
  agronomic inputs).
- No `LivestockMoveEvent` mutation (observe-stage, not Plan-stage).
- No goal-tree criterion / readiness gating.
- No cross-cellGroup `precedesAuto` edges.
- No `WorkItem.overridden` UI in this slice.
