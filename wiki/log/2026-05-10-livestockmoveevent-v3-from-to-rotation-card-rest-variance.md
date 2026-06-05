# 2026-05-10 — LivestockMoveEvent v3 (from/to) + rotation-card rest variance


Three commits closing Gaps A and C from the LivestockMoveCard
post-merge audit (sibling ADR
`2026-05-10-atlas-act-livestock-move-card.md`):

- `5e3f1c4` — S2 lifts canonical `DIRECTION_OPTIONS` /
  `SPECIES_OPTIONS` to `livestockMoveLogStore` (consumed by
  `LivestockMoveCard` + `ActStructurePopover.actions`; `LivestockMoveTool`
  still has inline copies, recorded as deferred). S3 adds a shared
  `.hint` class on `actCard.module.css` and backports per-kind
  empty-list hints to `MaintenanceLogCard` for parity.
- `302f00b` — A2 schema extension. `LivestockMoveEvent` gains
  `fromPaddockId` / `fromStructureId` / `toPaddockId` / `toStructureId`
  (legacy `paddockId` / `structureId` kept `@deprecated` for read
  fallback); persist v2→v3 migrate backfills `to*` from legacy
  fields. New helpers `destPaddockId(e)` / `destStructureId(e)` /
  `exitsFromPaddock()` / `structureDestEvents()`. `eventsByPaddock`
  now matches on destination. `RotationScheduleCard` merges per-row
  entries + exits (deduped by id; handles `rotate_through`) and
  adds a *Structure moves* tail section listing structure-destination
  events. `LivestockMoveCard` form replaced single Feature pair with
  **To** + optional **From** pickers; conditional From column when
  any event in a group has a recorded origin. Popover + draw-tool
  inline-form skeletons updated to `toStructureId` / `toPaddockId`;
  pragmatic deviation — no From picker added to those cramped
  floating panels (deferred).
- `306e182` — Gap C. `requiredDays` piped through `UpcomingMove`
  from `recovery.requiredDays`. Walk-and-pair algorithm over union
  of entries + exits (deduped by id, oldest→newest) tracks
  `lastExitDate` and emits `RestPair` per entry; first-ever entries
  quietly skip. One-line per-paddock summary
  (`M of N entries on schedule · avg +Xd vs target`, plus worst-pair
  callout when any pair was under-rested ≤ −3d) and per-entry
  color-coded pills (`+Nd rest` green / `on time` neutral /
  `−1d`/`−2d` amber / `−Nd` red at ≥3 under).

Verification: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
from `apps/web` exits 0 at each commit; manual smoke deferred
(basemap tiles unavailable in dev). Deferred follow-ups recorded in
the ADR: Gap B (inline write on rotation rows), From picker on
popover + draw-tool inline forms, lifting `DIRECTION_OPTIONS` /
`SPECIES_OPTIONS` in `LivestockMoveTool.tsx` (third S2 site),
linked `rotate_through` exit/entry pair objects, forward-looking
variance.

ADR: `wiki/decisions/2026-05-10-atlas-livestock-move-event-v3.md`.

Follow-up same day: commit `4fca1b3` closes Gap B (inline write
affordance previously deferred). Each `RotationScheduleCard` row
gained a `+ Log move` button + compact in-row form (Date ·
Direction · Species · Head · optional From · optional Notes)
calling `addEvent` with `toPaddockId = p.id`. Operator no longer
needs to switch tabs to log a move against a paddock already
visible on the rotation timeline. ADR Out-of-scope section
updated to strike Gap B and record the closing commit.

Follow-up same day (continued): two more deferred items closed.

- `e248105` — S2 third-site cleanup. `LivestockMoveTool.tsx` now
  imports the canonical `DIRECTION_OPTIONS` / `SPECIES_OPTIONS` from
  `livestockMoveLogStore`. Last duplication site of those constants
  is gone.
- `12d72b6` — Forward-looking variance. New persisted store
  `scheduledLivestockMoveStore.ts` holds `ScheduledLivestockMove`
  objects (separate from the actual log so its read helpers stay
  plan-agnostic). `RotationScheduleCard` gained a second per-row
  button `Schedule…` paired with `+ Log move`; an unfulfilled plan
  renders a `Planned: <date>` line under `.rowFoot` with a variance
  pill comparing `plannedDate` against `today + daysUntilReady`
  (reuses Gap C variance-tone classes). A `useEffect` auto-marks
  plans fulfilled when an actual event lands within ±7 days of
  `plannedDate` (same project + paddock + species). ADR
  Out-of-scope section updated to strike both items.
- `a2725c3` — Plan editing. `Edit` + `✕` chips on the `Planned:`
  line. `Edit` reopens the schedule form prefilled with the plan's
  fields (saves call `updatePlan(id, patch)`); `✕` dismisses the
  plan via `removePlan(id)` — useful when auto-fulfilment doesn't
  fire (e.g. species mismatch). Save-button label tri-states: `Save
  move` / `Schedule move` / `Update plan`. No store changes; reuses
  existing `updatePlan` / `removePlan` mutators on
  `scheduledLivestockMoveStore`.
- `1821f5d` + `e5d8224` — Plans for structure destinations.
  `1821f5d` (bundled with BE Phase 6 close-out) bumped
  `scheduledLivestockMoveStore` to persist v2: `toPaddockId` is now
  optional, `toStructureId` / `fromStructureId` added, new helper
  `structureDestPlans(plans, projectId)`. Same commit shipped
  `startScheduledLivestockMove(structure, projectId)` in
  `ActStructurePopover.actions.ts`. `e5d8224` wired the UI surface:
  new `scheduleLivestockMove` structure-action kind ("Schedule move"
  label) on barn + animal_shelter, popover button routes it to the
  handoff. `RotationScheduleCard`'s Structure-moves tail now renders
  unfulfilled plans above logged events with a `✕` dismiss chip (no
  variance pill — rotation model is paddock-centric). Auto-fulfilment
  effect generalised: matches by `toStructureId` as well as
  `toPaddockId` (same ±7-day window, same species). ADR
  Out-of-scope section gained a struck-through entry for closure.
- `88ded4c` — Plan-editing parity for structure-destination plans.
  `startScheduledLivestockMove` gained an optional `existingPlanId`
  parameter: when set, the action skips the skeleton-add, prefills the
  inline form from the existing plan, and rebinds Save to
  `updatePlan(existingPlanId, …)` / Cancel to a no-op. Structure-moves
  tail's plan row now carries an `Edit` chip alongside the dismiss
  `✕`; click looks up the destination structure and pops the prefilled
  inline form anchored at its map center. Closes the recommended-next
  item from the previous session's debrief; same UX as the paddock
  `Planned:` line from `a2725c3`.
