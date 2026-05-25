# Bound the Command Centre shell grid (definite height + clamped column)

**Date:** 2026-05-25
**Status:** Accepted
**Scope:** `apps/web/src/v3/command/shell/CommandCentreShell.module.css` (the `.shell` rule)

## Context

The Act Command Centre's bottom **"Open Work Items"** carousel rendered clipped at
the viewport bottom — but conspicuously **only** on the **All Modules** and
**Tracker** tabs. On the sparse per-module tabs (Build / Maintain / Livestock /
Harvest …) the tray rendered fully.

The surface is the shared, stage-agnostic `CommandCentreShell` used by
**Observe / Plan / Act** command centres. Its root `.shell` is a CSS grid
(`grid-template-rows: auto minmax(0,1fr) auto` = tabs / body / tray); `.body` is a
grid (`268px | minmax(0,1fr) | 340px` = sidebar / map / right rail). For
command-centre routes `V3ProjectLayout` returns a bare `<Outlet/>`, so `.shell` is
the sole, direct DOM child of AppShell's `.main`
(`flex:1; position:relative; overflow:hidden`).

A first attempt (commit `53a0e7a0`: carousel `overflow-y:hidden` +
`padding-bottom`) did **not** fix it — the clip was not in the carousel, it was the
whole tray being pushed past `.main`'s clip.

## Root cause (read- and live-verified)

Two independent facts in the `.shell` rule combined:

1. **No definite height.** `.shell { height: 100% }` did not reliably produce a
   *bounded* grid against the `position:relative` `.main`. The shell rendered
   auto-height, so the `minmax(0,1fr)` body row stretched to the **tallest column**
   — Act's tall right ops rail (Weather / Today's Priorities / Alerts / Upcoming
   Events) — instead of being clamped to the available height. That pushed the
   `auto` bottom-tray row **below** the viewport, where `.main { overflow:hidden }`
   clipped the work-item cards. Worst on **All Modules / Tracker** because those
   carry the tallest rail; the carousel is horizontal, so card **count** widens it,
   it does not heighten the row — height came entirely from the rail.

2. **No explicit grid column (latent horizontal blowout).** The `.shell` grid
   declared only rows, so the implicit **`auto`** column grew to the **widest
   row's max-content** — the long work-items carousel / module-tab strip — ballooning
   the body to thousands of px (~9710px measured) and shoving the right rail
   off-screen past `.main`'s clip.

## Decision

Edit the `.shell` rule only (CSS-only, shared sheet → fixes all three stages
uniformly, no per-stage divergence, no new file):

- **`height: 100%` → `position: absolute; inset: 0`.** Anchors the shell to its
  `position:relative` parent (`.main`) with a **definite** height. The grid now
  clamps: the `minmax(0,1fr)` map row absorbs slack, sidebar/rail scroll
  internally, and the `auto` tray row is always fully visible.
- **Add `grid-template-columns: minmax(0, 1fr)`.** Pins every row to the viewport
  width so the inner `overflow:auto` regions (tab strip, carousel) scroll **within
  their box** instead of widening the grid and pushing the rail off-screen.

Net diff: 1 file, +17/−1 (commit `2368e687`).

## Consequences

### Positive
- Observe / Plan / Act command-centre carousels all render fully (tray within
  viewport, rail on-screen) regardless of item count or which tab is active.
- The fix is purely presentational — no JSX / store / schema / model / migration —
  so it is covenant-clean and carries zero behavioural risk.

### Negative / follow-up
- `position:absolute; inset:0` hard-couples `.shell` to a `position:relative`
  ancestor. `.main` provides that today; a future layout change that drops the
  positioned ancestor would unbound the shell again. Acceptable — `.main` is the
  stable shell host for all command-centre routes.
- The earlier defensive carousel hygiene from `53a0e7a0` (`overflow-y:hidden` +
  `padding-bottom: var(--space-3)`) remains; harmless, kept.

### Verification
Live DOM (`preview_eval`) confirmed the shell bounded at 812px (= `.main`
height), body 1416px with sidebar 268 / map 784 / rail 340 all on-screen
(`railOnScreen:true`, `trayWithinViewport:true`), **and** a confirming
**screenshot** of the full Act layout — tabs, sidebar, map+legend, right ops rail,
and the work-items carousel with intact **Tracker** cards (per the
preview-verification rule; screenshot captured, not assumed). Verified on the
**All Modules / Tracker** tabs (the failing case) and a low-count tab (no
regression).

## References
- `apps/web/src/v3/command/shell/CommandCentreShell.module.css` — the `.shell` rule
- `apps/web/src/v3/command/shell/CommandCentreShell.tsx` — tabs / body / bottomTray structure
- `apps/web/src/app/AppShell.module.css` — `.main { position:relative; overflow:hidden }` (the positioned host)
- [[log/2026-05-25-command-centre-shell-bounding]] — this session's log entry
- [[log/2026-05-25-command-centre-tray-and-waterrouter-fixes]] — prior related grid-track fix (`f2a88288`) on the Observe shell
