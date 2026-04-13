# Web App (Frontend)
**Type:** package
**Status:** active
**Path:** `apps/web/`

## Purpose
React SPA for property design, map visualization, dashboard analytics, financial modeling, and export. Local-first architecture with Zustand stores persisted to localStorage.

## Key Structure
```
src/
  components/
    ui/             — 16 reusable components (Button, Card, Modal, etc.)
    IconSidebar.tsx  — Main navigation sidebar
  features/
    dashboard/      — DashboardView, DashboardSidebar, DashboardRouter, 14 dashboard pages
    climate/        — SolarClimateDashboard
    economics/      — EconomicsPanel
    regulatory/     — RegulatoryPanel
    scenarios/      — ScenarioPanel
    financial/      — Financial engine (cost, revenue, cashflow, break-even, mission)
    export/         — InvestorSummaryExport, ProjectSummaryExport, EducationalBookletExport
    fieldwork/      — FieldworkPanel, FieldNoteExport
    map/            — Map view, drawing tools, layer controls
  store/            — 18 Zustand stores
  lib/              — layerFetcher, geoParsers, scoring engine
  pages/            — Top-level route pages
```

## Dashboard Groups (DashboardSidebar)
Group colors are now design tokens (`--color-group-*` in `tokens.css`).

| Group | Token | Items |
|-------|-------|-------|
| Grazing & Livestock | `--color-group-livestock` | Paddock Design, Herd Rotation, Grazing Analysis, Inventory & Health Ledger |
| Forestry | `--color-group-forestry` | Planting Tool, Forest Hub, Carbon Diagnostic, Nursery Ledger |
| Hydrology & Terrain | `--color-group-hydrology` | Cartographic, Hydrology, Ecological, Terrain, Stewardship, Solar & Climate |
| Finance | `--color-group-finance` | Economics, Scenarios, Investor Summary |
| Compliance | `--color-group-compliance` | Regulatory |
| Reporting & Portal | `--color-group-reporting` | Reports & Export, Public Portal, Educational Atlas |
| General | `--color-group-general` | Biomass, Siting Rules, Settings, Archive |

## Zustand Stores (18)
All use `persist` middleware with localStorage. Key stores:
- `projectStore` — project CRUD, active project selection
- `zoneStore` — land zones (13 categories)
- `structureStore` — structures (20 types)
- `livestockStore` — paddocks + livestock species
- `cropStore` — crop areas (10 types)
- `pathStore` — paths/roads (11 types)
- `utilityStore` — utilities (15 types)
- `scenarioStore` — design scenario snapshots (v2, full dollars)
- `financialStore` — region, mission weights, overrides
- `fieldworkStore` — field notes, walk routes, punch lists
- `siteDataStore` — cached layer data
- `commentStore` — design comments

## Map / Geocoding
- Tile renderer: MapLibre GL (open-source)
- Tile provider: **MapTiler** (`VITE_MAPTILER_KEY`) — migrated from Mapbox 2026-04-11/12
- Style URLs: `https://api.maptiler.com/maps/{satellite|topo|streets|hybrid}/style.json?key=...`
- Geocoding: **MapTiler** (`https://api.maptiler.com/geocoding/{query}.json?key=...`) — used in `MapCanvas.tsx` and `StepBoundary.tsx`
- Terrain DEM: still `mapbox://` protocol in `TerrainControls.tsx` + `HydrologyPanel.tsx` — **pending migration**
- Token exported as `mapboxToken` from `maplibre.ts` (name preserved for import compatibility)

## Current State
- Map + drawing tools: **production-ready** (MapTiler tiles + geocoding live)
- Dashboard: 14 pages, mixed live/demo data
- Financial engine: **working** (client-side, ~8 sub-engines)
- Branch coverage (`computeScores.ts`): **84.61%** (138 tests passing, target >80% met 2026-04-12)
- All stores: **localStorage-only** (no backend sync — `serverId` field prepared but unused)
- Auth guard: **commented out** for dev convenience
