# OLOS Implementation Batches

## Batch 0: Refactor Existing Prototype — Complete

- Extract current `/observe` tokens and layout patterns from the single page/CSS file into shared components.
- Preserve current visual output and cropped-art behavior.
- Add a route-aware QA overlay that accepts a reference image per screen.

## Batch 1: Shared Shell And Dashboard — Complete

- Build `AppShell`, `SideRail`, `TopStageBar`, `MetricStrip`, `SurfaceCard`, `ModuleSummaryCard`, and `ProjectOverviewCard`.
- Implement `/observe/dashboard`.
- Generate production crops for dashboard hero, site map, topography map, and sector diagram.

## Batch 2: Human Context Detail Pages - Complete

- Build `BreadcrumbBar`, form fields, `ChipList`, `InsightSidebar`, `DataTable`, and `NextStepsPanel`.
- Implement `/observe/human-context/steward-survey`.
- Implement `/observe/human-context/indigenous-regional-context`.
- Generate production crops for steward hero, capacity orbit, regional hero, and regional snapshot map.

## Batch 3: Vision Page - Complete

- Build the Vision board layout, quote panel, reusable list panels, concept media panel, and moodboard panel.
- Implement `/observe/human-context/vision`.
- Use cropped concept landscape and moodboard thumbnails for high-detail visuals.

## Batch 4: Diagnostics Dashboard - Complete

- Build the module header, KPI strip, tabs, map panels, diagnostics rows, timeline panel, task list panel, and footer status bar.
- Implement `/observe/earth-water-ecology`.
- Use cropped site map, hydrology map, and species thumbnails.

## Batch 5: Visual QA Pass - Complete

- Capture native and responsive screenshots for every route.
- Use QA overlays to tune spacing, borders, color, crop placement, and typography.
- Confirm production build excludes full reference screenshots from visible UI.
- Fix responsive overflow and clipped button issues found during automated QA.

## Batch 6: Human Context Module Dashboard - Complete

- Implement `/observe/human-context` as the module-level dashboard above the Steward, Regional, and Vision detail pages.
- Use cropped source-derived art for the hero landscape and regional snapshot map.
- Rebuild the hero metrics, three module summary cards, synthesis sidebar, and module health strip as real DOM.
- Verify the new route plus existing routes for build, console errors, focusable buttons, overflow, and production-visible reference usage.

## Batch 7: Cross-section Tool - Complete

- Implement `/observe/topography/cross-section-tool` as the first Topography tool surface.
- Use cropped source-derived art for the cross-section chart, transect map, and seasonal comparison chart.
- Rebuild KPI metrics, section observations, transect library, overlay toggles, analysis controls, earthworks estimates, and action bar as real DOM.
- Verify native, tablet, and mobile behavior plus the existing route set for build, console errors, focusable controls, overflow, and production-visible reference usage.

## Batch 8: Topography Module Dashboard - Complete

- Implement `/observe/topography` as the Module 3 dashboard linking Terrain Detail and Cross-section Tool workflows.
- Use cropped source-derived art for the terrain header texture, terrain detail preview, and cross-section preview.
- Rebuild module metrics, topography synthesis, tool cards, design implications, detected features, recommended actions, module health, and footer status as real DOM.
- Verify native, tablet, and mobile behavior plus the implemented route set for build, console errors, focusable controls, overflow, clean text rendering, and production-visible reference usage.

## Batch 9: Terrain Detail - Complete

- Implement `/observe/topography/terrain-detail` as the detailed Module 3 terrain analysis page.
- Use cropped source-derived art for the main layered terrain map, slope map, elevation distribution chart, and A-B elevation profile.
- Rebuild terrain metrics, header actions, map overlays, layer controls, legends, detected features, terrain insights, recommended actions, and footer status as real DOM.
- Verify native, tablet, and mobile behavior plus the implemented route set for build, console errors, focusable controls, overflow, clean text rendering, and production-visible reference usage.

## Batch 10: Macroclimate & Hazards Dashboard - Complete

- Implement `/observe/macroclimate-hazards` as the Module 2 dashboard above Solar & Climate Detail and Hazards Log.
- Use cropped source-derived art for the monthly climate chart, sun path, hazard risk matrix, and hazard hotspot map.
- Rebuild climate and hazard KPI cards, module header, preview panels, active hazards table, design insights, key takeaways, next actions, and risk priorities as real DOM.
- Verify native, desktop, tablet, and mobile behavior plus the implemented route set for build, console errors, focusable controls, overflow, clean text rendering, and production-visible reference usage.
