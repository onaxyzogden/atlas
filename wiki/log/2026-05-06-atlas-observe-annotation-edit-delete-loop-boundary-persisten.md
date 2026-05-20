# 2026-05-06 — Atlas OBSERVE annotation edit/delete loop + boundary persistence + v3 sidebar link


Closed four follow-up gaps from the OBSERVE-tools-functional shipment that
surfaced in field testing.

**What landed:**
- **Boundary persistence:** `ObserveLayout.onBoundaryDrawn` now writes the
  closed polygon into `useProjectStore` as a single-feature
  `FeatureCollection`; survives reload, basemap toggle, route swap.
- **Per-kind Save/Cancel form:** new `AnnotationFormSlideUp` +
  `annotationFieldSchemas` (12 kinds) + `annotationFormStore`; 12 draw
  tools refactored to hand off to the form on draw-complete instead of
  writing default-shape records.
- **Live module dashboards:** new `AnnotationListCard` + `AnnotationRegistry`
  wired into 5 module dashboards (EarthWaterEcology, HumanContext,
  Macroclimate, Topography, SWOT); each row shows kind badge + edit + delete.
- **Map-click → detail panel:** new `annotationDetailStore` +
  `AnnotationDetailPanel`; `ObserveAnnotationLayers` injects `annoKind`/`annoId`
  into every feature's properties and wires click + hover handlers per layer.
  Clicking an annotation opens the detail panel with Edit + Delete.
- **v3 sidebar link:** `SidebarBottomControls` exposes "Open in OBSERVE (v3)"
  link to `/v3/project/$projectId/observe` from the production dashboard.

**Scope deferrals (next session):**
- Phase 4 SelectionFloater multi-select halo + drag-reposition for points +
  vertex-edit via MapboxDraw `direct_select` for line/polygon.
- Phase 5 zundo global Cmd-Z / Cmd-Shift-Z across the 7 namespace stores
  with input-focus guard + per-store vitest specs.

**Verification:** `npx tsc --noEmit` clean; `npm run build` clean (34s).

ADR: [2026-05-06-atlas-observe-edit-delete-undo.md](decisions/2026-05-06-atlas-observe-edit-delete-undo.md)
