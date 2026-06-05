# 2026-05-30 — B4 motion-token harmonisation

**Status.** Accepted. Slice I of the [B4 tooltip remaining-deferrals
roadmap](../log/2026-05-30-b4-tooltip-perblock-fade-and-reverse.md).

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

The [2026-05-30 per-block fade + reverse-in-flight ADR](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md)
shipped four transition declarations on `HostCanopyUnionTooltip.module.css`
with the same hard-coded literals repeated in every rule:

- duration `120ms` (× 4 rules × 2 properties = 8 sites)
- translateY magnitude `2px` (× 3 sites)
- easing `ease-out` (enter / reverse-to-visible) and `ease-in` (exit) — 2
  CSS keywords, 4 sites each

Slice I of the [roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md)
makes this harmonisation a prerequisite for Slice J (InlineFeaturePopover
exit fade) so the second consumer adopts the tokens **at birth** instead
of needing a later refactor when a third consumer arrives.

## Decision

Extract the four overlay-motion literals into a new
`--motion-overlay-*` token family declared on `:root` in
[apps/web/src/styles/tokens.css](../../apps/web/src/styles/tokens.css)
alongside the existing `--duration-*` and `--ease-*` families:

```css
--motion-overlay-duration:  120ms;
--motion-overlay-translate: 2px;
--motion-overlay-ease-out:  ease-out;
--motion-overlay-ease-in:   ease-in;
```

[HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
rewrites all four transition declarations + the three `translateY` sites
to consume the tokens via `var(...)`. The `prefers-reduced-motion: reduce`
override is unchanged (still nulls `transition` on the same four
selectors — no per-token override needed since reduced-motion treats the
whole transition as if it weren't declared).

Tokens.css is already imported once at the app root via
[app/index.css](../../apps/web/src/app/index.css:6) and CSS custom
properties propagate through the cascade into CSS-Modules-scoped class
names, so no additional import wiring is needed and no module-local
fallback is required.

## Why a new `--motion-overlay-*` family (rather than reusing `--duration-*` / `--ease-*`)

Three options were considered:

1. **Reuse existing tokens** — quantize 120ms → `--duration-fast` (100ms)
   or `--duration-base` (200ms), swap the bare `ease-out`/`ease-in` CSS
   keywords for the cubic-bezier `--ease-out`/`--ease-in` tokens.
   - **Pro:** strictly fewer tokens, true harmonisation across all
     animated surfaces.
   - **Con:** changes the visual timing of every tooltip frame — the
     2026-05-30 ship was tuned to 120ms specifically because 100ms felt
     snappy and 200ms felt draggy under cursor motion. Swapping
     `ease-out` (CSS keyword: `cubic-bezier(0, 0, 0.58, 1)`) for the
     project's `--ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) changes the
     deceleration profile. Both are subtle, but together they'd ship a
     visual change as part of a "refactor only" slice.
   - **Decision:** rejected — visual delta is a separate design call,
     not a token-extraction call.

2. **New overlay-scoped tokens preserving today's literals** (chosen).
   - **Pro:** strict refactor — zero visual change, future Slice J
     adopts the same tokens immediately, future overlay surfaces share
     one knob.
   - **Con:** adds four new `:root` tokens that may eventually be
     unified with `--duration-*` / `--ease-*` once the visual delta
     is verified.
   - **Decision:** accepted. The next ADR (post-Slice J) can revisit
     whether overlay surfaces should align onto the cubic-bezier family,
     with a verification pass that confirms the new curves still feel
     right under cursor motion.

3. **TypeScript constants module exporting numeric values** that the
   tooltip + popover import.
   - **Pro:** type-checked; can be referenced from JS (e.g. for a
     `setTimeout` slack that already knows the transition duration).
   - **Con:** CSS Modules can't reference TS values; we'd need either
     inline `style={{ transition: ... }}` (loses CSS-Modules scoping
     guarantees) or a build-time CSS-in-JS pipeline (overkill for four
     literals). Also fragments the source-of-truth between CSS and TS.
   - **Decision:** rejected — the 200ms safety timeout in
     [PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
     does duplicate `--motion-overlay-duration + slack`, but that's a
     single literal in a single place and the slack is the load-bearing
     part. If a second JS consumer materialises we'll revisit.

The chosen `:root` location matches the roadmap's recommendation of
"least disruptive": new tokens land in the same file that already holds
`--duration-*` / `--ease-*`, under a clearly-labelled subsection with a
comment explaining the deferred-harmonisation-with-cubic-bezier question.

## Why these four tokens specifically (not more, not fewer)

Three values + two easings would be five. Five was reduced to four by
recognising that the two easings (`ease-out` for enter and reverse,
`ease-in` for exit) **are not the same**: the enter motion accelerates
toward the visible state (the surface arrives), and the exit motion
decelerates away from it (the surface leaves). Coalescing them into a
single `--motion-overlay-ease` would require the consumer to pass
direction context, which CSS variables can't carry.

Three durations were *not* introduced (e.g. `enter-duration`,
`exit-duration`, `reverse-duration`) because the 2026-05-30 ship uses a
single 120ms across all three intent paths — different durations would
be a design change, not a token extraction.

## Consequences

**Touched.**

- [apps/web/src/styles/tokens.css](../../apps/web/src/styles/tokens.css):
  four new `--motion-overlay-*` tokens added under the TRANSITIONS
  section with a paragraph-length comment documenting why they exist as
  a separate family and what the future-harmonisation question is.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css):
  four transition declarations + three translateY sites rewritten as
  `var(...)` calls. The header comment for `.tooltip` gains a sentence
  noting the token source.

**Preserved.**

- Every visual property: duration, translate magnitude, easing curves
  — all literal values unchanged.
- `prefers-reduced-motion: reduce` override unchanged.
- All B4 tooltip invariants from the
  [2026-05-30 ADR](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md)
  hold (pointer-events: none, single-pin, ESC + tap-outside dismiss,
  multi-feature fan-out, edge-clamp, per-block fade, reverse-in-flight).
- 8/8 tooltip tests + 63/63 agroforestry tests green.

**Unlocks.**

- Slice J (InlineFeaturePopover exit fade) can adopt the same tokens at
  birth, so the two map-overlay surfaces fade in sync without any
  literal duplication.

**Out of scope.**

- Cubic-bezier alignment (revisit after Slice J's adoption verifies the
  current curves feel right with two consumers).
- Light-mode-only / dark-mode-only token overrides — overlay surfaces
  use a dark-glass palette in both modes, so a single value suffices.
- A `--motion-modal-*` / `--motion-toast-*` / etc family for other
  surface classes — defer until a second consumer in that class needs
  a fade.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx`
  — 8/8 green (no test changes; the contract tests only assert
  data-attrs and event handling, which is unchanged).
- `npx tsc --noEmit` — zero new errors on touched files.
- Preview server visual check — see end-of-session log entry for
  details.

## References

- Per-block fade + reverse-in-flight ADR:
  [2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md](2026-05-30-atlas-b4-tooltip-perblock-fade-and-reverse.md)
- Exit fade ship that introduced the literal `120ms`/`ease-in`/`ease-out`:
  [2026-05-29-atlas-b4-tooltip-exit-fade.md](2026-05-29-atlas-b4-tooltip-exit-fade.md)
- Roadmap defining Slice I:
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
