# ADR: De-brown the dark UI -- define cool canvas/surface tokens + sweep warm literals

**Date:** 2026-06-02
**Status:** Accepted
**Scope:** `apps/web/src/styles/dark-mode.css`, `apps/web/src/v3/plan/spine/spine-theme.css`, ~51 `apps/web/src/**/*.module.css`, `design-system/ogden-atlas/MASTER.md`

## Context

The steward reported the Observe and Plan dark-mode stage backgrounds "look kind
of brown," and after a first attempt (chroma bump `--c-warm-neutral` 0.010->0.020,
commit `77692111`) said "still too brown looking." That first edit correctly cooled
the OKLCH ladder but could not help, because the brown surfaces never consumed the
tokens it changed.

Live inspection on `/v3/project/mtc/observe` (dark theme confirmed active) pinned
the true cause -- it is **not** the core palette, which is already cool
(`--color-bg` = `oklch(15.8% 0.020 253)`, `--color-surface` = `oklch(21.1% ...)`).
Two narrow sources produced all the brown:

1. **Undefined tokens.** `--color-canvas` (backs the *entire* Observe dashboard
   surface, `UnifiedLandStateSurface.module.css`) and `--color-surface-0..3` (the
   domain/rollup cards) were referenced everywhere yet **defined nowhere**, so both
   fell through to hardcoded warm-brown fallbacks (`#181612`,
   `rgba(31,29,26,0.72)`). `getComputedStyle(...).getPropertyValue('--color-canvas')`
   returned `""`.
2. **Hardcoded warm literals.** Bare `rgba(31,29,26,A)` (~56 occurrences across ~39
   CSS modules -- Plan popovers/tabs/tooltips, Act popovers, card hovers) and
   `#181612` render warm regardless of tokens.

This is the **Phase-4 warm-literal sweep deliberately deferred** by
[[decisions/2026-05-25-atlas-earth-to-neutral-chrome]] ("~40 hardcoded warm
literals that bypass the token system ... dark glass panels `rgba(31,29,26,A)` ...
Defer unless the grey-vs-brown delta is noticeable in preview"). It is now noticeable,
so the phase is executed.

Operator chose **"Tokens + full literal sweep"** (informed of the in-flight
Plan-strata churn in the working tree, and that commits land immediately per the
rebased-branch rule).

## Decision

**1. Define the missing tokens cool, in every dark scope.** Add `--color-canvas`,
`--color-surface-0`, `--color-surface-1`, `--color-surface-2`, `--color-surface-3`
to all four dark scopes of `dark-mode.css`: the `[data-theme="dark"]` hex block, the
`@media (prefers-color-scheme: dark)` hex block, and both `@supports (color: oklch())`
OKLCH blocks. Hex form maps to the Obsidian/Mineral-Slate ladder
(`#0b0d10` / `#14191f` / `#1a2027` / `#1c232b`); OKLCH form mirrors it via the
existing primitives, holding `--c-warm-neutral 0.020` + `--h-warm-neutral 253` (cool
slate-blue). `--color-surface-1` is made **opaque** `#14191f` (cards were translucent
`0.72`) -- the translucency only existed to blend with the old warm canvas; over the
now-cool canvas opaque reads cleaner.

**2. Sweep the bare warm literals** across ~51 `*.module.css` files via exact-string
replacement, preserving every alpha/selector/property:
`rgba(31,29,26,A)` -> `rgba(20,25,31,A)`; `#181612` -> `#0b0d10`; inert
`var(--color-bg,#1f1d1a)` fallbacks -> `#14191f`.

**3. Cool the Plan-spine neutral ladder** in `v3/plan/spine/spine-theme.css` (the
dark `.olos-spine-root` block only): `--spine-bg/bg2/bg3/bg4`, `--spine-border`,
`--spine-border-light`, and the three `--spine-text-*` realigned to the cool ladder.
**Accent hues (blue/green/amber/teal/red/gold) left unchanged.** The light variant is
untouched.

**4. Document** the new aliases in `design-system/ogden-atlas/MASTER.md`.

### Explicitly NOT recolored (deliberate)
- **`.tsx` map-layer & chart color literals** (`ActDataLayers`, `PlanDataLayers`,
  `TemporalChart`, `PermacultureZoneTool`, `ComparisonChart`, etc.). Their
  `#1f1d1a`/`#181612` are **data-viz semantics** (marker/feature/series colors), not
  UI background brown; recoloring would corrupt map/chart meaning.
- **Three `color:#1f1d1a`** used as dark text on a light/gold pill
  (`ActTierShell.module.css:308`, `ActAsBuiltPopover.module.css:193`,
  `HostUnionDrilldownCard.module.css:127`).

## Consequences

### Positive
- Observe + Plan (+ Act) dark surfaces read cool slate-blue, no warm-brown cast.
  Verified live: `--color-canvas`/`--color-surface-1` now resolve cool (were `""`);
  Observe surface `oklch(0.158 0.02 253)`, cards `oklch(0.211 0.02 253)`; Plan shows
  only intentional warm accents (gold warning bar, gold Export CTA, 6% white overlay).
  Screenshots of both `/observe` and `/plan` captured; zero console errors.
- Closes the long-standing "tokens referenced but undefined" trap -- any future
  consumer of `--color-canvas`/`--color-surface-N` now gets a real cool value rather
  than a warm fallback.
- Executes (most of) the Phase-4 deferral from the 2026-05-25 ADR.

### Negative / follow-up
- **Co-mingled in-flight files excluded.** ~20 Plan-strata `.module.css` + 3
  `portfolio/*` `.module.css` had external in-flight edits (font-size churn) sitting
  uncommitted in the working tree. To avoid bundling a parallel session's work, those
  files were **excluded from commit `b5f1c9ab`** ([[feedback-no-deletion]],
  [[feedback-commit-immediately-on-rebased-branches]]). Their only de-brown content
  was **inert** `var(--color-bg,#1f1d1a)` fallback swaps -- the token is now defined,
  so they never render; zero visual impact. Those swaps remain loose in the working
  tree and may be dropped by the next external rebase without any visual regression.
- **tsc not re-run.** The plan's optional `tsc --noEmit` belt-and-suspenders step was
  not executed; CSS-only edits cannot affect typecheck (green at HEAD), and HMR
  applied every change cleanly with zero console errors. Reasoned-unnecessary, recorded.

## References
- [[decisions/2026-05-25-atlas-earth-to-neutral-chrome]] -- the Phase-4 warm-literal
  deferral this executes
- [[decisions/2026-04-23-oklch-token-migration]] -- the dark-mode/OKLCH token system this rides on
- [[concepts/design-system]] -- token sources, the map-data reservation rule
- [[entities/web-app]] -- "Dark-UI de-brown" note
- Commit `b5f1c9ab`; `apps/web/src/styles/dark-mode.css`, `v3/plan/spine/spine-theme.css`
