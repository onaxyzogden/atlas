# 2026-05-10 — Act-stage structure popover (read-only inspector + log-action handoff)

## Context

Plan-stage structures (barn / greenhouse / well / 17 other types) had no Act-stage
inspector. Two problems compounded:

1. **Plan handler leak in Act.** `PlanDataLayers` mounts under both Plan and
   Act layouts so the Act stage can render placed Plan features as a
   read-only substrate. The same component also wired the Plan-stage
   click-to-edit + drag-to-translate handlers from
   [2026-05-09 act-livestock-move-and-plan-edit-mobility](2026-05-09-atlas-act-livestock-move-and-plan-edit-mobility.md),
   so a click on a structure from the Act canvas opened the *Plan* edit
   form. Stage-bleed: the steward could rotate a barn footprint while
   on the Act stage.
2. **No "log work against this structure" entry point.** The three Act
   log tools (`MaintenanceLogTool`, `LivestockMoveTool`, `HarvestLogTool`)
   click earthworks / paddocks / crop areas — none of them targeted
   placed structures, so there was no path to record a barn
   maintenance, an animal-shelter livestock move, or a greenhouse
   harvest *from the structure click*.

## Decision

Three additive phases on `feat/atlas-permaculture`.

### Phase 1 — Gate `PlanDataLayers` editability

`PlanDataLayers` accepts an `editable?: boolean` prop. Five `if (!editable) return`
short-circuits at the top of each click/drag effect (guild, structure,
polygon, line/curve, center-point). `ActLayout.tsx:155` passes
`editable={false}`; `PlanLayout` keeps the default (`true`). Plan-stage edit
behavior is unchanged.

### Phase 2 — Read-only Act inspector

New trio:
- `useActStructurePopoverStore` — singleton with `{ active: { structureId, anchor } | null, open(), close() }`.
- `ActStructureClickHandler` — Maplibre layer click handler scoped to
  `${LAYER_PREFIX}poly-fill` filtered to `kind: 'structure'`; opens the
  popover store with the click `lngLat`.
- `ActStructurePopover` (+ `.module.css`) — DOM popover anchored at
  `map.project(anchor)`, re-projected on `move`/`zoom`/`resize`. Renders
  type icon + label, optional name, phase, rotation-degrees, footprint
  dimensions (`widthM × depthM m`), and category. ESC + outside-click +
  Close button all dismiss. Auto-closes if the underlying structure is
  deleted while the popover is open.

### Phase 3 — Per-type log-action handoff

Popover footer renders one button per applicable Act log action plus a
Close button. Action mapping in `apps/web/src/v3/act/data/structureActions.ts`:

| Structure types | Actions |
|---|---|
| `barn`, `animal_shelter` | Log maintenance · Log livestock move |
| `greenhouse` | Log maintenance · Log harvest |
| All other 17 types | Log maintenance |

Each button calls a helper from `apps/web/src/v3/act/ActStructurePopover.actions.ts`
that mirrors the **skeleton-then-patch** pattern the three Act log tools
already use:

1. Close popover.
2. Generate id (`newAnnotationId('mnt' | 'lvm' | 'hrv')`).
3. `addEvent` / `addEntry` skeleton with `structureId: structure.id` (and
   `sourceKind: 'structure'` for maintenance + harvest).
4. `useInlineFormStore.open()` at `structure.center` with the same fields
   the matching tool uses.
5. `onSave` → `updateEvent` / `updateEntry` with normalized values.
6. `onCancel` → `removeEvent` / `removeEntry` (rollback skeleton).

`ActStructurePopover` accepts `projectId: string | null`; action buttons
render only when `projectId` is truthy (the dev sentinel `/v3/project/mtc/act`
falls through to MTC fallback project, so `params.projectId === 'mtc'`
still renders buttons).

## Schema deltas (additive)

All three Act log stores grew a `structureId?` reference. Because the
popover targets a structure, not a paddock/earthwork/crop area, existing
typed-id fields had to relax.

**`maintenanceLogStore.ts`** — `MaintenanceSourceKind` already
discriminator-driven; extended union with `'structure'`. Same polymorphic
`sourceId` pattern (no new field; `sourceId = structure.id`). Persist
`version: 1 → 2`, no `migrate` (old records remain valid).

