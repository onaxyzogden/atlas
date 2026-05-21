# 2026-05-30 — B4 InlineFeaturePopover exit fade

**Status.** Accepted. Slice J of the B4 tooltip remaining-deferrals roadmap.

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

`InlineFeaturePopover` is the click-driven mini-form docked at the
bottom-right of the map canvas during Plan-stage drawing. Save, cancel,
ESC, and click-outside all currently dismiss it via an instant unmount:
the store's `active` field flips to null and the form disappears in one
frame. The 2026-05-30 host-canopy-union tooltip ship gave the hover
tooltip a deferred-unmount exit fade; the InlineFeaturePopover doing it
too closes the "consistency across overlays" gap [Slice J of the
roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md)
called out as the reason to land [Slice I (motion tokens)](2026-05-30-atlas-b4-motion-token-harmonisation.md)
**before** this slice — so the second consumer adopts the tokens at
birth rather than needing a later refactor.

This surface differs from the tooltip in one structurally important way:
the popover is **interactive** (`pointer-events: auto`) — it owns
inputs, a Save button, a Cancel button, and optional custom action
buttons. The tooltip's invariant ("must never steal events from the
underlying layer") doesn't transfer here. But a new invariant arrives:
**a mid-fade click on a fading button must not race the
displayed-mirror cleanup.**

## Decision

Lift the same `displayed` / `exiting` / `visible` machinery the
2026-05-30 tooltip ship landed into `InlineFeaturePopover.tsx`, and add
the same four-rule transition pattern to `InlineFeaturePopover.module.css`
consuming the `--motion-overlay-*` tokens from Slice I. Critically: the
exit-state CSS rule also drops `pointer-events: none` so mid-fade clicks
are physically impossible.

**Component (`InlineFeaturePopover.tsx`).**

- New local state: `displayed: InlineFormPayload | null` (mirrors
  `useInlineFormStore.active` but lives one exit-transition longer),
  `exiting: boolean`, `visible: boolean`.
- `useEffect([active])` drives the mirror: a fresh non-null `active`
  swaps `displayed` and clears `exiting`; `active === null` with a
  non-null `displayed` flips `exiting=true` and arms a 200ms safety
  timeout that clears `displayed` if the opacity transitionend never
  fires (the `prefers-reduced-motion` case).
- `useLayoutEffect([displayed, exiting])` flips `visible=true` after
  mount so the enter transition fires from the initial
  `opacity:0/translateY(2px)` values up to `opacity:1/translateY(0)`;
  clears it when `displayed` goes null so the next mount starts from
  the from-state.
- The existing "if `prevActive !== active` reset values + expanded"
  block now skips the reset when active goes null — the form stays
  showing its last-seen content through the fade.
- `onPopoverTransitionEnd` filters `propertyName === 'opacity'` AND
  `target === currentTarget` (only the form root, not bubbled
  transitionends from child inputs), and only acts when `exiting` is
  true (so post-reverse-in-flight transitionends don't spuriously
  unmount).
- Form root carries `data-testid='inline-feature-popover'` plus
  conditional `data-visible='true'` / `data-exiting='true'` attributes.
- Save/Cancel handlers now guard on `if (!active)` for safety —
  `pointer-events: none` is the primary defence, but a no-op guard is
  free insurance.
- The render guard switches from `if (!active) return null` to
  `if (!displayed) return null`. Title, field rendering, and customAction
  iteration now read from `displayed` instead of `active`.

**CSS (`InlineFeaturePopover.module.css`).**

```css
.popover {
  /* ... existing layout/palette/border properties ... */
  opacity: 0;
  transform: translateY(var(--motion-overlay-translate));
  transition:
    opacity   var(--motion-overlay-duration) var(--motion-overlay-ease-out),
    transform var(--motion-overlay-duration) var(--motion-overlay-ease-out);
}

.popover[data-visible='true'] {
  opacity: 1;
  transform: translateY(0);
}

.popover[data-exiting='true'] {
  opacity: 0;
  transform: translateY(var(--motion-overlay-translate));
  pointer-events: none;
  transition:
    opacity   var(--motion-overlay-duration) var(--motion-overlay-ease-in),
    transform var(--motion-overlay-duration) var(--motion-overlay-ease-in);
}

@media (prefers-reduced-motion: reduce) {
  .popover,
  .popover[data-exiting='true'] {
    transition: none;
  }
}
```

