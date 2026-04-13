# Atlas Design System

## Summary
The OGDEN Atlas design system is defined in `design-system/ogden-atlas/MASTER.md`. It uses an organic, biophilic aesthetic rooted in earth tones — designed for land stewardship rather than generic SaaS.

## Token Sources

### CSS Custom Properties
The full CSS token system lives in two files:
- **`apps/web/src/styles/tokens.css`** — all custom property definitions (palettes, zones, structures, paths, status, map, RGB channels)
- **`apps/web/src/styles/dark-mode.css`** — dark mode overrides

### TypeScript Token Bridge
**`apps/web/src/lib/tokens.ts`** is the authoritative source for all JS-context colors (MapLibre GL paint properties, Zustand stores, export components, chart libraries). It re-exports the same values as `tokens.css` in TypeScript `as const` objects with 20+ namespaces.

### Naming Conventions

**CSS:** `--color-{palette}-{shade}`, `--color-zone-{category}`, `--color-group-{domain}`, `--color-status-{level}`, `--color-map-{element}`

**TypeScript:** `earth[500]`, `zone.habitation`, `group.livestock`, `status.good`, `chart.accent`

## Token Families
Palette families defined in `tokens.css`:
- **Earth** (warm browns): `--color-earth-50` → `--color-earth-900`
- **Sage** (organic greens): `--color-sage-50` → `--color-sage-900`
- **Water** (slate blues): `--color-water-50` → `--color-water-900`
- **Sand** (warm neutrals): `--color-sand-50` → `--color-sand-200`
- **Semantic:** `--color-bg`, `--color-surface`, `--color-text`, `--color-border`, etc.
- **Status:** success/warning/error/info in 50/100/500/600/700 shades
- **Confidence:** `--color-confidence-high` (#2d7a4f), `--color-confidence-medium` (#8a6d1e), `--color-confidence-low` (#9b3a2a)
- **Panel/sidebar:** `--color-header-bg`, `--color-sidebar-bg`, `--color-sidebar-active` (#c4a265), etc.
- **Zone categories:** `--color-zone-habitation`, `--color-zone-pasture`, `--color-zone-forest`, etc. (13 zone types)
- **Structures:** `--color-structure-barn`, `--color-structure-greenhouse`, etc. (20 structure types)
- **Paths:** `--color-path-road`, `--color-path-trail`, etc. (11 path types)
- **Map elements:** `--color-map-boundary`, `--color-map-contour`, `--color-map-water`, etc.
- **Chart:** `--color-chart-accent` and series colors for data visualization
- **Dashboard group identity (7 tokens):** `--color-group-livestock` (#c4a265), `--color-group-forestry` (#8a9a74), `--color-group-hydrology` (#7a8a9a), `--color-group-finance` (#7a9a8a), `--color-group-compliance` (#8a8a6a), `--color-group-reporting` (#15803D), `--color-group-general` (#9a7a8a)

## Typography
- **Headings / Display:** Fira Code (monospace) — `--font-display: 'Fira Code', monospace`
- **Body:** Fira Sans — `--font-sans: 'Fira Sans', system-ui, sans-serif`
- **Serif alias:** `--font-serif: 'Fira Code', monospace` (referenced in components; same as display)
- **Mono:** `--font-mono: 'JetBrains Mono', ui-monospace, monospace`
- Google Fonts import in `tokens.css` line 6 loads Fira Code (400–700) + Fira Sans (300–700)

## Z-Index Scale
The z-index token system provides a global stacking order defined in `tokens.css` and bridged to TypeScript:

| Token | CSS Custom Property | Value |
|---|---|---|
| base | `--z-base` | 0 |
| dropdown | `--z-dropdown` | 100 |
| sticky | `--z-sticky` | 200 |
| overlay | `--z-overlay` | 300 |
| modal | `--z-modal` | 400 |
| toast | `--z-toast` | 500 |
| tooltip | `--z-tooltip` | 600 |
| max | `--z-max` | 999 |

**TypeScript bridge:** `zIndex.base` through `zIndex.max` in `apps/web/src/lib/tokens.ts`.

**Map-internal z-index values** (1-50 range in `MapView.module.css` and map components) are isolated by their own stacking context and do not participate in the global scale. These are intentionally hardcoded.

## Spacing
xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)

## Component Specs
Buttons, Cards, Inputs, Modals, Accordions, Tabs, Tooltips — all defined in MASTER.md with sizes, states, and anti-patterns.

## Where It's Used
- Frontend CSS (`apps/web/src/styles/`) — partially integrated
- PDF export templates (`apps/api/src/services/pdf/templates/baseLayout.ts`) — fully integrated
- Existing export modals (InvestorSummaryExport, ProjectSummaryExport) — use inline brown theme instead (legacy)

## Constraints
- Never use blue as a primary action color
- Never use rounded corners > 6px
- Score gauges always use the `scoreColor()` gradient: green (75+), gold (50-74), orange (25-49), red (<25)
- PDF templates must load Fira Code + Fira Sans from Google Fonts (Puppeteer has network access)

## Known Gaps (active, as of 2026-04-13, post z-index standardization)
- **Hardcoded hex: 85% eliminated (2026-04-13).** Reduced from ~1,340 to ~205 actionable instances across the codebase. Remaining instances are in third-party integrations, SVG literals, and edge cases requiring manual review.
- **Deferred:** Dark mode CSS deduplication (some overrides may be redundant after token expansion). Tailwind gray tokenization.
- ~64 font fallback violations: `HydrologyRightPanel.module.css`, `ProjectTabBar.module.css`, `Modal.module.css`, `StewardshipDashboard.tsx` use Lora/Georgia/DM Mono fallbacks referencing undefined `--font-serif` variable. `--font-serif` is now defined (2026-04-12) so `var(--font-serif, 'Lora'...)` chains will resolve correctly, but the Lora fallback string should still be cleaned up.
- Terrain DEM tiles: `TerrainControls.tsx` and `HydrologyPanel.tsx` still use `mapbox://mapbox.mapbox-terrain-*` protocol URLs — separate migration task.
