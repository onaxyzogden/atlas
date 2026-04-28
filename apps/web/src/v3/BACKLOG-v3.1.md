# Atlas v3.1 Backlog

**Status:** v3.0 shipped (mock-only lifecycle shell across all 7 stages).
**Branch tip:** `feat/atlas-3.0` · `efc3b47`
**Date:** 2026-04-28

v3.0 deliberately deferred everything that needed a live runtime, a live
map, or a real backend. This backlog catalogs what's deferred and the
order it should land in v3.1.

---

## Deferred from v3.0 — by stage

### Design Studio (highest priority — biggest gap)
- **Live MapboxGL canvas** to replace the static SVG in
  [DesignPage.tsx](apps/web/src/v3/pages/DesignPage.tsx). Should reuse
  the existing v2 MapView wrapper in [apps/web/src/components/MapView*](apps/web/src/components/).
- **Real placement** — clicking a toolbox item should drop a draft
  geometry on the map (not just a toast). Snap to property edges and
  contour lines.
- **Selected object inspector** in DesignRail — currently shows
  "Nothing selected"; should bind to the live selection on the map and
  surface attributes (area, slope, distance to water/access).
- **Design Completeness scoring** — currently reads
  `project.scores.designCompleteness.value` from the fixture. Should be
  derived live from placed elements + project goals via
  [packages/shared/src/scoring](packages/shared/src/scoring/).
- **Generate Design Report** CTA is a stub.

### Operate
- **Live field map** in
  [FieldMapPlaceholder.tsx](apps/web/src/v3/components/FieldMapPlaceholder.tsx)
  — should render real parcel geometry with flag overlays, replacing
  the static SVG canvas. RULE 2 lifts in v3.1.
- **Real-time field alerts** wired to backend telemetry / sensor feeds
  (currently three hand-authored fixture entries).
- **Create Field Task / Log Observation** CTAs — wire to a task store.

### Discover
- **Live candidate filtering** — current filters bar renders chips but
  doesn't filter the grid. Should wire `filters` state to a derived
  candidate list.
- **Compare Selected** CTA / tray — currently UI-only. Hook to a real
  compare view.
- **Backend-sourced candidates** — replace hand-authored 6-property
  fixture in [mockCandidates.ts](apps/web/src/v3/data/mockCandidates.ts)
  with API data.

### Diagnose
- **Real soil / water / regulatory data** — categories currently read
  from a fixture. Should call out to the existing land-analysis pipeline.
- **Parcel image** in the StageHero aside is a `◊` glyph placeholder.
  Wire to real satellite tile or property snapshot.

### Prove
- **Real scoring engine** for Vision Fit — currently fixture-only. Wire
  to [packages/shared/src/scoring](packages/shared/src/scoring/).
- **Best Uses ranking** — derive from project vision + diagnose data
  rather than hand-authored fixture.
- **Fix on Map / Generate Brief** CTAs are stubs.

### Build
- **Real phase + task data** — replace the 3-phase MTC fixture with a
  task store that supports add / complete / reorder.
- **Mark Phase Complete** CTA is a stub.
- **Per-phase Gantt or timeline** — beyond the MVP checklist view.

### Report
- **PDF export** — currently uses `window.print()` and `@media print`
  rules in [ReportPage.module.css](apps/web/src/v3/pages/ReportPage.module.css).
  Wire to a real PDF generator (server-side or `react-pdf`).
- **Share Link** CTA is a stub.

### Home
- **Activity feed** wired to a real audit trail (currently 5 fixture
  entries).

---

## Cross-cutting

### Backend
- **Replace `useV3Project`** in
  [apps/web/src/v3/data/useV3Project.ts](apps/web/src/v3/data/useV3Project.ts)
  with a real fetch hook that hits the Fastify API (`apps/api/`,
  currently out of scope per v3.0 plan).
- **Persistent project store** — Zustand v2 stores should be unified
  with the v3 project model rather than running parallel.

### Routing
- **Cutover plan** — v3 currently runs in parallel under `/v3/...`.
  Once v3.1 lands the live map and API, cut `/project/$projectId` over
  to v3 routes and delete the v2 LifecycleProjectPage shell.

### Shared scoring
- v3.0 uses `ProjectScores` view-model derived from fixtures.
  Reconcile with the existing
  [packages/shared/src/scoring](packages/shared/src/scoring/) engine —
  drive v3 scores from the same logic that powers `feat/shared-scoring`.

### Accessibility
- axe-core flagged contrast warnings on muted-text-on-charcoal at
  several locations (rail section labels, MetricCard subtext, footer).
  Audit token usage and bump muted text contrast to 4.5:1.

### TypeScript hygiene
- CSS-module imports surface as `string | undefined` for dynamic
  `css[`tone-${x}`]` access. Add explicit `as string` casts or
  generate `.module.css.d.ts` types so `tsc --noEmit` is clean.
- [FiltersBar.tsx:34](apps/web/src/v3/components/FiltersBar.tsx) state
  setter has a `string | undefined` widening that needs the value
  filtered before assignment.

### Mobile
- Studio (Design page) collapses to single-column under 880px but the
  toolbox + canvas + bottom strip stack hasn't been usability-tested
  on touch devices.

---

## Out of scope for v3.1
- Mapbox 3D terrain
- Multi-user collaboration / real-time editing
- Offline mode / sync
- Plugin / extension API for custom toolbox items
