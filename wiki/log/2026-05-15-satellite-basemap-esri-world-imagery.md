# 2026-05-15 — Satellite basemap → Esri World Imagery


**Branch.** `feat/atlas-permaculture`.

**Trigger.** User asked what could improve satellite-view
quality/resolution. Raster sharpness is provider-data-bound, not
code-tunable; for rural/agricultural sites Esri World Imagery is
sharper than MapTiler and is free/no-token (~z19). User chose "best
free long-term option" + "keep current zoom limits, change source
only."

**Change.** `apps/web/src/lib/maplibre.ts`: new inline
`ESRI_WORLD_IMAGERY_STYLE` (raster source
`server.arcgisonline.com/.../World_Imagery`, `tileSize 256`,
`maxzoom 19`, Esri/Maxar attribution, MapTiler `glyphs` fallback for
label layers). `MAP_STYLES` type widened to `string |
StyleSpecification`; `satellite` → the Esri style. `terrain` /
`topographic` / `street` / `hybrid` unchanged. MapTiler satellite
retained (and as fallback) via **Hybrid**. No zoom/fit/precache/store
default touched. ADR
`decisions/2026-05-15-atlas-satellite-basemap-esri-world-imagery.md`;
`entities/web-app.md` Map section updated.

**Verification.** `pnpm --filter web typecheck` clean across all 9
`MAP_STYLES` consumers (all feed `setStyle`/`Map({style})`, both
accept `StyleSpecification`). Live `map.getStyle()` after selecting
Satellite on Observe `sectors-zones`: `esri-world-imagery` raster +
MapTiler glyphs + 1 layer. Esri endpoint reachable (~450 ms). No
console errors (Esri/CORS/glyphs/tiles). Round-trip Satellite →
Terrain → Satellite restores Esri cleanly, `diagnose-parcel-boundary`
overlay survives. Hybrid confirmed still MapTiler `satellite-v2`.

**Deferred / caveat.** No pixel screenshot — `preview_screenshot`
renderer hung (reproduced pre-change on landing page; environment
issue, not the edit). Functional verification via applied-style
readback + error-absence instead.
