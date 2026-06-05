# 2026-05-30 — B4 tooltip max-height scroll cap (Slice K)

**Status.** Accepted. Slice K of the B4 tooltip remaining-deferrals roadmap.

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

The 2026-05-27 multi-feature fan-out stacked overlapping host unions
into the same tooltip as separate `HostBlock` rows. Each block is
~108px tall, so once `entries.length` climbs past 4–5 the stack
overflows the viewport: the edge-clamp logic in
[HostCanopyUnionTooltip.tsx:154-166](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
can only flip the anchor top/bottom — it cannot truncate a stack
that's taller than the viewport itself. The bottom blocks visibly
clip below the canvas, and on touch devices with smaller viewports
the steward can't read the third or fourth host's numbers at all.

The roadmap called Slice K out as the highest-risk wave-C slice
because **any** scroll affordance requires the surface to capture
scroll events on its own scrollbar, which means `pointer-events:
auto`. That breaks the 2026-05-25 invariant ("tooltip MUST be
`pointer-events: none` so it doesn't steal the underlying union
layer's mouseleave event"). Without a carve-out path the slice
can't ship.

## Decision

Carve out the invariant **only** when the tooltip is pinned AND
`entries.length >= 4`. Below the threshold, or when the tooltip is
unpinned (hover mode), the surface retains `pointer-events: none`
and the 2026-05-25 invariant survives unchanged.

The carve-out is safe in the pinned-large-stack state because **the
union layer's mouseleave is only the dismiss signal in hover mode**.
When pinned, the dismiss signals are:
- `ESC` (document keydown listener — unaffected by tooltip's
  pointer-events).
- Click again on the host (MapLibre layer click — fires below
  pointer-events, but the tooltip's mouseleave is no longer the
  trigger).
- Tap outside the canvas (document `pointerdown` listener).

The third path needs an additional carve-out: a pointerdown on the
pinned scrollable tooltip would fall through the existing
`canvas.contains(target)` check (target isn't in the canvas) and
dismiss the very surface the steward is interacting with. The
handler in
[PlanDataLayers.tsx:2120-2127](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
adds a second exempt-path: `target.closest('[data-testid="host-canopy-union-tooltip"]')`
returns early without dismissing.

### Threshold = 4

Three hosts (`PER_BLOCK_H * 3 + BASE_H` ≈ 340px) comfortably fits a
1024×768 viewport even when anchored near the top edge. Four hosts
(~448px) starts to feel tight on shorter viewports; five
(~556px) regularly clips. The roadmap suggested "likely 4"; the
slice ships at exactly 4 so the carve-out engages just before the
clipping starts mattering. The constant is a single
`SCROLL_CAP_THRESHOLD = 4` in
[HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
so a future tuning round can adjust without touching consumers.

### Reserve = 80px

`max-height: calc(100vh - 80px)` matches the reserve the
existing edge-clamp logic intuitively assumes — 12px cursor gap +
8px viewport padding at top and bottom plus headroom for the
DesignToolRail family at the top of the canvas. Eyeballed against
a 720px viewport: 80px reserve leaves ~640px of usable height,
which is ~5.9 blocks — large enough to keep the carve-out feeling
like a "scroll if you must" rather than a constant scroll fight.

### Edge-clamp adjustment

When scroll-capped, the on-screen height is bounded by
`viewport - 80px`, not by `entries.length * PER_BLOCK_H`. Using
the raw multiplier in the edge-clamp would over-reserve and push
the anchor too far up (potentially off-screen at very small
viewports). New `scrollCapMaxH = Math.max(PER_BLOCK_H, viewportH -
SCROLL_CAP_RESERVE_PX)` (the `Math.max` guards against
pathologically short viewports where `viewportH - 80` would go
negative); `estimatedH = scrollable ? Math.min(rawEstimatedH,
scrollCapMaxH) : rawEstimatedH`.

## Why not WAAPI / `wheel`-event capture

The roadmap's alternative was: keep the tooltip
`pointer-events: none` always and translate `wheel` events on the
document into a CSS-variable-driven offset on a virtual scrollable
container. That preserves the 2026-05-25 invariant verbatim but
imports a lot of complexity:

- A `wheel` listener on the document with conditional
  `preventDefault` based on cursor position vs the tooltip
  bounding box.
- A new CSS variable + JS-driven offset for the scroll position.
- Re-implementation of overscroll/inertia/keyboard-scroll/
  scrollbar-drag behaviours that browsers give us for free with
  `overflow-y: auto`.
- Touch scrolling on tablets requires a separate `touchmove`
  pathway because `wheel` doesn't fire on touch.

The dual carve-out (CSS `pointer-events: auto` + tap-outside
exempt) ships in ~10 lines and preserves the steward's expected
scrollbar/touch-scroll/keyboard-scroll affordances. The narrow
carve-out window (pinned AND 4+ hosts) means the invariant holds in
every state the steward encounters during normal hover flow.

## Why not gate the carve-out on `pinned` AND viewport-bound rather than entry count

The user-visible problem is "the stack runs off the screen," which
is a function of `entries.length * PER_BLOCK_H` vs `viewportH`, not
`entries.length` alone. A 3-host stack on a 320px viewport clips;
a 7-host stack on a 4K monitor doesn't. The cleaner predicate is
`scrollable = pinned && rawEstimatedH > scrollCapMaxH`.

Decided against it for now because (a) entries.length is a stable
signal across viewport changes — the steward who pinned at one
viewport size keeps a consistent surface if they resize, and (b)
the test surface stays simpler. If feedback shows the threshold is
wrong for small viewports, a follow-up can swap the predicate to
the viewport-aware form without changing the data-attribute
contract.

## Why expose the testid in the dismiss handler

The tooltip is portalled into the document body (via the existing
2026-05-25 portal mount), not nested inside the canvas container.
PlanDataLayers can't hold a ref to a component it doesn't render
directly. The cleanest contract is a stable `data-testid` on the
tooltip root (already present from prior tests) used as the
selector for the tap-outside exemption. The testid doubles as the
production query — there's no separate "production marker" needed.

## Consequences

**Touched.**

- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  new `.tooltip[data-scrollable='true']` rule with `max-height:
  calc(100vh - 80px)`, `overflow-y: auto`, and
  `pointer-events: auto`. Existing `.tooltip` rule gains
  `box-sizing: border-box` so the max-height reserve works as
  intended with padding. Paragraph-length CSS comment cross-
  references this ADR.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  new `SCROLL_CAP_THRESHOLD = 4` and `SCROLL_CAP_RESERVE_PX = 80`
  constants; new `scrollable = !!pinned && entries.length >=
  SCROLL_CAP_THRESHOLD` derivation; edge-clamp `estimatedH` now
  bounded by `scrollCapMaxH` when scrollable; new conditional
  `data-scrollable='true'` data-attr on the root.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  `onDocPointerDown` exempts pointerdowns whose target is inside
  `[data-testid="host-canopy-union-tooltip"]` so scrolling the
  tooltip doesn't dismiss it.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  +4 tests under a new `scroll-cap carve-out (Slice K)` describe
  block: below-threshold pinned, above-threshold unpinned, exact-
  threshold pinned, very tall pinned with edge-clamp regression
  guard.

**Preserved.**

- 2026-05-25 invariant for the entire hover surface and for pinned
  1–3 host stacks: `pointer-events: none`, mouseleave-driven
  dismiss, no scroll-cap.
- 2026-05-26 single-pin semantics.
- 2026-05-27 multi-feature fan-out semantics (set-equality toggle,
  replace-on-different-set).
- 2026-05-28 + 29 + 30 fade machinery: enter, exit, per-block, and
  reverse-in-flight all unchanged.
- ESC + canvas-tap dismissal — both untouched. The new exemption
  in `onDocPointerDown` is purely additive: anything outside the
  canvas AND outside the tooltip still dismisses.
- `prefers-reduced-motion: reduce` behaviour.
- All B4 surface invariants from earlier ADRs.

**Unlocks.** Slice L (multi-pin) — once a pinned tooltip can be
scrolled, the design conversation around per-block pinned state
becomes coherent (otherwise multi-pin with 5+ pins would also
overflow). Slice M (hover-card drill-down) — the same
`pointer-events: auto` carve-out approach can extend to a drill-
down panel sibling once Slice L lands.

**Out of scope.**

- Multi-pin (Slice L) — separate slice, depends on this one.
- Hover-card drill-down (Slice M) — depends on L.
- Viewport-aware predicate (mentioned in "Why not gate on
  viewport-bound") — deferred until a feedback loop suggests the
  fixed threshold is wrong.
- Sticky block headers when scrolling (would help a steward who
  scrolls past the host-name) — separate UX call.
- Keyboard arrow-key navigation between blocks — separate
  accessibility slice.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx`
  — 12/12 green (8 prior + 4 new).
- `npx vitest run src/v3/plan src/features/agroforestry` —
  278/278 green (35 files; +4 over the Slice J ship).
- `npx tsc --noEmit` — zero new errors on the three touched
  files. Pre-existing unrelated errors elsewhere in the tree
  (LandAssessmentSlideUp, AtlasAIPanel, HydrologyRightPanel, etc.)
  confirmed unchanged via baseline grep.
- Preview-server visual check not possible in this worktree (Vite
  resolves against worktree-root `node_modules` which doesn't
  exist); per the project CLAUDE.md instruction "say so rather
  than assuming success." The data-attribute contract is unit-
  test-covered (every state transition pinned by an explicit
  assertion); the visible-scrolling affordance relies on browser-
  native `overflow-y: auto` behaviour which doesn't require a
  custom test.

## References

- Roadmap defining Slice K (max-height scroll cap):
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
- 2026-05-25 invariant this carves out from:
  [2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
- Slice J ship that bookended this wave-C entry point:
  [2026-05-30-atlas-b4-inline-popover-exit-fade.md](2026-05-30-atlas-b4-inline-popover-exit-fade.md)
