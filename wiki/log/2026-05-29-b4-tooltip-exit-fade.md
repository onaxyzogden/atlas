# 2026-05-29 — B4 follow-up: tooltip exit fade

**Branch.** `feat/atlas-permaculture`. Closes the exit half of the
animated fade still-deferred bullet on the
[2026-05-28 ADR](../decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md)
(itself the parent of the 2026-05-25 deferral). Full design context in
[2026-05-29 ADR](../decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md).

**What changed.**

- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  a third local `useState` (`displayedUnion`) mirrors `activeUnion =
  pinnedUnion ?? hoveredUnion` but lives one exit-animation longer.
  A `useEffect([activeUnion])` drives the mirror: non-null
  `activeUnion` writes the mirror synchronously with a fresh
  monotonic `key` and `phase: 'entering'`; null `activeUnion` flips
  the existing mirror's phase to `'exiting'` (or no-ops if already
  exiting). A 180 ms safety `setTimeout` (120 ms anim + 60 ms slack)
  covers the case where `animationend` never fires
  (`prefers-reduced-motion` swap mid-animation, element removed by
  unrelated unmount). The portal-render now reads `displayedUnion`
  instead of `activeUnion`, forwards `key={displayedUnion.key}` so
  re-enters during exit remount cleanly, passes `exiting` +
  `onExited`, and forces `pinned={false}` while exiting so the gold
  accent doesn't linger.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  props extended with optional `exiting?: boolean` and
  `onExited?: () => void`. Root `<div>` gets a conditional
  `data-exiting='true'` and an `onAnimationEnd` handler that fires
  `onExited()` when `exiting === true` and the event's
  `animationName.includes('tooltipFadeOut')` (CSS Modules scopes the
  keyframe name; `.includes` matches the scoped form).
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  added `@keyframes tooltipFadeOut` (opacity 1→0, translateY 0→2px —
  the reverse of the enter keyframe); new selector
  `.tooltip[data-exiting='true'] { animation: tooltipFadeOut 120ms
  ease-in forwards; }`. `forwards` holds the final `opacity: 0` so
  the surface stays visually gone until React unmount finishes. The
  existing `prefers-reduced-motion` media block was extended to null
  the exit animation alongside the enter one.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  one new test asserts `data-exiting='true'` forwarding when
  `exiting` is passed, and verifies `onExited` is invoked exactly
  once on `fireEvent.animationEnd` with `animationName:
  'tooltipFadeOut'` — and NOT invoked when an unrelated keyframe
  (e.g. `tooltipFadeIn`) fires its end event.
- [wiki/decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md](../decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](../decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  and
  [wiki/decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md](../decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md):
  exit-fade still-deferred bullets flipped to closed in both
  Consequences and Out-of-scope, linking this ADR.

**Why a `displayedUnion` mirror, not refs / `useReducer`.**

`useRef` doesn't trigger re-render — the portal-branch needs to
subscribe to phase transitions so React can decide whether to
unmount. `useReducer` would be overkill for a two-shape state
machine (entering, exiting); the inline-setter form is shorter and
co-locates the transition logic next to the side-effect cleanup.

**Why a 60 ms slack on the safety timeout.**

120 ms is the animation duration. The slack covers (a) RAF jitter
between `animationend` firing and React scheduling the unmount, and
(b) the `prefers-reduced-motion` short-circuit where `animationend`
never fires at all (the CSS `animation: none` override skips the
event entirely). 60 ms is below the human perception threshold for
ghost-tooltip latency (~100 ms) yet large enough to absorb a frame
or two of jank on slow devices.

**Why force `pinned=false` during exit.**

The gold accent border (`data-pinned='true'`) reads as "this is
sticky." The fade reads as "this is going away." Stacking the two
signals confuses the surface. The user has already dismissed; the
pin state no longer needs to be advertised. The mirror is the source
of truth for what's *displayed*; `pinnedUnion` remains the source of
truth for what's *active*, and the latter is null by the time exit
fires.

**Tooltip surface invariants preserved.** `pointer-events: none` on
the tooltip is **unchanged** — the new `onAnimationEnd` handler
doesn't change pointer interaction. Single-pin model unchanged. ESC
+ tap-outside still unpin. Multi-feature fan-out (2026-05-27),
edge-clamp `entries.length`-aware `ESTIMATED_H` (2026-05-27), enter
fade (2026-05-28) all unchanged.

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 69/69 green (6 tooltip + 63
  agroforestry).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

**Out of scope.** Reverse-in-flight animation on re-enter (uses
remount-via-`key` instead); per-block exit fade in multi-host
stacks; `InlineFeaturePopover` exit fade; motion-token
harmonisation across map overlays; tooltip i18n; max-height scroll
cap; per-block separate pin (multi-pin); hover-card to expand a
single block; per-layer tinted accent stripe; all other 2026-05-24
/ 25 / 26 / 27 / 28 deferrals remain deferred.
