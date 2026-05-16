---
title: Offline tile-precache parity with the Esri satellite basemap
date: 2026-05-15
status: accepted
stage: cross-cutting
module: web-map
---

# ADR: Offline tile-precache repointed to Esri World Imagery

## Context

The live satellite basemap was swapped to **Esri World Imagery** on
2026-05-15 (ADR
[2026-05-15-atlas-satellite-basemap-esri-world-imagery](2026-05-15-atlas-satellite-basemap-esri-world-imagery.md),
commit `5fcf63f5`). Two offline-cache gaps remained:

1. The offline tile-precache warmer
   ([apps/web/src/lib/tilePrecache.ts](../../apps/web/src/lib/tilePrecache.ts))
   still fetched **MapTiler** satellite tiles
   (`api.maptiler.com/tiles/satellite/{z}/{x}/{y}@2x.jpg?key=…`) — the
   wrong provider, so an offline user on Satellite saw blank tiles while
   the cache held MapTiler imagery the live map no longer requests.
2. The precache is only a `fetch()` warmer; it populates the offline cache
   **only if the service worker intercepts and stores the request**. The
   Workbox tile rule in
   [apps/web/vite.config.ts](../../apps/web/vite.config.ts) matched only
   `api.maptiler.com`, so **neither** the live Esri map tiles **nor** any
   Esri precache fetch were cached offline.

User intent: best free long-term option, keep current zoom limits (change
the source only), offline cache must match what renders online.

## Decision

- **vite.config.ts** — new `runtimeCaching` rule directly after the
  MapTiler tiles rule, reusing the **same** `cacheName: 'ogden-map-tiles'`,
  `StaleWhileRevalidate` handler, expiration, and
  `cacheableResponse: { statuses: [0, 200] }`:
  `urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/.*/`.
  This single rule serves **both** the live MapLibre raster fetches and the
  precache warm fetches. All existing MapTiler rules left unchanged
  (terrain / topographic / street / hybrid styles, contours, vector tiles,
  fonts, sprites, style JSON still come from `api.maptiler.com`).
- **tilePrecache.ts** — `MAPTILER_TILE_BASE` → `ESRI_TILE_BASE`
  (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile`);
  `buildTileUrl(x,y,z)` → `${ESRI_TILE_BASE}/${z}/${y}/${x}` (no `@2x`, no
  `.jpg`, no key — Esri serves native 256px, matching
  `ESRI_WORLD_IMAGERY_STYLE`'s `tileSize: 256`). The existing slippy-map
  math is unchanged and already correct: ArcGIS `tile/{z}/{row}/{col}` is
  the same Web-Mercator XYZ scheme, i.e. `tile/{z}/{y}/{x}`.
- The `VITE_MAPTILER_KEY` early-return gate and `key` plumbing are
  **removed** — Esri needs no token, so the precache now also works on the
  keyless public deploy.
- `MAX_TILES = 1500`, zoom range 10–16, `CONCURRENCY = 6` unchanged
  (tile-budget guard, not a resolution cap — explicit non-goal).

## Consequences

- Offline Satellite imagery now matches the live basemap exactly (one
  provider, one `ogden-map-tiles` bucket for both the live source and the
  precache warmer).
- Precache works without a MapTiler token — keyless public deploy gains
  offline satellite for the first time.
- No change to the single caller
  [apps/web/src/lib/syncService.ts](../../apps/web/src/lib/syncService.ts)
  (`precacheProjectTiles(bbox)` with defaults; the key-removal is
  signature-internal).
- No zoom / `fitBounds` cap, offline-precache range, or `mapStore` default
  changed. No new dependency, env var, or token.

## Verification

- `pnpm --filter web typecheck` exit 0 (8 GB heap).
- `pnpm --filter web build` exit 0 — `vite-plugin-pwa` regenerated the
  service worker; `dist/sw.js` contains the Esri route
  (`server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/.*`)
  and `ogden-map-tiles` appears twice (existing MapTiler tiles rule + new
  Esri rule sharing the bucket, as intended).
- New `src/lib/__tests__/tilePrecache.test.ts` (2 specs, green): warmed
  URLs match `…/World_Imagery/MapServer/tile/{z}/{y}/{x}` (no @2x/.jpg/key);
  precache no longer early-returns when no MapTiler key is set.
- Behavioural offline DevTools cache-inspection step (per plan) **not
  performed** — needs the dev server + manual browser interaction, and
  preview/screenshot tooling is renderer-hanging in this environment
  (documented in the basemap ADR). Build-level proof (regenerated SW route,
  shared bucket, URL-format test, clean typecheck/build) stands in its
  place; the behavioural pass is deferred to a sighted run.

## Scope / non-goals

No zoom/fit cap change; no precache zoom-range or tile-budget change; no
removal of MapTiler caching for the non-satellite styles; no UI/switcher
change; no Sentinel/Planet layer.
