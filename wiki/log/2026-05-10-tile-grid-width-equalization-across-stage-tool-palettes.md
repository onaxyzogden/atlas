# 2026-05-10 — Tile-grid width equalization across stage tool palettes


Three small CSS-only commits in one session to fix a recurring
"tiles in the same row aren't equal width" bug in the stage tool
palettes. Root cause was always the same: `grid-template-columns:
repeat(N, 1fr)` resolves each track to `minmax(auto, 1fr)`, and
`auto` honors each column's min-content width — so any column whose
longest unbreakable token (e.g. "household", "Buried utility",
"Septic") exceeds the natural 1fr share expands and the others
shrink to compensate. Fix is the same in every grid:

- `grid-template-columns: repeat(N, minmax(0, 1fr))` on the grid
- `min-width: 0` on the tile (and on the wrapper, where a
  `DelayedTooltip` span sits between the grid and the button)
- `overflow-wrap: anywhere; word-break: break-word;` on the label

Grids touched:

- `apps/web/src/v3/observe/tools/ObserveTools.module.css` —
  `.itemGrid` (3-col), needs the wrapper-level `min-width: 0` because
  the buttons are children of `DelayedTooltip` `<span>`s, not direct
  grid children. Verified live: Human Context, Built Environment,
  Macroclimate all collapse to 50/50/50 px columns. (commit a7e7878)
- `apps/web/src/v3/plan/PlanModuleBar.module.css` — `.tiles`
  (11-col). Verified: 11 × 60 px.
- `apps/web/src/v3/act/ActModuleBar.module.css` — `.tiles` (7-col).
  Verified: 7 × 96 px (Build/Maintain/Livestock/Harvest/Review/
  Network/Schedule).
- `apps/web/src/v3/plan/canvas/DesignElementPalette.module.css` —
  `.tiles` (3-col). Patched in-line; not separately verified
  because the palette wasn't mounted in the preview path used.

Pattern is general enough to be worth repeating: any future tool
palette using `repeat(N, 1fr)` should reach for `minmax(0, 1fr)` +
`min-width: 0` to keep columns truly equal under variable label
length.
