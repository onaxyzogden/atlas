# 2026-04-27 — Right rail / bottom toolbar split + Dashboard ↔ Map domain parity


Split the map-view chrome along a single rule: **right rail = read-out,
bottom toolbar = action**. Three phases landed in this session:

### Done

**Phase 1d — Biomass on both surfaces.** Biomass was dashboard-only despite
being a clean site-readout. Re-wired across the stack so the same
`BiomassDashboard` component renders on the dashboard and inside the map
right rail (via the existing `map-rail-dashboard` wrapper, same pattern as
Forest Hub / Carbon Diagnostic). Files: [`apps/web/src/features/navigation/taxonomy.ts`](apps/web/src/features/navigation/taxonomy.ts) (added `panel: 'biomass'`, `mapSubItem: 'biomass'`, dropped `dashboardOnly`), [`apps/web/src/components/IconSidebar.tsx`](apps/web/src/components/IconSidebar.tsx) (`SidebarView` and `SubItemId` unions), [`apps/web/src/components/ui/RailPanelShell.tsx`](apps/web/src/components/ui/RailPanelShell.tsx) (`VIEW_LABELS.biomass = 'Biomass'` — required by exhaustive `Record<Exclude<SidebarView, null>, string>`), [`apps/web/src/features/dashboard/DashboardRouter.tsx`](apps/web/src/features/dashboard/DashboardRouter.tsx), [`apps/web/src/features/map/MapView.tsx`](apps/web/src/features/map/MapView.tsx), and new [`apps/web/src/features/dashboard/pages/BiomassDashboard.tsx`](apps/web/src/features/dashboard/pages/BiomassDashboard.tsx).

**Phase 2b — Hydrology → Water Systems cross-link.** Avoided component
duplication: added `<div id="water-systems">` anchor in [`EnergyDashboard.tsx`](apps/web/src/features/dashboard/pages/EnergyDashboard.tsx) and a `WaterSystemsCrossLink` button in [`HydrologyDashboard.tsx`](apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx) that flips `activeDashboardSection` to `'energy-offgrid'` and `scrollIntoView` on the anchor.

**Phase 3 — Right rail vs bottom toolbar.** Removed `DesignToolsPanel`'s
internal `activeTab`; it now reads `useUIStore.activeDashboardSection` so the
left sidebar, right rail, and bottom toolbar move together. All "Draw" /
"Place" controls moved to [`DomainFloatingToolbar.tsx`](apps/web/src/features/map/DomainFloatingToolbar.tsx) and emit custom maplibre events (`ogden:zones:start-draw`, `ogden:structures:open-picker`, `ogden:crops:open-picker`, `ogden:paths:open-picker`). Affected panels: [`DesignToolsPanel`](apps/web/src/components/panels/DesignToolsPanel.tsx), [`ZonePanel`](apps/web/src/features/zones/ZonePanel.tsx), [`StructurePanel`](apps/web/src/features/structures/StructurePanel.tsx), [`CropPanel`](apps/web/src/features/crops/CropPanel.tsx), [`AccessPanel`](apps/web/src/features/access/AccessPanel.tsx) (added Path Type Picker modal).

Decision record: [decisions/2026-04-27-right-rail-bottom-toolbar-split.md](decisions/2026-04-27-right-rail-bottom-toolbar-split.md).

### Verification

- Browser smoke test on `351 House` (preview server, port 5200):
  - Dashboard Biomass: Density 104 t/ha · Site Total 31,382 t · Carbon
    Stock 191 tCO2e/ha · YoY +19% · vegetation composition + drivers all
    render with no console errors.
  - Map rail Biomass: same component, same numbers (single source via
    `useSiteData`).
  - All four design domains (zones, structures, access, crops): every action
    button lives only in `_toolbar_*` ancestor, zero matches in the rail.
- `tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=8192`) — Biomass
  cross-stack wiring compiles; previously-flagged
  `QuietCirculationRouteCard.tsx:128-132` and `ProgramCoverageCard.tsx:125`
  errors confirmed absent from current source.

### Deferred

- **Planting Tool render-loop.** Spun off as a separate task chip earlier
  in the session (unrelated to refactor — pre-existing infinite loop in
  `PlantingToolDashboard`).
- **`npm test` / `npm run lint` regression sweep.** Out of session scope
  but should run before merging `feat/shared-scoring`.

### Recommended next session

- **Sweep store API for stable-reference contracts.** For each `getXxx(id)`
  method in the Zustand stores, document whether it returns a stored
  reference or a fresh array. Convert any fresh-array getters to
  subscribe-then-derive at every call-site. Optionally add a one-line
  comment on each store action describing return semantics.
