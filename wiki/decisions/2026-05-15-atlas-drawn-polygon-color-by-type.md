---
title: Drawn-polygon color by type — preview tint + VegetationPatch by ground cover
date: 2026-05-15
status: accepted
stage: observe
module: earth-water-ecology
---

# ADR: Color drawn polygons by type

## Context

Built directly on the same-day [Vegetation Patch unification]. Two
polygon-color gaps remained:

1. The in-progress MapboxDraw polygon rendered with one hardcoded tan/brown
   (`mapboxDrawStyles.ts`, `fill-color: mapTokens.boundary`,
   `line-color: earth[800]`) regardless of which tool was active — a steward
   could not tell vegetation from pasture from crop until after committing.
2. Committed `VegetationPatch` polygons were colored by `successionStage`
   (`ECOLOGY_STAGE_COLOR`), but the user wants them keyed to the structural
   `groundCover` axis via the already-defined-but-unused `GROUND_COVER_COLORS`
   (`zoneStore.ts`).

## Decision

**Change A — live draw preview color by active tool.** The active tool
unmounts/remounts the tool component (and thus `useMapboxDrawTool`) on every
`activeTool` change, so per-init styling suffices — no runtime style-swap
machinery.

- New `DRAW_PREVIEW_COLORS` table in `mapboxDrawStyles.ts` keyed by tool
  kind, reusing committed-table values so preview ≈ committed: vegetation =
  `GROUND_COVER_COLORS['sparse-grasses']` (`#bfa86a`, the form default
  cover), pasture `#b58550` (paddock), conventionalCrop `#a8854a`
  (annual-row). All other kinds keep the universal default.
- `useMapboxDrawTool` gains optional `previewColor`; after
  `map.addControl(draw)` it `setPaintProperty`s `gl-draw-polygon-fill`
  (`fill-color` + `fill-outline-color`) and `gl-draw-polygon-stroke`
  (`line-color`), guarded by `map.getLayer`, with `previewColor` added to
  the effect deps. MapboxDraw mutates only its GeoJSON source, not layer
  paint, so a single application holds for the draw session.
- `VegetationTool` / `PastureTool` / `ConventionalCropTool` each pass their
  kind's color.

**Change B — committed VegetationPatch color by ground cover.** In
`ObserveAnnotationLayers.tsx` the vegetation feature `color` property is now
`GROUND_COVER_COLORS[z.groundCover] ?? PALETTE.ecologyMid` (was
`ECOLOGY_STAGE_COLOR[z.successionStage]`); a `cover` property was added and
`stage` kept for text. The paint block already read `['get','color']` and is
unchanged.

## Consequences

- `ECOLOGY_STAGE_COLOR` became unused and was **removed** (deviation from the
  plan's "keep it defined" — an unused local trips `noUnusedLocals` and
  would fail the typecheck gate). Succession is still surfaced as text via
  `AnnotationRegistry` / `EcologicalDetail`; no legend/detail UI was tied to
  the map color, so no other UI changes.
- Preview-tint is scoped to the three EWE polygon tools; frostPocket /
  hazardZone / building / septic keep the universal default (no regression).

## Verification

- `npm run typecheck` clean (exit 0, memory-safe script).
- `npm test` — 59 files / 815 tests green.
- Dev server: no console errors. `preview_screenshot` was unresponsive
  (renderer hang, unrelated to the change) so no visual capture; the
  in-progress draw tint is not exercisable via preview automation anyway
  (synthetic events don't reach the MapLibre/MapboxDraw pipeline) — needs a
  manual draw. The committed groundCover color path is logic-only and is
  covered by the typecheck + Vitest gates.

## Scope / non-goals

No legend/detail rework; no preview color for non-EWE polygon kinds; no
store/schema change.
