# 2026-05-30 — B4 InlineFeaturePopover exit fade (Slice J)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice J of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md),
consuming the `--motion-overlay-*` tokens added in
[Slice I](2026-05-30-b4-motion-token-harmonisation.md). Full design
context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-inline-popover-exit-fade.md).

**What changed.**

- [apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.module.css):
  the `.popover` rule gains a from-state (`opacity: 0` + `translateY(var(--motion-overlay-translate))`)
  and a transition consuming the Slice I tokens. New
  `.popover[data-visible='true']` selector targets the visible state
  (opacity 1 / translateY 0). New `.popover[data-exiting='true']`
  selector mirrors the from-state, switches the easing token to
  `--motion-overlay-ease-in`, and adds `pointer-events: none` so a
  mid-fade click on a fading Save/Cancel button is physically
  impossible. A `prefers-reduced-motion: reduce` block nulls both
  transitions so reduced-motion users see instant dismissal as before.
- [apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx):
  three new state slots (`displayed`, `exiting`, `visible`), two new
  effects (a `useEffect([active])` mirror driver and a
  `useLayoutEffect([displayed, exiting])` mount-flip), one new
  `onTransitionEnd` handler filtering on
  `propertyName === 'opacity'` AND `target === currentTarget` AND
  `exiting === true`. The render guard now reads `displayed` instead
  of `active` so the form stays mounted through the exit fade. The
  existing value-reset block now skips `active === null` so the
  form's content remains visible mid-fade. Save/Cancel handlers gate
  on `if (!active)` for defense-in-depth alongside the CSS
  `pointer-events: none`.
- [apps/web/src/v3/plan/draw/__tests__/InlineFeaturePopover.test.tsx](../../apps/web/src/v3/plan/draw/__tests__/InlineFeaturePopover.test.tsx)
  (NEW): four tests pinning the exit-fade contract — cold-start
  renders nothing; `open()` mounts with `data-visible='true'`;
  `close()` flips `data-exiting='true'`, transform-property
  transitionend does NOT unmount but opacity-property transitionend
  does; reverse-in-flight `open()` during the exit window restores
  the form and a subsequent opacity transitionend does not spuriously
  unmount (because `exiting` is already false).

**Why this surface, why now.** Slice J was deliberately ordered after
Slice I so the second overlay consumer would adopt the
`--motion-overlay-*` tokens at birth rather than needing a later
refactor. The 2026-05-30 host-canopy-union tooltip ship gave the
hover tooltip a deferred-unmount exit fade; the InlineFeaturePopover
adopting the same machinery closes the "consistency across overlays"
gap the roadmap called out as the motivation for landing Slice I
before this slice.

**The interactivity invariant difference.** The tooltip is
`pointer-events: none` — its invariant is "must never steal events
from the underlying layer." The popover is `pointer-events: auto` —
it owns inputs, Save, Cancel, custom actions. So the tooltip's
invariant doesn't transfer. A new invariant arrives instead: **a
mid-fade click on a fading button must not race the displayed-mirror
cleanup.** Defense-in-depth: the exit-state CSS rule drops
`pointer-events: none` (primary defence), and the Save/Cancel
handlers also guard on `if (!active)` (free insurance — the store
entry has already been cleared by the time exit starts).

**Why the value-reset block now skips active=null.** The pre-fade
"reset values when prevActive !== active" block unconditionally
cleared `values` when `active` went null. With deferred unmount, the
form renders through the fade — clearing values would visually empty
every input mid-fade. The new logic only resets when active becomes
a **new non-null payload**; active going null is the exit signal and
values stay frozen until `displayed` clears, at which point the form
unmounts and the values are moot.

**Why the transitionEnd handler filters on three conditions.** The
popover contains nested `<input>`, `<select>`, and `<button>`
elements, many with their own implicit transitions (focus rings,
hover states). Without `target === currentTarget`, a child's
focus-ring transitionend could trigger the mirror cleanup
mid-animation. Without `propertyName === 'opacity'`, the transform
property's transitionend (the other interpolated property) would
also trigger cleanup — once per dismissal, but at a
non-deterministic moment relative to the opacity transitionend.
Without `if (!exiting) return`, a post-reverse-in-flight
transitionend could spuriously unmount a restored form.

**Verification.**
- `npx vitest run src/v3/plan src/features/agroforestry` — 274/274
  green (35 test files), including the 4 new InlineFeaturePopover
  tests and the 8 tooltip tests untouched.
- `npx tsc --noEmit` — zero new errors on touched files. The
  pre-existing unrelated errors in
  `LandAssessmentSlideUp.tsx`, `AtlasAIPanel.tsx`,
  `HydrologyRightPanel.tsx` etc. confirmed unchanged via baseline
  grep.
- Preview-server visual check was not possible in this worktree
  (Vite resolves against worktree-root `node_modules` which doesn't
  exist); per the project CLAUDE.md instruction "say so rather than
  assuming success." The change is structurally identical to the
  2026-05-30 tooltip ship whose contract is fully unit-test-covered,
  and the new tests pin every observable state transition.

**B4 surface invariants preserved.** Schema-driven render (title,
fields, customActions, required-field gate, disclosure expansion)
unchanged. ESC + click-outside dismiss listeners still gated on
`active` (they auto-detach when active goes null; the exit window
itself has no listeners — correct, because the form is no longer
interactive). All Plan-stage tests (35 files, 274 tests) green.
Tooltip tests unaffected (8/8 still green).

**Out of scope.** The slide-up dialog used for written reports (a
different surface class — slide-up animation, not fade). Cubic-bezier
alignment of overlay surfaces with the project's `--ease-out` /
`--ease-in` family (deferred per the Slice I ADR; revisit when a
third consumer arrives). Per-field exit animations within the
popover (form-level fade is sufficient for dismissal; per-field
motion is a separate design call). All other prior deferrals from
earlier B4 ADRs remain deferred per [the roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md).
