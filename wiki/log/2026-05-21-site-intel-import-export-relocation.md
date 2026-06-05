# 2026-05-21 — SiteIntelligencePanel header: Import / Export buttons relocated

**Branch.** `feat/atlas-permaculture`.

User-reported clutter: the `<ImportSiteIntelButton>` and `<ExportButton>`
floating docks (bottom-left at `left: 64px` after the prior nudge) fought
the left-toolbar column and the map viewport. User asked for them moved
into the right-side Site Intelligence pane header next to Refresh.

**Plan-approved trade-off:** `SiteIntelligencePanel` is real-project-only
(`DecisionRail.tsx` `ObserveSiteIntelligenceRail` returns empty for MTC
sample) — so the MTC sample loses its visible Export button after this
change. Import was already disabled on MTC. User accepted explicitly.

## Changes

1. **`apps/web/src/v3/observe/components/ExportButton.module.css`** — `.dock`
   rewritten from `position: absolute; left: 64px; bottom: 12px` to
   `position: relative; display: inline-flex;`. `.popover` anchor flipped
   `bottom: calc(100% + 8px); left: 0` → `top: calc(100% + 8px); right: 0;
   z-index: 20` so the menu opens downward and flushes to the right edge
   (popovers anchored at the top of a side pane should drop down).
2. **`apps/web/src/v3/observe/components/ImportSiteIntelButton.module.css`** —
   same rewrite (`min-width: 220px`).
3. **`apps/web/src/components/panels/SiteIntelligencePanel.tsx`** — added
   imports for `ImportSiteIntelButton` + `ExportButton`; wrapped the header
   right side in a new `.headerActions` flex cluster rendering Import →
   Export → Refresh.
4. **`apps/web/src/components/panels/SiteIntelligencePanel.module.css`** —
   added `.headerActions { display: flex; gap: 6px; align-items: center; }`
   right after `.headerRow`.

## Plan/Act fate

User chose "Drop from Plan/Act entirely" — `<ImportSiteIntelButton>` and
`<ExportButton>` were never mounted in `PlanLayout.tsx`,
`VisionLayoutCanvas.tsx`, or `ActLayout.tsx` (only `ObserveLayout.tsx`
carried them). `ObserveLayout.tsx` retains the legacy map-canvas mounts
in this commit; the new headerActions cluster supersedes them as the
primary UI surface and the legacy docks now render inline-relative (no
fixed position), so they collapse into the parent flow rather than
overlay the map. Future cleanup can drop the remaining
`ObserveLayout.tsx` mounts; left alone here per user/linter signal.

## Verification

`apps/web` `npm run typecheck` exit 0 with 6 pre-existing baseline errors
unchanged (`StepBoundary.tsx` × 1, `HostUnionContextMenu.test.tsx` × 1,
`HostUnionDrilldownCard.test.tsx` × 1, `builtEnvironmentProjection.ts` × 3
— all unrelated to this slice).