**`livestockMoveLogStore.ts`** — `paddockId: string` → `paddockId?: string`;
new `structureId?: string`. Invariant: exactly one of the two is set per
event. Persist `version: 1 → 2`. Existing `eventsByPaddock` helper
unchanged (filter on `paddockId === paddockId` still narrows correctly
for paddock-source events).

**`harvestLogStore.ts`** — `HarvestSourceKind` extended with `'structure'`;
new `structureId?: string`. `cropAreaId: string` kept non-optional so the
existing `HarvestLogCard` grouping (which keys by `cropAreaId`) keeps
working unchanged — structure-source entries set `cropAreaId: ''` (matches
the prior livestock-source convention). No version bump (changes are
purely additive optional fields; existing v2 migrate fn already stamps
legacy `cropAreaId` records).

## Why "extend, don't hide"

The plan considered hiding the Livestock-move button on every structure
that didn't have a paired paddock. Audit showed most barns / animal
shelters don't have a paired paddock (they often *are* the shelter
adjacent to grazing rotations rather than co-located with it). Hiding
would have made the feature dead by default. Adding `structureId?` is a
two-line schema change that lets a barn click produce a useful event.

## Files

**Modified**
- `apps/web/src/store/maintenanceLogStore.ts` — union extension, version bump.
- `apps/web/src/store/livestockMoveLogStore.ts` — `paddockId` optional, new `structureId`, version bump.
- `apps/web/src/store/harvestLogStore.ts` — union extension, new `structureId`, `cropAreaId: ''` for structure-source.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — `editable?: boolean` prop, five gates.
- `apps/web/src/v3/act/ActLayout.tsx` — passes `editable={false}` and `projectId` to popover.
- `apps/web/src/v3/act/ActStructurePopover.tsx` — accepts `projectId`, renders per-type action buttons.

**New**
- `apps/web/src/store/actStructurePopoverStore.ts`
- `apps/web/src/v3/act/layers/ActStructureClickHandler.tsx`
- `apps/web/src/v3/act/ActStructurePopover.module.css`
- `apps/web/src/v3/act/data/structureActions.ts`
- `apps/web/src/v3/act/ActStructurePopover.actions.ts`

**Reused (no changes)**
- `useInlineFormStore.open()` — same `InlineFormPayload` shape the three
  tools use.
- `STRUCTURE_TEMPLATES` — type/category/icon/dimensions data.
- `MaintenanceLogTool` / `LivestockMoveTool` / `HarvestLogTool` — verbatim
  reference for skeleton/openForm/patch/rollback per action.

## Verification

- `tsc --noEmit` (with 8GB heap) — exit 0.
- Mounted-component fiber walk on `/v3/project/mtc/act` confirms
  `ActStructurePopover`, `ActStructureClickHandler`, `PlanDataLayers`
  (`editable=false`), `InlineFeaturePopover` all present.
- `preview_eval`-driven synthetic store probes hit the known Vite
  dynamic-`import()` cache-bust limitation (separate Zustand singletons
  per imported module instance) — does **not** affect the user-click
  path which uses import-time singletons. Same limitation logged for
  Phase 2 last session.
- End-to-end click verification deferred to operator manual smoke (basemap
  tiles unavailable in dev).

## Risks / future work

- **`sourceKind` consumers.** Reports / filters / log views that exhaustively
  switch on `'earthwork' | 'storage'` (maintenance) or `'crop' | 'livestock'`
  (harvest) need a `'structure'` arm. None found in current grep, but
  flag during the next dashboard pass.
- **Greenhouse harvest UX.** `HarvestLogCard` slide-up groups by
  `cropAreaId`; structure-source entries fall under the empty-string
  bucket. Acceptable for the pilot; a follow-up should surface
  structure-source entries in their own grouping.
- **Anchor off-screen edge case.** Inline form opens at structure
  centroid; if the user clicked the structure while panned to its edge,
  the form may render off-screen. Existing tools have the same behavior.
  Defer if it surfaces.

## Related

- [2026-05-09 act-livestock-move-and-plan-edit-mobility](2026-05-09-atlas-act-livestock-move-and-plan-edit-mobility.md) — Plan-stage structure click/drag handlers that this ADR gates off in the Act stage.
- [2026-05-08 atlas-plan-module-structures-subsystems](2026-05-08-atlas-plan-module-structures-subsystems.md) — original Structures module + 20-type select.
- [2026-05-07 atlas-act-stage-page](2026-05-07-atlas-act-stage-page.md) — Act-stage shell that mounts `PlanDataLayers` read-only.
