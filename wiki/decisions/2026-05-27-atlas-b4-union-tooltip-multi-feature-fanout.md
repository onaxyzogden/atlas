# 2026-05-27 — B4 follow-up: multi-feature fan-out on host-union tooltip

**Status.** Implemented on `feat/atlas-permaculture`. Closes the
"Multi-feature fan-out when `resolveSilvopastureHosts` ever
produces overlapping hosts" still-deferred bullet from the
[2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md).

## Context

The 2026-05-25 hover-tooltip slice
([2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md))
and the 2026-05-26 click-to-pin + label slice
([2026-05-26-atlas-b4-union-tooltip-pin-and-label.md](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md))
both read **only the topmost** host union at the cursor via
`e.features?.[0]` on the hover/pin handler at
[PlanDataLayers.tsx:2005–2075](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx).
When two or more silvopasture polygons spatially overlap (and
[`resolveSilvopastureHosts`](../../apps/web/src/features/agroforestry/silvopastureHosts.ts)
enumerates both `cropAreas` with `type === 'silvopasture'` **and**
`designElements` with `kind === 'silvopasture'` with no
dedup between the two sources), their per-host canopy unions can
intersect at the cursor at `minzoom: 17`. Today the steward sees
only one host's three m² values; the others are invisible.

The 2026-05-25 ADR's Out-of-scope explicitly carved out:

> Multi-feature fan-out when `resolveSilvopastureHosts` ever
> produces overlapping hosts (today the tooltip shows the topmost
> union via `e.features?.[0]`).

This slice closes that loop.

## Decision

### Vertical stack of `HostBlock` rows, not tabs / chooser

The 2026-05-25 ship made `pointer-events: none` non-negotiable on
the tooltip surface: if the tooltip captured the cursor, it
would steal the underlying union-fill's `mouseleave` event and
the tooltip could never close. Any UX that requires the steward
to **click inside the tooltip** — tabs to switch between hosts,
a stack chooser, a per-block "expand" affordance — would force
`pointer-events: auto` and break that contract.

A vertical stack of `HostBlock` rows (one per overlapping host)
needs no in-tooltip interactivity. The cursor still hovers the
underlying union-fill; the tooltip is still read-only. The whole
stack is a single surface that shares one edge-clamp, one
`data-pinned` accent, and one cursor anchor. Stacking is the
only design that holds the `pointer-events: none` invariant.

### Set-equality unpin preserves the 2026-05-26 click-toggle

The 2026-05-26 ship gave clicking a pinned host an "unpin"
affordance via `hostId` equality. For multi-feature fan-out the
natural extension is **stack-set equality**: if clicking
produces a `hostIds` array (sorted) identical to the pinned
stack's, unpin; otherwise replace with the new stack. So:

- Click on a 2-host overlap → pin both as a stack.
- Click on the *same* overlap again → unpin.
- Click on a single-host region while a 2-host stack is pinned
  → pin moves to the new single-host stack.

This is implemented in a tiny pure `sameHostIdSet` helper inside
the click handler. ESC unpin unchanged.

### `hostId` dedup on `e.features`

MapLibre's `MapLayerMouseEvent.features` can include the same
feature twice when the layer's source has multiple visible
tiles intersecting the cursor — the same host union appears in
two tile renderings. The `unpackEntries` helper dedups by
`hostId` while preserving MapLibre's render order (topmost
first, which is the order `e.features` reports). Without this,
a host that straddles a tile boundary would render its
`HostBlock` twice in the same tooltip.

### Single-host case is visually identical to the 2026-05-26 ship

`entries.length === 1` is the common path. The `HostBlock` JSX
is the exact same dark-glass block the 2026-05-26 ship rendered
flat; the separator `<hr>` is only rendered when `i > 0`. The
unpinned + unstacked surface — what the steward sees most of
the time — is pixel-for-pixel unchanged. The brand-gold
`[data-pinned]` border still wraps the whole stack.

### Edge-clamp accounts for `entries.length`

