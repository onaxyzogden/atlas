# 2026-05-29 — B4 follow-up: tooltip exit fade

**Status.** Implemented on `feat/atlas-permaculture`. Closes the last
fade-related bullet still open after the
[2026-05-28 ADR](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md):
animated fade **out** (exit) on the per-host canopy-union tooltip.

## Context

The 2026-05-28 slice
([2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md))
shipped an enter fade via `@keyframes tooltipFadeIn` on `.tooltip` with
a `prefers-reduced-motion` override. The enter half was cheap because
the tooltip mounts fresh whenever `activeUnion = pinnedUnion ??
hoveredUnion` becomes non-null — CSS engages the keyframe automatically.

Exit was kept deferred because the existing render
([PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
≈ line 3397) returns `null` the instant `activeUnion → null`, which
unmounts the portal before any CSS exit keyframe can play. To close the
exit half, the lifetime of the *displayed* tooltip must decouple from
the lifetime of the *active* hover/pin state.

This slice does that with the minimum viable state — a small mirror —
and preserves every prior invariant: `pointer-events: none` on the
tooltip surface, single-pin model, single-tooltip-at-a-time, the
2026-05-27 multi-feature fan-out, the 2026-05-28 tap-outside-to-dismiss
listener.

## Decision

### `displayedUnion` mirror in `PlanDataLayers`

A third local state slot in
[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
holds the *displayed* tooltip independently of the *active* one:

```ts
const [displayedUnion, setDisplayedUnion] = useState<{
  point: { x: number; y: number };
  entries: HostBlock[];
  phase: 'entering' | 'exiting';
  key: number;
} | null>(null);
```

A `useEffect([activeUnion])` mirrors:

- When `activeUnion` is non-null, set the mirror synchronously with a
  fresh monotonically-increasing `key` (used as React's `key` on the
  child so a re-enter mid-exit remounts the tooltip and re-plays the
  enter keyframe).
- When `activeUnion` becomes null while the mirror is non-null and not
  already exiting, flip `phase` to `'exiting'`. The CSS keyframe takes
  over; `onAnimationEnd` clears the mirror on completion.
- A 180 ms safety `setTimeout` (120 ms anim + 60 ms slack) covers the
  edge case where `animationend` never fires — e.g. mid-animation
  `prefers-reduced-motion` swap, or the element being removed by
  unrelated unmount.

The mirror is `useState`, not a `useRef`, because the portal-render
branch needs to subscribe — refs don't trigger re-render. It is not
`useReducer` because there are only two transition shapes (enter,
exit) and the inline-setter form is shorter.

### `data-exiting` + reverse keyframe with `forwards`

```css
@keyframes tooltipFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(2px); }
}
.tooltip[data-exiting='true'] {
  animation: tooltipFadeOut 120ms ease-in forwards;
}
@media (prefers-reduced-motion: reduce) {
  .tooltip,
  .tooltip[data-exiting='true'] { animation: none; }
}
```

`forwards` holds the final `opacity: 0` state so the tooltip stays
visually gone until React's unmount finishes, even if the
`animationend → setDisplayedUnion(null)` ping happens a frame before
React schedules the re-render.

Symmetry with the enter fade: same 120 ms duration, same 2 px
translateY magnitude, reversed direction, paired `ease-out` (enter) /
`ease-in` (exit) so the visual character matches "the surface
arriving" vs "the surface leaving."

### `onAnimationEnd` clears the mirror

The tooltip's root `<div>` accepts a new optional `onExited` prop and
attaches `onAnimationEnd`:

```tsx
onAnimationEnd={(ev) => {
  if (exiting && ev.animationName.includes('tooltipFadeOut')) {
    onExited?.();
  }
}}
```

The `.includes('tooltipFadeOut')` match handles the CSS Modules
scoping of keyframe names (e.g. `_HostCanopyUnionTooltip_module__tooltipFadeOut`).
The `exiting &&` guard prevents the enter keyframe's `animationend`
from accidentally firing `onExited` if the prop ever stays attached
across phases — defensive, since `key`-driven remounts mean it
shouldn't happen, but cheap to keep.

### `pinned` is forced false during exit

The portal-render forwards
`pinned={!!pinnedUnion && displayedUnion.phase !== 'exiting'}` so the
gold accent border (`data-pinned='true'`) drops the moment the user
dismisses, instead of lingering through the fade. The fade carries the
visual "this is going away" cue; the gold accent would fight that read.

### Why not other approaches

- **`useRef` instead of `useState` for the mirror.** Refs don't
  trigger re-render; the portal-branch needs to subscribe.
- **`useReducer` with explicit `ENTER` / `EXIT` actions.** Two-shape
  state machine doesn't justify the boilerplate; inline setters are
  clearer for a 30-line slice.
- **`<AnimatePresence>` or framer-motion.** External motion library
  for one keyframe — overkill, and motion libs typically take
  `pointer-events: auto` on animated children unless configured
  otherwise, which would risk the 2026-05-25 `pointer-events: none`
  invariant.
- **Reversing the in-flight exit animation when a new hover arrives.**
  Web Animations API can do it (`anim.reverse()`), but the
  `key`-driven remount is simpler and the visual difference at 120 ms
  is imperceptible — the new enter starts from `opacity: 0`, which is
  approximately where the exit was about to land anyway.
- **Per-block exit fade in a multi-host stack.** When the cursor
  moves so a previously-overlapping host drops out, only the
  remaining block(s) should arguably fade the dropped one. Container-
  level fade is sufficient at this slice's polish level; per-block
  would require lifting `key` into the multi-host stack which adds
  state for negligible visual gain.

## Consequences

**Newly closed (was open on 2026-05-28):**
- Animated fade **out** (exit half).

**Tooltip surface invariants preserved.**
- `pointer-events: none` on `.tooltip` — unchanged. The new
  `onAnimationEnd` handler doesn't change pointer interaction.
- Single-pin model — unchanged. ESC + tap-outside still unpin.
- Single tooltip mounted at a time — unchanged. The mirror replaces
  the prior `activeUnion`-driven render; at most one instance is in
  the portal at any moment.
- Multi-feature fan-out (2026-05-27) — unchanged. The mirror copies
  `entries` verbatim.
- Edge-clamp + entries-aware `ESTIMATED_H` (2026-05-27) — unchanged.
- Enter fade (2026-05-28) — unchanged. The remount key still triggers
  it cleanly on every fresh `activeUnion`.
- Touch tap-outside dismiss (2026-05-28) — unchanged.

**`prefers-reduced-motion` honoured.** The OS reduced-motion
preference nulls both keyframes; the 180 ms safety timeout still
unmounts the tooltip so the steward isn't left looking at an
opacity:1 ghost.

**Re-enter during exit.** If the cursor returns to a union mid-exit,
the mirror replaces synchronously with a new `key`; React remounts,
the enter keyframe plays from `opacity: 0`. No visible flicker at
120 ms cadence.

**Closed by [2026-05-30 ADR](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md):**
- Reversing the in-flight exit animation on re-enter — switched the
  fade machinery from CSS keyframes to CSS opacity/transform
  transitions, which interpolate from the current computed value, so
  re-enter mid-exit is automatic (no remount, no snap).
- Per-block exit fade in multi-host stacks — `displayedUnion.entries`
  now carry per-block phase; the mirror merges by hostId so a host
  dropping out of the active set fades on its own while siblings
  remain mounted.

**Still deferred (own slices):**
- Motion-token harmonisation across other map overlays
  (`InlineFeaturePopover`, etc.).
- Tooltip i18n (separate 2026-05-25 deferral).
- Max-height / scroll cap when N hosts large (2026-05-27 deferral).
- Per-block separate pin / hover-card-to-expand-single-block
  (2026-05-27 deferrals).
- Per-layer tinted accent stripe (2026-05-25 deferral;
  design-rejected on hue-confusion grounds).
- All other 2026-05-24 / 25 / 26 / 27 / 28 deferrals remain deferred.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- Reverse-in-flight animation on re-enter.
- Per-block exit fade in multi-host stacks.
- `InlineFeaturePopover` exit fade.
- Motion-token harmonisation across map overlays.
- Tooltip i18n.
- Max-height scroll cap.
- Per-block separate pin.
- Hover-card to expand a single block.
- Per-layer tinted accent stripe.
- All other 2026-05-24 / 25 / 26 / 27 / 28 deferrals.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 69/69 green (6 tooltip render tests
  + 63 agroforestry suite unchanged; the new tooltip test asserts
  `data-exiting` forwarding and the `onExited` callback contract on
  `animationend` with a `tooltipFadeOut`-matching `animationName`).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (2):**
- [wiki/decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md](2026-05-29-atlas-b4-tooltip-exit-fade.md) (this ADR)
- [wiki/log/2026-05-29-b4-tooltip-exit-fade.md](../log/2026-05-29-b4-tooltip-exit-fade.md)

**Edited (5):**
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — third `useState` for `displayedUnion`; `useEffect([activeUnion])`
  mirror; portal-render reads the mirror with `key`, `exiting`,
  `onExited` forwarded.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — props extended with `exiting?` + `onExited?`; root `<div>` gets
  conditional `data-exiting` and an `onAnimationEnd` that fires
  `onExited` when the exit keyframe completes.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `@keyframes tooltipFadeOut`;
  `.tooltip[data-exiting='true'] { animation: tooltipFadeOut 120ms
  ease-in forwards; }`; `prefers-reduced-motion` override extended
  to null the exit animation too.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — one new test for `data-exiting` + `onExited` on `animationend`.
- [wiki/decisions/2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  — flip "Animated fade out (exit)" still-deferred bullet to closed,
  link this ADR.
- [wiki/decisions/2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md)
  — flip "Animated fade out" still-deferred bullet to closed, link
  this ADR.

## References

- [2026-05-28 — touch tap-outside dismiss + enter fade](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md) (parent slice)
- [2026-05-27 — multi-feature fan-out on host-union tooltip](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md)
- [2026-05-26 — click-to-pin tooltip + centroid label](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)
- [2026-05-25 — per-host union hover tooltip](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
