# 2026-06-02 -- De-brown the dark UI: define cool canvas/surface tokens + sweep warm literals

**Branch:** `feat/atlas-permaculture`
**Plan:** "De-Brown the Observe & Plan (and Act) Dark UI" (approved 2026-06-02,
scope = "Tokens + full literal sweep").
**Commit:** `b5f1c9ab` -- 54 files, +139/-105 (**not pushed**).

## Context

Operator: "I do not like how the Observe and Plan stages UI background looks kind
of brown," and after a first attempt, "still too brown looking." The first attempt
(chroma `--c-warm-neutral` 0.010->0.020, `77692111`) cooled the OKLCH ladder but
did nothing visible -- the brown surfaces never consumed those tokens.

## Root cause (live-diagnosed, not guessed)

The dark theme WAS active and the core palette WAS already cool (`--color-bg` =
`oklch(15.8% 0.020 253)`). Two narrow sources produced every brown pixel:

1. **Undefined tokens rendering warm fallbacks.** `--color-canvas` (backs the whole
   Observe dashboard surface) and `--color-surface-0..3` (domain/rollup cards) were
   referenced everywhere yet defined nowhere -> fell through to hardcoded `#181612`
   / `rgba(31,29,26,0.72)`. `getComputedStyle` confirmed both returned `""`.
2. **Bare warm literals** -- `rgba(31,29,26,A)` (~56 occ / ~39 modules) + `#181612`
   in Plan/Act popovers, tabs, tooltips, card hovers.

This is the **Phase-4 warm-literal sweep deferred** by
[[decisions/2026-05-25-atlas-earth-to-neutral-chrome]] -- now executed.

## What shipped

- **`dark-mode.css`** -- defined `--color-canvas` + `--color-surface-0..3` cool in
  **all four** dark scopes (hex block, `prefers-color-scheme` hex block, two
  `@supports` OKLCH blocks). Hex = Obsidian `#0b0d10` / Mineral-Slate `#14191f`
  ladder; OKLCH mirrors via existing primitives at `--c-warm-neutral 0.020` /
  `--h-warm-neutral 253`. `--color-surface-1` made opaque `#14191f` (was translucent
  `0.72` to blend with the old warm canvas).
- **~51 `*.module.css`** swept: `rgba(31,29,26,A)`->`rgba(20,25,31,A)`,
  `#181612`->`#0b0d10`, inert `var(--color-bg,#1f1d1a)` fallbacks->`#14191f`.
- **`spine-theme.css`** -- cooled the dark `.olos-spine-root` neutral ladder
  (bg/border/text), accent hues unchanged, light variant untouched.
- **`MASTER.md`** -- documented the new canvas/surface aliases.

## Deliberately excluded / untouched

- **`.tsx` map-layer & chart color literals** -- data-viz semantics, NOT chrome;
  recoloring would corrupt maps/charts.
- **Three `color:#1f1d1a`** dark-text-on-gold-pill uses (ActTierShell,
  ActAsBuiltPopover, HostUnionDrilldownCard).
- **~20 Plan-strata + 3 portfolio `.module.css`** that had external in-flight
  font-size edits co-mingled in the working tree -- **excluded from the commit** so a
  parallel session's WIP was not bundled ([[feedback-no-deletion]]). Their only
  de-brown content was inert fallback swaps (token now defined -> never render); zero
  visual loss. Those swaps remain loose in the tree, droppable by the next rebase
  without regression.

## Verification

Live token check (cool, were `""`); warmth scan (Plan shows only intentional gold
accents); screenshots of `/v3/project/mtc/observe` (cool cards) + `/plan` (cool spine
S1-S7); zero console errors; HMR applied all CSS cleanly. `tsc --noEmit` not re-run
(CSS-only edits cannot affect typecheck, green at HEAD) -- reasoned, recorded in the
ADR.

## Commit shape

A CLEAN/MIXED classifier (count of non-color `+` lines per file) split the working
tree; only CLEAN swept files + the 3 fully-authored files (`dark-mode.css`,
`spine-theme.css`, `MASTER.md`) staged. Staged diff verified purely de-brown before
committing `b5f1c9ab`. Commit-only, not pushed
([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]).
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

## State after

Observe + Plan + Act dark surfaces read cool slate-blue with no warm cast. ADR
[[decisions/2026-06-02-atlas-dark-ui-de-brown]]; entity [[entities/web-app]].
