# Entity -- Closed-loop / waste-vector Plan->Act workflow

**Kind:** Feature (multi-session epic, in progress)
**Repo:** `onaxyzogden/atlas` -- branch `feat/atlas-permaculture`
**Started:** 2026-06-03
**ADR:** [[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]]

## What it is

The realization of the operator-attached `olos-waste-vector-v2.jsx` prototype as a
real Plan -> Approval -> Act workflow: a steward designs closed material loops in Plan
(scored, status/cadence-aware, with a flow map that shows volume / status / via-nodes),
approves them through a gate, and an animated transition GENERATES stewardship routines
into an Act command center where they are scheduled, executed-with-proof, grouped, and
escalated.

It is an ENRICHMENT, not a new component:
- **Plan half** extends the existing closed-loop feature -- `closedLoopStore`
  (`MaterialFlow[]`), `WasteVectorTool`, `WasteVectorListView`,
  `WasteVectorDashboardView`, `ClosedLoopGraphCard`, `useClosedLoopValidation`,
  `useFlowEndpointOptions`.
- **Act half** builds UI over the existing-but-dormant `stewardshipRoutineStore.ts`
  (per-project CRUD, persist `ogden-olos-stewardship-routines`, API sync).

## Shared data-model contract (Phase A defines; B/C consume)

`MaterialFlow` (in `apps/web/src/store/closedLoopStore.ts`) carries OPTIONAL,
back-compat design-intent fields:
- `operationalStatus?: FlowOperationalStatus` -- active | seasonally-dormant | at-risk
  | suspended (undefined resolves to "active")
- `cadence?: FlowCadence` -- continuous | daily | weekly | fortnightly | monthly |
  seasonal | rotation-based | as-needed
- `transformationNodeIds?: string[]` -- ordered "via" feature ids the flow passes through
- `activeMonths?: number[]` -- 1..12; absent = all year

Plus exported config maps `FLOW_OPERATIONAL_STATUS_CONFIG` (label/dash/tone; `dash`
drives SVG `strokeDasharray`) and `FLOW_CADENCE_CONFIG` (label). Pure resolvers live in
`apps/web/src/features/plan/closedLoop/flowStatusModel.ts`. These symbols (+ the later
`buildLoopActPayload`) are the PUBLIC contract -- the Act half must NOT redefine the
enums. Closed-loop CREDIT remains `sourceId && sinkId` both non-null.

## Discipline

Pure-helper-first: every slice ships a tested `.ts` helper before any SVG/UI edit
(mirrors `flowCreditStatus.ts` / `geometryDiff.ts` / `applyAsBuiltDiff.ts`). Persist
version bumps use a pass-through `migrate` to preserve undo timelines. Any helper test
that transitively imports the persist-backed store needs `@vitest-environment happy-dom`
([[feedback-vitest-bounded-runs]]).

## Slice status (Phase A)

- **A0 -- shipped** (`71336025`): 4 optional fields + enums + config maps + version
  2->3 pass-through migrate; `flowStatusModel.ts` + 9 tests.
  [[log/2026-06-03-atlas-closed-loop-slice-a0]]
- **A1 -- shipped** (`55eeb943`): `loopDesignScore.ts` (pure scorer + extracted
  `efficiency()`) + read-only `LoopDesignScorePanel` mounted in `WasteVectorTool`;
  dashboard dedupes onto the shared helper; 10 tests. Live render-verify deferred --
  the WasteVectorTool legacy slide-up host is not reachable through the current strata
  IA via automation. [[log/2026-06-03-atlas-closed-loop-slice-a1]]
- **A2 -- shipped** (`37665eba`): `loopIntegrity.ts` (pure five-check loop-integrity
  checklist: sink / cadence / volume / via / activeMonths, ordered + completeCount) +
  9 tests; `FlowDetailPanel` (operationalStatus + cadence selects, mass/volume inputs,
  via-node multi-select from `useFlowEndpointOptions` filtered to `kind === "fertility"`,
  activeMonths month grid; writes via `updateMaterialFlow`); `parsePositive` extracted to
  shared `flowFormUtils.ts`; `WasteVectorListView` rows now selectable buttons that open
  the panel. Live render-verify deferred -- the WasteVectorTool legacy slide-up host is
  the same surface that A1 found unreachable through the strata IA via automation; relied
  on the unit suite (28/28) + web/shared tsc exit 0 + store read.
  [[log/2026-06-03-atlas-closed-loop-slice-a2]]
- **A3 -- shipped** (`99032df8`): `flowMapGeometry.ts` (pure `flowMagnitude` +
  clamped `edgeWidth` ramp + `flowPolylinePoints` via-skip + `polylinePointsAttr` +
  `dashForStatus`/`dashForFlow` re-export) + 12 tests; `ClosedLoopGraphCard` edges
  now `<polyline>` with width-by-volume, dash-by-status, via-node waypoints, and a
  CSS `@keyframes` orphan pulse ring (local `.module.css`, not SMIL);
  `WasteVectorDashboardView` routes flows through `transformationNodeIds` into the
  existing processor lane as per-segment curves with the shared width/dash/colour.
  Live render-verify deferred -- the WasteVectorTool legacy slide-up host is the
  same surface A1/A2 found unreachable through the strata IA via automation; relied
  on the 40/40 unit suite + shared tsc exit 0 + web tsc clean for the touched files
  (the only web tsc errors are the untracked foreign-WIP `src/compost/` vertical).
  [[log/2026-06-03-atlas-closed-loop-slice-a3]]
- **A4 -- pending:** `loopApprovalGate.ts` + `loopHandoffContract.ts`
  (`buildLoopActPayload`) + `ActHandoffPreviewPanel` + domain-guarded
  `PlanToActHandoff.onEmit` enrichment + "Loop / Handoff" tab.
- **Phase B (later):** animated approval-transition that generates Act routine
  artifacts onto `stewardshipRoutineStore` (+ execution/group stores).
- **Phase C (later):** the dedicated three-panel Act "Resource Flows" command center,
  launched from [[entities/act-tier-shell]].

## Related

- [[entities/act-tier-shell]] -- the Act tier shell that will host the Phase C surface.
- ADR [[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]].
