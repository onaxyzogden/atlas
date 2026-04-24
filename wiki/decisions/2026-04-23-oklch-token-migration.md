# OKLCH token migration for dark-mode elevation and semantic hues

**Date:** 2026-04-23
**Status:** Accepted
**Scope:** `apps/web/src/styles/tokens.css`, `apps/web/src/styles/dark-mode.css`

## Context

UX Scholar audit (§2, §4) flagged two related gaps:

1. **Perceived-brightness drift** across overlay hues — hex-coded semantic tokens (`--color-primary`, `--color-success`, `--color-warning`, etc.) were authored for aesthetic fit, not equal luminosity, so some states visually pop more than others at the same "semantic weight."
2. **Elevation math is hand-encoded** — dark-mode surface tiers (`--color-bg` `#1a1611`, `--color-surface` `#2a2420`, `--color-surface-raised` `#342d26`) were eyeballed, not derived. Adding a new surface tier invites drift.

OKLCH is perceptually uniform: equal L → equal perceived brightness. Holding chroma + hue constant while varying only L gives us a predictable elevation ladder. Browser support (Chromium 111+, Safari 15.4+, Firefox 113+) is broad enough to ship as an opt-in override behind `@supports`.

## Decision

**Introduce OKLCH primitives at the top of `:root` in `tokens.css`:**

```css
--l-bg: 15.5%; --l-surface: 21%; --l-raised: 26.5%; --l-popover: 33%;
--c-warm-neutral: 0.010; --h-warm-neutral: 60;
--l-primary: 72%;   --c-primary: 0.08;  --h-primary: 80;
--l-accent:  60%;   --c-accent:  0.05;  --h-accent:  145;
--l-success: 64%;   --c-success: 0.10;  --h-success: 150;
--l-warning: 72%;   --c-warning: 0.13;  --h-warning: 85;
--l-error:   59%;   --c-error:   0.15;  --h-error:   30;
--l-info:    68%;   --c-info:    0.07;  --h-info:    235;
```

**Override the dark-mode surfaces + semantics in `dark-mode.css` behind `@supports (color: oklch(0 0 0))`:**

```css
@supports (color: oklch(0 0 0)) {
  :root[data-theme="dark"],
  :root:not([data-theme="light"]):is(.prefers-dark) {
    --color-bg:             oklch(var(--l-bg)      var(--c-warm-neutral) var(--h-warm-neutral));
    --color-surface:        oklch(var(--l-surface) var(--c-warm-neutral) var(--h-warm-neutral));
    --color-surface-raised: oklch(var(--l-raised)  var(--c-warm-neutral) var(--h-warm-neutral));
    --color-panel-bg:       oklch(var(--l-bg)      var(--c-warm-neutral) var(--h-warm-neutral));
    /* semantic hues likewise */
  }
  /* + matching block inside @media (prefers-color-scheme: dark) */
}
```

The hex declarations above the `@supports` block remain authoritative on unsupporting browsers.

## Why `@supports`?

The original plan proposed stacking hex + OKLCH declarations on the same property so older engines would fall through via cascade precedence. This does not work for CSS custom properties: their values are strings, not parsed colors. Both lines store; the OKLCH string shadows the hex; `var(--color-bg)` resolves to the OKLCH string on a non-supporting browser and computes to transparent.

`@supports` is the correct gate — the override block is skipped entirely on engines without OKLCH, so the hex declarations remain the computed value.

## Consequences

### Positive

- Elevation ladder is now derived from a single set of L values. Adding a new tier (e.g. `--color-popover`) is a one-line addition using the same `--c-warm-neutral` / `--h-warm-neutral` anchors.
- Semantic hues can be re-tuned for equal perceived brightness by adjusting L alone without re-picking chroma and hue.
- Hex fallbacks remain for browsers we don't target.

### Negative / follow-up

- Current OKLCH values are reverse-computed from existing hex for visual parity, not yet tuned for perceptual uniformity. A future pass should tighten semantic L values so `--color-success` and `--color-warning` read at equal weight.
- `--l-popover` (L=33) is defined but not yet mapped to a `--color-*` surface. Wait until a popover surface needs it — don't introduce the token speculatively.
- The `@supports` gate means on older browsers the ladder stays hex-authored and subject to drift if hex is ever changed without corresponding OKLCH update. Acceptable given Chromium 111+ / Safari 15.4+ / Firefox 113+ baseline.

## References

- Audit §2, §4 (`design-system/ogden-atlas/ui-ux-scholar-audit.md`)
- Implementation plan (`design-system/ogden-atlas/impl-plan-oklch-tooltip.md`)
- `apps/web/src/styles/tokens.css`, `apps/web/src/styles/dark-mode.css`
