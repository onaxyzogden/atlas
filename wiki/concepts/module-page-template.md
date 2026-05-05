# Module-page template (Atlas-UI)

The standard JSX + CSS contract for every numbered module home page in atlas-ui. Locked 2026-05-05 so Stage 2 (Design) module pages inherit the same layout for free.

## JSX shape

```jsx
<AppShell navConfig={observeNav}>
  <div className="<page-class> module-frame">
    <TopStageBar
      stage="Stage 1 of 3"
      module="Roots & Diagnosis — Module N"
    />
    <ProjectDataStatus />
    {/* …page content… */}
  </div>
</AppShell>
```

Required:
- `module-frame` on the outer wrapper. Provides border, radius, dark gradient background, and a single padding standard (`--module-frame-padding-y` × `--module-frame-padding-x`).
- `<TopStageBar>` is the only header. No bespoke breadcrumbs.
- `module` prop format: **`Roots & Diagnosis — Module N`** (em-dash, not hyphen, not middot). Module numbers: 1 Human Context, 2 Macroclimate & Hazards, 3 Topography, 4 Earth/Water/Ecology, 5 Sectors, Microclimates & Zones.
- `actionLabel` defaults to "Project Settings" — do not override per page.

## CSS contract

`apps/atlas-ui/src/styles.css` defines **one** rule set for `.top-stage-bar`, `.stage-title`, `.stage-steps`, and `.stage-settings`. **Do not add per-page overrides** of these selectors. The base rule uses intrinsic columns (`max-content minmax(0, 1fr) max-content`) so the layout adapts to any title length without per-page tuning.

Per-page wrapper classes (`.dashboard-page`, `.detail-page`, `.human-context-page`, etc.) only carry `min-width: 0` and any genuinely page-specific layout below the topbar. **Padding lives on `.module-frame` only.**

`.swot-page` is the lone exception — it uses a different `.swot-topbar` component (separate visual treatment). Migrating SWOT to `TopStageBar` is a future task.

## Verification

After edits to module-page chrome, `preview_eval` the topbar rect on every module home page (`/observe/human-context`, `/observe/macroclimate-hazards`, `/observe/topography`, `/observe/earth-water-ecology`, `/observe/sectors-zones`) and assert:
- `.stage-title` height = 20px (one line)
- `.stage-settings` width identical (±1px) across pages
- `.stage-steps` left edge centered (±20px across pages)
- `.top-stage-bar` height identical across pages

## Files

- [apps/atlas-ui/src/components/TopStageBar.jsx](../../apps/atlas-ui/src/components/TopStageBar.jsx) — component.
- [apps/atlas-ui/src/styles.css](../../apps/atlas-ui/src/styles.css) — base rules at `.top-stage-bar`, `.module-frame`.
- Module home pages: `HumanContextDashboardPage`, `MacroclimateDashboardPage`, `TopographyDashboardPage`, `EarthWaterEcologyPage`, `SectorsMicroclimatesDashboardPage`, plus `ObserveDashboardPage` (stage hub).
