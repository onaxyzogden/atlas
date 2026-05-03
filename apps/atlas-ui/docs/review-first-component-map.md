# OLOS Review-First Component Map

## Summary

This project should convert screenshots into real React pages by reviewing the full screen set first, extracting shared components, then implementing routes in dependency order. The UI should remain real DOM/CSS for layout, text, controls, cards, tables, forms, and responsive behavior. Cropped source assets should be used only for high-detail visuals such as landscapes, maps, diagrams, moodboards, and illustration thumbnails.

The current `/observe` page is the prototype pattern: real React layout with source-derived crops for artwork. It should be refactored into shared primitives before building the next batch.

The full reference library now contains 112 images. The generated inventory lives in:

- `docs/screen-inventory.md`
- `docs/screen-inventory.json`
- `src/screenCatalog.generated.js`

## Screen Inventory

| Route | Reference | Type | Size | Complexity | Build Status |
| --- | --- | --- | --- | --- | --- |
| `/observe` | `olos-observe-homepage.png` | Stage landing | 1293 x 963 | Medium | Prototype built |
| `/observe/dashboard` | `observe-dashboard.png` | Stage dashboard | 1448 x 1086 | High | Reviewed |
| `/observe/human-context/steward-survey` | `observe-m1-steward-survey.png` | Module form | 1448 x 1086 | High | Reviewed |
| `/observe/human-context/indigenous-regional-context` | `observe-m1-indigenous-regional-context.png` | Module content/network | 1448 x 1086 | High | Reviewed |
| `/observe/human-context/vision` | `observe-m1-vision.png` | Module vision board | 1448 x 1086 | Very high | Reviewed |
| `/observe/earth-water-ecology` | `observe-m4-earth-water-ecology-diagnostics.png` | Diagnostic dashboard | 1448 x 1086 | Very high | Reviewed |

## Shared Component Map

### Navigation And Shell

- `AppShell`: dark page frame, fixed left rail, content area, responsive collapse behavior.
- `SideRail`: OLOS mark, nav items, help/avatar footer, active route state.
- `TopStageBar`: stage label, three-step progress indicator, settings/save actions.
- `BreadcrumbBar`: project/module breadcrumb trail and page-level actions for form/detail screens.
- `QaOverlay`: dev-only reference overlay per route, hidden by default.

### Page Structure

- `HeroPanel`: title/kicker/body with optional cropped landscape or topo background.
- `MetricStrip`: horizontal KPI cards with icons, progress rings, labels, and notes.
- `ModuleHeader`: back link, module number badge, title, summary text, progress card.
- `SidebarPanel`: right-side snapshot/map/next-step/tip stack.
- `FooterStatusBar`: synced/project metadata footer for dense dashboard pages.

### Cards And Panels

- `SurfaceCard`: default bordered dark card surface.
- `ActionCard`: large CTA card with icon/art and optional arrow.
- `ModuleSummaryCard`: compact module overview card for dashboard.
- `InsightCard`: recommendation, warning, or design-tip card.
- `ListPanel`: repeated key-value or checklist content.
- `TimelinePanel`: recent observations feed.
- `TaskListPanel`: recommended actions with priority and due date.

### Controls And Data

- `Button`, `IconButton`, `SegmentedTabs`, `SelectLikeButton`.
- `TextInput`, `TextArea`, `FieldGroup`, `FormSection`.
- `Chip`, `ChipList`, `StatusBadge`, `PriorityBadge`.
- `DataTable`, `TableRowActions`.
- `ProgressRing`, `Gauge`, `Sparkline`, `BarMeter`.

### Media And Crops

- `CroppedArt`: reusable wrapper for decorative source-derived crops.
- `MapPanel`: satellite/terrain/diagram crop with real DOM legends and controls where possible.
- `MoodboardGrid`: cropped thumbnails with real surrounding layout.
- `IllustrationSlot`: module-card or sidebar illustration crop.

## Crop Asset Policy

- Store full screenshot references in `src/assets/reference/`.
- Store production crops in `src/assets/generated/<screen-id>/`.
- Never use the full reference screenshot as production UI.
- Use crops for high-detail visuals only:
  - hero and concept landscapes
  - satellite/terrain/hydrology maps
  - moodboard thumbnails
  - module illustrations
  - detailed diagrams that would be slow or brittle to recreate
- Keep labels, buttons, legends, tables, forms, and narrative text as real DOM unless the crop is purely decorative.
- Decorative crops use `alt=""`; meaningful text remains outside the image.

## Route Build Order

1. Refactor `/observe` into shared tokens/components while preserving its current visual output.
2. Build `/observe/dashboard` to establish the full app shell, stage tracker, overview cards, dashboard module cards, and project sidebar.
3. Build `/observe/human-context/steward-survey` to establish forms, chips, save actions, and insight sidebars.
4. Build `/observe/human-context/indigenous-regional-context` to establish content panels, map sidebars, data tables, and next-step lists.
5. Build `/observe/human-context/vision` to establish large annotated media panels, aspiration/value lists, and moodboard grids.
6. Build `/observe/earth-water-ecology` last because it depends on nearly every shared pattern plus map panels, tabs, KPI strips, timelines, action lists, and footer status.

## Per-Screen Notes

### Observe Dashboard

- Main reusable patterns: full app shell, stage tracker, hero/project overview pair, progress metric strip, dense module cards.
- Crop candidates: hero landscape, site map, topography map, sector compass/satellite diagram.
- Keep as DOM: all metric text, module text, buttons, status badges, chart bars where simple enough.

### Steward Survey

- Main reusable patterns: breadcrumb topbar, save actions, hero card, form sections, chip input, right insight sidebar.
- Crop candidates: hero landscape and capacity orbit diagram.
- Keep as DOM: inputs, dropdowns, budget widgets where practical, profile completeness ring, design tip text.

### Indigenous & Regional Context

- Main reusable patterns: module hero, place-name chips, content cards, organization table, regional snapshot sidebar.
- Crop candidates: hero terrain and regional map overlay.
- Keep as DOM: chips, warnings, strengths list, next steps, contacts table.

### Vision

- Main reusable patterns: intro card, quote panel, large media panel, multi-column list cards, moodboard grid.
- Crop candidates: annotated vision concept landscape and moodboard images.
- Keep as DOM: concept labels if feasible; otherwise crop only the landscape/annotation composite for first pass and revisit later.

### Earth, Water & Ecology Diagnostics

- Main reusable patterns: module header, KPI strip, tab bar, map panel, diagnostics card, hydrology panel, species cards, timeline, recommended actions, status footer.
- Crop candidates: site observation map, hydrology contour map, species thumbnails.
- Keep as DOM: tabs, filters, legends where practical, soil rows, recent observations, recommended actions.

## QA And Acceptance

- `npm run build` passes after each implementation batch.
- Every route has a dev-only QA overlay using its reference screenshot.
- Native viewport screenshots are captured for each page:
  - `/observe`: 1293 x 963
  - all five new pages: 1448 x 1086
- Also test desktop, tablet, and mobile responsive viewports.
- DOM checks confirm:
  - visible page text is real text
  - key actions are buttons or links
  - module/card controls are keyboard focusable
  - no full reference screenshot is visible in production UI
