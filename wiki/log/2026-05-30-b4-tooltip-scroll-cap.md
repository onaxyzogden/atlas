# 2026-05-30 — B4 tooltip max-height scroll cap (Slice K)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice K of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md),
the highest-risk wave-C entry. Full design context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-scroll-cap.md).

**What changed.**

- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  new `.tooltip[data-scrollable='true']` selector adds
  `max-height: calc(100vh - 80px)`, `overflow-y: auto`, and
  `pointer-events: auto`. Base `.tooltip` rule gains
  `box-sizing: border-box` so the max-height reserve includes
  padding correctly. Paragraph-length CSS comment cross-references
  the ADR.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  two new module constants (`SCROLL_CAP_THRESHOLD = 4`,
  `SCROLL_CAP_RESERVE_PX = 80`); new
  `scrollable = !!pinned && entries.length >= SCROLL_CAP_THRESHOLD`
  derivation; edge-clamp `estimatedH` now bounded by
  `Math.min(rawEstimatedH, viewportH - SCROLL_CAP_RESERVE_PX)` when
  scrollable; new conditional `data-scrollable='true'` data-attr
  on the root.
- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx):
  `onDocPointerDown` now exempts pointerdowns whose target is
  inside `[data-testid="host-canopy-union-tooltip"]` so scrolling
  the scroll-capped pinned tooltip doesn't dismiss it. ESC +
  canvas-tap dismissal both still work — the carve-out is purely
  additive.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx):
  +4 tests under a new `scroll-cap carve-out (Slice K)` describe
  block — below-threshold pinned (no data-scrollable),
  above-threshold unpinned (no data-scrollable; invariant survives
  in hover mode), at-threshold pinned (data-scrollable='true'),
  very-tall pinned (regression guard on edge-clamp at viewport
  top).

**The invariant carve-out.** The 2026-05-25 invariant is
"`pointer-events: none` so the tooltip never steals the underlying
union layer's mouseleave." Slice K's carve-out engages only when
the tooltip is **pinned** AND **entries.length >= 4**. Below either
condition the invariant survives verbatim. Above both, the
invariant is moot because mouseleave is only the dismiss signal in
hover mode — when pinned, dismissal is via ESC, click-again-on-host,
or tap-outside-the-canvas-and-outside-the-tooltip, none of which
depend on the tooltip's pointer-events. Hover mode with 4+ hosts
accepts that the bottom of the stack may clip below the viewport
(rare; the steward can pin to scroll).

**Why threshold = 4.** Three hosts (~340px) fits a 768px viewport
comfortably even when edge-clamped near the top edge. Four
(~448px) gets tight on shorter viewports; five+ regularly clips.
The threshold sits exactly at the point where clipping starts to
matter. Single `SCROLL_CAP_THRESHOLD = 4` constant in the
component so a future tuning pass can move it without touching
consumers.

**Why 80px reserve.** `calc(100vh - 80px)` matches the existing
edge-clamp's intuitive budget — 12px cursor gap + 8px viewport
padding at top and bottom + headroom for the DesignToolRail family
above the canvas. On a 720px viewport that leaves ~640px usable,
roughly 5.9 blocks — enough that the carve-out feels like "scroll
if you must" rather than "scroll constantly."

**Why expose the testid in the dismiss handler.** The tooltip is
portalled into the document body (existing 2026-05-25 pattern), so
PlanDataLayers can't hold a ref to a component it doesn't render
directly. The data-testid already used by tests becomes the
production query selector — no separate "production marker"
required, no portal-aware ref forwarding needed.

**Why not WAAPI / wheel-event capture.** The roadmap mentioned a
zero-pointer-events alternative: capture `wheel` events on the
document and translate them into a CSS-variable offset on a virtual
scroll container. Preserves the 2026-05-25 invariant verbatim but
imports a lot of complexity (conditional preventDefault, separate
touchmove path, re-implemented overscroll/inertia, scrollbar-drag,
keyboard scroll). The dual carve-out ships in ~10 lines and gives
the steward every native scroll affordance — scrollbar, mouse
wheel, two-finger swipe, keyboard PageDown — for free. The narrow
carve-out window means the invariant still holds in every state
the steward encounters during normal hover flow.

**Verification.**
- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx`
  — 12/12 green (8 prior + 4 new).
- `npx vitest run src/v3/plan src/features/agroforestry` —
  278/278 green (35 files; +4 over the Slice J ship).
- `npx tsc --noEmit` — zero new errors on touched files;
  pre-existing unrelated errors elsewhere in the tree unchanged.
- Preview-server visual check not possible in this worktree
  (Vite resolves against worktree-root `node_modules` which
  doesn't exist) — stated explicitly per project CLAUDE.md "say so
  rather than assuming success." Data-attribute contract fully
  unit-test-covered; visible scrolling relies on browser-native
  `overflow-y: auto`.

**Invariants preserved.** 2026-05-25 (mouseleave-driven dismiss in
hover mode + pinned-small-stack), 2026-05-26 (single-pin),
2026-05-27 (multi-feature fan-out semantics), 2026-05-28 (touch
tap-outside dismiss), 2026-05-29 + 30 (enter + exit + per-block +
reverse-in-flight fade machinery), `prefers-reduced-motion`.

**Out of scope.** Multi-pin (Slice L — depends on K; per-block
pinned state). Hover-card drill-down (Slice M — depends on L).
Viewport-aware predicate (deferred until feedback suggests the
fixed threshold is wrong). Sticky block headers when scrolling.
Keyboard arrow-key navigation between blocks. All other prior
deferrals from earlier B4 ADRs remain deferred per [the roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md).
