# 2026-05-10 — 7 thematic commits


Multi-thread dirty tree (15 modified + 4 untracked spanning unrelated
work) split into 7 coherent commits on `feat/atlas-permaculture` rather
than one monolithic blob. The Terrain3D enable was held back as broken
(see *deferred* below).

Commits landed (ffe8de3 … a7e7878):

1. **`ffe8de3`** — Affinity-telemetry surfacing (dev-only). Adds
   `/v3/project/$projectId/reference/affinity-telemetry` route plus
   gated entry points in `V3LifecycleSidebar` + `HomePage` "References &
   tools" section. Gate: `VITE_ATLAS_TELEMETRY_ENABLED ?? DEV`.
2. **`6ff7bdb`** — SWOT PDF export pipeline. Three new templates
   (`swotSynthesis`, `swotJournal`, `swotDiagnosisReport`) wired into
   `apps/api` PDF service + `packages/shared/.../export.schema.ts` +
   web-side export buttons on the three SWOT views.
3. **`f05c78c`** — `DesignToolRail` selector hoists `EMPTY_ELEMENTS`
   constant, fixing "Maximum update depth exceeded" on empty-element
   projects. (Cross-referenced as a hot-fix in the Terrain3D entry
   below.)
4. **`07630b1`** — Drops the duplicate `QuickActions` + dialog mounts
   from `ActOpsAside`; the canonical wiring now lives only in
   `ActTools` (left rail).
5. **`166c0e0`** — Vitest config gains `@vitejs/plugin-react`;
   `actInteractionLog.test.ts` switches `jsdom → happy-dom`.
6. **`a50613a`** — `MaintenanceLogCard` accepts placed-Structure
   sources (barn / greenhouse / well / etc.) alongside the existing
   earthworks + storage-infra source kinds.
7. **`a7e7878`** — `ObserveTools.module.css` grid fix: tooltip wrapper
   is now the direct grid child after the `e0a516d` DelayedTooltip
   migration; columns needed `min-width: 0` + `repeat(3, minmax(0,
   1fr))` to keep equal-width.

Deferred (left dirty intentionally):

- **Terrain3D enable** — `PlanPhaseTabs.tsx` flips `terrain3d` tab
  from disabled to enabled, but the `Terrain3DController`,
  `DesignElementExtrusionLayer`, and `elementHeights.ts` files the
  log entry below references are not yet on disk (`git ls-files`
  empty for those names). Landing the tab-enable now would ship a
  click-target with no behaviour. Plus the Terrain3D ADR
  (`wiki/decisions/2026-05-10-atlas-plan-terrain3d-design-element-extrusions.md`)
  is still untracked. Holds until the implementation files land.

Verification: `apps/web tsc --noEmit` was clean before, between, and
after the 7 commits (background tasks `b8puyeeyy`, `bra7wrg2k`).

Pushed: `3a80ed1..a7e7878 → origin/feat/atlas-permaculture`.
