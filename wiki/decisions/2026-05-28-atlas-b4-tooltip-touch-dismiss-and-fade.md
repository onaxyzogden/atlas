# 2026-05-28 — B4 follow-up: tooltip touch tap-outside dismiss + enter fade

**Status.** Implemented on `feat/atlas-permaculture`. Closes two
still-deferred bullets from the
[2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md):
touch-device tap-to-show and (entry half of) animated fade in/out.

## Context

The 2026-05-25 hover-tooltip slice
([2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)),
2026-05-26 click-to-pin + label slice
([2026-05-26-atlas-b4-union-tooltip-pin-and-label.md](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)),
and 2026-05-27 multi-feature fan-out slice
([2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md))
shipped a hover-read + click-to-pin + ESC-unpin + multi-host
fan-out flow for the per-host canopy-union halo. Two cosmetic /
touch-affordance bullets remained on the 2026-05-25
still-deferred list:

> - Touch-device tap-to-show.
> - Animated fade in/out.

**Touch tap-to-show — the real gap is dismissal, not showing.**
MapLibre's `click` event already fires from synthesised
touch-taps, so the 2026-05-26 click-to-pin handler already
*shows* the tooltip on touch (it pins immediately, skipping the
hover step that touch devices can never produce). What's missing
on tablets is **dismissal**: ESC is the desktop unpin path, but
a tablet steward has no keyboard, so the only existing unpin
routes are "tap the same pinned stack again" (set-equality
toggle from 2026-05-27) and "tap another union" (replace). Tap
*anywhere off the union* — the natural mobile dismissal gesture
— doesn't exist.

**Animated fade — entry softens; exit kept deferred.** The
tooltip currently snaps in and out abruptly. A short opacity +
translateY enter fade softens the mount transition without
introducing any new state. Exit fade would require keeping the
portal mounted past the `activeUnion → null` transition (a
deferred-unmount wrapper with timeout state), which is more
state than this cosmetic warrants; the unmount snap stays
consistent with how other map-overlay surfaces close.

Both bullets share the same scope (tooltip presentation polish
+ touch affordance) and the same files (`PlanDataLayers.tsx`
+ `HostCanopyUnionTooltip.module.css`); they're bundled into
one slice rather than two single-handler / single-keyframe
ships.

## Decision

### `pointerdown`-on-document, target-outside-canvas unpins

The new dismissal listener is registered on `document`, not on
the tooltip surface — the tooltip's `pointer-events: none`
invariant (2026-05-25 ADR, non-negotiable) is preserved.

```ts
const onDocPointerDown = (ev: PointerEvent) => {
  if (!pinnedUnion) return;
  const canvasContainer = map.getCanvasContainer();
  if (!canvasContainer) return;
  const target = ev.target as Node | null;
  if (target && canvasContainer.contains(target)) return;
  setPinnedUnion(null);
};
```

The Pointer Events API unifies mouse + touch in one handler.
`pointerdown` fires before `click`, so a tap outside the canvas
dismisses before any other action consumes the event. Taps
*inside* the canvas still flow through MapLibre's existing
`click` handler — which already handles "tap same stack → unpin"
(set-equality from 2026-05-27) and "tap other union → replace" —
so the new listener only fills the missing
tap-anywhere-off-the-union dismissal affordance. Desktop ESC
unchanged.

### Listener lives in the same `useEffect` that owns hover/click

The host-canopy-union `useEffect` in `PlanDataLayers.tsx`
already owns the layer's `mousemove` / `mouseleave` / `click`
registrations and the document `keydown` (ESC) listener. The
new `pointerdown` registration follows the same add/remove
shape inside the same effect, mirroring `onKey`. No new effect,
no new state, no shape change to `pinnedUnion`.

The effect's dep list (`[map, pinnedUnion]`) already
re-registers handlers when `pinnedUnion` changes, so closure
capture of `pinnedUnion` in `onDocPointerDown` is correct
without a ref.

### Enter-only fade via CSS keyframe

```css
@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tooltip { animation: tooltipFadeIn 120ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .tooltip { animation: none; }
}
```

CSS-only. No React state, no `useEffect`, no animation library.
The animation runs once on mount; if the same tooltip stays
mounted while `entries` change (multi-feature stack swap on
hover-replace), the animation does not replay — which is the
desired behaviour (replays would look like a flicker).

`prefers-reduced-motion: reduce` short-circuits the animation
for users with the OS accessibility preference.

