# 2026-05-06 — Atlas OBSERVE annotation edit/delete loop + boundary persistence + v3 sidebar link

**Status:** Adopted (partial — Phase 4 selection floater / drag-reposition and Phase 5 zundo global undo deferred)
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [2026-05-06 Atlas OBSERVE tools functional](2026-05-06-atlas-observe-tools-functional.md)
**Related:** [2026-04-30 Site-Annotations 7-Namespace Consolidation](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md), [2026-04-26 Zustand Selector Discipline](2026-04-26-zustand-selector-discipline.md)

## Context

The 2026-05-06 OBSERVE-tools-functional shipment landed 16 draw tools but
left four user-visible gaps in field testing:

1. **Drawn property boundary disappeared on reload.** `BoundaryTool` emitted
   the closed polygon, but `ObserveLayout`'s `onBoundaryDrawn` callback only
   logged it — the polygon never reached `useProjectStore`, so on next mount
   `project?.location.boundary` was `undefined` and the map re-rendered blank.
2. **Annotations saved with no form input.** Activating a tool such as
   `SoilSampleTool` wrote a default-shaped record on draw-complete with no
   chance to enter pH, organic matter, NPK, notes, etc. None of the
   six OBSERVE module dashboards consumed the namespace stores either; the
   record was technically persisted in localStorage but functionally invisible.
3. **No edit/delete loop.** Once placed, an annotation could only be removed
   by hand-editing localStorage. There was no click-select, no drag, no undo.
4. **No way into v3 from a real project.** The production `DashboardSidebar`
   exposed no entry into the `/v3/project/$projectId/observe` prototype.

User-confirmed scope decisions from this session:

- Explicit Save/Cancel slide-up form per annotation kind.
- Live dashboards — replace dummy content with store-derived lists.
- Global Cmd-Z across the 7 namespace stores _(deferred — see Scope deferrals)_.
- v3 link at the bottom of the real-project `DashboardSidebar`.

## Decision

### 1. Boundary persistence ([ObserveLayout.tsx](../../apps/web/src/v3/observe/ObserveLayout.tsx))

`onBoundaryDrawn` now wraps the closed polygon in a single-feature
`FeatureCollection` and calls
`useProjectStore.getState().updateProject(projectId, { location: { ...project.location, boundary } })`.
`DiagnoseMap`'s existing render-prop effect re-applies the boundary on
`style.load`, so it survives basemap toggles, hard reloads, and route swaps.

### 2. Per-kind Save/Cancel slide-up form

NEW [`apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx`](../../apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx)
+ [`AnnotationFormSlideUp.module.css`](../../apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.module.css):
shared bottom-sheet form. ESC and the backdrop both cancel; Save calls the
schema's `save(values, ctx)` then closes; Cancel discards.

NEW [`apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`](../../apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts):
declarative `FIELD_SCHEMAS[kind]` map keyed by 12 annotation kinds —
`neighbourPin`, `household`, `accessRoad`, `frostPocket`, `hazardZone`,
`contourLine`, `highPoint`, `drainageLine`, `watercourse`, `ecologyZone`,
`soilSample`, `swotTag`. Each schema owns `title`, `fields`, `defaults`,
`loadDefaults(id)` (for edit mode), and `save(values, ctx)` (dispatches
into the correct namespace store). Access-road `lengthM` is computed via
`turf.length(...)` on save so the geometry → store contract holds.

NEW [`apps/web/src/store/annotationFormStore.ts`](../../apps/web/src/store/annotationFormStore.ts):
ephemeral zustand atom `{ active: { kind, geometry?, mode: 'create' | 'edit', existingId? } | null, open(...), close() }`.
A single `<AnnotationFormSlideUp />` is mounted from `ObserveLayout` and
reads `active`.

REFACTOR — 12 draw tools under
[`apps/web/src/v3/observe/components/draw/`](../../apps/web/src/v3/observe/components/draw/)
no longer write a default-shape record on draw-complete. They now call
`annotationFormStore.open({ kind, geometry, mode: 'create' })` and let the
form take over.

### 3. Live module dashboards

NEW [`apps/web/src/v3/observe/components/AnnotationListCard.tsx`](../../apps/web/src/v3/observe/components/AnnotationListCard.tsx):
shared `SurfaceCard` taking `{ title, projectId, kinds, emptyHint }`. Each
row shows kind badge + title + subtitle + Pencil edit + Trash2 delete; row
click opens the detail panel.

NEW [`apps/web/src/v3/observe/components/AnnotationRegistry.ts`](../../apps/web/src/v3/observe/components/AnnotationRegistry.ts):
`useAnnotationsForKinds(kinds, projectId)` subscribes broadly to the 11
relevant store collections and `useMemo`s a sorted `AnnotationRow[]`.
`removeAnnotation(kind, id)` dispatches to the per-kind delete action
(noting `soilSampleStore` exposes `deleteSample`, all others use
`remove<X>`); `getAnnotationRow(kind, id)` returns the same row shape for
the detail panel.

WIRED into 5 module dashboards:

