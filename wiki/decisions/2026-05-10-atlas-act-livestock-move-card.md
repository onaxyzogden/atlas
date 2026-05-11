# 2026-05-10 — Act Livestock module: LivestockMoveCard (unified two-kind log)

## Context

Phase 3 of the Act-stage structure popover
([2026-05-10-atlas-act-structure-popover](2026-05-10-atlas-act-structure-popover.md))
wired three per-type action handoffs on placed structures. Two are
fully surfaced after today's earlier sibling work:

- `harvest` → `HarvestLogCard` (crop) + `StructureYieldCard` (structure)
  — [2026-05-10-atlas-act-structure-yield-card](2026-05-10-atlas-act-structure-yield-card.md)
- `maintenance` → `MaintenanceLogCard` (earthwork + storage + structure)
  — [2026-05-10-atlas-act-maintenance-log-structure-source](2026-05-10-atlas-act-maintenance-log-structure-source.md)

The third — `livestockMove` (wired on `barn` and `animal_shelter`) —
writes a `LivestockMoveEvent` to `useLivestockMoveLogStore` via
`ActStructurePopover.actions.startLivestockMoveLog`
([apps/web/src/v3/act/ActStructurePopover.actions.ts:153–212](../../apps/web/src/v3/act/ActStructurePopover.actions.ts)).

