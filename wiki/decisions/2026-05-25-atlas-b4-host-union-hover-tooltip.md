# 2026-05-25 — B4 follow-up: per-host union hover tooltip

**Status.** Implemented on `feat/atlas-permaculture`. Closes the
"Per-host hover tooltip / popover" still-deferred bullet from
[2026-05-24 ADR](2026-05-24-atlas-b4-host-canopy-union-viz.md).

## Context

The 2026-05-24 slice
([2026-05-24-atlas-b4-host-canopy-union-viz.md](2026-05-24-atlas-b4-host-canopy-union-viz.md))
shipped the neutral-grey canopy-union halo on
`guild-host-canopy-union-fill` at `minzoom: 17`. The map now shows
*where* `canopyDedupedM2` lives geometrically, but the steward still
has to look at `SilvopastureIntegrationCard` to read the number —
and the card only surfaces the saved overlap, not the raw π·r² sum
or the union footprint directly. The 2026-05-24 ADR explicitly
carved out:

> Per-host hover tooltip / popover showing `unionAreaM2`, `rawSumM2`,
> dedup delta. Steward reads the number on
> `SilvopastureIntegrationCard` today; map hover is a separate slice.

This slice closes that loop with a cursor-following floating
tooltip on the union fill.

## Decision

### Cursor-following floating tooltip, not docked popover

The existing
[InlineFeaturePopover](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx)
is **click-driven** (mousedown via `useInlineFormStore.openForm`) and
**docked** (bottom-right, fixed). Reusing it for hover would force a
pin-and-dismiss flow that doesn't match the "scan multiple hosts
quickly" task this surface is for. So this slice introduces a new
component
[HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
+ a tiny dedicated CSS module that mirrors the same dark-glass
palette (`rgba(31, 29, 26, 0.96)` bg, `#f2ede3` text, `#c4a265`
accent on the saved-overlap row) so the two map-overlay surfaces
read as one design family.

`pointer-events: none` on the tooltip is non-negotiable — if the
tooltip captured the cursor it would steal the underlying layer's
mouseleave event and the tooltip could never close. The component
edge-clamps off the right/bottom of the viewport (flips anchor side
when `point + size + gap > viewportEdge - padding`) so it stays
on-screen near the map's gutters.

### Feature-properties extension — additive

[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
push site for the union FeatureCollection now carries:

```
{
  kind: 'host-canopy-union',
  hostId, hostName,
  unionAreaM2, rawSumM2,
  guildCount, memberCount,
}
```

`hostName` comes from `host.name` (already resolved by
`resolveSilvopastureHosts`). `guildCount` is `hostGuilds.length`.
`memberCount` counts members whose
`findSpecies(speciesId)?.canopySpreadM` is a positive finite number
— the same gate
[`hostCanopyUnion`](../../apps/web/src/features/agroforestry/guildLivestockMath.ts)
uses internally to decide whether to push a `turf.circle`. The
count is computed at the call site so the tooltip's "M
canopy-bearing members" reads exactly as "M circles were folded into
this union."

The four added property keys ride alongside the existing three. No
existing consumer destructures these keys; the extension is
additive.

### Portal render into the map's canvas container

`PlanDataLayers` was previously a pure side-effect component
(`return null`). To render the tooltip, the component now returns a
`createPortal(<HostCanopyUnionTooltip />, map.getCanvasContainer())`
when `hoveredUnion` state is non-null. Portalling into the canvas
container means the tooltip's `position: absolute` resolves against
the same pixel space `e.point` reports from MapLibre — no
coordinate conversion needed.

State is local to the component (a single `useState` next to the
existing hooks). No new store; this surface has no cross-component
consumers and the lifecycle is short (entered → hovering → left).

### Hover wiring — mirror of existing hover blocks

A new `useEffect` registers `mousemove` + `mouseleave` on
`guild-host-canopy-union-fill` (the fill, not the line — fill is the
hit target). On `mousemove`, the topmost feature's properties are
read into the local state along with `e.point`. On `mouseleave`,
state is cleared. Cleanup `off`s mirror the existing
guild-member-point handler block. No `setCursorIntent('move')` — the
union is read-only context, the cursor stays default.

## Consequences

**Newly closed (was open on 2026-05-24):**
- Per-host hover tooltip / popover.

**Feature-properties covenant.** The tooltip is a
presentation-only consumer of math outputs already exposed by
`hostCanopyUnion`. The new properties (`hostName`, `rawSumM2`,
`guildCount`, `memberCount`) are denormalised onto the feature for
hit-test convenience — they're cheap to recompute and the math
remains the authoritative source. Future hover-style surfaces on
other map layers should follow this pattern (local state + portal
into canvas container + read-only tooltip), not reuse the
click-driven `InlineFeaturePopover`.

**Per-rasterisation noise unchanged.** This is a presentation slice;
the underlying union geometry and π·r² sums are untouched.

**Closed by [2026-05-26 ADR](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md):**
- Click-to-pin variant of the tooltip.
- Union-area as a map label (carried forward from the
  2026-05-24-still-deferred list).

**Closed by [2026-05-27 ADR](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md):**
- Multi-feature fan-out when `resolveSilvopastureHosts` produces
  overlapping hosts.

**Still deferred (own slices):**
- Touch-device tap-to-show.
- Tooltip i18n.
- Per-layer tinted accent stripe matching the dominant canopy
  layer of the host — the union is a per-host aggregate;
  layer-tinting would reintroduce the misleading-hue concern
  2026-05-24 called out for the halo itself.
- Animated fade in/out.
- All other 2026-05-24-still-deferred follow-ups (toggle UI,
  light/dark theming, ring-radius ground-truthing,
  snap-to-other-member, multi-select drag, z-order, member-catalog
  edit via popover).

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- ~~Click-to-pin variant.~~ Closed by
  [2026-05-26 ADR](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md).
- ~~Union-area as a map label~~ (carried forward from 2026-05-24).
  Closed by
  [2026-05-26 ADR](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md).
- Touch tap-to-show.
- Tooltip i18n.
- Per-layer tinted stripe.
- Animated transitions.
- ~~Multi-feature fan-out on overlapping hosts.~~ Closed by
  [2026-05-27 ADR](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md).
- All other 2026-05-24-still-deferred follow-ups.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 66/66 green (3 new tooltip render
  tests + 63 agroforestry suite unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (3):**
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md) (this ADR)
- [wiki/log/2026-05-25-b4-host-union-hover-tooltip.md](../log/2026-05-25-b4-host-union-hover-tooltip.md)

**Edited (2):**
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — feature properties extended; `useState` for `hoveredUnion`;
  new `useEffect` hover block on `guild-host-canopy-union-fill`;
  `return null` replaced with conditional portal render into
  `map.getCanvasContainer()`.
- [wiki/decisions/2026-05-24-atlas-b4-host-canopy-union-viz.md](2026-05-24-atlas-b4-host-canopy-union-viz.md)
  — flip "Per-host hover tooltip / popover" still-deferred bullet
  to closed; link this ADR.

## References

- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md) (parent slice)
- [2026-05-23 — per-member map-layer rendering + drag](2026-05-23-atlas-b4-guild-member-map-layer-drag.md)
- [2026-05-21 — canopy union dedup + GuildMember positions](2026-05-21-atlas-b4-canopy-union-dedup.md) (math carve-out)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
