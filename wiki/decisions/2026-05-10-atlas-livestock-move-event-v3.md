# 2026-05-10 — LivestockMoveEvent v3 (from/to fields) + rotation-card rest variance

## Context

The 2026-05-10 RotationScheduleCard audit
([2026-05-10-atlas-act-livestock-move-card](2026-05-10-atlas-act-livestock-move-card.md)
Corrections § "follow-up audit findings")
carved out three gaps remaining on the livestock-rotation surface
once the `LivestockMoveCard` shipped:

- **Gap A.** Structure-anchored events (`structureId` set, no `paddockId`)
  stayed invisible on `RotationScheduleCard` because the
  `eventsByPaddock()` helper is paddockId-keyed and silently drops them.
- **Gap B.** No inline write affordance per row — switching tabs or
  going through the structure popover is the only path to log a move.
- **Gap C.** No plan-vs-actual variance signal — the projected target
  date and the logged-move date are both displayed but never diffed.

Investigation of Gap A surfaced a deeper data-model gap: the v2
`LivestockMoveEvent` shape held a destination (`paddockId` xor
`structureId`) but no origin field. A `rotate_through` event was one row
with no record of where the herd came from, making true plan-vs-actual
rest analysis (Gap C) structurally impossible without storing
historical projections.

Two sub-paths were considered for Gap A:

- **A1 (cosmetic).** Add a "Structure moves" section at the bottom of
  `RotationScheduleCard.tsx` listing structure-anchored events flat,
  no paddock attribution. ~30 LOC, no schema change. *Low value*:
  `LivestockMoveCard` already shows these; duplicating dilutes the
  rotation card's mental model.
- **A2 (schema extension).** Add `fromPaddockId` / `fromStructureId`
  / `toPaddockId` / `toStructureId` to `LivestockMoveEvent`. Persist
  version 2→3 with a migrate fn that backfills `to*` from the legacy
  fields. Three write paths and two read paths need propagation, but
  this unlocks proper Gap C variance and makes `rotate_through`
  semantically honest.

## Decision

**A2 (schema extension), plus Gap C in the same arc.** Gap B deferred —
worth its own session.

### Schema (`useLivestockMoveLogStore` persist v3)

`LivestockMoveEvent` gains four optional fields and keeps the v2 fields
as `@deprecated` for legacy-read fallback:

```ts
interface LivestockMoveEvent {
  id: string;
  projectId: string;
  /** @deprecated v2 — new writes set toPaddockId. */
  paddockId?: string;
  /** @deprecated v2 — new writes set toStructureId. */
  structureId?: string;
  fromPaddockId?: string;
  fromStructureId?: string;
  toPaddockId?: string;
  toStructureId?: string;
  // ... unchanged: date, direction, species, headCount, who, notes
}
```

**Invariants on new writes.** Exactly one of `toPaddockId` /
`toStructureId` set (destination required). At most one of
`fromPaddockId` / `fromStructureId` set (origin optional — the first-ever
entry to a paddock has no recorded origin). `direction === 'rotate_through'`
implies origin set (UI enforces; reader tolerates).

**Persist migrate (v2 → v3).** Map existing events forward by setting
`toPaddockId = paddockId` / `toStructureId = structureId`. The legacy
fields stay on each event for read-path safety; new writes do not set
them.

### Read helpers (all v2-tolerant)

- `destPaddockId(e)` → `e.toPaddockId ?? e.paddockId`
- `destStructureId(e)` → `e.toStructureId ?? e.structureId`
- `eventsByPaddock()` — now matches `destPaddockId(e) === paddockId`
- `exitsFromPaddock(events, projectId, paddockId)` — new, matches
  `e.fromPaddockId === paddockId`
- `structureDestEvents(events, projectId)` — new, returns events whose
  destination is any structure on the project

### Write-path changes

