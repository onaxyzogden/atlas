# 2026-05-26 — B4 follow-up: click-to-pin tooltip + union-area centroid label

**Status.** Implemented on `feat/atlas-permaculture`. Closes two
still-deferred bullets from
[2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md):
"Click-to-pin variant" and "Union-area as map label."

## Context

The 2026-05-25 slice
([2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md))
shipped a cursor-following hover tooltip on the per-host
canopy-union halo at `minzoom: 17`. Two of its Out-of-scope bullets
remained:

> Click-to-pin variant of the tooltip (a separate slice if
> stewards report needing to read while panning).

> Rendering `unionAreaM2` as a label on the polygon centroid.
> (carried forward from the 2026-05-24 ADR.)

Both are small isolated slices that touch the same layer family and
share the centroid math, so this slice ships them together rather
than re-touching `PlanDataLayers.tsx` twice.

## Decision

### Local component state for pin, not `PlanSelectionStore`

The host-canopy-union surface has no cross-component readers — the
hover tooltip already lives as local `useState` on
[PlanDataLayers.tsx:259](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx).
Extending `PlanSelectionKind` (currently 14 kinds, none for the
read-only union surface) for one transient pin-state would be
premature abstraction. A second `pinnedUnion` `useState` mirrors
the existing `hoveredUnion` pattern and keeps the lifecycle local
(click → pin → click-same-union-or-ESC → unpin).

### Pin interaction — click toggles, ESC clears, hover gates

`map.on('click', 'guild-host-canopy-union-fill', ...)` reads the
topmost feature's `hostId`. If it matches `pinnedUnion?.hostId`,
unpin; else pin (replacing any prior pin). A `document` `keydown`
listener clears the pin on `Escape`. While `pinnedUnion` is
non-null, the existing `mousemove` handler short-circuits before
writing to `hoveredUnion` — the pin doesn't jitter under cursor
motion. The portal-render block picks `pinnedUnion ?? hoveredUnion`
and forwards `pinned={!!pinnedUnion}` to the tooltip.

Background-click coexistence: the union-fill layer is **not** in
`SELECTABLE_LAYERS`
([PlanDataLayers.tsx:1615–1632](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)),
so a click on the union won't also trigger selection clearing. No
coordination needed.

### Centroid label via `turf.pointOnFeature`, not `turf.centroid`

For concave or `MultiPolygon` host unions, `turf.centroid` can
return a point outside the geometry — the label would float in
empty space. `turf.pointOnFeature` is guaranteed-inside (it returns
a representative point on the surface for any geometry). The
`@turf/turf` namespace is already imported at
[PlanDataLayers.tsx:16](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx);
no new dependency.

### Pre-formatted `unionAreaLabel` string at the push site

`text-field` reads the formatted string verbatim via
`['get', 'unionAreaLabel']` — rounding lives at the push site where
the math source is known, so the label, the tooltip, and the
[SilvopastureIntegrationCard](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
all share one `Math.round(x) + ' m²'` formatter. No MapLibre
`number-format` expression needed.

### Symbol layer paint mirrors the existing main label layer

`#f2ede3` text, `rgba(31, 29, 26, 0.85)` halo at width 1.2 — same
values as the main label layer at
[PlanDataLayers.tsx:1391–1429](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx).
No `text-font` key (defaults apply, matching the rest of the file).
The label layer is inserted *between* `guild-host-canopy-union-line`
and `guild-member-canopy-fill` so member disks paint on top — the
label is per-host context, not per-member identity.

### Pinned-state styling — `data-pinned` attribute + CSS only

The tooltip component gains an optional `pinned?: boolean` prop
forwarded as `data-pinned="true"` on the root `<div>` only when
true. CSS swaps `border-color` to brand-gold `#c4a265` (the same
hue used for the saved-overlap accent). `pointer-events: none`
stays — pinning does not change the rule that the tooltip never
steals events.

## Consequences

**Newly closed (was open on 2026-05-25):**
- Click-to-pin variant of the tooltip.
- Union-area as a map label (carried forward from 2026-05-24).

**Single-pin model.** Only one host can be pinned at a time.
Multi-pin would require list state + per-pin close affordances —
out of scope.

**Hover behaviour unchanged for unpinned unions.** A union without
a pin still shows the same cursor-following hover tooltip from the
2026-05-25 ship. The only behavioural delta when nothing is pinned
is the new persistent `<N> m²` label on the centroid.

**Future hover-style or pin-style surfaces** on other map layers
should follow the same pattern: local state + portal into canvas
container + `data-*` attribute for state styling. Don't reuse
`InlineFeaturePopover` (click-driven, form-only) and don't extend
`PlanSelectionStore` for transient read-only state.

**Still deferred (own slices):**
- Touch tap-to-pin (desktop hover/click only today).
- Label clustering when hosts crowd at low zoom.
- Label-visibility toggle in a layers panel.
- Pinned-tooltip drag to reposition.
- Multi-pin (pin several hosts simultaneously).
- Saved-overlap or host-name label variants.
- All other 2026-05-25 and 2026-05-24 deferrals remain deferred.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- Touch tap-to-pin.
- Label clustering / collision strategy at low zoom.
- Label-visibility toggle.
- Pinned-tooltip drag.
- Multi-pin.
- Saved-overlap or host-name label variants.
- All other 2026-05-25 and 2026-05-24 deferrals.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 67/67 green (4 tooltip render tests
  incl. new pinned-state coverage + 63 agroforestry suite
  unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (3):**
- [wiki/decisions/2026-05-26-atlas-b4-union-tooltip-pin-and-label.md](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md) (this ADR)
- [wiki/log/2026-05-26-b4-union-pin-and-label.md](../log/2026-05-26-b4-union-pin-and-label.md)

**Edited (4):**
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — `hostCanopyUnionLabels` accumulator (point-FC via
  `turf.pointOnFeature` + pre-formatted `unionAreaLabel`); new
  `guild-host-canopy-union-label` source + symbol layer at
  `minzoom: 17`; `pinnedUnion` `useState`; existing hover
  `useEffect` extended with click + ESC handlers + hover gating;
  portal render picks `pinnedUnion ?? hoveredUnion` and forwards
  `pinned`.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — optional `pinned?: boolean` prop forwarded as `data-pinned`.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `.tooltip[data-pinned='true']` brand-gold border-color
  override.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — 1 new test on `pinned` forwarding (true sets `data-pinned`;
  false/unset omits it). Existing 3 tests untouched.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  — "Click-to-pin variant" bullet flipped to closed and linked to
  this ADR.

## References

- [2026-05-25 — per-host union hover tooltip](2026-05-25-atlas-b4-host-union-hover-tooltip.md) (parent slice)
- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md) (label originated here)
- [2026-05-23 — per-member map-layer rendering + drag](2026-05-23-atlas-b4-guild-member-map-layer-drag.md)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
