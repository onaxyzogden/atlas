# 2026-05-30 — B4 follow-up: per-block tooltip fade + reverse-in-flight

**Status.** Implemented on `feat/atlas-permaculture`. Closes two
still-deferred bullets from the
[2026-05-29 ADR](2026-05-29-atlas-b4-tooltip-exit-fade.md):
reverse-in-flight on re-enter, and per-block exit fade in multi-host
stacks. Bundled because both share the same machinery (the
`displayedUnion` mirror + the tooltip's fade rules) and the same
underlying design choice (CSS transitions vs CSS keyframes).

## Context

The 2026-05-29 exit-fade slice
([2026-05-29-atlas-b4-tooltip-exit-fade.md](2026-05-29-atlas-b4-tooltip-exit-fade.md))
shipped a `displayedUnion` mirror in
[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
that holds the portal mounted past `activeUnion → null` so a
`@keyframes tooltipFadeOut` rule on `.tooltip[data-exiting='true']`
can play before unmount. That ADR explicitly carved out two open
items:

> - Reversing the in-flight exit animation on re-enter (vs. remount).
> - Per-block exit fade in multi-host stacks.

Both shortcomings have the same root cause: **CSS keyframe animations
restart from `from`.** They don't interpolate from the current
computed value.

- **Reverse-in-flight.** The 2026-05-29 ship handled mid-exit
  re-enter by bumping a monotonic `key` on the portal child, forcing
  React to remount the tooltip. A remount means a new DOM element,
  which means the enter keyframe plays from `opacity: 0`. Whatever
  opacity the tooltip happened to be at when re-enter fired is
  thrown away — the user sees a snap to 0 followed by a fresh fade
  in. Functional but slightly jarring at 120 ms cadence.

- **Per-block fade.** The exit keyframe was applied to the whole
  `.tooltip` container, so the only thing the 2026-05-29 mirror could
  fade was the container. When the active set went from `{A, B, C}`
  to `{A, B}` (host C dropped out but A and B remained), the
  container stayed mounted and just re-rendered with the new entries
  — C disappeared abruptly. A per-block fade would need each
  `HostBlock` to have its own animation lifecycle, which keyframes
  make awkward when one block's animation needs to start while its
  siblings stay at full opacity.

Both bullets share a single fix: switch the fade machinery from CSS
keyframes to **CSS transitions on `opacity` and `transform`.**
Transitions interpolate from the current computed value to the new
declared value, so reversing direction mid-fade is free, and the
same `data-exiting='true'` selector works at any DOM level (container
*or* per-block) without coordinating across animation instances.

## Decision

### Switch the entire fade surface from keyframes to transitions

The previous CSS shape:

```css
.tooltip { animation: tooltipFadeIn 120ms ease-out; }
@keyframes tooltipFadeOut { from { opacity: 1 ... } to { opacity: 0 ... } }
.tooltip[data-exiting='true'] { animation: tooltipFadeOut 120ms ease-in forwards; }
```

becomes:

```css
.tooltip {
  opacity: 0;
  transform: translateY(2px);
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.tooltip[data-visible='true'] { opacity: 1; transform: translateY(0); }
.tooltip[data-exiting='true'] {
  opacity: 0;
  transform: translateY(2px);
  transition: opacity 120ms ease-in, transform 120ms ease-in;
}
.hostBlock {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.hostBlock[data-exiting='true'] {
  opacity: 0;
  transform: translateY(2px);
  transition: opacity 120ms ease-in, transform 120ms ease-in;
}
@media (prefers-reduced-motion: reduce) {
  .tooltip, .tooltip[data-exiting='true'],
  .hostBlock, .hostBlock[data-exiting='true'] { transition: none; }
}
```

Three behaviours fall out of this for free:

1. **Mount fade.** The tooltip mounts at `opacity: 0`; the component
   flips `data-visible='true'` via `useLayoutEffect` on the next
   tick, which engages the transition from 0 → 1. (Without the
   layout-effect flip the element would render already at the final
   state and skip the enter fade.)

2. **Exit fade.** Parent sets `exiting={true}`; component writes
   `data-exiting='true'`; transition interpolates opacity 1 → 0.
   `onTransitionEnd` fires `onExited` when `propertyName === 'opacity'`.

3. **Reverse-in-flight.** Parent flips `exiting` back to `false`
   mid-fade; component removes `data-exiting`; transition
   interpolates opacity from its current value back to 1. No snap,
   no remount, no JS animation library.

### Per-entry phase on the mirror

The `displayedUnion` state in PlanDataLayers now tracks phase **per
entry** in addition to container-level phase:

```ts
type HostBlockEntry = HostBlockProps & {
  hostId: string;
  phase: 'entering' | 'exiting';
};
const [displayedUnion, setDisplayedUnion] = useState<{
  point: { x: number; y: number };
  entries: HostBlockEntry[];
  phase: 'entering' | 'exiting';  // container; 'exiting' = full dismiss
} | null>(null);
```

The monotonic `key` from the 2026-05-29 ship is gone — transitions
handle reverse-in-flight natively, so the remount path is no longer
needed.

### Merge logic on hostId

When `activeUnion` changes (still non-null), the mirror's `useEffect`
merges previous entries with the new active set by `hostId`:

```ts
if (activeUnion) {
  setDisplayedUnion((prev) => {
    const newIds = new Set(activeUnion.entries.map(e => e.hostId));
    const prevIds = new Set((prev?.entries ?? []).map(e => e.hostId));
    const merged: HostBlockEntry[] = [];
    // Preserve prev stack order: kept hosts refresh data + flip to
    // entering; dropped hosts flip to exiting and stay in array.
    for (const p of (prev?.entries ?? [])) {
      if (newIds.has(p.hostId)) {
        const fresh = activeUnion.entries.find(e => e.hostId === p.hostId)!;
        merged.push({ ...fresh, phase: 'entering' });
      } else {
        merged.push({ ...p, phase: 'exiting' });
      }
    }
    // Brand-new hostIds appended in MapLibre topmost-first order.
    for (const e of activeUnion.entries) {
      if (!prevIds.has(e.hostId)) merged.push({ ...e, phase: 'entering' });
    }
    return { point: activeUnion.point, entries: merged, phase: 'entering' };
  });
  return;
}
```

Each `HostBlock` carries `data-exiting={entry.phase === 'exiting'}`
and its own `onTransitionEnd` handler. When a phase-`exiting` block's
opacity transition completes, it fires `onEntryExited(hostId)` and
PlanDataLayers drops that entry from the array. If the array empties
out entirely (last block faded), the mirror is cleared in the same
callback to avoid leaving an empty container mounted.

**Reverse-in-flight at the per-block level is automatic** — if host
C drops out (marked exiting, starts fading) and then activeUnion
returns with C in it, the next merge flips C back to entering; the
CSS transition interpolates its opacity from the current visible
value back to 1.

### Container `onExited` filter

`onTransitionEnd` bubbles. The container's listener filters out
per-block transitions and the transform-property fire (transforms
interpolate alongside opacity):

```tsx
onTransitionEnd={(ev) => {
  if (
    exiting &&
    ev.target === ev.currentTarget &&
    ev.propertyName === 'opacity'
  ) {
    onExited?.();
  }
}}
```

`ev.target === ev.currentTarget` is the bubbled-vs-direct filter —
per-block transitionends have `ev.target` set to the block element,
not the container.

### Safety timeout bumped 180 → 200 ms

The 2026-05-29 ship used a 180 ms `setTimeout` as a fallback for the
`prefers-reduced-motion` case (where `animationend` never fires
because `animation: none` skips the lifecycle). The transition-based
machinery has the same edge: with `transition: none`, the value
change is instantaneous and `transitionend` doesn't fire. The
timeout is now 200 ms — 120 ms transition + 80 ms slack to absorb
event-loop jitter and the per-block phase scheduling. Still well
inside the ~250 ms threshold for "instant feel" so a missed
transitionend doesn't leave a ghost tooltip up.

### Why not Web Animations API for reverse-in-flight

The 2026-05-29 ADR speculated about `element.animate()` +
`animation.reverse()` as the obvious tool. WAAPI does work, but it's
strictly more code than the transition-based approach: a ref,
`useLayoutEffect`, manual keyframes, manual `onfinish` wiring,
manual cancellation, manual cleanup. CSS transitions give the same
behaviour with zero JavaScript and no animation library — they
*always* interpolate from the current computed value, which is
exactly what "reverse" means in animation-as-UI terms. WAAPI would
make sense if the surface had complex multi-property choreography or
needed to query playback state, but a single opacity+transform fade
doesn't.

### Why not keep keyframes + add a JS reverse handler

A minimal-diff variant would keep the keyframe ship and only swap
the reverse path: capture `getComputedStyle(el).opacity` at the
moment of re-enter, cancel the keyframe, run a WAAPI animation from
the captured opacity to 1. Two reasons not to:

1. It would mean two parallel mechanisms — keyframes for the
   "normal" exit and WAAPI for the reverse. Future contributors
   would have to know that reverse-in-flight takes a different
   path. The transition-based unification removes that footgun.

2. Per-block fade needs the same lifecycle as container fade. With
   keyframes, per-block needs its own keyframe rule and its own JS
   reverse. With transitions, the `.hostBlock` rule is structurally
   identical to the `.tooltip` rule — same selectors, same
   properties, same `prefers-reduced-motion` guard. Half the CSS
   surface area.

### Why merge by hostId rather than by array index

When the active set changes, indices shift (host at index 2 becomes
index 1 when index 0 drops out). Keying React's reconciliation by
hostId — and keying the merge by hostId — means a block keeps its
DOM identity across set changes, so its in-flight transition isn't
cancelled by reconciliation. This is the same reason the React `key`
on the rendered map iterator is `entry.hostId` and not the array
index.

## Consequences

**Newly closed (was open on 2026-05-29):**
- Reversing the in-flight exit animation on re-enter.
- Per-block exit fade in multi-host stacks.

**Tooltip surface invariants preserved.**
- `pointer-events: none` on the tooltip — unchanged. The new
  transitions live on opacity/transform; no interaction surface
  added.
- Single-pin model — unchanged. `pinned` still flips off during
  exit so the gold accent doesn't stack with the fade-out.
- Multi-feature fan-out (2026-05-27) — unchanged shape; per-entry
  phase is purely additive on the existing block array.
- Edge-clamp + entries-aware `ESTIMATED_H` (2026-05-27) —
  unchanged. The `entries.length` used for the clamp still counts
  every block in the array, including phase-`exiting` ones that
  are about to fade out. Conservative behaviour: a tooltip that's
  about to lose a block stays clamped as if it still had that
  block, which avoids a flicker-reposition mid-fade.
- 2026-05-28 tap-outside-to-dismiss listener — unchanged.

**`prefers-reduced-motion` honoured.** Both the container and the
per-block rules carry the `transition: none` override under the
media query. With transitions disabled, value changes are instant,
matching the 2026-05-28 enter-fade behaviour for reduced-motion
users.

**Mirror `key` field retired.** The 2026-05-29 ship's monotonic
`key` on `displayedUnion` is gone — transitions interpolate from
current value, so re-enter mid-exit doesn't need remount. The React
`key` on the rendered iterator is now `entry.hostId` (stable per
host) rather than the array index.

**Test mechanism shift.** The 2026-05-29 ship asserted via
`fireEvent.animationEnd(tip, { animationName: 'tooltipFadeOut' })`
because keyframes emit `animationend`. Transition-based fades emit
`transitionend` with `propertyName: 'opacity'` instead. happy-dom's
`TransitionEvent` constructor silently drops the `propertyName`
init key (and @testing-library/dom's `createEvent.transitionEnd`
hands the init straight to the constructor without a fallback), so
the test file uses a small `fireTransitionEnd(el, propertyName)`
helper that `Object.defineProperty`'s the property name onto the
event after construction.

**Still deferred (own slices):**
- Motion-token harmonisation across map overlays (Slice I in the
  roadmap).
- `InlineFeaturePopover` exit fade (Slice J).
- Max-height / scroll cap when N hosts large (Slice K).
- Multi-pin / per-block separate pin (Slice L; would build on
  this slice's per-block addressability).
- Hover-card-to-expand-single-block (Slice M; depends on L).
- Tooltip i18n (Slice N; blocked on missing project-wide i18n
  bootstrap).
- Per-layer tinted accent stripe (Slice O; design-rejected on
  hue-confusion grounds — revisit deferred).
- All other 2026-05-24 / 25 / 26 / 27 / 28 / 29 deferrals.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological data model. No riba /
gharar / CSRA / salam / investor / financing / cost-of-capital
framing in any new file.

## Out of scope

- ~~Reverse-in-flight on re-enter.~~ Closed here.
- ~~Per-block exit fade in multi-host stacks.~~ Closed here.
- Motion-token harmonisation across map overlays.
- `InlineFeaturePopover` exit fade.
- Max-height scroll cap.
- Multi-pin / per-block separate pin.
- Hover-card drill-down.
- Tooltip i18n.
- Per-layer tinted accent stripe.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 71/71 green (8 tooltip render +
  fade tests, +2 over the 2026-05-29 ship — one for reverse-in-flight,
  one for per-block exit; existing 6 unchanged behaviourally;
  63 agroforestry suite unchanged).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

## Files

**New (2):**
- [wiki/decisions/2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md) (this ADR)
- [wiki/log/2026-05-30-b4-tooltip-perblock-fade-and-reverse.md](../log/2026-05-30-b4-tooltip-perblock-fade-and-reverse.md)

**Edited (4):**
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — exported new `HostBlockEntry` interface (hostId + per-entry
  phase); container `useLayoutEffect` mount flip for `data-visible`;
  `onTransitionEnd` filter for `propertyName === 'opacity'` +
  `target === currentTarget`; `HostBlock` component takes a single
  `entry` prop and forwards `onEntryExited(hostId)` on its own
  opacity transitionend.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — keyframes removed; `.tooltip` + `.hostBlock` rules use
  opacity/transform transitions with `data-visible` /
  `data-exiting` selectors; reduced-motion override updated.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — `displayedUnion` state shape: per-entry phase; `key` field
  removed; mirror `useEffect` merge logic added (kept/dropped/new
  by hostId); portal forwards `onEntryExited` callback; safety
  timeout 180 → 200 ms.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — `fireTransitionEnd` helper for happy-dom's
  propertyName-dropping `TransitionEvent`; existing tests
  transitioned to the new event shape; two new tests
  (reverse-in-flight + per-block exit).
- [wiki/decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md](2026-05-29-atlas-b4-tooltip-exit-fade.md)
  — flip reverse-in-flight + per-block bullets from still-deferred
  to closed-by-this-ADR.

## References

- [2026-05-29 — tooltip exit fade](2026-05-29-atlas-b4-tooltip-exit-fade.md) (parent slice)
- [2026-05-28 — tooltip touch dismiss + enter fade](2026-05-28-atlas-b4-tooltip-touch-dismiss-and-fade.md)
- [2026-05-27 — multi-feature fan-out](2026-05-27-atlas-b4-union-tooltip-multi-feature-fanout.md)
- [2026-05-26 — click-to-pin + centroid label](2026-05-26-atlas-b4-union-tooltip-pin-and-label.md)
- [2026-05-25 — per-host union hover tooltip](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
- [2026-05-24 — per-host canopy-union visualisation](2026-05-24-atlas-b4-host-canopy-union-viz.md)
- [2026-05-19 — B4 guild ↔ livestock ↔ silvopasture integration](2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md) (root B4 ADR)
