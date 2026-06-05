# 2026-05-24 — Stage compass wheel fills its space + True North banner clears the header

**Branch.** `feat/atlas-permaculture`. One explicit-path commit `73d2678e` (two CSS files).

## Why

Two steward-reported UI-polish defects on the Observe Stage Compass surface:

1. The **True North advisory banner** ("Define your True North first — N% done…") was partially hidden behind the global top header — its top half clipped, only the lower text readable.
2. The **stage compass wheel** rendered small (~440px) inside a much larger center column; steward asked it to "expand to fit page and not limit its max size."

## What shipped

**`apps/web/src/v3/true-north/TrueNorthAdvisoryBanner.module.css`.** The banner is `position: fixed` and was pinned at `top: var(--space-4)` (16px). The AppShell header (`apps/web/src/app/AppShell.module.css` `.header { height: 48px }`) sits at `z-index: var(--z-sticky)` (200) vs the banner's `z-index: 60`, so the header overpainted the banner's top. Changed `top` → `calc(48px + var(--space-3))` (60px) = 12px below the header. (Note: project pages still render the AppShell header because `isProjectPage` checks `/project/` but the live route prefix is `/v3/project/` — so `!isProjectPage` is true and the header shows.) No `--header-height` token exists, so the 48px literal mirrors `.header`.

**`apps/web/src/v3/compass/ObserveCompassWheel.module.css`.** The wheel was double-capped: our host `.wheelHost { max-width: 440px }` and the shared `@ogden/ui-components` `MaqasidComparisonWheel`'s own `.mcw-svg { max-width: 540px }`. Sizing chain: `StageCompassView .center` (flex column, padding `--space-6`, `overflow:auto`) → `.wheelHost` (flex:1, definite height) → `ObserveCompassWheel .wheelHost` (#cw-r1) → `.mcw-wrap` → `svg.mcw-svg` (width:100%, height:auto, square via `viewBox 0 0 400 400`). Replaced the fixed cap with a **height-driven square fit**: `height: 100%; aspect-ratio: 1; max-width: 100%` so the host sizes to `min(available width, available height)` and stays square; added a `:global(.mcw-svg) { max-width: 100% }` override to lift the shared 540px cap. Shared by **Observe/Plan/Act** compasses (all three use `StageCompassView` + `ObserveCompassWheel`), so the change applies uniformly.

Key correction during work: an initial `width: 100%` + `aspect-ratio: 1` + `max-height: 100%` formulation **overflowed vertically** at wide viewports (explicit width pins the box at column width, aspect-ratio sets height taller than the cell, and `max-height` can't scale a box whose width is already definite). Switching to `height: 100%` (no explicit width) lets `aspect-ratio` + `max-width: 100%` scale the square down uniformly on portrait cells — the canonical fit pattern.

## Verification

Live preview (`/v3/project/mtc/compass`), computed-style + `getBoundingClientRect` probes and screenshots in three viewports:
- **1920×1080**: wheel **944×944** (was capped ~440), square, height-limited, fits both axes, exceeds the old 540 cap (proves both caps lifted), no overflow.
- **~1137 (narrow desktop)**: 449×449, fills the column width.
- **375 mobile**: 300×300, square, single-column layout intact (`.body` switches to one column < 1024px) — no collapse.
- Banner: `top: 60px`, `clearsHeader: true`, full text + both buttons visible.

`mtc`'s True North is complete (`ready=true`) so the banner is normally suppressed; to surface it for verification the project's `ogden-true-north` localStorage profile was **temporarily blanked then restored byte-for-byte** (576 bytes) — no persistent data change.

## Discipline notes

Committed as a single slice the moment it verified, staging **only** the two CSS files by explicit path per [[feedback-commit-immediately-on-rebased-branches]]; the large pre-existing foreign WIP (`EconomicsPanel*`, `CapitalPartnerSummaryExport`, `capitalPartner*`, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `MapCanvas`, the `*Map.tsx` trio, `SectorCompassDiagram*`, `launch.json`, `tokens.css`/`dark-mode.css`, `_sweep_out.txt`) left untouched per [[feedback-no-deletion]]. Fetched + checked divergence before pushing (0 behind / ahead of upstream). Pure presentation (no schema/store/model/migration) — covenant clean; 3-item Observe/Plan/Act IA unchanged. One known non-blocker noted to steward: the center hotspot/hint uses fixed-px offsets that don't scale with the now-larger wheel. Plans: `~/.claude/plans/there-s-a-floating-message-sprightly-sparkle.md` (banner).
