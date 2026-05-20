# 2026-04-12 — MapTiler Migration Completion + Design Token Fixes + Coverage Verification


**Operator:** Claude Code (Sonnet 4.6)
**Session scope:** Complete MapTiler migration, fix tokens.css critical errors, verify branch coverage

### Changes

**Branch coverage verification:**
- Ran `vitest --coverage` on `computeScores.test.ts` (138 tests written in prior session)
- Result: all 138 pass, branch coverage = **84.61%** — target >80% met
- Remaining uncovered: lines 437, 738–739 (unreachable defensive paths)

**tokens.css — critical font fixes:**
- Line 6: replaced `@import Lora` with Fira Code (400–700) + Fira Sans (300–700)
- `--font-sans`: changed from `'Inter'` to `'Fira Sans'`
- Added `--font-serif: 'Fira Code', monospace` (was referenced in components but never defined)
- Group color tokens: added 7 `--color-group-*` tokens (livestock/forestry/hydrology/finance/compliance/reporting/general) matching values hardcoded in `DashboardSidebar.tsx`

**MapTiler geocoding migration:**
- `apps/web/src/features/map/MapCanvas.tsx` line 559: Mapbox geocoding → MapTiler
- `apps/web/src/features/project/wizard/StepBoundary.tsx` line 88: Mapbox geocoding → MapTiler
- Both use `https://api.maptiler.com/geocoding/${query}.json?key=${mapboxToken}`
- Response parsing unchanged (`features[0].center` — identical structure)
- HMR confirmed clean in browser preview

### Design Audit Findings (no changes — documented only)
- ~500 hardcoded hex instances across ~97 CSS module files
- ~64 font fallback violations (Lora/Georgia/DM Mono in 5 key files)
- Terrain DEM (`mapbox://` protocol) in TerrainControls.tsx + HydrologyPanel.tsx — deferred

### Deferred
- Replace wrong font fallbacks in HydrologyRightPanel.module.css, ProjectTabBar.module.css, Modal.module.css, StewardshipDashboard.tsx
- Terrain DEM migration (TerrainControls.tsx + HydrologyPanel.tsx)
- apps/api server-side MAPBOX_TOKEN in config.ts