**Errata (post-merge audit, see [Corrections](#corrections-2026-05-10-post-merge-audit) below).** This ADR
originally claimed "zero cards in `apps/web/src/` consumed the store"
and that paddock-anchored events had no read surface. Both claims were
wrong — they came from a false-negative grep in the planning agent's
output. A direct re-audit confirmed that
[`RotationScheduleCard.tsx:16–20, 109–116, 257–289`](../../apps/web/src/features/livestock/RotationScheduleCard.tsx)
already imported `useLivestockMoveLogStore` and rendered an inline
"Logged moves" section under each paddock row, sourcing per-paddock
events via the `eventsByPaddock()` helper.

The actual gaps this card closes are:

1. **Structure-source events were truly invisible.** `eventsByPaddock()`
   is paddock-keyed and silently drops events whose only set field is
   `structureId` (popover handoff from a barn / animal_shelter). No
   surface anywhere rendered them.
2. **No self-service write affordance.** `RotationScheduleCard` is
   read-only — a steward who wanted to log a move without going
   through the map popover had no in-card form.
3. **Per-paddock log fragments scattered across rotation rows.** No
   single at-a-glance log of all move events across all paddocks
   plus all structures.

`LivestockMoveEvent`
([apps/web/src/store/livestockMoveLogStore.ts:16–31](../../apps/web/src/store/livestockMoveLogStore.ts))
already documents the discriminant: exactly one of `paddockId` /
`structureId` is set per event. Direction is one of `move_in` /
`move_out` / `rotate_through`.

## Decision

**One unified `LivestockMoveCard`** mounted as a new tab on the
`livestock` Act module, between *Yield log* and *Rotation schedule*.

### Why one card, not two siblings

Mirrors the `MaintenanceLogCard` shape (mixed source kinds on one
card), not the harvest split (`HarvestLogCard` + `StructureYieldCard`).
The harvest split was driven by event-shape divergence: crop-area
yield-per-area vs structure yield-per-facility — different units,
different rollups. Move events don't have that asymmetry: both kinds
answer the same question ("herd moved from somewhere to somewhere on
date D, N head, by whom"). The discriminant is purely *where the
destination is*. If specialization later forks the kinds, splitting
is cheap (discriminant already in the event, store unchanged);
merging two cards back is expensive.

### Shape

| Concern | Implementation |
|---|---|
| Store | `useLivestockMoveLogStore` — `events`, `addEvent`, `removeEvent` |
| Filter | `e.projectId === project.id` only (both kinds render) |
| Derived discriminant | `kind = event.structureId ? 'structure' : 'paddock'`, `id = event.structureId ?? event.paddockId ?? ''` |
| Group key | `${kind}::${id}` — same as `MaintenanceLogCard` |
| Label resolver | structure → `useStructureStore` + `STRUCTURE_TEMPLATES` (`${icon} ${name \|\| tpl.label}`, fallback `(deleted structure)`). Paddock → `useLivestockStore.paddocks.name` (fallback `(deleted paddock)`) |
| Form: Feature kind | `<select>` with `paddock` / `structure` |
| Form: source options | paddocks filtered to project, OR structures filtered to project + `getActionsForType(s.type).includes('livestockMove')` (barn + animal_shelter) |
| Form fields | Date, Direction, Species, Head, Who, Notes — matches `LivestockMoveEvent` |
| Defaults | direction `move_in`, species `sheep` — match popover handoff |
| ID prefix | `lvm-` — matches popover's `newAnnotationId('lvm')` |
| Group rollups | Total head moved, last-move date |
| Empty-list hints | When the active kind has zero options, render an inline note pointing to the Plan-stage tool that adds the missing feature |

No schema or store changes. No persist version bump.

## Files

| File | Action |
|---|---|
| `apps/web/src/features/act/LivestockMoveCard.tsx` | **CREATE** — new card (~250 LOC, mirrors MaintenanceLogCard shape) |
| `apps/web/src/v3/act/types.ts` | EDIT — add `act-livestock-moves` to `MODULE_CARDS.livestock` between Yield log and Rotation schedule |
| `apps/web/src/v3/act/ActModuleSlideUp.tsx` | EDIT — lazy import + switch case |

## Verification

- `tsc --noEmit` (8 GB heap) — exit 0 for touched files. (Three
  pre-existing TS errors in `v3/plan/draw/PlanObserveSelectionHandler.tsx`
  remain in concurrent in-flight working-tree work; not introduced by
  this change.)
- Manual click-test deferred to operator smoke (same Phase 3
  limitation: basemap tiles unavailable in dev).

## Related

- [2026-05-10 atlas-act-structure-popover](2026-05-10-atlas-act-structure-popover.md) — Phase 3 handoff that produces structure-anchored move events.
- [2026-05-10 atlas-act-structure-yield-card](2026-05-10-atlas-act-structure-yield-card.md) — sibling pattern (harvest split) chosen *against* here.
- [2026-05-10 atlas-act-maintenance-log-structure-source](2026-05-10-atlas-act-maintenance-log-structure-source.md) — sibling pattern (unified-card three-kind log) chosen *for* here.

## Out of scope

- **Rotation-card integration.** *Originally listed here as
  out-of-scope on the premise that "the current card is plan-only";
  post-merge audit found rotation card already renders logged moves
  inline per paddock row. See Corrections below. Remaining
  rotation-card work (write affordance, plan-vs-actual variance,
  structure-source visibility) deferred to its own session.*
- **Linked `rotate_through` exit/entry pairs.** A `rotate_through`
  event today is one row; modelling as a linked pair waits for the
  rotation-card follow-up.
- **CSV export, date filters, species filters.** Parity with the
  maintenance card.

## Corrections (2026-05-10, post-merge audit)

A re-audit of `RotationScheduleCard` immediately after this card
shipped revealed two factual errors in the original Context section
(corrected inline above; preserved here for the historical record):

1. **"Zero cards in `apps/web/src/` consumed the store."** Wrong.
   `RotationScheduleCard.tsx:16` already imported
   `useLivestockMoveLogStore` + the `eventsByPaddock` helper, and
   lines 257–289 rendered a "Logged moves" section under each
   paddock row.
2. **"Paddock-anchored events had no read surface either."** Wrong
   for the same reason — they did, via the rotation card.

The card still ships and stays committed. Its actual value is the
three gaps listed in the corrected Context: surfacing structure-
anchored events (which truly had zero read consumers), providing a
self-service write form (rotation card is read-only), and giving an
at-a-glance unified log across both source kinds.

Root cause of the errors: the first Explore agent's grep pass missed
the import in `RotationScheduleCard.tsx`. The planning phase trusted
the grep result without spot-verifying the file. Lesson noted for the
next deferred-item audit: spot-read the most likely consumer file
directly before treating "no imports" as ground truth.

Follow-up audit findings on the rotation card itself (for a future
session, not this ADR):

- **Gap A:** Structure-source events stay invisible there too —
  `eventsByPaddock()` is paddockId-keyed.
- **Gap B:** No inline write affordance per row; switching tabs or
  going through the popover is the only path to log a move.
- **Gap C:** No plan-vs-actual variance signal — projected target
  date and logged-move date are both shown but not diffed.
