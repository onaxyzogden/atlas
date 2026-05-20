# 2026-04-28 — v3.4 wind-prevailing sectors overlay


### Context

Following commit `771e31a` (homestead anchor flow-through), the fourth permaculture matrix overlay (prevailing wind) was the natural next step. The `SectorKind` union already included `"wind-prevailing"`; the anchor pipeline already feeds through `getEffectiveAnchor`. Mock-first, Eastern-Ontario climatology.

### Completed

- `lib/sectors/wind.ts` — `computeWindSectors(anchor, opts?)` returning `SiteSectors` with eight 45° compass petals. Petal reach = `maxReachMeters * (frequency / peakFrequency)`; default 600 m. `DEFAULT_FREQUENCIES` are W/NW-dominant Eastern Ontario climatology. 10 vitest cases (N→NW order, kind, bearings ±22.5°, frequencies sum ≈ 1, W dominant, longest = maxReach, custom override, NaN/negative fallback, anchor preserved, sources entry).
- `v3/components/overlays/WindSectorsOverlay.tsx` — mirrors `SectorsOverlay` (idempotent ensure, visibility-only on toggle); `matrix-wind-*` prefix; single rose color `#5b7a8a`; line solid (no dasharray); labels filtered to `frequency ≥ 0.10`.
- `store/matrixTogglesStore.ts` — v4 → v5; added `wind: boolean`; `setAll` covers it; migrate fills `wind: false`.
- `v3/components/MatrixTogglesPopover.tsx` — fourth row "Wind sectors (prevailing rose)".
- `v3/components/V3LifecycleSidebar.tsx` — count includes `Number(s.wind)`; footer caption now `Topography · Sectors · Zones · Wind overlay`.
- `v3/components/__tests__/V3LifecycleSidebar.test.tsx` — mock state extended with `wind: true`; badge assertion bumped to `/4/`.
- `v3/components/DiagnoseMap.tsx` — fourth legend row + `anyOn` includes wind.
- `v3/pages/DiagnosePage.tsx` — `useMemo windRose = computeWindSectors(anchor)`; renders `<WindSectorsOverlay>` after solar `SectorsOverlay`.

### Verified

- `npx vitest run src/lib/anchor src/lib/zones src/lib/sectors src/v3/components` — **46/46 pass** (was 36; +10 wind suite).
- `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` — clean (43.7 s).

### Deferred

- **Preview verification** — synthetic-click regression against the popover means the toggle flip cannot be exercised end-to-end in the preview tool; the seeded-localStorage substitute used for homestead would also work here. Logged as a standing limitation, not a feature blocker.
- **Real climatology fetch** — Open-Meteo / ERA5 wiring; out of scope for v3.4 mock-first.
- **Seasonal rose** — per-month or summer/winter mode; defer until live climatology lands.
- **Boundary-aware petal trimming** — currently petals can extend beyond the parcel; no clipping yet.

### Recommended next session

- **Live wind climatology** — wire Open-Meteo or ERA5 to populate `frequencies` from the anchor's lat/lon; cache server-side; fall back to `DEFAULT_FREQUENCIES` on outage.
- Or — **Boundary-aware overlays** — clip wind petals (and zone rings) at the parcel boundary; warn when homestead is placed outside the polygon.
- Or — **Sector toolbar** — combine the four toggles into a horizontal map-edge toolbar so power users don't need to open the sidebar popover for each flip.
