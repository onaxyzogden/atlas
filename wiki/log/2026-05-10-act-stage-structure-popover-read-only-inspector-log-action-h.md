# 2026-05-10 — Act-stage structure popover (read-only inspector + log-action handoff)


**Branch.** `feat/atlas-permaculture` (commit `20879ef` bundled the
in-flight files; this entry documents the three-phase work as a unit).

**Problem.** Clicking a placed Plan structure (barn / greenhouse / well /
17 other types) from the **Act** canvas opened the *Plan* edit form
because `PlanDataLayers` mounts under both stages and its click/drag
handlers from
[2026-05-09 act-livestock-move-and-plan-edit-mobility](decisions/2026-05-09-atlas-act-livestock-move-and-plan-edit-mobility.md)
fired regardless of stage. Stage-bleed: rotating a barn footprint while
on the Act stage. Separately, the three Act log tools
(`MaintenanceLogTool`, `LivestockMoveTool`, `HarvestLogTool`) hit-tested
earthworks / paddocks / crop areas — none of them targeted placed
structures, so there was no path to record a barn maintenance, an
animal-shelter livestock move, or a greenhouse harvest *from the
structure click*.

**Phase 1 — Plan handler gate.** `PlanDataLayers` accepts
`editable?: boolean` (default `true`). Five `if (!editable) return`
short-circuits at the top of each click/drag effect (guild, structure,
polygon, line/curve, center-point). `ActLayout.tsx` passes
`editable={false}`; Plan-stage edit behavior unchanged.

**Phase 2 — Read-only Act inspector.** New `useActStructurePopoverStore`
+ `ActStructureClickHandler` (poly-fill click, filtered to
`kind: 'structure'`) + `ActStructurePopover` (DOM popover anchored at
`map.project(anchor)`, re-projected on `move`/`zoom`/`resize`). Renders
type icon + label, optional name, phase, rotation°, footprint
`widthM × depthM m`, category. ESC + outside-click + Close all dismiss;
auto-closes if the underlying structure is deleted.

**Phase 3 — Per-type log-action handoff.** Footer renders one button per
applicable Act log action via `getActionsForType()`
(`apps/web/src/v3/act/data/structureActions.ts`):

- `barn`, `animal_shelter` → Log maintenance · Log livestock move
- `greenhouse` → Log maintenance · Log harvest
- 17 other types → Log maintenance only

Each button calls a helper from
`apps/web/src/v3/act/ActStructurePopover.actions.ts` mirroring the
**skeleton-then-patch** pattern the three Act tools already use:
close popover → `newAnnotationId('mnt'|'lvm'|'hrv')` →
`addEvent`/`addEntry` skeleton with `structureId: structure.id` (and
`sourceKind: 'structure'` for maintenance + harvest) →
`useInlineFormStore.open()` at structure centroid with the same fields
the matching tool uses → `onSave` patches with normalized values →
`onCancel` rolls back the skeleton. `ActStructurePopover` accepts
`projectId: string | null` from `ActLayout`; action buttons render only
when `projectId` is truthy.

**Schema deltas (additive).**
- `MaintenanceSourceKind`: `'earthwork' | 'storage'` → `'earthwork' | 'storage' | 'structure'`. Reuses the existing polymorphic `sourceId` (no new field). Persist `version: 1 → 2`, no `migrate` (old records valid).
- `LivestockMoveEvent`: `paddockId: string` → `paddockId?: string`; new `structureId?: string`. Invariant: exactly one set per event. Persist `version: 1 → 2`. `eventsByPaddock` helper unchanged.
- `HarvestSourceKind`: `'crop' | 'livestock'` → `'crop' | 'livestock' | 'structure'`; new `structureId?: string`. `cropAreaId: string` kept non-optional — structure-source entries set `cropAreaId: ''` matching the prior livestock-source convention so `HarvestLogCard` grouping keeps working. No version bump (purely additive).

**Why "extend, don't hide" on livestock-move.** Plan considered hiding
the button on structures without a paired paddock. Audit: most barns /
animal shelters don't have a paired paddock. Hiding would have made the
feature dead by default. Adding `structureId?` is two lines of schema
change for a useful event.

**Verification.** `tsc --noEmit` (8 GB heap) exit 0. Mounted-component
fiber walk on `/v3/project/mtc/act` confirms `ActStructurePopover`,
`ActStructureClickHandler`, `PlanDataLayers` (`editable=false`),
`InlineFeaturePopover` all present. `preview_eval` synthetic store
probes hit the Vite dynamic-`import()` cache-bust limitation (separate
Zustand singletons per imported module instance) — does not affect the
user-click path which uses import-time singletons. Same limitation
logged for Phase 2 last session. End-to-end click verification deferred
to operator manual smoke.

**ADR.** [2026-05-10 atlas-act-structure-popover](decisions/2026-05-10-atlas-act-structure-popover.md).