| Surface | Change |
|---|---|
| `LivestockMoveCard` form | Replaced single Feature kind/feature pair with **To · kind/feature** + optional **From · kind/feature**. Conditional From column appears in a group's table when any event has a recorded origin. |
| `ActStructurePopover.actions.startLivestockMoveLog` | Skeleton writes `toStructureId` (was `structureId`). |
| `LivestockMoveTool` (Plan-paddock draw tool) | Skeleton writes `toPaddockId` (was `paddockId`). |

**Pragmatic deviation from the approved A2 plan:** the popover and
draw-tool inline forms did **not** gain a From picker. Both live on the
map as cramped floating panels; a 20-option paddock+structure select is
poor UX there. The schema migration + in-card-form already give us full
read coverage and a write affordance. Adding the From picker to the
inline forms is a deferred follow-up.

### Gap A close — `RotationScheduleCard`

Two additions beyond the audit's original Gap A framing (which only
called for structure-event visibility):

1. **Per-paddock exits.** Each paddock row's "Logged moves" block now
   merges entries (`destPaddockId === p.id`) with exits
   (`fromPaddockId === p.id`), deduped by id (handles `rotate_through`
   within the same paddock). Exits render with an `Exit` label.
2. **"Structure moves" tail section.** A new block at the bottom of
   the card lists all events whose destination is a placed structure on
   the project. Each row shows the structure's icon + name + date +
   species + head count. Empty when no structure events exist.

### Gap C close — plan-vs-actual rest variance

For each paddock with ≥1 paired entry, the rotation card now shows:

- **One-line summary.** "M of N entries on schedule · avg +Xd vs
  target", with a worst-pair callout when any pair was under-rested
  (variance ≤ −3 days).
- **Per-entry inline badges.** A small pill on each entry row, color-
  coded:
  - `+Nd rest` — green (positive variance, ≥0 days over required)
  - `on time` — neutral (variance == 0)
  - `−1d` / `−2d` — neutral-amber (within ±2 day tolerance)
  - `−Nd` — red (≥3 days under required)

**Algorithm.** Walk the union of entries + exits (deduped by id),
sorted oldest→newest. Track `lastExitDate`. On each entry whose
`destPaddockId === p.id` (and `direction !== 'move_out'`), if a
`lastExitDate` exists, emit a `RestPair` with `actualRestDays =
entry.date − lastExitDate` and `variance = actualRestDays − requiredDays`.
On any event that exits the paddock (`fromPaddockId === p.id`, or a
legacy v2 event whose `paddockId === p.id` *and* direction is
`move_out` / `rotate_through`), update `lastExitDate`. Required days
come from `computeRecoveryStatus(p).requiredDays` (already exposed
on `RecoveryStatus`); piped through `UpcomingMove`.

First-ever entries (no prior exit) emit no pair — quietly correct.

## Files

**Modified**

- `apps/web/src/store/livestockMoveLogStore.ts` — schema, migrate,
  three new read helpers.
- `apps/web/src/features/act/LivestockMoveCard.tsx` — To/From form,
  conditional From column, grouping reads via helpers.
- `apps/web/src/v3/act/ActStructurePopover.actions.ts` — `toStructureId`
  in skeleton.
- `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` —
  `toPaddockId` in skeleton.
- `apps/web/src/features/livestock/RotationScheduleCard.tsx` — exits
  per paddock, Structure-moves tail section, rest-variance computation
  and badges.
- `apps/web/src/features/livestock/RotationScheduleCard.module.css` —
  variance badge classes (`.variancePositive` / `.varianceTolerant` /
  `.varianceNegative`).

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from
  `apps/web` → exit 0 (clean across the whole tree at commit time).
- Manual smoke deferred to operator (basemap tiles unavailable in dev).

## Out of scope (deferred)

