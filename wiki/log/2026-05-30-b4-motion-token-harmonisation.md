# 2026-05-30 — B4 motion-token harmonisation (Slice I)

**Branch.** `feat/atlas-permaculture`. Closes Slice I of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md).
Full design context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-motion-token-harmonisation.md).

**What changed.**

- [apps/web/src/styles/tokens.css](../../apps/web/src/styles/tokens.css):
  four new `--motion-overlay-*` tokens declared on `:root` under the
  TRANSITIONS section:
  - `--motion-overlay-duration: 120ms;`
  - `--motion-overlay-translate: 2px;`
  - `--motion-overlay-ease-out: ease-out;`
  - `--motion-overlay-ease-in: ease-in;`
  Paragraph-length comment documents (a) why they exist as a separate
  family rather than reusing `--duration-*` / `--ease-*` (different
  cubic-bezier curves; would ship a visual change as a "refactor only"
  slice), and (b) the deferred-harmonisation question for a future ADR
  to revisit once Slice J adopts the same tokens.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  four `transition: ...` declarations + three `translateY(2px)` sites
  rewritten as `var(...)` calls. The `.tooltip` rule's header comment
  gains a sentence pointing to `tokens.css` as the source of truth.
  `prefers-reduced-motion: reduce` block unchanged — it nulls
  `transition` entirely, not per-property, so no token override needed.

**Why a new `--motion-overlay-*` family, not reuse `--duration-*` / `--ease-*`.**

The existing duration ladder is 100/200/400/600ms — none matches the
2026-05-30 tooltip's 120ms, which was tuned specifically because 100ms
felt snappy and 200ms felt draggy under cursor motion. The existing
`--ease-out` / `--ease-in` tokens are cubic-beziers
(`cubic-bezier(0, 0, 0.2, 1)` / `cubic-bezier(0.4, 0, 1, 1)`) and the
tooltip ships with the bare CSS keywords `ease-out` / `ease-in`
(`cubic-bezier(0, 0, 0.58, 1)` / `cubic-bezier(0.42, 0, 1, 1)`).
Coercing to either family would change deceleration profile + frame
timing simultaneously — a visual change shipped under a "token
extraction" header. New `--motion-overlay-*` family preserves the
literals verbatim and reserves the cubic-bezier alignment question for
a follow-up ADR after Slice J (InlineFeaturePopover) has adopted the
same tokens and the two consumers are both observable.

**Why CSS custom properties, not a TypeScript constants module.**

CSS Modules can't reference TS values without either inline
`style={{}}` (loses CSS-Modules scoping) or a build-time CSS-in-JS
pipeline (overkill for four literals). The 200ms safety timeout in
[PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
does duplicate `--motion-overlay-duration + slack`, but the slack is the
load-bearing part (it absorbs event-loop jitter and the
`prefers-reduced-motion` instant-change case where transitionend doesn't
fire), and the duplication is one literal in one place. If a second JS
consumer materialises we'll revisit.

**Tooltip surface invariants preserved.** Every literal value
unchanged: duration (120ms), translate magnitude (2px), easing
(`ease-out` enter/reverse-to-visible, `ease-in` exit). All B4
invariants from the 2026-05-30 per-block fade + reverse-in-flight ADR
hold: `pointer-events: none`, single-pin, ESC + tap-outside dismiss,
multi-feature fan-out, edge-clamp + entries-aware `ESTIMATED_H`,
per-block fade, reverse-in-flight. `prefers-reduced-motion` behaviour
unchanged.

**Verification.**
- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx`
  — 8/8 green (no test changes; the contract tests only assert
  data-attrs and event handling, both untouched).
- `npx tsc --noEmit` — zero new errors on touched files.
- Preview-server visual check confirmed the tooltip fades visually
  identically to the pre-extraction ship (duration + curves
  indistinguishable by eye).

**Out of scope.** Cubic-bezier alignment of overlay surfaces with the
project's `--ease-out` / `--ease-in` family (revisit post-Slice J).
Light-mode-only / dark-mode-only token overrides (overlay surfaces use
a dark-glass palette in both modes). A `--motion-modal-*` /
`--motion-toast-*` family (defer until a second consumer in that surface
class needs a fade). All other prior deferrals from earlier B4 ADRs
remain deferred per [the roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md).
