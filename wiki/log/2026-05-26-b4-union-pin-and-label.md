# 2026-05-26 — B4 follow-up: click-to-pin tooltip + union-area centroid label

**Branch.** `feat/atlas-permaculture`. Closes two still-deferred
bullets on the
[2026-05-25 ADR](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md):
"Click-to-pin variant" and "Union-area as map label" (the label
was originally carried forward from the
[2026-05-24 ADR](../decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md)).
Full design context in
[2026-05-26 ADR](../decisions/2026-05-26-atlas-b4-union-tooltip-pin-and-label.md).

**What changed.**

- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  four changes —
  - **Label FC accumulator.** Alongside the existing
    `hostCanopyUnions` push, a parallel `hostCanopyUnionLabels`
    Feature array accumulates one point feature per host union,
    anchored via `turf.pointOnFeature` (guaranteed-inside for
    concave / `MultiPolygon` shapes — `turf.centroid` can fall
    outside the geometry and float the label in empty space).
    Each feature carries `{ kind: 'host-canopy-union-label',
    hostId, unionAreaLabel }` where `unionAreaLabel` is the
    pre-formatted `` `${Math.round(union.unionAreaM2)} m²` ``
    string — same rounding as the tooltip + the
    [SilvopastureIntegrationCard](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx),
    so all three surfaces print the same number for the same
    host. Exposed from the layer-data `useMemo` as
    `hostCanopyUnionLabelFC`; dep array unchanged in shape.
  - **New source + symbol layer.** `guild-host-canopy-union-label`
    source feeds a `type: 'symbol'` layer at `minzoom: 17` with
    `text-field: ['get', 'unionAreaLabel']`, `text-size: 11`,
    `text-anchor: 'center'`, `text-allow-overlap: false`. Paint
    mirrors the existing main label layer: `#f2ede3` text,
    `rgba(31, 29, 26, 0.85)` halo at width 1.2. The label layer
    is inserted *between* `guild-host-canopy-union-line` and
    `guild-member-canopy-fill` so member disks paint on top of
    the label — the m² number is per-host context, not
    per-member identity.
  - **`pinnedUnion` state + click + ESC.** A second `useState`
    next to the existing `hoveredUnion` (same `{ point, props,
    hostId }` shape, mirrored from the hover pattern). The
    existing hover `useEffect` is extended: `onMove` short-circuits
    when `pinnedUnion` is non-null (no jitter under cursor motion);
    a new `onClick` handler on the same union-fill layer reads the
    topmost feature's `hostId` and toggles — same id unpins,
    different id replaces (single-pin model); a `document
    keydown` listener clears the pin on `Escape`. All registrations
    cleaned up on unmount. Union-fill is **not** in
    `SELECTABLE_LAYERS`, so the click-to-pin does not also trigger
    selection clearing — no coordination needed.
  - **Portal render.** `pinnedUnion ?? hoveredUnion` selects which
    state drives the tooltip (pin precedence); `pinned={!!pinnedUnion}`
    is forwarded so the tooltip can render its sticky-state
    accent.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  optional `pinned?: boolean` prop added to the interface and
  forwarded as `data-pinned="true"` on the root element only when
  true. Layout, edge-clamp, and `pointer-events: none` rules
  unchanged.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  one selector added — `.tooltip[data-pinned='true']` swaps the
  border-color to brand-gold `#c4a265` (same hue as the
  saved-overlap accent). The unpinned hover surface is visually
  unchanged from the 2026-05-25 ship.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  1 new render test using `rerender` to verify `pinned={true}`
  sets `data-pinned="true"` on the root, and `pinned={false}` (or
  unset) omits the attribute entirely. Existing 3 tests untouched.
- [wiki/decisions/2026-05-26-atlas-b4-union-tooltip-pin-and-label.md](../decisions/2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md):
  "Click-to-pin variant" and "Union-area as map label" still-deferred
  bullets flipped to closed and linked to the 2026-05-26 ADR (both
  in Consequences and Out-of-scope).

**Why local state, not `PlanSelectionStore`.** The host-canopy-union
surface has no cross-component readers — the hover tooltip already
lives as local `useState`. Extending `PlanSelectionKind` (currently
14 kinds, none for the read-only union surface) for one transient
pin-state would be premature abstraction. A second `pinnedUnion`
`useState` mirrors the existing `hoveredUnion` pattern and keeps
the lifecycle local: click → pin → click-same-union-or-ESC →
unpin. Future hover-style or pin-style surfaces on other map
layers should follow the same pattern (local state + portal into
canvas container + `data-*` attribute for state styling) rather
than reusing `InlineFeaturePopover` (click-driven, form-only) or
extending the selection store for transient read-only state.

**Why `turf.pointOnFeature`, not `turf.centroid`.** For concave or
`MultiPolygon` host unions, `turf.centroid` can return a point
outside the geometry — the label would float in empty space.
`turf.pointOnFeature` is guaranteed-inside (returns a representative
point on the surface for any geometry). The `@turf/turf`
namespace is already imported at the top of `PlanDataLayers.tsx`;
no new dependency.

**Why pre-formatted `unionAreaLabel` at the push site.** Keeps the
symbol layer's `text-field` expression trivial (`['get',
'unionAreaLabel']`) and ensures the label, the tooltip, and
`SilvopastureIntegrationCard` all share a single
`Math.round(x) + ' m²'` formatter — no MapLibre `number-format`
expression needed and no chance of rounding drift between
surfaces.

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 67/67 green (4 tooltip render
  tests incl. new pinned-state coverage + 63 agroforestry suite
  unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

**Out of scope.** Touch tap-to-pin (desktop hover/click only
today); label clustering when hosts crowd at low zoom (MapLibre's
`text-allow-overlap: false` silently drops collisions today);
label-visibility toggle in a layers panel; pinned-tooltip drag to
reposition; multi-pin (single-pin model only); saved-overlap or
host-name label variants; all other 2026-05-25 and 2026-05-24
deferrals remain deferred.
