# Command Centre shell: stop tray cutoff & rail blowout

**Date:** 2026-05-25
**Branch:** `feat/atlas-permaculture`
**Commit:** `2368e687` (1 file, +17/−1)

The Act Command Centre's bottom **"Open Work Items"** carousel rendered clipped at
the viewport bottom, but **only** on the **All Modules** / **Tracker** tabs. A
first attempt (`53a0e7a0`: carousel `overflow-y:hidden` + `padding-bottom`) did not
fix it — the clip was the whole bottom tray being pushed past the viewport, not the
carousel itself.

**Surface:** the shared, stage-agnostic `CommandCentreShell` (Observe / Plan / Act).
Root `.shell` is a grid (`auto minmax(0,1fr) auto` = tabs/body/tray); `.body` is
`268px | minmax(0,1fr) | 340px` (sidebar/map/rail). On command-centre routes
`V3ProjectLayout` returns a bare `<Outlet/>`, so `.shell` is the sole direct child
of AppShell's `.main` (`flex:1; position:relative; overflow:hidden`).

**Root cause — two facts in the `.shell` rule combined:** (1) `height:100%` did not
reliably bound the grid against the positioned `.main`; the shell rendered
auto-height, so the `1fr` body row stretched to the **tallest column** (Act's tall
right ops rail) and pushed the `auto` tray row below the viewport, where
`.main { overflow:hidden }` clipped the cards. Worst on **All Modules / Tracker**
because those carry the tallest rail — the carousel is horizontal, so item count
*widens* it, it doesn't heighten the row. (2) With no explicit grid **column** the
implicit `auto` column grew to the widest row's max-content (the long carousel /
tab strip), ballooning the body to ~9710px and shoving the rail off-screen past
`.main`'s clip (latent horizontal blowout).

**Fix (CSS-only, the `.shell` rule):** `height:100%` → `position:absolute; inset:0`
(definite height anchored to the `position:relative` `.main` → the grid clamps,
map absorbs slack, sidebar/rail scroll internally, the `auto` tray is always
visible) **+** added `grid-template-columns: minmax(0,1fr)` (pins every row to
viewport width so inner `overflow:auto` regions scroll within their box instead of
widening the grid). One shared sheet → fixes all three stages uniformly, no new
file, no per-stage divergence. Purely presentational — no JSX/store/schema/model/
migration (covenant-clean).

**Verified:** live DOM (`preview_eval`) — shell bounded at 812px (= `.main`
height), body 1416px with sidebar 268 / map 784 / rail 340 all on-screen
(`railOnScreen:true`, `trayWithinViewport:true`) — **and a confirming screenshot**
of the full Act layout (tabs, sidebar, map+legend, right ops rail, carousel with
intact Tracker cards), per the preview-verification rule (captured, not assumed).
Checked the failing **All Modules / Tracker** tabs and a low-count tab (no
regression).

**Process:** earlier `git add <file>` swept 61 files because the index already held
60 pre-existing staged foreign files; recovered via `git reset --soft HEAD~1` +
unstage-all + `git add` the one file by explicit path (final commit = 1 file
+17/−1), then restored the prior 60-file index. Lesson reinforced: stage by
explicit path and verify full (non-path-scoped) `git status` before committing on
this shared branch. Foreign WIP untouched per [[feedback-no-deletion]]; committed
immediately per [[feedback-commit-immediately-on-rebased-branches]] — the commit
later survived an out-of-band rebase ([[project-branch-rebase]]; reflog-confirmed,
HEAD now `f5a4cd94` with external commits layered on top).

ADR: [[decisions/2026-05-25-atlas-command-centre-shell-bounding]]. Continues the
Command Centre shell thread from [[log/2026-05-25-command-centre-tray-and-waterrouter-fixes]]
(the prior `f2a88288` grid-track fix on the Observe shell) and
[[log/2026-05-25-observe-command-centre-dashboard-shell]].