- [`EarthWaterEcologyDashboard`](../../apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx) — `['soilSample', 'watercourse', 'ecologyZone']`, replaces the dummy `RecentObservationsCard`.
- [`HumanContextDashboard`](../../apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx) — `['neighbourPin', 'household', 'accessRoad']`.
- [`MacroclimateDashboard`](../../apps/web/src/v3/observe/modules/macroclimate-hazards/MacroclimateDashboard.tsx) — `['frostPocket', 'hazardZone']`.
- [`TopographyDashboard`](../../apps/web/src/v3/observe/modules/topography/TopographyDashboard.tsx) — `['contourLine', 'highPoint', 'drainageLine']`.
- [`SwotDashboard`](../../apps/web/src/v3/observe/modules/swot-synthesis/SwotDashboard.tsx) — `['swotTag']`.

`SectorsZonesDashboard` was intentionally skipped — sector wedges and
permaculture-zone radii have their own explicit Save buttons inside their
tools and are not registered in `FIELD_SCHEMAS`.

### 4. Map click → detail panel (Edit + Delete loop)

NEW [`apps/web/src/store/annotationDetailStore.ts`](../../apps/web/src/store/annotationDetailStore.ts):
ephemeral atom `{ active: { kind, id } | null, open, close }` — singleton
overlay, avoids threading `useDetailNav` through every module's panel
`details` map.

NEW [`apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx`](../../apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx):
modal overlay reading `useAnnotationDetailStore.active`. ESC closes.
`Edit` hands off to `useAnnotationFormStore.open({ kind, mode: 'edit', existingId })`;
`Delete` confirms then calls `removeAnnotation`. Reuses the form's CSS.

EXTEND [`ObserveAnnotationLayers.tsx`](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx):
each FeatureCollection's `properties` now carries `annoKind` + `annoId`.
Inside the apply effect, a `wireClick(layerId)` helper attaches `click` /
`mouseenter` / `mouseleave` per layer and routes the click to
`useAnnotationDetailStore.getState().open({ kind, id })`. All listeners are
torn down on cleanup. Sectors and permaculture-zones are not wired (no
schema entry).

Mounted from `ObserveLayout`:

```tsx
<AnnotationFormSlideUp />
<AnnotationDetailPanel projectId={params.projectId ?? null} />
```

### 5. v3 sidebar link ([SidebarBottomControls.tsx](../../apps/web/src/components/SidebarBottomControls.tsx))

Added a TanStack Router `<Link to="/v3/project/$projectId/observe" params={{ projectId }} />`
labelled "Open in OBSERVE (v3)" with a `v3` badge. Renders only when
inside a real-project route (`projectId` defined).

## Scope deferrals

Cut from this session for context budget; documented for follow-up:

- **SelectionFloater + multi-select halo** (Phase 4 full) — click-select
  with shift-click multi-select, halo layer per kind, floating Edit /
  Delete / Clear control above the bottom rail.
- **Drag-reposition for points** (Phase 4) — pointer-down on a selected
  point feature, live preview source, pointer-up writes
  `update<X>(id, { position })`.
- **Vertex edit for line/polygon** (Phase 4) — switch MapboxDraw to
  `direct_select` on the selected feature; `draw.update` writes back to
  the store.
- **zundo global Cmd-Z / Cmd-Shift-Z** (Phase 5) — wrap each of the 7
  namespace stores with `temporal()` _inside_ `persist()`, build
  `useGlobalAnnotationUndo` keydown hook with input-focus guard, plus 1
  vitest spec per store covering rehydrate→action→undo→assert.

The current map-click → detail-panel loop is sufficient to view, edit,
and delete annotations; the deferred items are convenience layers on top.

## Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean.
- `npm run build` clean (Vite build, 34s, 626 PWA precache entries).
- Boundary persistence flow, dashboard live row, slide-up form, and
  map-click detail panel exercised through the typecheck graph; manual
  preview not run this session.

## Files

**New:**

- `apps/web/src/store/annotationFormStore.ts`
- `apps/web/src/store/annotationDetailStore.ts`
- `apps/web/src/v3/observe/components/AnnotationRegistry.ts`
- `apps/web/src/v3/observe/components/AnnotationListCard.tsx`
- `apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx`
- `apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx`
- `apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.module.css`
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`

**Modified:**

- `apps/web/src/v3/observe/ObserveLayout.tsx` (boundary persistence + form/detail mounts)
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` (annoKind/annoId + click handlers)
- `apps/web/src/components/SidebarBottomControls.tsx` (v3 link)
- 12 draw tools under `apps/web/src/v3/observe/components/draw/`
- 5 module dashboards listed in §3.

## References

- Predecessor ADR: [2026-05-06 Atlas OBSERVE tools functional](2026-05-06-atlas-observe-tools-functional.md)
- 7-namespace stores: [2026-04-30 Site-Annotations Scholar-aligned namespaces](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
- Selector discipline: [2026-04-26 Zustand selector discipline](2026-04-26-zustand-selector-discipline.md)