`ESTIMATED_H` becomes `BASE_H + entries.length * PER_BLOCK_H`
(rough `BASE_H = 16`, `PER_BLOCK_H = 108`) so the bottom-edge
flip continues to keep a 3-block tooltip fully on-screen near
the map's bottom gutter. The right-edge clamp uses a fixed
width and is unaffected.

### No max-height cap

3+ overlapping hosts is rare in practice. If it becomes common,
a `max-height: 60vh; overflow-y: auto` cap is a separate polish
slice — adding `overflow: auto` introduces a scroll affordance
that interacts with `pointer-events: none` (the scrollbar would
need `pointer-events: auto` only on its track, which is a
non-trivial CSS dance). Left out today.

### Props refactor: no backward-compat shim

`HostCanopyUnionTooltipProps` becomes `{ point, entries[],
pinned? }`. The flat single-host fields (`hostName`,
`unionAreaM2`, …) are removed from the top-level shape and
moved to `HostBlockProps`. The 4 existing tests and the one
consumer in `PlanDataLayers.tsx` are updated in lockstep — a
shim that accepts both shapes would be dead surface area within
one commit.

## Consequences

**Newly closed (was open on 2026-05-25):**
- Multi-feature fan-out on overlapping host unions.

**Single-pin model unchanged.** A click pins the **whole stack**
at the click point. There is no per-block separate pin — the
pin captures the stack as a unit, the unpin set-equality
preserves the toggle, and ESC clears the whole stack.

**Component shape stabilised.** Now that the tooltip accepts
`entries[]`, future surfaces that surface other map kinds in the
same dark-glass family can adopt the same `{ point, entries[],
pinned? }` shape rather than inventing their own.

**Still deferred (own slices):**
- Max-height scroll cap when N hosts is large.
- Tabs / segmented chooser variant (design-rejected — would
  break `pointer-events: none`).
- Per-block separate pin (multi-pin within an overlap).
- Hover-card to expand a single block (same pointer-events
  concern).
- Touch tap-to-show (separate 2026-05-25 deferral, independent
  of fan-out).
- Animated fade in/out (separate 2026-05-25 deferral).
- All other 2026-05-25 / 2026-05-26 / 2026-05-24 deferrals
  remain deferred.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- Max-height / scroll cap.
- Tabs or segmented chooser.
- Per-block separate pin.
- Hover-card to expand a single block.
- Touch tap-to-show.
- Animated fade in/out.
- All other 2026-05-25 / 2026-05-26 / 2026-05-24 deferrals.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 68/68 green (5 tooltip render
  tests incl. new two-host-stack coverage + 63 agroforestry
  suite unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (2):**
- [wiki/decisions/2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md) (this ADR)
- [wiki/log/2026-05-27-b4-union-tooltip-multi-feature-fanout.md](../log/2026-05-27-b4-union-tooltip-multi-feature-fanout.md)

**Edited (4):**
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — props split: `HostBlockProps` exported; top-level props now
  `{ point, entries[], pinned? }` (flat fields removed). Render
  loops `entries.map(...)` with `<hr className={styles.separator}
  role="separator" />` between consecutive blocks; `HostBlock`
  sub-component kept local to the file. Edge-clamp `ESTIMATED_H`
  is now `entries.length`-aware.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `.separator` rule added (hairline against dark glass, same
  `#f2ede3` family at low opacity).
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — `hoveredUnion` / `pinnedUnion` state widened from single
  `props` to `entries: HostBlock[]` (and `hostIds: string[]` on
  pinned for set-equality unpin); `unpackProps` → `unpackEntries`
  walks all `e.features`, filters by `kind`, dedups by `hostId`;
  click toggle uses sorted-array `sameHostIdSet` equality.
  Portal render forwards `entries` instead of spread props.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — 4 existing tests migrated to length-1 `entries`; 1 new
  test asserts 2-host stack renders both names + values + one
  `role="separator"` between.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  — "Multi-feature fan-out" still-deferred bullet flipped to
  closed and linked to this ADR.

## References

- [2026-05-26 — click-to-pin tooltip + centroid label](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)
- [2026-05-25 — per-host union hover tooltip](2026-05-25-atlas-b4-host-union-hover-tooltip.md) (parent slice)
- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
