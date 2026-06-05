# 2026-06-03 -- Closed-loop Plan->Act workflow: Slice A3 (flow-map rendering upgrade)

**Branch:** `feat/atlas-permaculture`
**Commit:** `99032df8` -- shared `flowMapGeometry` helper + 12 tests, plus the
two flow-map surface upgrades (5 files +324/-20; **not pushed**). Fourth slice of
the multi-session Plan->Act closed-loop / waste-vector workflow. See ADR
[[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]] and entity
[[entities/closed-loop-workflow]].

## Context

Slices A0 (data-model contract + `flowStatusModel`), A1 (read-only Loop Design
Score strip), and A2 (per-flow editor + integrity checklist) are shipped. A3 turns
the A0 design-intent fields (throughput, operationalStatus, transformationNodeIds)
into VISUAL signal on the two existing flow maps: width by volume, dash by status,
via-node waypoints, and an orphan-pulse cue.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (5 files)

**Create**
- `apps/web/src/features/plan/closedLoop/flowMapGeometry.ts` -- pure, render-free.
  - `flowMagnitude(flow)` -- largest positive finite of mass / volume / energy per
    month (the single comparable throughput scalar; 0 when no throughput; nutrient
    sub-totals excluded as they are not a transport magnitude).
  - `edgeWidth(volume, maxVolume, opts?)` -- clamped linear ramp MIN(1.4)..MAX(6);
    degenerate inputs (non-finite, volume<=0, maxVolume<=0) return MIN so a
    zero-throughput flow renders thin rather than vanishing.
  - `flowPolylinePoints(source, via[], sink)` -- ordered source -> via... -> sink;
    null/undefined via entries skipped (missing-centroid via degrades to a straight
    segment); null source/sink omitted; caller renders only when >= 2 points.
  - `polylinePointsAttr(pts)` -- SVG `points` string.
  - Re-exports `dashForStatus` / `dashForFlow` from `flowStatusModel` so a surface
    needs ONE import for all flow-map geometry + dash logic.
- `apps/web/src/features/plan/closedLoop/__tests__/flowMapGeometry.test.ts` --
  12 tests (`@vitest-environment happy-dom` for parity): edgeWidth ramp clamps +
  custom min/max + degenerate->min; flowPolylinePoints ordering + missing-via skip
  + null source/sink omission; polylinePointsAttr format; flowMagnitude selection.
- `apps/web/src/v3/plan/cards/soil-fertility/ClosedLoopGraphCard.module.css` --
  `.pulseRing` CSS `@keyframes` (NOT SMIL) for the orphan-fertility pulse;
  `prefers-reduced-motion` falls back to a static ring.

**Modify**
- `ClosedLoopGraphCard.tsx` (spatial closed-loop graph) -- vectors render as
  `<polyline>` with `strokeWidth = edgeWidth(flowMagnitude(v), maxMag)`,
  `strokeDasharray = dashForFlow(v)`, and via-node waypoints from
  `transformationNodeIds` resolved through the existing `positions` map (via nodes
  reference feature ids -> centroids for free; missing centroid -> straight
  segment). `maxMag` memo = largest `flowMagnitude` across project vectors. Orphan
  fertility nodes get the pulse ring behind the node circle.
- `WasteVectorDashboardView.tsx` (3-column lane map) -- edges are now waypoint-keyed
  (`source -> via processors -> sink`): a flow's `transformationNodeIds` that map to
  a seeded processor node route the flow through the EXISTING processor lane as
  per-segment curves; via ids without a placed processor node are skipped (direct
  source->sink fallback). Each segment carries the shared `edgeWidth` width +
  `dashForFlow` dash + the material-kind colour.

## Verification

- **Typecheck:** shared `tsc --noEmit` EXIT 0. Web `tsc --noEmit -p
  apps/web/tsconfig.json` (with `node --max-old-space-size=8192`) reports ONLY 3
  errors, all in the untracked foreign-WIP `apps/web/src/compost/` vertical
  (`CompostWorkspacePage.tsx` referencing not-yet-created `./PlanStage.js` /
  `./ActStage.js` / `./ObserveStage.js`). That directory is `??` untracked, not
  mine, and appeared out-of-band (the branch is externally rebased per
  [[project-branch-rebase]]); my five files produce zero errors. Per the
  foreign-WIP never-edit discipline I left it untouched.
- **Vitest (bounded, `--pool=forks --testTimeout=20000`, from `apps/web`):** the
  closedLoop suite 40/40 green (flowMapGeometry 12, loopIntegrity 9,
  flowStatusModel 9, loopDesignScore 10). The two modified surfaces have no unit
  tests (logic lives in the tested pure helper).
- **Live-verify limitation (honesty gate).** Both surfaces live inside
  `WasteVectorTool` -- the same legacy `PlanModuleSlideUp` "soil" module host that
  A1/A2 found unreachable through the current strata-spine IA via automation. Per
  [[project-screenshot-hang]] honesty discipline, the rendered maps were NOT
  exercised on a live MTC surface this slice. Evidence basis: the 40/40 unit suite
  + clean shared typecheck + clean web typecheck for the touched files. Follow-up:
  when A4's "Loop / Handoff" tab re-exposes WasteVectorTool through the strata IA,
  do the deferred live render-verify (via flow elbows through the node; high-volume
  thicker; at-risk dashed; orphan pulses; widths clamped).

## Commit shape

Explicit-path commit (`git add --` the 5 files only), guarded with `Compare-Object`
(intended == staged) run atomically with `git commit -F` in one shell invocation.
The untracked foreign-WIP `src/compost/` tree was NOT staged -- never `git add -A`.
Commit-only (not pushed). ASCII-only; JS/JSON apostrophes double-quoted; message via
system temp + `git commit -F` ([[feedback-commit-immediately-on-rebased-branches]]).

## State after

Both Plan flow maps now encode throughput (width), operational status (dash), via
topology (waypoints through the processor lane), and orphan state (pulse) from the
shared helper. Next: Slice A4 -- `loopApprovalGate.ts` + `loopHandoffContract.ts`
(`buildLoopActPayload`) + `ActHandoffPreviewPanel` + domain-guarded
`PlanToActHandoff.onEmit` enrichment + the "Loop / Handoff" tab on WasteVectorTool
(which also re-exposes the surface for the deferred live render-verify). CSRA
untouched ([[fiqh-csra-erased-2026-05-04]]).
