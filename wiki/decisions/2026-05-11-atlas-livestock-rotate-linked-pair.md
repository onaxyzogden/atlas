# 2026-05-11 — Linked `rotate_through` exit/entry pair objects

## Context

Architectural follow-up from
[2026-05-10-atlas-livestock-move-event-v3](2026-05-10-atlas-livestock-move-event-v3.md).
The v3 schema treats a rotation as one `LivestockMoveEvent` with
`direction: 'rotate_through'` and both `fromPaddockId/Structure` +
`toPaddockId/Structure` set on the same record. The ADR flagged this:

> Single-row model remains; from/to fields make the linkage implicit.

The single-row model collapses two operational acts ("herd left A on
Monday", "herd arrived at B on Wednesday") into one date, blocking
true per-leg variance and obscuring the data shape when a stopover
isn't atomic.

## Decision

Split every rotation into two linked `LivestockMoveEvent`s. Resolution
shape (confirmed with operator):

- **(Q1) Pointer pair.** Each leg carries `linkedEventId?: string`
  pointing at its partner. O(1) sibling lookup via id index. Rejected
  alternative: a separate `MovePair` parent object with shared
  metadata — adds a store with no operational payoff over the
  cross-pointing pair.
- **(Q2) Write-time convenience + linked badge.** `rotate_through`
  stays in the direction picker; on save the form mints two events
  (one `move_out`, one `move_in`) sharing cross-pointing
  `linkedEventId`s. Both rows render with a chain-link glyph
  (`🔗`, `\u{1F517}`) so the operator sees they came from one
  operational act. After this pass, **no new persisted event has
  `direction === 'rotate_through'`** — the value remains legal in
  the union as a write-time picker convenience that the form layer
  splits before persisting.
- **(Q3) Optional split-date disclosure.** Default both legs share
  the operator-entered date. A new `+ Different exit date`
  disclosure (reuses `kind: 'disclosure'` from
  [2026-05-10 from-picker work](2026-05-10-atlas-livestock-move-event-v3.md))
  lets the operator set an earlier exit date.
- **(Q4) Scheduled plans stay unsplit.** A `ScheduledLivestockMove`
  remains one record targeting one destination. Splitting plans is
  deferred — auto-fulfilment already matches plans against events
  by destination, so this works.

### Schema (`useLivestockMoveLogStore` persist v4)

`LivestockMoveEvent` gains one optional field:

```ts
/**
 * v4 — Linked-pair pointer. Set on both legs of a split rotation; each
 *  leg's `linkedEventId` points at the partner's `id`. `direction` on
 *  persisted v4 events is `'move_in'` or `'move_out'` only.
 */
linkedEventId?: string;
```

### Migration v3 → v4

Every event with `direction === 'rotate_through'` splits into two
cross-pointing legs:

```
exitId  = `${rt.id}-out`
entryId = `${rt.id}-in`
exit  = { id: exitId,  ...common, direction: 'move_out',
          fromPaddockId: rt.fromPaddockId,
          fromStructureId: rt.fromStructureId,
          linkedEventId: entryId }
entry = { id: entryId, ...common, direction: 'move_in',
          toPaddockId: rt.toPaddockId ?? rt.paddockId,
          toStructureId: rt.toStructureId ?? rt.structureId,
          linkedEventId: exitId }
```

Deterministic id derivation makes rehydration idempotent.
Date/species/headCount/who/notes copy verbatim onto both legs.

### Store helpers

```ts
export function linkedPartner(events, event): LivestockMoveEvent | undefined;
export function getPair(events, eventId): { exit?, entry? };
export function buildRotatePair(args): [exitLeg, entryLeg];
```

`buildRotatePair` is the shared write-path used by all three call
sites; it mints deterministic ids from a shared seed
(`lvm-${seed}-out` / `lvm-${seed}-in`) and cross-points
`linkedEventId`.

### Cascade removal

`removeEvent(id)` now drops both legs of a pair together. Rationale:
a paired rotation is one operational act; removing only the exit
while keeping the entry would silently corrupt rest-pair accounting
on the rotation card.

Cross-leg **edit** propagation stays out — operators may legitimately
log a head-count change between exit and entry ("two ewes broke off
on the way"). Edits affect one leg at a time.

### Infra delta

`inlineFormStore.FieldSpec` gained a `visibleWhen?: (values) => boolean`
predicate (rendered field + required-field validation both filter on
it). `InlineFeaturePopover` honors it in `renderField` and the
`flatFields` validation walk. Used by the new `+ Different exit
date` disclosure on all three write paths.

### UI states — linked badge

Logged-moves rows render a chain-link glyph (`🔗`,
`<span aria-label="Linked rotation">`) before the direction label
when `e.linkedEventId` is set. Same treatment in:

- `LivestockMoveCard.tsx` moves table (`title="Linked rotation —
  partner exited|entered on <date>"`)
- `RotationScheduleCard.tsx` logged-moves block (per-paddock) and
  Structure-moves tail

## Write paths

Three call sites mint pairs at write time:

- `LivestockMoveCard.tsx#commit` — full in-card form; branches on
  `draft.direction === 'rotate_through'` and calls `buildRotatePair`
  + `addEvent` twice. Form gains a conditional Exit date field
  visible only when direction is rotate_through.
- `ActStructurePopover.actions.ts#startLivestockMoveLog` — popover-
  anchored inline form. Skeleton stays as a single `move_in` event
  (matches today's UX: operator clicks a structure and lands inside
  it). On save, if direction switched to rotate_through, the
  skeleton is removed and a fresh pair is built. Adds an
  `exitDateDisclosure` field with
  `visibleWhen: (v) => v.direction === 'rotate_through'`.
- `LivestockMoveTool.tsx` (draw tool) — same pattern as the structure
  popover, but the destination is a paddock from a point-in-polygon
  hit-test.

## Read paths

- `RotationScheduleCard.computeRestPairs` drops the legacy
  `direction === 'rotate_through'` branch from its `isExit` predicate.
  After migration nothing persists with that direction, so the
  cleaner condition `e.fromPaddockId === paddockId` (plus the
  `move_out` legacy paddockId fallback for pre-v3 reads) is correct.
- All other readers (`destPaddockId`, `destStructureId`,
  `eventsByPaddock`, `exitsFromPaddock`,
  `livestockAnalysis.computeRecoveryStatus`) are direction-agnostic
  and need no change.

## Out of scope (deferred)

- **`MovePair` parent object.** Rejected per Q1 — pointer-pair gives
  O(1) sibling lookup without a second store.
- **Cross-leg edit propagation.** Operator may legitimately log
  different head counts per leg.
- **Scheduled rotate plans.** Plans stay single-destination; rotation-
  style planning needs its own design pass.
- **Three-leg rotations** (paddock → stop → paddock with an
  intermediate rest). Pointer-pair generalizes poorly; a future
  schema move to a `pairId` group key would unlock this.
- ~~**Linked-pair visual grouping**~~ **Shipped 2026-05-11
  (hover-highlight only).** `RotationScheduleCard` now tracks a
  `hoveredLinkedId` state; rows that own a `linkedEventId` wire
  `onMouseEnter`/`onMouseLeave` setting/clearing that state, and any
  row whose `id` *or* `linkedEventId` matches the hovered partner
  receives `.linkedPairHighlight` (warm background tint +
  `#c4a265` left-border accent). Symmetric — hovering either leg
  lights up both. Applied to per-paddock logged-moves rows and the
  Structure-moves tail. Shared-border styling stayed deferred (the
  background-tint highlight is enough signal).
- **Per-leg variance pill** ("trip: 2d" badge when exit and entry
  dates differ). Easy follow-up once operators report whether they
  use the split-date disclosure.

## Related

- [2026-05-10 atlas-livestock-move-event-v3](2026-05-10-atlas-livestock-move-event-v3.md) — base schema; this work closes the implicit-linkage flag raised there.
- [2026-05-10 atlas-act-livestock-move-card](2026-05-10-atlas-act-livestock-move-card.md) — sibling card; its in-card form gained the rotate split branch.

## Commits

- (filed at session close) — schema v3→v4 with split migration,
  `buildRotatePair`/`linkedPartner`/`getPair` helpers, cascade
  `removeEvent`, `visibleWhen` on `FieldSpec`, three write-site
  rotate branches with optional exit-date disclosure, chain-link
  glyph on logged-moves rows in `LivestockMoveCard` + the rotation
  card's per-paddock and structure-moves tails, legacy
  `rotate_through` clause removed from `computeRestPairs`.
