# Plan rail — Guild draw tool (Plant Systems)

**Date:** 2026-05-08
**Branch:** feat/atlas-permaculture
**Status:** Implemented

## Decision

Add a `Guild` point tool to the Plant Systems module on the Plan rail.
Crop area and Guild now both render as rail buttons; the rail's
map-first promise is honoured for guilds.

## Why a point, not a polygon

`Guild.centroidUv: [number, number]` (added 2026-05-07 to
`polycultureStore`) is a single anchor — a polygon would mislead the
steward into drawing extents the schema does not store. Layer extents
belong to crop-area (already on the rail) or to a future canopy
projection overlay, not to the guild record itself.

## Tool semantics

- On `draw.create`, project the dropped lng/lat against current map
  bounds into normalised `[u, v]` parcel coords for `centroidUv`.
- Skeleton record via `addGuild` — `name: 'New guild'`,
  `anchorSpeciesId: ''`, `members: []`. Persisted immediately.
- Inline popover: 2 fields — `name` (text required), `anchorSpeciesId`
  (select, filtered to canopy + sub_canopy from `PLANT_DATABASE`).
- Members stay deferred to the slide-up `GuildSpatialBuilderCard` —
  the rail seeds anchor + name only.
- Save → `updateGuild`. Cancel/ESC → `removeGuild` rollback.

## Render

`PlanDataLayers` reads `usePolycultureStore.guilds`, projects each
`centroidUv` against current map bounds back into lng/lat, and pushes
features into the existing `points` + `labels` collections with
`yeomansRank: 8` so the lens recolours them with crops.

## Why anchor filtered to canopy + sub-canopy

A guild's anchor sets the upper-storey of the polyculture stack;
restricting the rail-popover select avoids stewards anchoring a guild
on a herb when the schema treats anchor as the canopy seed. Members
(other layers) remain unconstrained — added inside the slide-up.

## Out of scope (follow-ups)

- Member composition from the rail tool (slide-up remains canonical).
- Guild canopy-projection overlay (separate concern from the anchor
  point).
- Editing existing guild centroids by dragging on the map.

## Files

- Created `apps/web/src/v3/plan/draw/tools/GuildTool.tsx`
- Edited `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`,
  `PlanTools.tsx`,
  `draw/PlanDrawHost.tsx`,
  `layers/PlanDataLayers.tsx`
