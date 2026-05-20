# 2026-05-27 — B4 follow-up: multi-feature fan-out on host-union tooltip

**Branch.** `feat/atlas-permaculture`. Closes the "Multi-feature
fan-out when `resolveSilvopastureHosts` ever produces overlapping
hosts" still-deferred bullet on the
[2026-05-25 ADR](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md).
Full design context in
[2026-05-27 ADR](../decisions/2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md).

**What changed.**

- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  props split. New exported `HostBlockProps` interface (`hostName`,
  `unionAreaM2`, `rawSumM2`, `guildCount`, `memberCount`); the
  top-level `HostCanopyUnionTooltipProps` is now `{ point,
  entries: HostBlockProps[], pinned? }`. The flat single-host
  fields are **removed** from the top-level shape — each entry
  carries its own. Render loops `entries.map((e, i) => ...)`,
  emitting a `<hr className={styles.separator} role="separator" />`
  between consecutive blocks (omitted on `i === 0` so single-host
  stacks are visually identical to the 2026-05-26 ship). The
  host-name + counts + 3-row m² grid is lifted into a local
  `HostBlock` sub-component (kept in the same file — no new
  module). Edge-clamp `ESTIMATED_H` becomes
  `BASE_H + entries.length * PER_BLOCK_H` (rough `BASE_H = 16`,
  `PER_BLOCK_H = 108`) so the bottom-edge anchor flip continues
  to keep a 3-block tooltip on-screen near the map's bottom
  gutter.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  new `.separator` rule — `border: 0; border-top: 1px solid
  rgba(242, 237, 227, 0.12); margin: 8px 0 6px;`. Same `#f2ede3`
  text family at low opacity so the rule reads as a soft divider
  (not a hard edge) against the dark glass. The `[data-pinned]`
  brand-gold border accent still wraps the whole stack — a
  pinned 2-host overlap reads as one sticky surface.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  three changes —
  - **State shape widened.** `hoveredUnion` and `pinnedUnion` no
    longer carry a single `props` object. Both now carry
    `entries: HostBlock[]` (where `HostBlock = HostBlockProps &
    { hostId: string }`); pinned additionally keeps a sorted
    `hostIds: string[]` for the set-equality unpin check.
  - **`unpackProps` → `unpackEntries`.** Walks every entry in
    `e.features` (not `[0]`), filters by `properties.kind ===
    'host-canopy-union'`, dedups by `hostId` via a `Set`
    (MapLibre can emit the same feature twice when its source
    has multiple visible tiles intersecting the cursor), and
    returns the deduped `HostBlock[]` preserving MapLibre's
    render order (topmost first).
  - **Click toggle uses stack-set equality.** A new
    `sameHostIdSet(a, b)` helper compares two sorted `hostIds`
    arrays element-wise. The 2026-05-26 affordance "click the
    currently-pinned union to unpin it" generalises naturally:
    clicking a stack whose `hostIds` set matches the pinned
    stack's unpins; any other click replaces. ESC unpin
    unchanged. Hover-suppression-while-pinned unchanged.
  - **Portal render** forwards `entries` instead of spread
    `props`.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  4 existing tests migrated to length-1 `entries`; 1 new test
  added for multi-feature fan-out — two `HostBlockProps` entries,
  asserts both host names render, both sets of three m² values
  render, and `screen.getAllByRole('separator').length === 1`
  (exactly one hairline between two blocks).
- [wiki/decisions/2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md](../decisions/2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md):
  "Multi-feature fan-out" still-deferred bullet flipped to
  closed and linked to the 2026-05-27 ADR (both in Consequences
  and Out-of-scope).

**Why vertical stack, not tabs / chooser.** Any UX that requires
clicking inside the tooltip — tabs to switch between hosts, a
chooser to pick which host's detail to show — would force
`pointer-events: auto` on at least part of the tooltip surface.
That breaks the 2026-05-25 non-negotiable: the tooltip must never
steal `mouseleave` from the underlying union-fill, or the
tooltip can never close. A static vertical stack of read-only
`HostBlock` rows needs zero in-tooltip interactivity — the
cursor stays on the union-fill, the contract holds.

**Why dedup by `hostId`.** `MapLayerMouseEvent.features` can
include the same Feature twice when the layer's source has
multiple visible tiles intersecting the cursor — the same host
union appears in two tile renderings. Without the `Set`-based
dedup, a host that straddles a tile boundary would render its
`HostBlock` twice in the same tooltip.

**Why stack-set equality for unpin.** The 2026-05-26 click-toggle
("click pinned ↔ unpin") generalises to "click the same stack ↔
unpin" once the click captures multiple features. Sorted-array
equality is O(n) and matches the steward's mental model: a
second click on the spot they just pinned reverses the action.
Multi-pin (pin host A but not host B in the same overlap) is
left to a separate slice — the single-pin model is preserved.

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 68/68 green (5 tooltip render
  tests incl. new two-host-stack coverage + 63 agroforestry
  suite unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

**Out of scope.** Max-height / scroll cap when N hosts is
large; tabs / segmented chooser variant (design-rejected on
`pointer-events: none` grounds); per-block separate pin within
an overlap (multi-pin); hover-card to expand a single block;
touch tap-to-show (separate 2026-05-25 deferral); animated
fade in/out (separate 2026-05-25 deferral); all other
2026-05-25 / 2026-05-26 / 2026-05-24 deferrals remain deferred.
