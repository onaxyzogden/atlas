# 2026-04-28 — Atlas v3.0 lifecycle shell shipped


Completed the 9-phase v3.0 plan on `feat/atlas-3.0`. Atlas is now a
lifecycle-driven Land Intelligence OS with 7 stage pages mounted under
`/v3/project/:id/*`, a parallel route tree to the existing v2 workspace.

### What shipped (`feat/atlas-3.0`)

- **Shell + primitives** (Phases 1–2): branch cut, route stubs for all
  7 stages, [`apps/web/src/v3/`](../apps/web/src/v3/) folder with
  `useV3Project` adapter reading from a single MTC fixture
  ([`mockProject.ts`](../apps/web/src/v3/data/mockProject.ts)). Built
  `MetricCard`, `DecisionRail` (generic stage-aware container with a
  rail per stage under [`components/rails/`](../apps/web/src/v3/components/rails/)),
  `StageHero`, `PageHeader`, `BlockerCard`, `CategoryCard`,
  `InsightPanel`, `BestUsesTable`, `ScoreBar`, `DesignRulesGrid`.
- **Project Command Home** (Phase 3): verdict ring + 6-tile Project
  Health strip + Top Blocker + Recent Activity / Decisions / Next
  Actions tri-column.
- **Discover** (Phase 4): candidate board with 6 properties (Green
  Valley Ranch, Pine Ridge, Maple Creek, Riverside Meadows, Stonefield
  Acres, Highland Homestead), filters bar, shortlist + compare tray.
- **Diagnose** (Phase 5): Conditional Opportunity verdict + 7
  category cards (Regulatory/Soil/Water/Terrain/Ecology/Climate/Infra)
  + Risks / Opportunities / Limitations 3-panel.
- **Prove** (Phase 6): "Supported with Required Fixes" verdict, 4
  blockers, 6 best uses, 6 vision-fit bars with benchmarks, 5
  execution stats, 6 design-rules grid.
- **Operate** (Phase 7): 7 Today-on-the-Land tiles, alerts +
  upcoming events split panel,
  [`FieldMapPlaceholder`](../apps/web/src/v3/components/FieldMapPlaceholder.tsx)
  inline-SVG canvas with tone-coded flag chips. RULE 2: no MapboxGL
  imports anywhere in v3.
- **Build + Report MVPs** (Phase 8): 3-phase × 13-task build plan
  with status-keyed phase cards; Report page with "Generate Summary"
  → print-styled aggregation of verdict + 6 score bars + blockers +
  actions, `window.print()` + `@media print` rules.
- **Design Studio** (Phase 9, last per the brief): 5-group toolbox
  (Grazing & Land Use, Structures, Water Systems, Access & Paths,
  Amenity & Culture) → static-SVG canvas with paddocks A–D, yurt
  cluster, barn, musalla, hydrology stream/pond/wetland, contour
  curves, gold-dashed property boundary → 5 overlay toggle chips +
  Base Map dropdown → bottom 5-MetricCard strip
  (Area / Perimeter / Elevation / Water Need / Project Phase).
  Toolbox clicks fire toast ("Would place X").

### Verification

- `npm run build` clean across all phases.
- 8-route post-Phase-9 sweep confirmed: every route renders a clear
  title, populated DecisionRail, and `mapboxgl`/`maplibregl` both
  `undefined` on every route. RULE 3 (what / wrong / next) satisfied
  per stage.
- Backlog filed at
  [`apps/web/src/v3/BACKLOG-v3.1.md`](../apps/web/src/v3/BACKLOG-v3.1.md).

### Commits (top of `feat/atlas-3.0`)

```
b503b16 docs(v3): v3.1 backlog
efc3b47 feat(v3/design): Phase 9 — Design Studio
63ddc81 feat(v3/build,report): Phase 8 — Build + Report MVPs
43e542f feat(v3/operate): Phase 7 — Operations Hub
e2e1808 feat(v3): Phase 6 — Prove Feasibility Engine
bf8b0b7 feat(v3): Phase 5 — Diagnose Land Brief
3a32a38 feat(v3): Phase 4 — Discover candidate board
913df8e feat(v3): Phase 3 — Project Command Home
ff2d92f feat(v3): Phase 2 — primitive components
61c5f9a feat(v3): Phase 1 — branch + scaffolding
```

### Deferred (v3.1 backlog highlights)

- Live MapboxGL canvas in Design Studio replacing static SVG; live
  field map in Operate.
- Wire `useV3Project` to Fastify backend; route cutover from
  `/project/$projectId` to `/v3/...` once API + map land.
- Real candidate filtering, real Vision Fit scoring (reuse
  `packages/shared/src/scoring`), PDF export, Generate Brief / Fix on
  Map / Mark Phase Complete CTAs.
- axe-core contrast warnings on muted-text-on-charcoal; CSS-module
  `.d.ts` generation to clean up `string | undefined` widening.

### Recommended next session

- **v3.1 kickoff** — pick the spike that unblocks the most: either
  wire `useV3Project` to the Fastify backend (unblocks real data
  across all 7 stages) or replace the Design Studio SVG with the live
  MapboxGL canvas (unblocks placement scoring + the v3.1 cutover).

Decision record: [decisions/2026-04-28-atlas-v3-mock-first-lifecycle-shell.md](decisions/2026-04-28-atlas-v3-mock-first-lifecycle-shell.md).
