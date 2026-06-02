# 2026-06-02 -- Portfolio shell: side columns to page bottom, stage rail centred between them; stage-rail project label removed

**Branch.** `feat/atlas-permaculture` (explicit-path commit `d7625128`, 4 files +25/-25; **not pushed** -- operator asked to make the change, not push).

**Amanah gate.** Clear -- internal land-stewardship UI chrome; no riba/gharar, no capital-channel or Islamic-framing strings touched ([[fiqh-csra-erased-2026-05-04]]).

## What & why

On the Portfolio home page (`/v3/portfolio`) the shell was a flex column: a 3-column grid (`.zones` = My Projects list | map | at-a-glance rail) stacked **above** a full-width bottom bar (`.stageZone`, the Plan/Act/Observe stage rail). Because the stage bar spanned the full width beneath all three columns, the left list and right rail stopped at the *top* of that bar -- they did not reach the page bottom (the source comment confirmed the original intent: "the stage rail spans the full width along the bottom").

The steward selected the two side containers + the stage bar and asked to **"have these containers reach bottom of page while having bottom container fit in between"** -- i.e. the side columns should extend to the page bottom and the stage bar should occupy only the **centre column** (the gap *between* them), not span full width. They also asked to **remove the project-name label** ("Moontrance Creek") from the stage rail.

## Changes (4 files)

- **`PortfolioMapPage.module.css`** -- `.zones` becomes a 2-row named-area grid:
  `grid-template-areas: "list map rail" / "list stage rail"`, `grid-template-rows: minmax(0,1fr) auto`. The two side zones span both rows (same area name in both); `.stageZone` drops `flex-shrink` and takes `grid-area: stage` (bottom-centre cell). Responsive blocks kept in sync with the column count: `@media (max-width:1000px)` sets `"list map" / "list stage"` (rail becomes a fixed bottom-sheet, list spans full height); `@media (max-width:760px)` sets `"map" / "stage"` (list also a fixed sheet, stage stays a full-width bottom bar). `@media (max-width:1200px)` keeps its 3-column override (areas inherited).
- **`PortfolioMapPage.tsx`** -- moved the `.stageZone` `<div>` from the last child of `.shell` to the last child of `.zones` (after the rail `<aside>`) so it lands in the bottom-centre grid cell; rail content unchanged.
- **`PortfolioStageRail.tsx`** -- removed the redundant `<span className={css.projectLabel}>` (the project name is still shown in the at-a-glance rail header); `.rail` retains `aria-label="Jump into a stage for <name>"` for screen readers.
- **`PortfolioStageRail.module.css`** -- removed the `.projectLabel` rule and its `@media (max-width:640px)` `display:none` override; `.rail`/`.buttons` untouched (`.buttons` `margin-left:auto` becomes a no-op so the button group sits left, matching the existing <=640px rendering).

## Verified

- Web typecheck **EXIT 0** (background task `bu9ropt3v`).
- Preview at **1280x800, both themes** (dark + light screenshots): My Projects list and at-a-glance rail both flush to the page bottom (bottom 792), the Plan/Act/Observe stage rail centred in the map column between them (left 276-right 944, same as the map), no project-name label.
- **950px**: 2-column grid, list full-height, rail `position:fixed; bottom:76px` bottom-sheet, stage under the map.
- **700px**: single-column grid, list `position:fixed; bottom:76px` bottom-sheet, stage a full-width bottom bar (left 8-right 692) clearing the sheets.

No shared/store/data changes; all classes CSS-module-scoped to these two files. Explicit-path 4-file commit, staged set verified == exactly those 4 amid out-of-band rebase co-mingling (HEAD ahead 11, behind 0 at commit time) ([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]); foreign WIP untouched ([[feedback-no-deletion]]); not pushed; CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.

Entity [[entities/web-app]].
