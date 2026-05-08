# Land Brief — map-workspace shell with structured sidebars + collapsible panes

**Date:** 2026-05-08
**Status:** shipped
**Scope:** `apps/atlas-ui/` — Land Brief page (`/observe/land-brief`) + `AppShell`

## Context

The Land Brief page evolved iteratively across this session from a chip-row +
floating-toolbar layout into a full map-first workspace. Three user directives
drove the final shape:

1. *"Make all module tools visible at once"* → categorized
   `DesignElementsPanel` replaces the focused `ModuleToolbar`.
2. *"Make all module checklists visible at all times; dim non-selected ones"*
   → right rail stacks all six `ModuleTodoRail`s with `is-dim` / `is-selected`
   styling instead of swapping by selection.
3. *"Right and left sidebars become collapsible structured components rather
   than floating overlays. Thumbstrip lives in a slide-up pane (tucked behind
   a handle). LevelNavigator lives in a slide-down pane."* → `AppShell` gains a
   `leftSidebar` slot mirroring the right; new `CollapsiblePane` component
   handles slide-down (Stages) and slide-up (Module Deep-Dives) panes.

Earlier in the same session, `LandBriefHeader` + `OverlayToggleRow` were
replaced with `LevelNavigator` from `@ogden/ui-components` (vendored from
`onaxyzogden/ogden-ui-components#v0.1.0`), and "Generate Draft Brief" moved
into a right-rail `LandBriefGenerateCta` card.

## Decision

- `AppShell` has **two symmetric sidebar slots** (`leftSidebar` / `rightSidebar`),
  each collapsible with title, mirrored CSS via `.appshell__left*` and
  `.appshell__right*`. Grid `grid-template-columns` variants combine
  `appshell--has-left` × collapse states for a 4-column shell.
- New `CollapsiblePane` component (`direction="down" | "up"`) renders a handle
  on the appropriate edge so the pane is always visible (collapsed → handle
  only; expanded → handle + body). Caret uses `Icon.chevronDown` rotated by
  direction + collapsed state (no `chevronUp` in icon set).
- Land Brief page composition:
  - `leftSidebar` = `DesignElementsPanel` (all-modules tool palette, no
    longer floating).
  - `rightSidebar` = `LandBriefGenerateCta` + stacked `ModuleTodoRail`s
    (always visible; dim non-selected via `is-dim`).
  - `<CollapsiblePane direction="down" title="Stages">` wraps
    `LandBriefStageNavigator` (LevelNavigator).
  - `<CollapsiblePane direction="up" title="Module Deep-Dives" defaultCollapsed>`
    wraps `LandBriefThumbStrip` (strip tucked behind handle by default).
  - Map fills the remaining center column with `MapToolbar` floating
    overlay.

## Files

**New:**
- `apps/atlas-ui/src/components/CollapsiblePane.jsx`
- `apps/atlas-ui/src/components/DesignElementsPanel.jsx`
- `apps/atlas-ui/src/components/ModuleTodoRail.jsx`
- `apps/atlas-ui/src/components/LandBriefStageNavigator.jsx`
- `apps/atlas-ui/src/components/LandMap.jsx`, `MapTokenMissing.jsx`, `MapToolbar.jsx`, `MiniMap.jsx`
- `apps/atlas-ui/src/data/landBrief.js`, `landBriefOverlays.js`, `landBriefTodos.js`, `landBriefTools.js`
- `apps/atlas-ui/src/pages/LandBriefPage.jsx`
- `apps/atlas-ui/src/lib/` (turf-based helpers)

**Modified:**
- `apps/atlas-ui/src/components/AppShell.jsx` — added `leftSidebar` slot.
- `apps/atlas-ui/src/styles/appshell.css` — 4-col grid variants,
  `.appshell__left*`, `.collapsible-pane*`.
- `apps/atlas-ui/src/styles.css` — DesignElementsPanel layout
  (flex-column, no absolute positioning); ModuleTodoRail dim/selected;
  Generate CTA + LevelNavigator chrome.

## Verification

- Production build: `pnpm --filter @ogden/atlas-ui build` clean (8.42s,
  only pre-existing chunk-size warning).
- Dev preview probe at `/observe/land-brief` confirmed: left sidebar with
  `DesignElementsPanel`, slide-down pane with `LevelNavigator`, slide-up
  pane (collapsed) with `LandBriefThumbStrip` handle, full-bleed map
  canvas, right sidebar with Generate CTA + 6 stacked `ModuleTodoRail`s,
  no error boundary.

## Deferred

- Middle column compresses with 4 columns + slide-down open; consider
  narrower default left sidebar or default-collapsed left.
- LevelNavigator pillar labels truncate (`H.C.`, `M.&...`) inside the
  slide-down pane — needs width allocation or compact-mode tweak.
- Cleanup: drop unused `LandVerdictRail`, `ConfidenceDots`,
  `priorities` / `topPriorities` import from `LandBriefPage.jsx`; remove
  obsolete `.land-brief-overlay-row*` / `.land-brief-overlay-chip*` /
  `.land-brief-header*` rules in `styles.css`.
