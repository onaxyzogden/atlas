# 2026-05-09 — Act `Log livestock move` wiring + Plan feature edit/move mobility

## Context

Three closely-related defects on `feat/atlas-permaculture` reported by the operator:

1. The Act-stage **Log livestock move** Quick-Log button only opened the slide-up
   onto a read-only `RotationScheduleCard`; unlike its siblings *Log harvest*
   (`act.harvest.log-entry`) and *Log water check* (`act.maintain.log-event`),
   the livestock entry in `ActTools.tsx` carried no `toolId`, no
   `ActDrawHost` case existed, and there was no `LivestockMoveTool` /
   `livestockMoveLogStore` to back the action.
2. **Plan-stage features were "movable once."** Only guild points were ever
   draggable; the click-select + drag handler in `PlanDataLayers.tsx` used
   `map.once('mouseup', onUp)` which consumed the listener after the first
   drag, leaving the second `mousedown` without a tear-down path. The cursor
   stuck and the second drag never tracked.
3. **Plan-stage structures could not be moved or edited at all.**
   `StructureTool.onComplete` opened the `InlineFeaturePopover` only during
   creation; no click-to-reopen, no drag-reposition. Same gap exists for
   zones / paths / crops / paddocks / fertility units / water nodes, but the
   user-visible report was structures, so this ADR fixes structures fully and
   leaves the broader pattern for a follow-up.

## Decision

Three fixes, mirroring proven patterns rather than inventing new abstractions.

### Phase 1 — Wire `act.livestock.log-move`

Mirror the `MaintenanceLogTool` pattern verbatim, swapping the source-kind
hit-test from earthwork-line / storage-point to **point-in-polygon over
`livestockStore.paddocks`** (no tolerance — paddocks are large; first match
wins).

- `apps/web/src/store/livestockMoveLogStore.ts` (NEW) — `LivestockMoveEvent`
  records keyed on `paddockId`, with `direction: 'move_in' | 'move_out' |
  'rotate_through'`, `species: LivestockSpecies` (re-used from
  `livestockStore`), `headCount: number | null`, optional `who` / `notes`.
  Persist key `ogden-livestock-moves`. Same `addEvent` / `updateEvent` /
  `removeEvent` shape as `maintenanceLogStore` so the persist-first +
  ESC-rollback contract holds.
- `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` (NEW) — copy of
  `MaintenanceLogTool.tsx` with paddock hit-test via
  `turf.booleanPointInPolygon`. Default species comes from the hit paddock's
  `species[0]`, falling back to `'sheep'`. Inline form fields:
  `date / direction / species / headCount / who / notes`.
- `MapToolId` extended with `'act.livestock.log-move'` in
  `useMapToolStore.ts`.
- `ActDrawHost` switch arm added.
- `ActTools` livestock entry gains `toolId: 'act.livestock.log-move'` +
  hint *"Click a paddock to log a move-in / out / rotate-through"*.

### Phase 2 — Guild "movable once" fix

`PlanDataLayers.tsx:446-455` — `map.once('mouseup', onUp)` →
`map.on('mouseup', onUp)`, with `map.off('mouseup', onUp)` as the first line
of `onUp` so the handler tears itself down on each release. Matches the
Observe `AnnotationDragHandler` pattern shipped 2026-05-06.

### Phase 3 — Structure click-to-edit + drag-to-move

New effect on `${LAYER_PREFIX}poly-fill` in `PlanDataLayers.tsx`, filtered to
`properties.kind === 'structure'` and gated on
`useMapToolStore.activeTool == null` (so a Plan draw tool always wins).
Stamping `kind: 'structure'` was added to the Structure feature props.

- **Click** (movement < 4 px screen-space): opens
  `useInlineFormStore` with the same `name / type / phase / rotationDeg`
  schema as `StructureTool.onComplete`, pre-filled from the current
  `Structure` record. `onSave` re-runs `createFootprintPolygon(structure.center,
  nextTpl.widthM, nextTpl.depthM, rotationDeg)` so type or rotation changes
  redraw the footprint. `onCancel` is a no-op — the record already exists.
- **Drag** (movement ≥ 4 px): disables `dragPan`, translates `center` to
  `e.lngLat`, recomputes `geometry` via `createFootprintPolygon` keeping
  `widthM` / `depthM` / `rotationDeg`, calls `updateStructure` live.
- Cursor: `move` on hover, `grabbing` while dragging.

## Files

| File | Action |
|---|---|
| `apps/web/src/store/livestockMoveLogStore.ts` | NEW |
| `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` | NEW |
| `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` | EDIT — `MapToolId` adds `act.livestock.log-move` |
| `apps/web/src/v3/act/draw/ActDrawHost.tsx` | EDIT — switch case |
| `apps/web/src/v3/act/ActTools.tsx` | EDIT — `toolId` + hint |
| `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` | EDIT — `map.once`→`map.on` (line ~453); `kind: 'structure'` on props; new structure click/drag effect |

## Verification

- `npx tsc --noEmit` with `NODE_OPTIONS=--max-old-space-size=8192` — exit 0.
- Dev preview (`apps/web` Vite on port 5200) boots; Act + Plan routes load
  without JS errors.
- DOM snapshot confirms the *Log livestock move* button now reads *"Click a
  paddock to log a move-in / out / rotate-through"* and a click mounts the
  new `<LivestockMoveTool>` dialog (`role="dialog" aria-label="Livestock
  move tool"`).
- End-to-end map interactions (paddock click → inline form, guild second
  drag, structure click-edit, structure drag-translate) require seeded
  geometry — left as manual smoke for the operator.

## Deferred

- Drag-reposition + click-to-edit for non-structure Plan features
  (zones, paths, crops, paddocks, fertility units, water nodes).
- Polygon vertex edit for Plan features.
- Multi-select / batch edit / undo for Plan mutations (Observe parity).
- Promoting `LivestockMoveEvent`s into `RotationScheduleCard`'s timeline so
  the slide-up reflects field-logged moves.
