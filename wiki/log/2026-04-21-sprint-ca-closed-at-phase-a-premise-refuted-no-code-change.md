# 2026-04-21 — Sprint CA closed at Phase A: premise refuted, no code change


Planned as "clean up the NoData tag in `convert-gaez-to-cog.ts`" — Sprint BZ left a note that the COG conversion was dropping the source GDAL NoData tag, causing `-1` sentinel values to leak through at Sahara. Sprint BZ's classifier guard (`yield < 0 || null → UNKNOWN`) was framed as defense-in-depth papering over this ingest defect.

Phase A probe via a small `geotiff.js` script against the raw + COG files (`maize_rainfed_high_yield.tif` + `_suitability.tif`, sampled at Iowa / Sahara / Bering / Antarctica / Pacific) **refuted the premise**. Both raw AND COG have `GDAL_NODATA=-9` set identically. Bering / Antarctica / Pacific all return `-9` in yield and `0` in suitability (= true NoData, flows through as `null`). Sahara returns `-1` in yield and `9` in suitability — but these are NOT NoData leaks; they're a **second, in-band FAO sentinel** meaning "pixel is on-raster but not viable for this crop / water / desert".

Conclusion: the ingest is clean. FAO uses a two-sentinel convention per raster (standard NoData + in-band "not viable"), and Sprint BZ's `yield < 0` classifier branch is load-bearing code that handles the second sentinel — not defensive scaffolding around a broken ingest. Documented the two-sentinel pattern in `wiki/entities/api.md` under `GaezRasterService`.

**Considered and rejected:**
- *Add `-a_nodata -1` override at conversion:* GDAL bands can only hold one NoData value; this would replace FAO's `-9` tag with `-1`, confusing downstream tools (QGIS, anything reading the COGs directly).
- *Reframe `-1` as class `N` (not suitable) instead of `UNKNOWN`:* closer to FAO's intent, but contradicts Sprint BZ's hard-won "Sahara should say UNKNOWN" UX decision; not worth a re-litigation.

**Files touched (1):** `wiki/entities/api.md` (edited the Sprint BZ note to reflect the CA finding), `wiki/log.md` (this entry). No source changes.

**Next up:** Sprint CB (map-side GAEZ raster visualization) and Sprint CC (RCP ingest) remain deferred. With CA closed, both inherit a clean, well-understood ingest + classifier foundation.
