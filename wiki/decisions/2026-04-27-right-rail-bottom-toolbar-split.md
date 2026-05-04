# Right rail = read-out · Bottom toolbar = action

**Date:** 2026-04-27
**Status:** Adopted
**Scope:** `apps/web` — map view chrome

## Context

Before this session, the map view's right rail (`DesignToolsPanel`) mixed
**information read-outs** (placed-zone lists, structure inventories, off-grid
score, demand/solar/water summaries) with **tool actions** (Draw Zone,
click-to-place templates, Path Type Picker). The bottom-center
`DomainFloatingToolbar` only carried a partial set of tools, and the rail kept
its own internal `activeTab` state that drifted from the left sidebar's
`activeDashboardSection`. Users hit the same control surface in two places
with two different behaviours.

The Dashboard sidebar and Map sidebar also diverged on which items appeared
under each phase/domain — driven by per-item `mapOnly` / `dashboardOnly` flags
in `taxonomy.ts` and one item (Biomass) that was dashboard-only despite
mapping cleanly to a map readout.

## Decision

Adopt one rule across the map view chrome:

- **Right rail = read-out only.** Lists, scores, and inventories. No "Draw"
  or "Place" buttons. Selecting an item may highlight it, but creation /
  placement leaves the rail.
- **Bottom toolbar = all action tools, scoped to the selected domain.**
  Driven from `getDomainContext(activeDashboardSection).domain`. Buttons fire
  custom maplibre events (`ogden:zones:start-draw`,
  `ogden:structures:open-picker`, `ogden:crops:open-picker`,
  `ogden:paths:open-picker`) which the matching panel listens for and handles.
- **Single source of truth for domain selection.** Both surfaces read
  `useUIStore.activeDashboardSection`. `DesignToolsPanel`'s internal
  `activeTab` is removed.
- **Sidebar parity.** Where an item maps cleanly to both surfaces, drop the
  `mapOnly` / `dashboardOnly` flag. Biomass becomes a dual-surface item:
  its dashboard component is reused as the right-rail panel via the
  `map-rail-dashboard` wrapper (same pattern Forest Hub / Carbon already use).

## Implementation notes

- `apps/web/src/features/navigation/taxonomy.ts` — Biomass NavItem gains
  `panel: 'biomass'` and `mapSubItem: 'biomass'`; `dashboardOnly` removed.
- `apps/web/src/components/IconSidebar.tsx` — `'biomass'` added to
  `SidebarView` and `SubItemId` unions.
- `apps/web/src/components/ui/RailPanelShell.tsx` — `VIEW_LABELS.biomass`
  added (required by `Record<Exclude<SidebarView, null>, string>`).
- `apps/web/src/features/dashboard/DashboardRouter.tsx` and
  `apps/web/src/features/map/MapView.tsx` — both lazy-import
  `BiomassDashboard` so map rail and dashboard render the same component.
- `apps/web/src/features/dashboard/pages/EnergyDashboard.tsx` — embeds
  `OffGridReadiness` → `EnergyDemandRollup` → `SolarPlacement` →
  `WaterSystemPlanning`, with `<div id="water-systems">` anchor.
- `apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx` —
  `WaterSystemsCrossLink` button switches `activeDashboardSection` to
  `'energy-offgrid'` and `scrollIntoView('#water-systems')`. Avoids component
  duplication.
- `apps/web/src/components/panels/DesignToolsPanel.tsx` — drives off
  `activeDashboardSection`; placement controls removed.
- `apps/web/src/features/access/AccessPanel.tsx` — Path Type Picker modal
  added (was previously a missing modal in the noisy/quiet path flow).
- `apps/web/src/features/map/DomainFloatingToolbar.tsx` — extended per-domain
  tool sets to cover zones, structures, crops, paths.

## Verification

- Browser smoke test (preview server, `351 House` project):
  - Dashboard view: Biomass renders 104 t/ha, 31,382 t site total,
    191 tCO2e/ha carbon, +19% YoY.
  - Map view: selecting Biomass in the rail loads the same component via
    `map-rail-dashboard`; numbers match.
  - All four design domains: every action button lives in the bottom toolbar
    (`_toolbar_*` ancestor), zero matches in the rail.
- `tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=8192`) — Biomass
  cross-stack wiring passes; previously-flagged
  `QuietCirculationRouteCard.tsx` (lines 128–132) and
  `ProgramCoverageCard.tsx:125` errors no longer present in current source.

## Consequences

- Users always know what each surface is for. Rail = "what's there."
  Toolbar = "what can I do here."
- `DesignToolsPanel` shrinks to a pure switch over `activeDashboardSection`.
- New domains follow the rule by default: add to taxonomy + render the
  read-out component in the rail; add the tools to `DomainFloatingToolbar`.
