# 2026-05-08 — Land Brief map-workspace shell


**Trigger.** User directives across the session: (1) all module tools visible at once, (2) all module checklists visible at once with dim-on-non-selected, (3) sidebars become structured collapsible components (not floating overlays); thumbstrip in slide-up pane tucked behind a handle; LevelNavigator in slide-down pane.

**Done.** `AppShell` gained a symmetric `leftSidebar` slot. New `CollapsiblePane` (direction `down` / `up`) wraps `LandBriefStageNavigator` and `LandBriefThumbStrip`. Right rail stacks 6 `ModuleTodoRail`s with `is-dim` / `is-selected`. `DesignElementsPanel` moved into the left sidebar (no longer absolute-positioned over the map). 4-column grid variants in [`appshell.css`](apps/atlas-ui/src/styles/appshell.css). Earlier in the session, `LandBriefHeader` + `OverlayToggleRow` were replaced with `LevelNavigator` from `@ogden/ui-components` v0.1.0; "Generate Draft Brief" moved to right-rail `LandBriefGenerateCta`.

**Verified.** `pnpm --filter @ogden/atlas-ui build` clean (8.42s). Dev preview probe confirmed structure: left sidebar with design panel, slide-down pane with LevelNavigator, slide-up pane (collapsed) with thumbstrip handle, map canvas, right sidebar with Generate CTA + 6 stacked module rails, no error boundary.

**Deferred.** Middle-column width tuning when 4 cols + slide-down open; LevelNavigator pillar-label truncation (`H.C.`, `M.&...`); cleanup of unused `LandVerdictRail`, `ConfidenceDots`, and obsolete `.land-brief-overlay-*` / `.land-brief-header*` CSS.

**Decision file.** [`wiki/decisions/2026-05-08-land-brief-map-workspace-shell.md`](wiki/decisions/2026-05-08-land-brief-map-workspace-shell.md)
