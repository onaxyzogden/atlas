# 2026-04-28 — v3.2 solar sectors land on Diagnose


### Done

**Wedges over the parcel.** The Diagnose site-analysis map now renders three solar sector wedges — winter solstice, equinox, summer solstice — fanning sunrise→sunset over the MTC parcel centroid. The Matrix Toggles popover's previously-disabled "Sectors" row is live; toggling it shows/hides all three wedges via the existing `matrixTogglesStore`.

New module: [`apps/web/src/lib/sectors/`](../apps/web/src/lib/sectors/) — `solar.ts` (pure suncalc-driven sector computation; UTC-noon anchor dates so timezone/DST drift can't move the arc; northern-hemisphere clockwise sweep through south), `types.ts` (shared `SectorKind` discriminator that already accommodates `wind-prevailing`, `fire`, `view`, `noise` for future passes), and 8 vitest cases covering azimuth-bearing math, default 600m reach, and the suncalc provenance entry.

New overlay: [`apps/web/src/v3/components/overlays/SectorsOverlay.tsx`](../apps/web/src/v3/components/overlays/SectorsOverlay.tsx) — `@turf/turf`'s `sector()` builds wedge polygons; three layers (`fill` 0.18 opacity, dashed `line`, `symbol` labels). Idempotent ensure() pattern matches `TopographyOverlay`; visibility-only on toggle so reflows are cheap.

**Wiring.** [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx) re-enables the Sectors row, bumps the Zones placeholder badge to v3.3. [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) version 2→3 (clears stale `zones` carry-over only — preserves user's sectors choice). [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) hosts an internal `DiagnoseOverlays` component so `useMemo(computeSolarSectors(centroid), [centroid])` can cache the wedges. [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) adds a sectors row to the active-overlays legend. [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) badge counts topography + sectors (zones still excluded as a v3.3 placeholder).

**Mock data.** [`v3/types.ts`](../apps/web/src/v3/types.ts) gains `ProjectLocation.boundary?: GeoJSON.Polygon`; [`mockProject.ts`](../apps/web/src/v3/data/mockProject.ts) carries a hand-drawn ~128 ha rectangle around `[-78.20, 44.50]` so DiagnoseMap can `fitBounds` and pass the bounds-derived centroid to overlay children. Real cadastral geometry lands later.

**Dependency.** Added `suncalc` (~5 KB MIT, no network) + `@types/suncalc`. Chose it over NREL SPA / Open-Meteo to keep solar geometry deterministic and offline.

### Verification

- `apps/web` `tsc --noEmit` ✓ (clean, 0 bytes).
- `apps/web` vitest: **14/14** (8 new in `lib/sectors/__tests__/solar.test.ts`, 6 in `V3LifecycleSidebar.test.tsx` updated for the `topography+sectors=true` mock and `/2/` badge assertion).
- `vite build` ✓ (~2m13s, 493 PWA precache entries).
- Preview eval at `/v3/project/mtc/diagnose`: popover label reads "Solar arcs (winter · summer · equinox)", Zones placeholder shows `v3.3`, footer reads "Topography & Sectors live · Zones in v3.3", `sectorChecked=true` after toggle, canvas mounted. **Visual screenshot of wedge geometry on the map was not captured — preview_screenshot timed out twice.** Functional verification only.

### Deferred

- **Visual screenshot confirmation** of the wedge fan over the MTC parcel — the preview screenshot tool was unresponsive during this session. Code paths verified through tests + DOM eval.
- **Southern hemisphere sweep direction.** `solar.ts` carries a TODO; northern-only is fine for MTC and any prospective Canada/Northeast US parcels.
- **Wind / fire / view / noise wedges.** The `SectorKind` discriminator and `SiteSectors` shape already accommodate them; the popover row is currently solar-only.
- **Polar-region guard.** Wedges are filtered when suncalc returns invalid Dates, but no UX message yet.
- **Real cadastral boundary.** MTC carries a hand-drawn rectangle in `mockProject.ts`; v3.2's outstanding work includes a real parcel fetch.

### Recommended next session

- **Zones overlay (v3.3).** Use-frequency rings 0–5 anchored on the homestead centroid, wired to the same `matrixTogglesStore.zones` flag. Once it lands, the sidebar badge and popover footer copy ("Zones in v3.3") need updating in lockstep.
- Or — **wind-prevailing wedge.** Extend `lib/sectors/` with an Open-Meteo / ERA5 wind-rose pull, persist to `SiteSectors.wedges` alongside the solar arcs, surface in the same overlay.
