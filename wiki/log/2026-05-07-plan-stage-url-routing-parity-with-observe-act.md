# 2026-05-07 — Plan stage URL-routing parity with Observe / Act


Plan now mirrors Observe / Act on three axes that previously diverged:

### URL routing

- New route `v3PlanModuleRoute` (`path: 'plan/$module'`) registered in
  [`apps/web/src/routes/index.tsx`](../apps/web/src/routes/index.tsx)
  immediately after `v3PlanRoute`, both pointing at `PlanLayout`.
- [`PlanLayout`](../apps/web/src/v3/plan/PlanLayout.tsx) rewritten to mirror
  [`ActLayout`](../apps/web/src/v3/act/ActLayout.tsx): module is read from
  `useParams({ strict: false })`, validated via `isPlanModule`, and
  `handleSelectModule` calls `useNavigate()` for both the clear branch
  (`/plan`) and the select branch (`/plan/$module`). `slideUpOpen` stays
  local — sheet open/close does not navigate.

### Boundary read

- `PlanLayout` now derives the parcel boundary via
  `useV3Project(params.projectId)?.location.boundary`, matching Observe.
  The previous raw `useProjectStore` lookup fell through to a local
  `MTC_FALLBACK` with `parcelBoundaryGeojson: null`, so the boundary
  outline never rendered for the MTC sentinel; `useV3Project` short-circuits
  `'mtc'` to `MTC_PROJECT.location.boundary`.

### Self-railed stage

- `'plan'` added to `SELF_RAILED_STAGES` in both
  [`DecisionRail.tsx`](../apps/web/src/v3/components/DecisionRail.tsx) (line 52)
  and [`V3ProjectLayout.tsx`](../apps/web/src/v3/V3ProjectLayout.tsx) (line 58).
  Plan's `StageShell.rightRail` already mounts `PlanChecklistAside`; the
  outer `LandOsShell` rail must short-circuit so the canvas isn't squeezed
  to ~108 px wide by a duplicate rail.

### Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc -p apps/web/tsconfig.json --noEmit` clean (exit 0, no diagnostics).
- In-browser at `http://localhost:5200/v3/project/mtc/plan`:
  bare `/plan` → no module pressed; click Water → URL flips to
  `/plan/water-management` (slide-up closed); second click → slide-up opens
  (URL unchanged); third click → slide-up closes (URL unchanged); switch to
  Plants → URL flips to `/plan/plant-systems` and slide-up closes; hard
  refresh on `/plan/plant-systems` → Plants restored; invalid slug
  (`/plan/not-a-module`) renders cleanly with no module pressed and no
  console errors.
- React-fiber inspection of the `.maplibregl-map` element: `boundary` prop
  arrives as `{ type: 'Polygon' }` at depth 2 — the same shape Observe passes
  and the input that drives `DiagnoseMap`'s boundary `useEffect`.
- Outer rail gone (`document.querySelector('._rail_rp4b6_31')` → null);
  Plan's own right aside present; canvas grew from 108 → 246 px on a 1030 px
  window.

**ADR.** [`wiki/decisions/2026-05-07-atlas-plan-url-routing-parity.md`](decisions/2026-05-07-atlas-plan-url-routing-parity.md).

### Deferred

- Plan-pillar wiring in `V3LevelNavBridge.handleSegmentClick` (still
  observe-only). Needs `PLAN_PILLARS` + pillar tasks before pillar segments
  can route.
- Plan-side vitest coverage of the URL contract.

### Recommended next session

- Wire Plan pillars into the level navigator so Plan modules can be reached
  from the lifecycle sidebar's segment clicks (matches the Observe segment
  flow at `V3LevelNavBridge.tsx:131`).
