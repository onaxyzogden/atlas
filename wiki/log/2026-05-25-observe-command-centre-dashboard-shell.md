# Observe Command Centre → dashboard shell + nested-box rails

**Date:** 2026-05-25
**Branch:** `feat/atlas-permaculture`
**Commit:** `20348877` (code, 8 files, +1090/−133) + a follow-up wiki commit.
**ADR:** [[decisions/2026-05-25-atlas-observe-command-centre-dashboard-shell]]

## What happened

Two coupled passes over the Observe Command Centre (route
`observe/command-centre`, the surface unlocked once Observe hits 100% — see
[[log/2026-05-24-marker-hover-fix-and-command-centre-unlock]]).

**Phase 1 — dashboard shell.** The steward asked the Command Centre to "look and
function like" a fixed operations dashboard (mockup supplied). The old surface was
a **vertical scroll stack** (full-site map → open-needs grid → 4-panel summary →
embedded module dashboards → plan-readiness banner). Rebuilt as a full-viewport
CSS grid (`grid-template-rows: auto auto minmax(0,1fr) auto`): **topbar** ·
**module tabs** · **body** (`268px | minmax(0,1fr) | 340px` → sidebar / map /
right rail) · **bottom tray**. A single `activeModule: ObserveModule | null` lens
(null = All) drives the tabs, the sidebar filter chip, the map markers + legend +
"Filtered to" chip, the timeline, and the needs carousel — all from
`filteredViews = activeModule ? displayViews.filter(v => v.objective.module === activeModule) : displayViews`.
Re-homing: per-module **% verified** on the tabs; **timeline** → right rail
(Today/Yesterday day-grouping from real timestamps); **evidence + gaps** →
compact cards under the timeline; **open needs** → bottom carousel; legacy
**module dashboards** removed from this render but **preserved on disk** (still
reachable from the capture workspace) per [[feedback-no-deletion]]. New siblings:
`ObserveModuleTabs`, `ObserveMapSidebar`, `ObserveMapLegend`. **Estate-palette,
real-data-only** — none of the mockup's fabricated due dates, place names, status
badges, or avatars.

**Phase 2 — nested-box treatment (Plan-stage parity).** Steward: *"I like how
clean and organized this layout looks for the right and left rail and would like
to copy it to the Observe Command Centre (sections contained within boxes which
are contained within a box that contains them all)."* Confirmed via
AskUserQuestion: scope = **all shell regions** (rails **plus** topbar, module-tabs
strip, bottom tray) and **box every section** (including the sidebar's brand
header + footer). Mirrors `PlanTools.module.css` `.toolbox`/`.group` exactly:
**outer box** `background: color-mix(in srgb, var(--color-surface) 96%, #fff)`,
`border: 1px solid color-mix(in srgb, var(--color-border) 88%, #fff)`,
`border-radius: var(--radius-lg)`, `box-shadow: 0 1px 2px rgba(0,0,0,0.1)`;
**section box** `background: var(--color-bg)` (darkest token, recessed),
`border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`.

**This was a CSS-only change** — every region wrapper + section element already
existed from Phase 1, and `.tab` / `.objCard` were already individually boxed, so
the treatment is a pure restyle of one file
(`ObserveCommandCentrePage.module.css`): `.shell` gains gap/padding so regions
float; `.topbar` / `.tabs` / `.sidebar` / `.mapRegion` / `.rail` / `.bottomTray`
take the outer-box look and drop their old divider borders; `.brand` /
`.sideSection` / `.sideFooter`, `.tab`, rail `.panel`, and `.objCard` read as
recessed inner boxes; the `@media (max-width:1100px)` block drops the obsolete
`border:none; border-bottom` overrides for a `row-gap`ped box stack.

## Verification

- `npm run typecheck` (8GB heap) at the known pre-existing / foreign-WIP baseline
  (`StepBoundary.tsx`, `ObserveAnnotationLayers.tsx` `waterRouter`,
  `planImpactFlag`/`HostUnion*` tests); **zero** errors in any `v3/command/` file.
  The CSS-only Phase 2 removed no class names, so it added no TS errors.
- Live preview at `/v3/project/mtc/observe/command-centre` (Claude Preview :5200),
  verified via accessibility snapshot + computed-style reads — all six regions show
  the outer-box surface/border/radius/shadow; sidebar brand / sections / footer +
  tabs + rail panels + need cards read as recessed boxes; shell gap/padding 12px,
  body column-gap 12px; responsive <1100px stacks boxes with row-gap and no
  orphaned dividers (map keeps 420px min-height); interactivity intact (7 module
  tabs, 15 need cards + Open buttons, basemap switch, Raise form). **No visual
  screenshot claimed** — `preview_screenshot` times out on the MapLibre WebGL
  canvas per project rule; DOM + computed-style reads are authoritative.

## Notes

- Covenant clean (pure presentation / nav — no schema/store/model/migration);
  3-item Observe/Plan/Act IA unchanged.
- Committed by **explicit path** on the rebased branch, divergence-checked before
  push, per [[feedback-commit-immediately-on-rebased-branches]].
- Legacy vertical-stack classes (`.page`, `.sections`, `.grid`, `.mapPanel`,
  `.modCard`, …) left in place (preserve-legacy).
- Design language: [[concepts/design-system]].
