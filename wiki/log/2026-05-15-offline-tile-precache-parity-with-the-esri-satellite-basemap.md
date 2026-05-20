# 2026-05-15 — Offline tile-precache parity with the Esri satellite basemap


**Objective.** Follow-up to the same-day Esri basemap swap (`5fcf63f5`):
make the offline tile cache match what the live Satellite basemap renders
online.

**Problem.** Two gaps. (1) `tilePrecache.ts` still warmed MapTiler
satellite tiles (`api.maptiler.com/tiles/satellite/{z}/{x}/{y}@2x.jpg`) —
the wrong provider after the swap. (2) The precache is only a `fetch()`
warmer; it caches offline **only if the service worker stores the
request**, but the Workbox tile rule in `vite.config.ts` matched only
`api.maptiler.com`, so neither the live Esri tiles nor any Esri precache
fetch were cached at all.

**Change.** `vite.config.ts`: new `StaleWhileRevalidate` rule for
`server.arcgisonline.com/.../World_Imagery/*` into the **same**
`ogden-map-tiles` bucket (the essential fix — serves both the live raster
source and the precache warmer); existing MapTiler rules untouched.
`tilePrecache.ts`: `MAPTILER_TILE_BASE`→`ESRI_TILE_BASE`,
`buildTileUrl(x,y,z)` → `tile/{z}/{y}/{x}` (no @2x/.jpg/key — Esri native
256px), `VITE_MAPTILER_KEY` early-return gate + key plumbing removed (Esri
is tokenless, so keyless public deploy now gains offline satellite).
`MAX_TILES=1500` / zoom 10–16 / `CONCURRENCY=6` unchanged. No caller change
(`syncService.ts`). New `src/lib/__tests__/tilePrecache.test.ts` (2 specs).

**Verification.** `pnpm --filter web typecheck` exit 0;
`pnpm --filter web build` exit 0 — `dist/sw.js` carries the Esri route
regex and `ogden-map-tiles` ×2 (MapTiler + Esri sharing the bucket); the
2 new precache specs green. Behavioural offline DevTools cache-inspection
step **not performed** — needs dev server + manual browser, and
preview/screenshot tooling is renderer-hanging in this environment
(documented in the basemap ADR); build-level proof stands in its place,
behavioural pass deferred to a sighted run.

**Deferred.** Behavioural offline cache check. See ADR
`decisions/2026-05-15-atlas-offline-tile-precache-esri-parity.md`.