### Why not exit fade

Exit fade requires keeping the portal mounted past the
`activeUnion → null` state transition: a wrapper component that
defers unmount via `setTimeout`, or a `useEffect` cleanup that
plays the animation before unmounting. Both add mount-lifecycle
state for what is purely cosmetic. The mount-snap-out is
consistent with other map-overlay surfaces (the click-driven
`InlineFeaturePopover` closes instantly on dismiss). Left to a
separate slice if it ever feels jarring in practice.

### Why not `touchstart` on the layer

A `touchstart` registration on the union-fill layer would
duplicate the click handler's tap-to-pin logic on touch (since
`click` fires from synthesised touch already). The pinning side
needs no new touch wiring; only dismissal does. So the new
listener targets the *outside-canvas* dismissal case
exclusively.

## Consequences

**Newly closed (was open on 2026-05-25):**
- Touch tap-to-show (real gap was tap-outside-to-dismiss; show
  was already via synthesised `click`).
- Animated fade in (enter half).

**Tooltip surface invariants preserved.**
- `pointer-events: none` on the tooltip — unchanged. New
  listener is on `document`, not on the tooltip.
- Single-pin model — unchanged. ESC still unpins on desktop.
- Multi-feature fan-out (2026-05-27) — unchanged. The
  set-equality toggle still routes through MapLibre `click`.
- Edge-clamp + entries-aware `ESTIMATED_H` (2026-05-27) —
  unchanged. Animation does not alter layout.

**`prefers-reduced-motion` honoured.** Users with the OS
reduced-motion preference see the prior snap-in behaviour, no
opacity / transform animation.

**Closed by [2026-05-29 ADR](2026-05-29-atlas-b4-tooltip-exit-fade.md):**
- Animated fade **out** — `displayedUnion` mirror keeps the portal
  mounted past `activeUnion → null`; CSS `tooltipFadeOut` keyframe
  plays; `onAnimationEnd` + 180 ms safety timeout clear the mirror.

**Still deferred (own slices):**
- Touch-only swipe-to-dismiss — gesture system too heavy.
- Long-press-for-detail on touch — would force
  `pointer-events: auto` and risk the mouseleave-never-stolen
  contract.
- Tooltip i18n (separate 2026-05-25 deferral).
- Max-height / scroll cap when N hosts large (2026-05-27
  deferral).
- Per-block separate pin / hover-card-to-expand-single-block
  (2026-05-27 deferrals).
- Per-layer tinted accent stripe (2026-05-25 deferral;
  design-rejected on hue-confusion grounds).
- All other 2026-05-24 / 25 / 26 / 27 deferrals remain
  deferred.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- ~~Exit fade / leave animation.~~ Closed by
  [2026-05-29 ADR](2026-05-29-atlas-b4-tooltip-exit-fade.md).
- Touch-only swipe-to-dismiss.
- Long-press-for-detail on touch.
- Tooltip i18n.
- Max-height scroll cap.
- Per-block separate pin.
- Hover-card to expand a single block.
- Per-layer tinted accent stripe.
- All other 2026-05-24 / 25 / 26 / 27 deferrals.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 68/68 green (5 tooltip render
  tests + 63 agroforestry suite unchanged; no test changes — CSS
  animations don't run in happy-dom and the touch listener
  lives below this file's mock surface).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (2):**
- [wiki/decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md) (this ADR)
- [wiki/log/2026-05-28-b4-tooltip-touch-dismiss-and-fade.md](../log/2026-05-28-b4-tooltip-touch-dismiss-and-fade.md)

**Edited (3):**
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — new `onDocPointerDown` listener inside the existing
  host-canopy-union `useEffect`; cleanup mirrored in the
  existing teardown block. No state-shape change.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `@keyframes tooltipFadeIn` added; `.tooltip` gets
  `animation: tooltipFadeIn 120ms ease-out`; `@media
  (prefers-reduced-motion: reduce)` override nulls it.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  — flip touch tap-to-show + animated fade still-deferred
  bullets to closed and link this ADR (touch full closed;
  fade enter half closed, exit half remains deferred). Both in
  Consequences and Out-of-scope.

## References

- [2026-05-27 — multi-feature fan-out on host-union tooltip](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md)
- [2026-05-26 — click-to-pin tooltip + centroid label](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)
- [2026-05-25 — per-host union hover tooltip](2026-05-25-atlas-b4-host-union-hover-tooltip.md) (parent slice)
- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
