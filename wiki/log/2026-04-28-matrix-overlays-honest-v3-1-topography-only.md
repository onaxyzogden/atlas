# 2026-04-28 — Matrix overlays: honest v3.1 (topography only)


### Done

Walked back the mocked Sectors and Zones overlays shipped earlier today. The Permaculture Scholar dialogue is unambiguous that Mollison zones are designer-drawn polygons, not concentric circles, and sector lines need real sun/wind/water data — neither was available, so the v3.1 layer now ships **topography only**, with Sectors and Zones surfaced as visibly disabled v3.2 affordances.

- Deleted `apps/web/src/v3/components/overlays/SectorsOverlay.tsx` and `ZonesOverlay.tsx` (mocked 8-ray sectors and 5-ring zone polygons). [`TopographyOverlay`](../apps/web/src/v3/components/overlays/TopographyOverlay.tsx) — the only data-backed one, fed from MapTiler `CONTOUR_TILES_URL` — stays.
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) now mounts only `TopographyOverlay` inside `DiagnoseMap`.
- [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) legend simplified — only the topography swatch row renders, gated on `topography` alone (no `anyOn` aggregation).
- [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx): Sectors and Zones rows are `<input disabled>` with a "v3.2" badge, `title="Data layer not yet available — v3.2"`, and a `.rowDisabled` style at `opacity: 0.55`. Footer toggle is now a single "Show / Hide topography" link; note copy: "Topography live · Sectors & Zones in v3.2".
- [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) bumped to `version: 2` with a `migrate` that force-clears `sectors` and `zones` to `false` on rehydrate, so any user who toggled them on under v1 doesn't see phantom overlays.
- [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) active-count badge now sums only `topography` — counting visibly disabled rows would lie about active layers.
- [`V3LifecycleSidebar.test.tsx`](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx) mock store flipped (`topography: true, sectors: false, zones: false`) so the badge assertion still resolves to `1`. 6/6 tests pass.

### Verification

- `pnpm vitest run src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` — 6/6 pass.
- `tsc --noEmit` — clean across touched files (DiagnosePage, DiagnoseMap, MatrixTogglesPopover, matrixTogglesStore, V3LifecycleSidebar).
- Preview: `/v3/project/mtc/diagnose` after `localStorage.removeItem('ogden-atlas-matrix-toggles')`. Popover opens, Sectors and Zones rows render disabled with "v3.2" badge and the tooltip. Toggling Topography shows the legend "Topography (contours)" on the map and updates the sidebar badge to "1 active". Sectors / Zones checkboxes refuse user input.

### Deferred

- Discover-stage map dropped from this session — `MOCK_CANDIDATES` has no `lat/lng/coord` field, so a "where is it?" map would have nothing to render. Restore once a parcel `centroid` lands in mock data.
- Real sector data (sun-path service, wind climatology) and designer-drawn zone polygons remain v3.2 work — the disabled-checkbox affordance now signals that honestly to the user.
