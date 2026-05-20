# 2026-05-25 — B4 follow-up: per-host union hover tooltip

**Branch.** `feat/atlas-permaculture`. Closes the "Per-host hover
tooltip / popover" still-deferred bullet on the
[2026-05-24 ADR](../decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md).
Full design context in
[2026-05-25 ADR](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md).

**What changed.**

- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  (NEW): small presentational component. Six props: `point: { x,
  y }`, `hostName`, `unionAreaM2`, `rawSumM2`, `guildCount`,
  `memberCount`. Renders the host name, "N guilds · M
  canopy-bearing members" subtitle, and a 3-row grid of m² values
  (union footprint, raw π·r² sum, saved overlap). Numbers via
  `Math.round(x) + ' m²'` to match
  [SilvopastureIntegrationCard.tsx:110–116](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
  verbatim. Edge-clamp: when the cursor + estimated size would
  overflow the viewport, the anchor flips to left-of / above-cursor
  (`data-anchor-x` / `data-anchor-y` exposed for tests). `position:
  absolute` + `pointer-events: none` so the tooltip never steals
  the underlying layer's mouseleave event.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  (NEW): dark-glass palette mirroring
  [InlineFeaturePopover.module.css](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css)
  (`rgba(31, 29, 26, 0.96)` bg, `#f2ede3` text, `border-radius:
  8px`, `backdrop-filter: blur(8px)`); `font-variant-numeric:
  tabular-nums` on the values grid so the three m² rows align;
  brand-gold `#c4a265` accent on the saved-overlap label/value.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  three changes —
  - **Feature properties**: the union FC push site extended
    additively. Previously `{ kind, hostId, unionAreaM2 }`; now also
    carries `hostName` (from `host.name`), `rawSumM2` (from the
    `hostCanopyUnion` return), `guildCount` (`hostGuilds.length`),
    and `memberCount` (count of members whose
    `findSpecies(speciesId)?.canopySpreadM` is a positive finite
    number — same gate `hostCanopyUnion` uses to decide whether to
    push a `turf.circle`, so the tooltip's count equals the number
    of circles folded into the union).
  - **`useState` hook** at the top of the component:
    `hoveredUnion: { point: { x, y }; props: Omit<...,'point'> } |
    null`.
  - **New `useEffect` block** registering `mousemove` + `mouseleave`
    on `'guild-host-canopy-union-fill'`. Mirrors the existing
    guild-member-point handler block (`map.on / map.off` with
    cleanup in the return). On `mousemove`: reads the topmost
    feature's properties + `e.point`, sets state. On `mouseleave`:
    clears. No `setCursorIntent('move')` — the union is read-only.
  - **Portal render**: `return null` replaced with
    `hoveredUnion && createPortal(<HostCanopyUnionTooltip ... />,
    map.getCanvasContainer())`. Portalling into the canvas
    container means the tooltip's `position: absolute` resolves
    against the same pixel space MapLibre's `e.point` reports —
    no coordinate conversion.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  (NEW): 3 render tests in `happy-dom` —
  (a) all six fields render with `Math.round` rounding (host name,
  pluralised counts, three m² values incl. computed saved-overlap),
  (b) zero-overlap edge case (`rawSumM2 === unionAreaM2`) renders
  `0 m²` for saved overlap, not negative,
  (c) right-edge cursor (`x = 1020` in default 1024-wide
  happy-dom) flips `data-anchor-x` from `right` → `left`.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md](../decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md):
  "Per-host hover tooltip / popover" still-deferred bullet flipped
  to closed and linked to the 2026-05-25 ADR (both in Consequences
  and Out-of-scope).

**Why a new component, not InlineFeaturePopover.** The 2026-05-23
popover is **click-driven** (mousedown via
`useInlineFormStore.openForm`) and **docked** at the bottom-right of
the map. Hover-to-show would fight both of those design choices —
the steward needs to scan multiple hosts quickly without
pin-and-dismiss friction. A small dedicated component that mirrors
the same dark-glass palette keeps the visual family without forcing
the wrong interaction model.

**Why portal into the canvas container.** `PlanDataLayers` was
previously `return null` — a pure side-effect component. To render
the tooltip without restructuring the parent layouts that mount it
(`PlanLayout`, `ActLayout`, `ObserveLayout`, `VisionLayoutCanvas`),
the component now portals the tooltip into
`map.getCanvasContainer()`. The container is already relatively
positioned by MapLibre, so the tooltip's `position: absolute`
resolves against the same pixel space the cursor coords live in
(`e.point.x`, `e.point.y`). No coordinate conversion, no layout
edits.

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 66/66 green (3 new tooltip render
  tests + 63 agroforestry suite unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

**Out of scope.** Click-to-pin variant; touch tap-to-show; tooltip
i18n; per-layer tinted accent stripe (the union is a per-host
aggregate, layer-tinting would reintroduce the misleading-hue
concern 2026-05-24 called out for the halo itself); animated fade
in/out; multi-feature fan-out on overlapping hosts (today the
tooltip shows the topmost union only via `e.features?.[0]`); all
other 2026-05-24-still-deferred follow-ups (toggle UI, union-area
as map label, light/dark theming, ring-radius ground-truthing,
snap-to-other-member, multi-select drag, z-order between members
and other Plan kinds, member-catalog edit via popover).
