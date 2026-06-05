# 2026-05-28 — B4 follow-up: tooltip touch tap-outside dismiss + enter fade

**Branch.** `feat/atlas-permaculture`. Closes two still-deferred
bullets from the
[2026-05-25 ADR](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md):
touch-device tap-to-show and (entry half of) animated fade
in/out. Full design context in
[2026-05-28 ADR](../decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md).

**What changed.**

- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  inside the existing host-canopy-union `useEffect`, a new
  `onDocPointerDown` listener is registered on `document` next
  to the existing `onKey` (ESC) listener. While `pinnedUnion`
  is set, a `pointerdown` whose target is **outside**
  `map.getCanvasContainer()` calls `setPinnedUnion(null)`. Taps
  *inside* the canvas still route through MapLibre's existing
  `click` handler — the set-equality toggle (2026-05-27) and
  replace semantics are untouched. Cleanup mirrored in the
  existing teardown block. No state-shape change; no MapLibre
  handler change; dep list (`[map, pinnedUnion]`) already
  re-registers on pin changes so closure capture is correct.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  added `@keyframes tooltipFadeIn` (opacity 0→1 + translateY
  2px→0); `.tooltip` selector gets `animation: tooltipFadeIn
  120ms ease-out`; `@media (prefers-reduced-motion: reduce)`
  override nulls the animation so users with the OS
  reduced-motion preference see the prior snap-in behaviour.
  CSS-only — no React state, no animation library.
- [wiki/decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md](../decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md):
  two still-deferred bullets flipped — touch tap-to-show fully
  closed (the real gap was tap-outside-to-dismiss; show was
  already covered by MapLibre's synthesised `click` from the
  2026-05-26 pin handler), animated fade enter half closed and
  exit half kept deferred. Both Consequences and Out-of-scope
  updated.

**Why `pointerdown` on `document`, not `touchstart` on the layer.**
A layer-level touch handler would duplicate the existing click
handler's tap-to-pin logic on touch (since MapLibre `click`
fires from synthesised touch already). The pinning side needs
no new wiring on touch; only **dismissal** does. So the new
listener is targeted exclusively at tap-outside-canvas. Pointer
Events unify mouse + touch in one API and `pointerdown` fires
before `click`, so a tap outside the canvas dismisses cleanly
before any other handler consumes the event.

**Why enter-only fade, not enter + exit.** Exit fade requires
keeping the portal mounted past the `activeUnion → null` state
transition: either a wrapper component that defers unmount via
`setTimeout`, or a `useEffect` cleanup that plays the animation
before unmount. Both add mount-lifecycle state for a purely
cosmetic effect. The mount-snap-out is consistent with the
click-driven `InlineFeaturePopover` (closes instantly on
dismiss). Deferred to a separate slice if it ever feels jarring
in practice.

**Tooltip surface invariants preserved.** `pointer-events:
none` on the tooltip is **unchanged** — the new listener is on
`document`, not on the tooltip. The single-pin model is
unchanged. ESC still unpins on desktop. Multi-feature
set-equality toggle (2026-05-27) and edge-clamp
`entries.length`-aware `ESTIMATED_H` are unchanged.

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 68/68 green (5 tooltip render
  tests + 63 agroforestry suite unchanged; no test changes —
  CSS animations don't run in happy-dom and the touch listener
  lives below this file's mock surface).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed
  unrelated).

**Out of scope.** Exit fade / leave animation; touch-only
swipe-to-dismiss; long-press-for-detail on touch; tooltip i18n;
max-height scroll cap; per-block separate pin (multi-pin);
hover-card to expand a single block; per-layer tinted accent
stripe; all other 2026-05-24 / 25 / 26 / 27 deferrals remain
deferred.
