# 2026-05-30 — B4 follow-up: per-block tooltip fade + reverse-in-flight

**Branch.** `feat/atlas-permaculture`. Closes the reverse-in-flight
and per-block exit-fade still-deferred bullets on the
[2026-05-29 ADR](../decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md).
Full design context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md).

**What changed.**

- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  fade machinery switched from CSS keyframes (`@keyframes
  tooltipFadeIn` / `tooltipFadeOut`) to CSS transitions on opacity
  and transform. `.tooltip` mounts at `opacity: 0`;
  `.tooltip[data-visible='true']` flips to opacity 1; the enter
  transition interpolates between them. `.tooltip[data-exiting='true']`
  takes opacity back to 0 with `ease-in` timing. A new `.hostBlock`
  rule mirrors the same shape for per-block fades. The
  `prefers-reduced-motion` override nulls all four selectors'
  `transition`. Reverse-in-flight is free: removing `data-exiting`
  mid-fade lets the transition interpolate from the current visible
  value back to 1, with no snap and no JS.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  new exported `HostBlockEntry` interface (hostId + per-entry
  `phase: 'entering' | 'exiting'`). Container holds a `visible`
  useState that flips via `useLayoutEffect` on first paint so the
  enter transition fires from mount. `onTransitionEnd` filters by
  `propertyName === 'opacity'` and `target === currentTarget` (the
  latter rejects bubbled per-block transitionends). A new
  `onEntryExited?: (hostId: string) => void` prop is forwarded by
  each `HostBlock`, fired on its own opacity transitionend when
  `entry.phase === 'exiting'`. The React `key` on the rendered map
  iterator is now `entry.hostId` (stable per host) so a block's
  in-flight transition isn't cancelled when siblings drop out and
  the array re-indexes.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  `displayedUnion` state shape replaces 2026-05-29's `key + entries:
  HostBlock[]` with per-entry phase tracking (`entries:
  HostBlockEntry[]`). The monotonic key is gone — transitions
  handle reverse-in-flight, so remount is no longer needed. The
  mirror `useEffect` rewrites the merge logic: when activeUnion is
  non-null, kept hosts (in both old and new sets) carry forward
  with phase `entering` and refreshed data; dropped hosts (in old
  but not new) flip to phase `exiting` and stay in the array; new
  hosts are appended in MapLibre topmost-first order. The portal
  now also forwards `onEntryExited`, which removes the hostId from
  the entries array — or clears the mirror entirely if the last
  block just finished fading. Safety timeout bumped 180 → 200 ms
  (120 ms transition + 80 ms slack to absorb event-loop jitter and
  the `prefers-reduced-motion` instant-change case where
  transitionend doesn't fire).
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  new `fireTransitionEnd(el, propertyName)` helper —
  `@testing-library/dom`'s `createEvent.transitionEnd` passes init
  to the constructor without a fallback, and happy-dom's
  `TransitionEvent` constructor silently drops the `propertyName`
  init key, so the helper `Object.defineProperty`'s the value onto
  the event post-construction. Existing tests migrated from
  `fireEvent.animationEnd({ animationName: 'tooltipFadeOut' })` to
  the new helper. Two new tests: (a) reverse-in-flight asserts that
  flipping `exiting` from true → false during re-render clears
  `data-exiting` and that a subsequent opacity transitionend does
  NOT fire `onExited`; (b) per-block exit asserts that an entry
  with `phase='exiting'` carries `data-exiting='true'`, that
  opacity transitionend fires `onEntryExited(hostId)`, and that
  sibling `entering` blocks and transform-property transitionends
  do not.
- [wiki/decisions/2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md](../decisions/2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md)
  (NEW): ADR.
- [wiki/decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md](../decisions/2026-05-29-atlas-b4-tooltip-exit-fade.md):
  reverse-in-flight + per-block bullets in still-deferred flipped
  to closed-by-this-ADR.

**Why transitions, not Web Animations API.**

The 2026-05-29 ADR speculated about WAAPI `element.animate()` +
`animation.reverse()`. Transitions get the same behaviour with zero
JS: they always interpolate from the current computed value, which
is exactly what "reverse" means for a single-property fade. WAAPI
would make sense for multi-property choreography or playback-state
queries; for opacity+transform it's strictly more code.

**Why merge by hostId.**

When the active set shrinks (host C drops out), the dropped host has
to stay in the displayed array long enough to fade. Indices shift
under set changes, so a key-by-index would cancel C's transition
when the array re-reconciled. Keying by `entry.hostId` keeps C's DOM
element stable across the merge so the transition runs to completion.

**Why per-block reverse-in-flight works for free.**

The same CSS rule that handles container reverse-in-flight handles
per-block: when host C is mid-fade (phase exiting, data-exiting
present) and activeUnion returns with C, the next merge flips C's
phase back to entering; the next render removes data-exiting;
opacity transitions from the current visible value back to 1.

**Tooltip surface invariants preserved.** `pointer-events: none`
unchanged. Single-pin model unchanged. ESC + tap-outside-to-dismiss
unchanged. Multi-feature fan-out (2026-05-27) unchanged. Edge-clamp
+ entries-aware `ESTIMATED_H` (2026-05-27) unchanged — the
`entries.length` used for the clamp counts every block including
phase-`exiting` ones, so a tooltip about to lose a block stays
clamped conservatively (no flicker-reposition mid-fade).
Reduced-motion behaviour unchanged in user-visible terms (was: no
keyframe animation; now: no transition).

**Verification.**
- `npx vitest run
  src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx
  src/features/agroforestry` — 71/71 green (8 tooltip + 63
  agroforestry; +2 tooltip tests over the 2026-05-29 ship).
- `npx tsc --noEmit` — zero new errors on touched files
  (pre-existing `@ogden/shared/*`, `precedesAuto` Zod, and
  `PlanSelectionFloater` Record-gap errors confirmed unrelated).

**Out of scope.** Motion-token harmonisation across map overlays
(Slice I); `InlineFeaturePopover` exit fade (Slice J); max-height
scroll cap (Slice K); multi-pin (Slice L); hover-card drill-down
(Slice M); tooltip i18n (Slice N); per-layer tinted stripe
(Slice O); all other prior deferrals remain deferred.
