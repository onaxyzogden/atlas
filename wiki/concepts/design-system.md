# Atlas Design System

## Summary
The OGDEN Atlas design system is defined in `design-system/ogden-atlas/MASTER.md`. It uses an organic, biophilic aesthetic rooted in earth tones — designed for land stewardship rather than generic SaaS.

## Tokens
The full token system lives in `apps/web/src/styles/tokens.css`. Palette families:
- **Earth** (warm browns): `--color-earth-50` → `--color-earth-900`
- **Sage** (organic greens): `--color-sage-50` → `--color-sage-900`
- **Water** (slate blues): `--color-water-50` → `--color-water-900`
- **Sand** (warm neutrals): `--color-sand-50` → `--color-sand-200`
- **Semantic:** `--color-bg`, `--color-surface`, `--color-text`, `--color-border`, etc.
- **Status:** success/warning/error/info in 50/100/500/600/700 shades
- **Confidence:** `--color-confidence-high` (#2d7a4f), `--color-confidence-medium` (#8a6d1e), `--color-confidence-low` (#9b3a2a)
- **Panel/sidebar:** `--color-header-bg`, `--color-sidebar-bg`, `--color-sidebar-active` (#c4a265), etc.
- **Dashboard group identity (7 tokens):** `--color-group-livestock` (#c4a265), `--color-group-forestry` (#8a9a74), `--color-group-hydrology` (#7a8a9a), `--color-group-finance` (#7a9a8a), `--color-group-compliance` (#8a8a6a), `--color-group-reporting` (#15803D), `--color-group-general` (#9a7a8a)

## Typography
- **Headings / Display:** Fira Code (monospace) — `--font-display: 'Fira Code', monospace`
- **Body:** Fira Sans — `--font-sans: 'Fira Sans', system-ui, sans-serif`
- **Serif alias:** `--font-serif: 'Fira Code', monospace` (referenced in components; same as display)
- **Mono:** `--font-mono: 'JetBrains Mono', ui-monospace, monospace`
- Google Fonts import in `tokens.css` line 6 loads Fira Code (400–700) + Fira Sans (300–700)

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

## Known Gaps (active, as of 2026-04-12)
- ~500 hardcoded hex color instances across ~97 CSS module files — tokens exist but components don't use them. Audit complete; tokenization work deferred.
- ~64 font fallback violations: `HydrologyRightPanel.module.css`, `ProjectTabBar.module.css`, `Modal.module.css`, `StewardshipDashboard.tsx` use Lora/Georgia/DM Mono fallbacks referencing undefined `--font-serif` variable. `--font-serif` is now defined (2026-04-12) so `var(--font-serif, 'Lora'...)` chains will resolve correctly, but the Lora fallback string should still be cleaned up.
- Terrain DEM tiles: `TerrainControls.tsx` and `HydrologyPanel.tsx` still use `mapbox://mapbox.mapbox-terrain-*` protocol URLs — separate migration task.