- ~~**Gap B.** Inline write affordance on `RotationScheduleCard` rows
  (so an operator can log a move without switching tabs).~~
  **Closed 2026-05-10 (commit `4fca1b3`).** Each row gained a
  "+ Log move" button next to the action label; clicking expands a
  compact in-row form (Date · Direction · Species · Head · From
  optional · Notes optional · Save) that calls `addEvent` with
  `toPaddockId = p.id`. Only one form open at a time. Destination
  is implicit (this row's paddock), so the form is narrower than
  `LivestockMoveCard`'s. Species default is the paddock's first
  declared species (falls back to `sheep`); direction defaults to
  `move_in`. The logged-moves + rest-variance block below the form
  refreshes automatically via store subscription.
- ~~**From picker on popover + draw-tool inline forms.** Pragmatic UX
  deviation; popover/tool are 6-field cramped panels.~~ **Closed
  2026-05-11 (commit `<PENDING>`).** Resolved via a **disclosure
  pattern**: `inlineFormStore.FieldSpec` gained a new `kind:
  'disclosure'` variant (`triggerLabel` + nested `children: FieldSpec[]`);
  `InlineFeaturePopover` renders the trigger as a single button row when
  collapsed and reveals the children inline when expanded (auto-expands
  if any child has a non-empty initial value, so edit-mode flows show
  the picker already open). New shared helper
  `apps/web/src/v3/act/originPicker.ts` owns the encoding
  (`'paddock:<id>'` / `'structure:<id>'` / `''`), builds the combined
  paddock + livestock-capable-structure option list, and **excludes the
  current destination** so a plan/event can never self-target.
  Wired into `startLivestockMoveLog`, `startScheduledLivestockMove`
  (including edit-mode prefill via `encodeOriginValue` on the existing
  plan's `fromPaddockId` / `fromStructureId`), and the
  `LivestockMoveTool` draw-tool. The default form footprint stays at
  6 fields — the picker only appears when the operator clicks
  `+ Add origin`.
- ~~**Lift `DIRECTION_OPTIONS` / `SPECIES_OPTIONS` in `LivestockMoveTool.tsx`.**
  Third duplication site missed by the 2026-05-10 S2 cleanup (the
  store now owns the canonical lists for `LivestockMoveCard` and
  `ActStructurePopover.actions`, but the draw tool still has its own
  inline copies).~~ **Closed 2026-05-10 (commit `e248105`).** Local
  `SPECIES_VALUES` / `DIRECTION_VALUES` / `isDirection` / `isSpecies`
  guard helpers kept — they're tool-local utilities.
- **Linked `rotate_through` exit/entry pair objects.** Single-row model
  remains; from/to fields make the linkage implicit.
- ~~**Forward-looking variance** ("will the *next* move be on time?"). Needs
  scheduled-move objects, separate session.~~ **Closed 2026-05-10
  (commit `12d72b6`).** New persisted store
  `apps/web/src/store/scheduledLivestockMoveStore.ts` holds
  `ScheduledLivestockMove` objects (kept separate from
  `livestockMoveLogStore` so existing read helpers stay plan-agnostic).
  `RotationScheduleCard` gained a second per-row button (`Schedule…`)
  that writes a plan via `addPlan`; an unfulfilled plan renders as a
  `Planned: <date>` line under `.rowFoot` with a variance pill
  comparing `plannedDate` against `today + daysUntilReady` (reuses
  the Gap C variance-tone classes). Auto-fulfilment: when an actual
  event lands within ±7 days of `plannedDate` (same project +
  paddock + species), the plan is marked `fulfilledByEventId` and
  stops rendering.
- **Plan editing** (followed forward-looking variance the same day).
  **Closed 2026-05-10 (commit `a2725c3`).** The `Planned:` line now
  carries `Edit` and `✕` chips after the variance pill. `Edit`
  reopens the schedule form prefilled with the plan's fields (saves
  call `updatePlan(id, patch)`); `✕` dismisses the plan via
  `removePlan(id)` — useful when auto-fulfilment doesn't fire
  (e.g. species mismatch). Save-button label tri-states: `Save move`
  (actual) / `Schedule move` (new plan) / `Update plan` (edit). No
  store changes — reuses existing `updatePlan` / `removePlan`
  mutators.
- ~~**Plans for structure destinations** (popover handoff). Originally
  deferred — rotation card is paddock-centric, structure plans add no
  value on *that* surface.~~ **Closed 2026-05-10 (commits `1821f5d`
  schema + handoff, `e5d8224` UI wiring, `88ded4c` plan-editing
  parity).** Schema (`1821f5d`):
  `scheduledLivestockMoveStore` bumped persist v1 → v2 — `toPaddockId`
  is now optional, `toStructureId` / `fromStructureId` added; new
  helper `structureDestPlans(plans, projectId)` returns all
  unfulfilled structure-destination plans. Handoff (`1821f5d`):
  `startScheduledLivestockMove(structure, projectId)` in
  `ActStructurePopover.actions.ts` mirrors `startLivestockMoveLog`'s
  skeleton-then-patch pattern but writes to the scheduled store with
  `toStructureId`. UI wiring (`e5d8224`): new structure-action kind
  `scheduleLivestockMove` (label "Schedule move") on barn +
  animal_shelter; the popover button row routes the kind to the new
  action. The `RotationScheduleCard` Structure-moves tail now renders
  unfulfilled plans above logged events with a `✕` dismiss chip (no
  variance pill — the rotation model is paddock-centric, so structure
  plans render as plain `Planned · <direction>` reminders).
  Auto-fulfilment effect extended to match either `toPaddockId` or
  `toStructureId` (same ±7-day window, same species match).
  **Plan-editing parity (`88ded4c`):** `startScheduledLivestockMove`
  gained an optional `existingPlanId` parameter — when set, the action
  skips the skeleton-add, prefills the inline form from the existing
  plan, and rebinds Save to `updatePlan(existingPlanId, …)` / Cancel
  to a no-op. The Structure-moves tail's plan row now carries an
  `Edit` chip alongside the dismiss `✕`; clicking it routes through
  the existing structure to pop the prefilled form. Same UX as the
  paddock `Planned:` line from `a2725c3`.

## Related

- [2026-05-10 atlas-act-livestock-move-card](2026-05-10-atlas-act-livestock-move-card.md) — sibling ADR; this work closes Gaps A and C from its post-merge audit.
- [2026-05-10 atlas-act-structure-popover](2026-05-10-atlas-act-structure-popover.md) — Phase 3 handoff producing the structure-anchored events Gap A surfaced.

## Commits

- `5e3f1c4` — S2 (lift direction/species options to store) + S3 (`.hint`
  class + MaintenanceLogCard per-kind empty-list hint backport).
- `302f00b` — A2 schema extension, persist v3, in-card-form To/From,
  rotation-card exits + Structure-moves tail.
- `306e182` — Gap C rest-variance summary + per-entry badges.
- `4fca1b3` — Gap B inline `+ Log move` affordance on each
  rotation row.
- `e248105` — S2 third-site cleanup (`LivestockMoveTool` imports
  canonical OPTIONS from store).
- `12d72b6` — Forward-looking variance: scheduled-move store +
  `Schedule…` button + `Planned: <date>` line with variance pill +
  ±7d auto-fulfilment.
- `a2725c3` — Plan editing: `Edit` + `✕` chips on the `Planned:`
  line (in-place `updatePlan` and manual `removePlan`).
- `1821f5d` — Plans-for-structure-destinations schema + handoff
  (scheduled-move store v2 with optional `toPaddockId` +
  `toStructureId` / `fromStructureId`, `structureDestPlans` helper,
  `startScheduledLivestockMove` action). Bundled with the BE Phase 6
  close-out.
- `e5d8224` — Plans-for-structure-destinations UI wiring: new
  `scheduleLivestockMove` action kind + popover routing + Structure-
  moves tail renders unfulfilled plans + auto-fulfilment extended to
  `toStructureId`.
- `88ded4c` — Plan-editing parity for structure-destination plans:
  `startScheduledLivestockMove(structure, projectId, existingPlanId?)`
  handles both add and edit; `Edit` chip on Structure-moves tail plan
  rows mirrors the paddock `Planned:` line from `a2725c3`.
