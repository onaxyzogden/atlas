# 2026-04-24 — MapControlPopover primitive + mapZIndex token export

**Status:** Accepted · **Scope:** Atlas web (`apps/web/src`) · **Supersedes:** inline chrome literals in `features/map/**`

## Context

The IA & Panel Conventions spec ([`design-system/ogden-atlas/ia-and-panel-conventions.md`](../../design-system/ogden-atlas/ia-and-panel-conventions.md), landed 2026-04-24) codified two deferred refactors in §5:

1. **Six map-resident floating controls** (`GaezOverlay`, `SoilOverlay`, `TerrainControls`, `HistoricalImageryControl`, `OsmVectorOverlay`, plus `MeasureTools`' popover) each re-declared the same glass chrome — `var(--color-chrome-bg-translucent)` + `backdrop-filter: blur(8–10px)` + warm-gold border + radius 8–10 + padding 6–12 — as copy-pasted inline style objects. Two chrome variants had already diverged in the wild: a "panel" variant (top-right-anchored, thick border, built-in header row) and a "dropdown" variant (trigger-anchored, thin border, no header). Drift was ongoing.
2. **The map canvas z-index sub-scale** (1–50, isolated by `.mapArea { position: relative }`) lived only as a comment in `MapView.module.css`. 14 TSX sites and 4 CSS-module sites used raw integer literals with no token export, no CSS custom property, and no central definition.

Goal: retire inline chrome/zIndex literals so future map surfaces are typed, grep-able, and centralized — without visual regression.

## Decision

### 1. `MapControlPopover` primitive

`apps/web/src/components/ui/MapControlPopover.tsx` — chrome only, nothing else.

```ts
export type MapControlPopoverVariant = 'panel' | 'dropdown';
export interface MapControlPopoverProps {
  variant?: MapControlPopoverVariant;   // default 'panel'
  collapsed?: boolean;                   // controls padding when variant='panel'
  style?: React.CSSProperties;           // position, zIndex, width overrides
  className?: string;
  role?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}
```

Variant defaults (mergeable — caller's `style` wins via spread order):

|                 | `panel`                            | `dropdown`                           |
|-----------------|------------------------------------|--------------------------------------|
| background      | `var(--color-chrome-bg-translucent)` | same                               |
| backdrop-filter | `blur(10px)`                       | `blur(10px)`                         |
| border          | `1px solid rgba(125, 97, 64, 0.4)` | `1px solid rgba(196, 180, 154, 0.25)`|
| border-radius   | `10px`                             | `8px`                                |
| padding         | `collapsed ? '6px 10px' : 12px`    | `10px`                               |
| pointer-events  | `auto`                             | `auto`                               |

**No built-in header.** The collapse-chevron row varies per consumer (GAEZ says "GAEZ Suitability", Soil says "Soil Properties", Terrain just "Terrain"). Abstracting it would have required 3 props and saved ~4 lines per consumer — not worth the API surface.

**No built-in position / z-index.** Caller passes both via `style`:

```tsx
<MapControlPopover
  variant="panel"
  collapsed={collapsed}
  style={{ position: 'absolute', top: 12, right: 12, zIndex: mapZIndex.panel, minWidth: 220 }}
>
  …caller's own header row…
  {!collapsed && <Body />}
</MapControlPopover>
```

Exported from the UI barrel at `apps/web/src/components/ui/index.ts`.

### 2. `mapZIndex` export + `--z-map-*` mirror

`apps/web/src/lib/tokens.ts`:

```ts
// Map canvas local sub-scale — isolated by `.mapArea { position: relative }`.
// Safe inside .mapArea only; outside, use the global zIndex scale.
export const mapZIndex = {
  spine:       2,   // LeftToolSpine + top-right view-context cluster
  baseOverlay: 3,   // Cesium 3D terrain overlay (shares layer with splitPane)
  splitPane:   3,   // SplitScreenCompare right pane
  dropdown:    4,   // dropdown popovers (Historical, OSM, MeasureTools)
  panel:       5,   // main map control panels + floating cards + inline legends
  tooltip:     6,   // inline hover readout tooltips
  loadingChip: 9,   // MapLoadingIndicator tile-fetch chip
  toolbar:     10,  // DomainFloatingToolbar
  mobileBar:   40,  // mobile bar, loading overlays
  top:         50,  // top-level map controls (CrossSection, top toolbar)
} as const;
```

`apps/web/src/styles/tokens.css` mirrors each key as a `--z-map-*` custom property.

**Why two tokens at value `3` (`baseOverlay` + `splitPane`) instead of one?** They express distinct intent and never coexist on the same surface. Collapsing them into one token would conflate "Cesium is replacing the basemap" with "I'm comparing two styles side-by-side" — a future refactor that changes one should not silently move the other.

## Migration

All five consumers in the IA spec §4 inventory migrated to `<MapControlPopover>`:

| File | Variant | Notes |
|---|---|---|
| `GaezOverlay.tsx` | `panel` | `minWidth: 220`, tooltip at `mapZIndex.tooltip` |
| `SoilOverlay.tsx` | `panel` | `right: 260` offset preserved to sit left of GAEZ |
| `TerrainControls.tsx` | `panel` | **Borderless** — `border: 'none'` override preserves pre-refactor look; see *Known inconsistency* below |
| `HistoricalImageryControl.tsx` | `dropdown` | `padding: 6` override (tighter list rows) |
| `OsmVectorOverlay.tsx` | `dropdown` | Primitive default padding 10 (matches pre-refactor) |

zIndex literal sweep — 13 sites swapped (TSX: `LeftToolSpine`, `MeasureTools`, `CrossSectionTool`, `MapView ×2`, `SplitScreenCompare ×2`, `GaezOverlay` tooltip, `SoilOverlay` tooltip; CSS: `MapView.module.css ×4`, `DomainFloatingToolbar.module.css`, `MapLoadingIndicator.module.css`).

Grep gate (passing):
- `zIndex:\s*[1-9]` in `apps/web/src/features/map/**/*.tsx` → 0 hits
- `z-index:\s*[1-9]` in `apps/web/src/features/map/**/*.module.css` → 0 hits

## Consequences

### Positive
- New map-tethered controls get chrome for free; no more copy-paste of the 6-line panel recipe.
- `mapZIndex.*` references are grep-discoverable; `zIndex: 5` was not.
- Future z-index adjustments (e.g., raising the toolbar above new overlays) are one-line edits in `tokens.ts` + `tokens.css`.
- The `variant` prop forces a naming decision (panel vs dropdown) at the call site — authors now must state intent.

### Negative / tradeoffs
- Two keys at value `3` (`baseOverlay` + `splitPane`) look redundant at a glance. Justified by distinct intent; documented here and inline.
- Primitive does not own position/zIndex. Forgetting to pass `zIndex` still renders (at the stacking-context default), which could mask a layering bug. Mitigated by the grep gate — if a new site writes `zIndex: 5`, review will catch it.

### Known inconsistency — TerrainControls has no border
Pre-refactor, `TerrainControls` used a one-off inline `style` object that omitted the warm-gold border while `GAEZ`/`Soil` had one. The plan required pixel-identical migration, so `TerrainControls` now passes `border: 'none'` to override the primitive's default. **Follow-up:** either harmonize (add the border) or document a legitimate reason for the deviation. Flagged for a future IA spec revision.

## Verification

- `tsc --noEmit` clean after each phase (Windows requires `NODE_OPTIONS=--max-old-space-size=8192`).
- Vite HMR reloaded all 5 consumers without errors after migration.
- Preview: GAEZ / Soil / Terrain / Historical / OSM toggles unchanged; stacking order (panel z=5 below toolbar z=10) preserved.

## References

- IA & Panel Conventions spec: [`design-system/ogden-atlas/ia-and-panel-conventions.md`](../../design-system/ogden-atlas/ia-and-panel-conventions.md) — §4 inventory, §5 (formerly deferred) forward guidance
- UX Scholar audit: [`design-system/ogden-atlas/ui-ux-scholar-audit.md`](../../design-system/ogden-atlas/ui-ux-scholar-audit.md) — §§1 + 3 source of the mandate
- Primitive: [`apps/web/src/components/ui/MapControlPopover.tsx`](../../apps/web/src/components/ui/MapControlPopover.tsx)
- Tokens: [`apps/web/src/lib/tokens.ts`](../../apps/web/src/lib/tokens.ts) (TS), [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css) (CSS mirror)
- Sibling ADR: [`2026-04-23-delayed-tooltip-primitive.md`](2026-04-23-delayed-tooltip-primitive.md) — same extraction pattern, one day earlier
