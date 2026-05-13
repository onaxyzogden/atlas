---
date: 2026-05-13
title: Tree spacing snap — cursor canopy ring + placement validation
status: implemented
---

# Tree spacing snap (continuous-point follow-up)

## Context

Continuous-point placement (ADR 2026-05-12) made it trivial to drop many
trees in a row, but the tool offered no canopy hint and no guard against
clicking two oaks 30 cm apart. The user picked spacing snap as the next
step — visible canopy ring while armed, clicks rejected when they'd land
inside an existing same-category drip line or outside the parcel.
Polygon-fill / row stamp / grid stamp were deliberately deferred — this
slice keeps the one-click-one-tree mental model and just adds guardrails.

## Decision

Per-kind canopy spacing on `DesignElementSpec` (`defaultSpacingM`) drives:

1. A translucent cursor-following ring (`turf.circle`, radius =
   `defaultSpacingM`) rendered while a point tool is armed. Estate-green
   when the click would be valid, fired-clay red when it would violate.
2. Click-time validation: rejects clicks outside the parcel boundary, or
   within `defaultSpacingM` of any same-category point design element
   already placed in the project. Rejection emits a `plan:tree-rejected`
   window CustomEvent with a reason; a tiny `TreeRejectionToast`
   component shows it as a 1.5 s pill near the bottom of the canvas.

Active-kind spacing only — placing a small shrub near a large oak
doesn't block at the oak's radius. Cross-kind asymmetric spacing is a
v2 tweak.

## Implementation

- Modified: `apps/web/src/v3/plan/canvas/elementCatalog.ts` —
  `defaultSpacingM?: number` on `DesignElementSpec`. Values: oak 10 m,
  pine 6 m, apple 5 m, shrub 2 m.
- Modified: `apps/web/src/v3/plan/canvas/draw/useContinuousPointDrawTool.ts`
  — added optional `spacing: { radiusM, validate }` arg. When set, owns
  a single `preview-tree-spacing` ephemeral source + fill/line layers,
  reads cursor on mousemove, swaps the circle's `feature-state.valid`
  based on `validate(lngLat)`. Click handler short-circuits and
  dispatches the rejection event when `!ok`.
- Modified: `apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts`
  — added `parcelBoundary?: GeoJSON.Polygon` arg + local
  `validatePlacement` (boundary check + same-`category` point neighbour
  check). Builds the `spacing` object only when the active spec is a
  point kind with `defaultSpacingM`.
- Modified: `apps/web/src/v3/plan/draw/tools/PlanDesignElementHost.tsx`,
  `apps/web/src/v3/plan/draw/PlanDrawHost.tsx`,
  `apps/web/src/v3/plan/PlanLayout.tsx`,
  `apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx` — threaded
  `parcelBoundary` from `useV3Project` down both Current and Vision
  draw paths.
- New file: `apps/web/src/v3/plan/draw/TreeRejectionToast.tsx` — single
  `useEffect` + `useState`, listens for `plan:tree-rejected`, auto-
  dismisses after 1.5 s, replaces message + resets timer on overlap.
  Mounted once in `PlanLayout` next to `PlanPhaseTabs` so it overlays
  both Current and Vision canvases.

## Reused, unchanged

- `getDesignElementsForProject` — neighbour lookup.
- `turf.circle` / `turf.distance` / `turf.booleanPointInPolygon` —
  already in the bundle.
- Estate-green / fired-clay palette (#7fa05a / #8a4f3a) — matches the
  selection-halo treatment in `DesignElementLayers`.
- `setData` swap pattern from `PlanSunPathOverlay` — single source,
  swap geometry per mousemove rather than re-creating layers.

## Verification

`tsc --noEmit -p .` passes for all touched files (one pre-existing
`Geometry` width error in `DesignElementLayers.tsx:433` around
`translateByDelta`, unrelated). Browser-canvas mouse-event verification
is blocked by the same preview-environment limitation noted in the
2026-05-12 ADR — synthetic events don't reach MapLibre's pointer
pipeline. Tool arms cleanly; manual end-to-end pass deferred to user.

## Out of scope

- Polygon fill / row stamp / grid stamp (foundation for these is now in
  place via `defaultSpacingM`).
- Soft-snap (placing at the violation boundary instead of refusing).
- Per-stamp spacing override UI.
- Hedgerow (line) spacing — different geometry model.
- Cross-kind asymmetric spacing — v2 tweak.
