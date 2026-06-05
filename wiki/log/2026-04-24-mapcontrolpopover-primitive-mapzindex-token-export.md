# 2026-04-24 — MapControlPopover primitive + mapZIndex token export


Landed the two §5-deferred refactors from the IA & Panel Conventions spec
(`design-system/ogden-atlas/ia-and-panel-conventions.md`). Pure refactor — no
visual change. Mandate: retire inline chrome/zIndex literals in `features/map/**`
so future map surfaces are typed and centralized.

### Deliverables

- **`apps/web/src/components/ui/MapControlPopover.tsx`** (new) — thin
  chrome-only wrapper. Two variants: `panel` (rgba(125,97,64,0.4) border, radius
  10, padding 12/6px collapsed) and `dropdown` (rgba(196,180,154,0.25) border,
  radius 8, padding 10). No built-in header or position — callers own both and
  spread via the `style` prop (default ⊕ caller → caller wins).
- **`apps/web/src/lib/tokens.ts`** — added `mapZIndex` const (10 keys:
  `spine 2 / baseOverlay 3 / splitPane 3 / dropdown 4 / panel 5 / tooltip 6 /
  loadingChip 9 / toolbar 10 / mobileBar 40 / top 50`) below the existing global
  `zIndex` export.
- **`apps/web/src/styles/tokens.css`** — `--z-map-*` CSS mirror of the TS
  export. Two entries (`baseOverlay`, `loadingChip`) added after Phase 4 grep
  surfaced inline literals not in the original plan inventory (`cesiumOverlay`
  z:3 in `MapView.module.css`, `MapLoadingIndicator.module.css` chip z:9).
- **Consumer migrations** — 5 files now use `<MapControlPopover>`:
  `GaezOverlay.tsx`, `SoilOverlay.tsx`, `TerrainControls.tsx`,
  `HistoricalImageryControl.tsx`, `OsmVectorOverlay.tsx`. `TerrainControls` was
  borderless pre-refactor; preserved via `border: 'none'` style override (flagged
  in ADR as a de facto inconsistency to revisit).
- **zIndex literal sweep** — 13 inline sites swapped to tokens across
  `LeftToolSpine`, `MeasureTools`, `CrossSectionTool`, `MapView.tsx ×2`,
  `SplitScreenCompare ×2`, `GaezOverlay` (tooltip), `SoilOverlay` (tooltip) on
  the TSX side; `MapView.module.css ×4`, `DomainFloatingToolbar.module.css`,
  `MapLoadingIndicator.module.css` on the CSS side.
- **Doc updates** — `ia-and-panel-conventions.md` §2 matrix row + §4 callout +
  §5 deferred items flipped to "Landed 2026-04-24" with file refs.

### Verification

- Grep gate: `zIndex:\s*[1-9]` in `features/map/**/*.tsx` → 0 hits;
  `z-index:\s*[1-9]` in `features/map/**/*.module.css` → 0 hits.
- Vite HMR: all 5 consumers reload without errors after migration.
- Preview: map controls unchanged (chrome pixel-identical; `TerrainControls`
  deliberately still borderless).
- `tsc --noEmit`: clean (Phase 1, 2, 3 passes — Phase 4 pass pending).

### ADR

[2026-04-24 — MapControlPopover primitive + mapZIndex token export](decisions/2026-04-24-map-control-popover-and-mapzindex.md)
