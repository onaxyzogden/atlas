---
title: Satellite basemap → Esri World Imagery (MapTiler retained as Hybrid fallback)
date: 2026-05-15
status: accepted
stage: cross-cutting
module: web-map
---

# ADR: Satellite basemap swapped to Esri World Imagery

## Context

The `satellite` basemap rendered MapTiler's `satellite` style
([apps/web/src/lib/maplibre.ts](../../apps/web/src/lib/maplibre.ts) →
`MAP_STYLES.satellite`). Raster imagery resolution is fixed by the
provider's source data — it cannot be sharpened in code; past the source's
native zoom the tiles only upscale and blur. For a rural permaculture /
land-design tool the relevant areas are agricultural, where **MapTiler's
imagery is frequently lower-resolution than Esri World Imagery**. Esri World
Imagery is free, requires no API token, serves to ~z19 (sub-meter in most
regions), and was already trusted in this codebase (Cesium 3D viewer +
`HistoricalImageryControl` Wayback overlay both consume the same Esri
service). User explicitly chose "the best free long-term option" and
"keep current zoom limits — only change the imagery source."

## Decision

- New exported `ESRI_WORLD_IMAGERY_STYLE` inline MapLibre
  `StyleSpecification` in `maplibre.ts`: a single `raster` source
  `esri-world-imagery` →
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  `tileSize: 256`, `maxzoom: 19`, with the Esri/Maxar attribution string
  (surfaces automatically via the existing `attributionControl`).
- `glyphs` on that style points at MapTiler's font endpoint
  (`https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${key}`) so
  app-added symbol/label layers still resolve fonts after a swap to this
  style (an Esri raster style ships none of its own; text layers would
  silently fail without this).
- `MAP_STYLES` type widened `Record<string, string>` →
  `Record<string, string | maplibregl.StyleSpecification>`;
  `satellite` now points at `ESRI_WORLD_IMAGERY_STYLE`. `terrain`,
  `topographic`, `street`, `hybrid` remain the existing MapTiler style URLs.
- No zoom/`fitBounds` cap, offline-precache range, or `mapStore` default
  changed (explicit non-goal). Declaring source `maxzoom: 19` only states
  the source's true native depth — it does not raise any app-facing limit.

## Consequences

- All 9 `MAP_STYLES` consumers feed the value into `new maplibregl.Map({
  style })` or `map.setStyle(...)`, both of which accept a
  `StyleSpecification` — no consumer changes needed; typecheck clean.
- **MapTiler satellite is not removed** — it remains reachable via the
  `hybrid` style (MapTiler `satellite-v2` tiles + planet labels), which
  doubles as a built-in fallback if the Esri endpoint degrades. Aligns with
  the project's "no deletion in revamps" principle.
- The MapTiler key gate (`hasMapToken`) is unchanged: MapTiler still backs
  terrain DEM, contours, vector overlays, geocoding, and the
  Hybrid/Terrain/Topographic/Street styles, so the existing token UX stays
  correct.
- No new dependency, env var, or token.

## Verification

- `pnpm --filter web typecheck` clean (8 GB heap; default OOMs — not a type
  error) across all `MAP_STYLES` consumers.
- Dev server, Observe `sectors-zones` basemap selector → Satellite: live
  `map.getStyle()` (read via the component instance) returns the
  `esri-world-imagery` raster source + MapTiler glyphs + single raster
  layer. Esri endpoint reachable from preview (tile fetch ~450 ms). No
  console errors for Esri/CORS/glyphs/tiles. Round-trip Satellite → Terrain
  → Satellite restores the Esri style cleanly; app overlay source
  (`diagnose-parcel-boundary`) survives the swap. Hybrid confirmed still
  serving MapTiler `satellite-v2` (fallback intact).
- `preview_screenshot` was unresponsive (renderer hang — reproduced on the
  landing page before this change, so environment-side, not caused by the
  edit); no pixel capture. Functional verification done via the live
  applied-style readback + absence of errors instead.

## Scope / non-goals

No zoom/fit cap changes; no offline-precache change; no UI/switcher change;
no Sentinel/Planet on-demand layer; no removal of MapTiler.
