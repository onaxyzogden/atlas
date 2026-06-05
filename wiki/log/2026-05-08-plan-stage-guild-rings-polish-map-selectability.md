# 2026-05-08 — Plan-stage guild rings polish + map selectability


### Brief
Two-part Plan-stage guild work: (1) consult NotebookLM SAAS Design
Scholar on the GuildRingsCanvas aesthetic and ship a tier-2 visual
upgrade; (2) make placed guild centroids click-to-select and
drag-to-move on the Plan map, mirroring how sectors already work.

### Completed

**Visual upgrade — `GuildRingsCanvas.tsx`** (~280 LOC rewrite)
- Translucent ring bands (`stroke-width 32`, depth-cued opacity per
  ring index) replace dartboard dashed strokes.
- Curved bezier leader lines + leaf-glyph members rotated radially.
- Anchor disc gains SVG `feGaussianBlur` glow, radial gradient, and a
  Lucide `Trees` icon centred.
- Function-tag chips become uppercase tracked typography on rounded
  rects; empty-ring "+" affordances at 6 o'clock.
- CSS keyframe shimmer on the active ring; hover affordances via
  inline `<style>`.
- Scholar consultation cached in `.scholar-rings-prompt.txt` /
  `.scholar-rings-response.json` (gitignored scratch).

**Selectability + drag — `PlanDataLayers.tsx` + new `planSelectionStore.ts`**
- New ephemeral `usePlanSelectionStore` (mirror of
  `observeSelectionStore`, scoped to PLAN, single-select, kind = `'guild'`).
- Point-layer paint expressions become `case` expressions when a guild
  is selected: `circle-stroke-color` → `#ffd166`, `circle-stroke-width`
  → 3, `circle-radius` → 9.
- New layer-scoped `mousedown` handler on `plan-data-point` calls
  `setSelected({kind:'guild', id})`, disables `dragPan`, then tracks
  `mousemove` to recompute `centroidUv` from current map bounds and
  call `updateGuild`. `mouseup` re-enables `dragPan`.
- Background `click` handler clears selection when no guild is hit.

### Bug fixes

- **Race against `style.load`** in PlanDataLayers — initial mount saw
  `layers.length === 0` and bailed via early-return; by the time the
  `style.load` listener attached, the event had already fired, leaving
  the map permanently without `plan-data-*` sources/layers. Replaced
  the early-return with `map.isStyleLoaded()` and added `'load'` plus
  one-shot `'idle'` fallbacks. Layers now mount reliably on first paint.
- Added defensive `if (!map.getLayer(layerId)) return;` in the
  background-click handler so it no longer throws
  `"layer 'plan-data-point' does not exist"` when called pre-mount.

### Verification

- `cd apps/web && tsc --noEmit` → clean (exit 0, 0 bytes output).
- Plan stage `/v3/project/mtc/plan`: 5 plan-data layers
  (`poly-fill`, `poly-line`, `line`, `point`, `label`) auto-mount
  via the live map instance pulled from PlanDataLayers' `memoizedProps.map`.
- Synthetic pointer/mouse drag on the canvas: guild moves
  `(-78.196, 44.501) → (-78.192, 44.502)` over an 80×40 px drag;
  selection store reads `{ kind:'guild', id:'gld-1778277527272-r6hfw0' }`
  immediately on mousedown and persists after release.
- Background click on empty canvas area clears selection
  (`selectedAfterBgClick: null`).
- Paint inspection confirms `circle-stroke-color` becomes the
  case-expression with the correct id when selected; reverts to literal
  `'#1f1d1a'` when cleared.
- Screenshot confirms guild dot relocated up-and-right with golden ring
  visible.

### Deferred
- Other unstaged edits (ActChecklistAside, V3LifecycleSidebar,
  BuiltEnvironmentPanel, observe-port.css, new `apps/web/src/v3/act/ops/`
  + `observe/modules/built-environment/` directories) are from sibling
  sessions, not committed in this session.
- Edit-in-place species swap on a guild member (still remove + re-add).
- Guild reordering (angles still derived from `members[]` order).

### Commit

(see git log for hash) on `feat/atlas-permaculture`.

### Recommended next session

- Wire keyboard `Esc` to clear plan selection.
- Add a small "selected guild" inspector chip (name, member count,
  open module) anchored near the highlighted point — mirrors what
  Observe does for selected annotations.
- Same as previous: fix `/plan` route crash
  (`PlanChecklistAside.tsx:148` missing `livestock` module guidance).
