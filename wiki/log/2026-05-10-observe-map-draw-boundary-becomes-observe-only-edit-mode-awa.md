# 2026-05-10 — Observe map: draw-boundary becomes Observe-only + edit-mode-aware + icon swap


Three small but related changes to the `MapToolbar` floating dock:

1. **Stage scoping.** Added a `showBoundary?: boolean` prop (default
   `true`) to `apps/web/src/v3/observe/components/MapToolbar.tsx`.
   PlanLayout and ActLayout now pass `showBoundary={false}`; ObserveLayout
   keeps the default. The toolbar still mounts in all three stages
   (Distance / Elevation / Area / Return-to-property remain everywhere)
   — only the parcel-boundary draw button + popover are gated. Rationale:
   parcel definition belongs to Observe; surfacing the draw button in
   Plan/Act invited stewards to redraw the boundary mid-design.

2. **Edit mode.** `BoundaryTool.tsx` now accepts an `existing?:
   GeoJSON.Polygon | null` prop. On mount: if `existing` is provided,
   `draw.add(...)` seeds the feature and `draw.changeMode('direct_select',
   { featureId })` opens it for vertex-level editing; otherwise the
   original `draw.changeMode('draw_polygon')` runs. The existing
   `draw.create / draw.update / draw.delete` listener triplet (already
   present pre-change) covers the persistence path — no changes to
   ObserveLayout's `onBoundaryDrawn` callback. `existing` is stashed in a
   ref alongside `onBoundaryDrawn` to keep the init effect's dep array at
   `[map]` (re-renders must not re-init the draw control mid-edit).

3. **Icon swap.** Measure-area now uses Lucide `SquareDashed`;
   draw-boundary uses Lucide `Square`. The dashed silhouette better
   signals "ephemeral measurement"; the solid square signals
   "persistent property edge."

Verified end-to-end against the running dev server at :5200:
`tsc --noEmit` clean; Observe toolbar shows 6 buttons including
"Draw property boundary"; Plan + Act show 5 (no boundary); icon classes
on the buttons confirmed (`lucide-square-dashed` for area,
`lucide-square` for boundary); seeding a `parcelBoundaryGeojson`
FeatureCollection on a project and reopening the tool produces the
"Vertices N · Area X.XX ha" readout immediately (proof that
`direct_select` ran with a populated polygon, rather than the
"Click points to outline the parcel" hint shown when no boundary
exists).
