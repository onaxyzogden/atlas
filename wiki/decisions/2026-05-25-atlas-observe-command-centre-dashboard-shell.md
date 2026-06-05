# Observe Command Centre → dashboard shell + nested-box rails

**Date:** 2026-05-25
**Status:** Adopted
**Scope:** `apps/web` — `apps/web/src/v3/command/` (the Observe Command Centre surface)

## Context

The Observe Command Centre (route `observe/command-centre`, the surface that
unlocks once Observe hits 100% — see [[log/2026-05-24-marker-hover-fix-and-command-centre-unlock]])
was a **vertical scroll stack**: full-site map → open-needs card grid → a
4-panel summary grid (summary / timeline / evidence / gaps) → embedded module
dashboards → plan-readiness banner. The steward asked for it to "look and
function like" a fixed operations dashboard (mockup supplied), then in a second
pass to adopt the **Plan stage's nested-box visual treatment** seen in
`PlanTools` / `PlanChecklistAside` — *"sections contained within boxes which are
contained within a box that contains them all."*

## Decision

Two coupled changes, both **estate-palette, real-data-only** (no fabricated due
dates, place names, status badges, or avatars from the mockup):

### 1. Fixed dashboard shell

`ObserveCommandCentrePage` becomes a full-viewport CSS grid
(`grid-template-rows: auto auto minmax(0,1fr) auto`): **topbar** · **module
tabs** · **body** (`268px | minmax(0,1fr) | 340px` → sidebar / map / right rail)
· **bottom tray**. A single `activeModule: ObserveModule | null` lens (null =
All) drives the module tabs, the sidebar filter chip, the map markers + "Filtered
to" chip + legend, the timeline, and the needs carousel — derived as
`filteredViews = activeModule ? displayViews.filter(v => v.objective.module === activeModule) : displayViews`
(`displayViews` already drops dismissed auto-needs).

Re-homing: the per-domain **summary** is represented by real per-module **%
verified** on the tabs ("All Modules" = `data.stage.pct`); **timeline** → right
rail (with Today/Yesterday day-grouping from real timestamps); **evidence +
gaps** → compact cards below the timeline; **open needs** → bottom horizontal
carousel; **module dashboards** → removed from this render (still reachable from
the capture workspace — `ModuleDashboardsPanel.tsx` preserved per
[[feedback-no-deletion]]). New sibling components: `ObserveModuleTabs`,
`ObserveMapSidebar`, `ObserveMapLegend`.

### 2. Nested-box treatment (Plan-stage parity)

Every shell region (steward-confirmed scope = **all** regions, and **box every
section** including the sidebar's brand + footer) is an **elevated outer box**
holding **recessed section boxes**. The recipe mirrors `PlanTools.module.css`
`.toolbox`/`.group` exactly:

- **Outer box:** `background: color-mix(in srgb, var(--color-surface) 96%, #fff)`,
  `border: 1px solid color-mix(in srgb, var(--color-border) 88%, #fff)`,
  `border-radius: var(--radius-lg)`, `box-shadow: 0 1px 2px rgba(0,0,0,0.1)`.
- **Section box:** `background: var(--color-bg)` (darkest token, recessed),
  `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`.

The nesting reads because the outer surface is mixed *toward white* (elevated)
while inner sections use `--color-bg` (recessed). Regions float on the page via
`.shell { gap/padding: var(--space-3) }` + `.body { column-gap }`. This was a
**CSS-only** change — every region wrapper and section element already existed
from change 1, and `.tab` / `.objCard` were already individually boxed, so the
treatment is pure restyle (no `.tsx` edits): `.topbar`, `.tabs`, `.sidebar`,
`.mapRegion`, `.rail`, `.bottomTray` gain the outer-box look and drop their old
divider borders; `.brand` / `.sideSection` / `.sideFooter`, `.tab`, rail
`.panel`, and `.objCard` read as inner section boxes. The `max-width:1100px`
block drops the now-obsolete `border:none; border-bottom` overrides in favour of
a `row-gap`ped stack of boxes.

## Implementation notes

- All in `apps/web/src/v3/command/`. `ObserveCommandCentrePage.module.css` is the
  single file touched by the nested-box pass; the legacy vertical-stack classes
  (`.page`, `.sections`, `.grid`, `.mapPanel`, `.modCard`, …) are left in place
  (preserve-legacy).
- `.panel` is consumed only by the three right-rail panels in this module
  (`ObservationTimelinePanel` / `EvidenceLibraryPanel` / `GapsPanel` import this
  CSS module), so retuning it to the inner-section look is safe and local.
- Reused as-is: `DiagnoseMap`, `CaptureMapMarkers`, `useCompassData`,
  `useObservationNeeds`, `useBasemapStore`/`BASEMAP_OPTIONS`, `OBSERVE_MODULE_DOT`/
  `OBSERVE_MODULE_LABEL`.

## Verification

- `npm run typecheck` (8GB heap) — exit 0 with only the known pre-existing /
  foreign-WIP baseline (`StepBoundary.tsx`, `ObserveAnnotationLayers.tsx`
  `waterRouter`, `planImpactFlag`/`HostUnion*` tests); **zero** errors in any
  `v3/command/` file.
- Live preview at `/v3/project/mtc/observe/command-centre` (Claude Preview
  :5200), verified via accessibility snapshot + computed-style reads — all six
  regions show the outer-box surface/border/radius/shadow; sidebar brand /
  sections / footer + tabs + rail panels + need cards read as recessed boxes;
  shell gap/padding 12px, body column-gap 12px; responsive <1100px stacks boxes
  with row-gap and no orphaned dividers (map keeps 420px min-height); interactivity
  intact (7 module tabs, 15 need cards + Open buttons, basemap switch, Raise
  form). `preview_screenshot` times out on the MapLibre WebGL canvas — **no
  visual screenshot claimed** per CLAUDE.md; DOM + computed-style reads are
  authoritative.

## Consequences

- The Command Centre now reads as one operations dashboard with a consistent
  "container-of-containers" depth language shared with the Plan stage.
- The single `activeModule` lens removes the old drift between separate filter
  surfaces; every panel filters together.
- Covenant clean (pure presentation / nav — no schema/store/model/migration);
  3-item Observe/Plan/Act IA unchanged.

Commit: `20348877` (explicit-path, on `feat/atlas-permaculture`, divergence-checked
before push) per [[feedback-commit-immediately-on-rebased-branches]].
Log: [[log/2026-05-25-observe-command-centre-dashboard-shell]].
Design language: [[concepts/design-system]].