## Why `pointer-events: none` only during exit (not always)

The popover's content is interactive — inputs, selects, Save/Cancel
buttons all require pointer events. The exit phase is the only window
where the surface looks present (opacity fading from 1 to 0) but
shouldn't respond. Without the rule, a steward who pressed Cancel and
then immediately clicked where Save used to be could submit a form whose
store entry is already null — the handlers guard against this anyway,
but defense-in-depth from CSS removes the race from existing.

## Why the value-reset block now skips active=null

The 2026-05-29 ship's "reset values when prevActive !== active"
unconditionally reset to `{}` when active went null. With deferred
unmount, the form is still rendered through the fade — clearing values
would visually empty every input mid-fade. The new logic only resets
when active becomes a **new non-null payload**; active going null is
the exit signal and values stay frozen at their last-seen state until
`displayed` clears, at which point the form unmounts and the values are
moot anyway.

## Why bubble filtering matters here too

`InlineFeaturePopover` contains nested `<input>`, `<select>`, and
`<button>` elements, many of which have their own implicit transitions
(focus rings, hover states). Without `target === currentTarget`, a child
input's focus-ring transitionend could mid-fade trigger the
displayed-mirror cleanup. The filter ties the unmount strictly to the
form root's own opacity transition.

## Consequences

**Touched.**

- [apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css):
  fade machinery added to `.popover` (initial state) + new
  `[data-visible]` / `[data-exiting]` selectors + reduced-motion
  override.
- [apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx):
  three new state slots, two new effects, one new transitionEnd
  handler, render switched from `active` to `displayed`, value-reset
  skips active=null, handlers gated on active for safety.
- [apps/web/src/v3/plan/draw/__tests__/InlineFeaturePopover.test.tsx](../../apps/web/src/v3/plan/draw/__tests__/InlineFeaturePopover.test.tsx)
  (NEW): 4 tests covering cold-start render, mount-flip,
  close-then-transitionend unmount (with the transform-vs-opacity
  propertyName filter assertion), and reverse-in-flight restore.

**Preserved.**

- Schema-driven render — title, fields, customActions, required-field
  gate, disclosure expansion all unchanged.
- ESC + click-outside dismiss listeners still gated on `active` (auto-
  detach when active goes null; the exit window itself has no
  listeners).
- All Plan-stage tests in `src/v3/plan` (35 files, 274 tests) green.
- Tooltip tests unaffected (8/8 still green).
- `prefers-reduced-motion: reduce` users see instant dismissal as
  before (no transition declared, so transitionend doesn't fire — the
  200ms safety timeout still clears `displayed`).

**Unlocks.** Future map-overlay surfaces (e.g. a hover-card
drill-down per Slice M) can adopt the same `--motion-overlay-*`
tokens + `data-visible`/`data-exiting` pattern at birth.

**Out of scope.**

- The slide-up dialog used for written reports — that's a different
  surface class (slide-up animation, not fade) and a different
  interaction model.
- Cubic-bezier alignment of overlay surfaces with the project's
  `--ease-out` / `--ease-in` family (deferred per the Slice I ADR).
- Per-field exit animations within the popover (e.g. an animated
  field-remove). The form-level fade is sufficient for the dismissal
  case; per-field motion would be a separate design call.

## Verification

- `npx vitest run src/v3/plan src/features/agroforestry` — 274/274
  green (35 test files), including the 4 new InlineFeaturePopover
  tests + the 8 tooltip tests untouched.
- `npx tsc --noEmit` — zero new errors on touched files (pre-existing
  unrelated errors in `LandAssessmentSlideUp.tsx`,
  `AtlasAIPanel.tsx`, `HydrologyRightPanel.tsx`, etc. confirmed
  unchanged via baseline grep).
- Preview-server visual check was not possible in this worktree
  (vite resolves against worktree-root `node_modules` which doesn't
  exist); per project CLAUDE.md "say so rather than assuming success."
  The change is structurally identical to the 2026-05-30 tooltip ship
  whose contract is fully unit-test-covered.

## References

- Slice I — motion tokens this slice consumes:
  [2026-05-30-atlas-b4-motion-token-harmonisation.md](2026-05-30-atlas-b4-motion-token-harmonisation.md)
- Tooltip ship that established the deferred-unmount pattern:
  [2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md)
- Roadmap defining Slice J:
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
