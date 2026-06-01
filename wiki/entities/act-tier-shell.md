# Act Tier Shell

**Type:** module (v3 Act surface) · **Status:** active (default Act page) · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/act/tier-shell/` · **Branch:** `feat/atlas-permaculture`

The real, store-backed Act page, promoted from the throwaway 4-rail
map-centric prototype on 2026-05-30 ([[decisions/2026-05-30-atlas-act-tier-shell-promotion]]).
Map-centric layout with the stratum spine above the canvas, the objective
rail on the LEFT, map markers, and a tools rail along the bottom; the RIGHT
panel toggles a dashboard / objective-execution view. `getActShellMode`
defaults to `tier-shell`; `field-action` and `command-centre` are one toggle
away (none deleted, per [[feedback-no-deletion]]).

## Purpose

Give the steward a map-first Act surface where selecting a Plan objective
reveals exactly the field tools that objective calls for, and arming one
places a real, persisted feature on the canvas. Replaces the prototype's
show-everything tool strip with an objective-conditional, categorized rail
(Phase C, 2026-05-31).

## Key files

- `ActTierShell.tsx` — entry; mounts the spine above `StageShell`, the LEFT
  objective rail, the center read-only Act substrate, the bottom tools rail,
  and the RIGHT dashboard/objective toggle. Hosts the DrawHosts (below).
- `ActTierShell.module.css` — shell + category-tile styles (catTile / toolCat
  / toolGrid, +108 lines for the categorized rail).
- `ActTierCategorizedToolsRail.tsx` — bottom rail (Phase C). Renders the
  non-empty tool categories for the selected objective; armed-tile highlight
  from `useMapToolStore`; two empty states. Replaced the always-on three-log
  `ActTierToolsRail` (preserved on disk, no longer mounted). Navigated by a
  vertical **dots navigator** (2026-05-31): an `IntersectionObserver` tracks the
  framed category and lights the matching dot; clicking a dot `scrollIntoView`s
  its category; native scrollbar hidden. Dots render only when >1 category.
- `ActTierExecutionPanel.tsx` — RIGHT-rail objective-execution detail (header,
  % ready, checklist, Evidence, activity, record). Checklist items are bordered
  cards matching the Evidence cards (2026-05-31). The Evidence section is
  **per-objective** (2026-05-31): driven by `getObjectiveEvidence(objective)`
  via descriptor-keyed state + a `renderEvidenceCard` helper. **Evidence capture
  is now persisted** (2026-05-31): photo counts, confirms, note text + saved
  flags write to `actEvidenceStore`; checklist completion writes to the shared
  `planStratumStore` (unified with the Plan stage). All state survives reload.
  The header + progress bar are wrapped in one bordered `.execHeaderBox` (with a
  `border-bottom` divider) over an `.execBody`, mirroring the objective rail's
  `.railPanel`/`.railHeader` (2026-05-31). The **Record-observation button is
  armed** (2026-05-31): it enables only when the checklist is complete AND every
  REQUIRED evidence item is satisfied AND `getPrimaryDomainForObjective` resolves
  non-null, then writes a `manual_observation` `ObserveDataPoint`
  (`statusOutput:'clear'`, domain-linked, `capturedBy:'act-tier'`) via
  `useObserveDataPointStore.recordDataPoint`. First Act->Observe write path; see
  [[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]]. **The point
  also carries `sourceObjectiveId: objective.id`** (2026-05-31): a nullable FK added
  to the `ObserveDataPoint` schema, so the activity section is now a **real
  per-objective feed** -- it subscribes to `observeDataPointStore.byProject` and
  `useMemo`-filters by `sourceObjectiveId`, newest-first, rendering each recorded
  point's timestamp + note (`.actyList`/`.actyRow`). **Repeat recordings are
  allowed**: the prior session-local `recorded` lock was removed -- the feed gaining
  a row is the confirmation, the button stays `disabled={!ready}`. See
  [[decisions/2026-05-31-atlas-observe-datapoint-objective-link]] (supersedes
  decision #2 of the record-observation ADR in part).
- `actToolCatalog.ts` — app-layer catalogue joining catalogue-id strings to
  `{ label, icon, category, arm }`. `ActToolArm` is a discriminated union
  `{kind:'map';mapToolId:MapToolId} | {kind:'log';quickLogId:string}`.
  5 categories (terrain-survey, access-utilities, structures,
  production-systems, field-logs); ~21 map tools + 3 logs; `slope`/`aspect`/
  `dem` omitted (analysis-only, un-armable).
- `ActTierToolsRail.tsx` — superseded three-log rail; preserved, unmounted.
- `ActTierObjectiveRail.tsx` / `ActTierObjectiveCard.tsx` — LEFT rail with real
  **"N/M done" checklist chips** (2026-05-31): fed by `computeChecklistProgress`
  (checklist completion), not field actions, so a populated checklist no longer
  reads "No tasks yet". Map markers keep the field-action progress.
- `ActTierMapMarkers.tsx` — per-objective markers (real geometry,
  hide-until-real, [[decisions/2026-05-31-atlas-act-objective-marker-geometry]]).
- `objectiveProgress.ts` / `objectiveMarkerGeometry.ts` — pure helpers.
  `objectiveProgress.ts` now exports BOTH `computeObjectiveProgress` (field
  actions -> markers) and `computeChecklistProgress` (checklist -> rail);
  `objectiveMarkerGeometry.ts` feeds markers.

## Data: objective -> tool map

`packages/shared/src/relationships/objectiveActTools.ts` (net-new product data,
mirrors `objectiveObserveDomains.ts`):
- `OBJECTIVE_ACT_TOOLS_OVERRIDE` (per-objective) over
  `STRATUM_ACT_TOOLS_DEFAULT` (per-stratum backstop)
- `getObjectiveActTools(objective): readonly string[]` — override wins, else
  stratum default, else `[]`. Returns catalogue-id strings only (no app deps);
  exported from the ROOT `@ogden/shared` barrel.

Mapping: s1-* -> [] (non-spatial); s2-land-baseline -> terrain/survey set;
s3/s4 -> access + structures; s5-water-strategy -> water systems + water log;
s6-yield-flows -> production systems + harvest/livestock logs; s7-phasing ->
structures.

## Data: objective -> evidence map

`packages/shared/src/relationships/objectiveEvidence.ts` (net-new product data,
mirrors `objectiveActTools.ts`; 2026-05-31). The Evidence descriptor data has
NO app deps, so the catalogue AND the relevance map both live in `@ogden/shared`
and the resolver returns ready-to-render descriptors:
- `EvidenceKind = 'photo' | 'confirm' | 'note'`;
  `EvidenceDescriptor { id, kind, label, required, target? }`.
- `EVIDENCE_CATALOG` (5): `checkpoint-photos`, `route-passable`, `summary-note`
  (original 3, verbatim) + `site-photo`, `measurement-confirm`.
- `OBJECTIVE_EVIDENCE_OVERRIDE` keyed by the real 19 universal objective ids;
  `STRATUM_EVIDENCE_DEFAULT` backstop.
- `getObjectiveEvidence(objective): readonly EvidenceDescriptor[]` —
  `OVERRIDE[id] ?? STRATUM_DEFAULT[stratumId] ?? ['summary-note']`, mapped to
  descriptors. `summary-note` floor on every objective; `route-passable` only on
  `s5-access` + `s2-infrastructure`. Guarded by
  `__tests__/objectiveEvidenceCoverage.test.ts` (6 invariants).
See [[decisions/2026-05-31-atlas-act-evidence-perobjective-and-dots]].

## DrawHost composition (the ADR-7 seam)

The canvas mounts three DrawHosts side by side, each hard-guarding on its own
id prefix and returning `null` otherwise (one tool armed at a time):
- `ActDrawHost` (`act.*`)
- `ObserveDrawHost` (`observe.*`) — added Phase C
- `PlanDrawHost` (`plan.*`, `variant="current"`, `editable` Plan layers stay
  `false`) — added Phase C

This crosses the ADR-7 stage boundary ("Act executes; Plan decides"); mitigated
by writing through the shared stores (one source of truth) and keeping
`PlanDataLayers editable={false}` (add-only, no editing of Plan decisions). See
[[decisions/2026-05-31-atlas-act-objective-tool-rail]].

## API / arming flow

1. User selects an objective (LEFT rail) -> URL `.../tier-shell/<objectiveId>`.
2. `ActTierCategorizedToolsRail` resolves
   `resolveActTools(getObjectiveActTools(objective))` and groups by category.
3. `onActivate(tool)` -> `handleActivateTool`: `kind:'map'` ->
   `setActiveTool(arm.mapToolId)`; `kind:'log'` -> resolve `QUICK_LOGS` entry,
   `setActiveModule(log.module)` + `setActiveTool(log.toolId)`.
4. The matching DrawHost picks up `activeTool`, mounts its draw dock, and the
   placement persists to the shared store and renders via the data layers.

`MapToolId` drift is caught by `tsc` (every `mapToolId` literal is union-checked).

## Dependencies

- `useMapToolStore` (`v3/observe/components/measure/`) — `{activeTool, setActiveTool}`
- `QUICK_LOGS` (`v3/act/quickLogs.ts`) — field-log definitions (not duplicated)
- `@ogden/shared` — `getObjectiveActTools`, `PlanStratumObjective`
- Shared stores: `builtEnvironmentStoreV2`, crop / livestock / design-element
- `ObserveDrawHost` / `PlanDrawHost` / `ActDrawHost`, `PlanDataLayers`

## Routes

- `act/tier-shell` — dashboard mode
- `act/tier-shell/$objectiveId` — objective-execution mode

## Data: Evidence capture persistence

`apps/web/src/store/actEvidenceStore.ts` (net-new, 2026-05-31):

- Persist key: `ogden-act-evidence`, version 1.
- `byProject: Record<projectId, Record<objectiveId, EvidenceCapture>>` —
  photo counts, confirm flags, note text + notesSaved flags; keyed by
  `descriptorId` within each capture so multiple cards of one kind coexist.
- `visionForms: Record<projectId, Record<formId, string>>` — text captured
  via the s1-vision VisionFormModal tiles.
- Actions: `addPhoto` (cap at `maxTarget`), `setConfirm` (idempotent),
  `updateNote` (atomically clears saved flag), `saveNote` (idempotent),
  `saveVisionForm`. All immutably patch nested records via `patchCapture`.
- `EMPTY_CAPTURE` — module-level frozen object returned by selectors when no
  capture exists for an objective. Prevents the Zustand v5 `getSnapshot`
  infinite re-render loop (`?? {}` creates a new object every render).
- Checklist completion is NOT stored here; it writes to the shared
  `planStratumStore.toggleItem(projectId, objectiveId, itemId)` so Plan and
  Act share one source of truth.

`ActTierExecutionPanel` selects each action individually
(`useActEvidenceStore((s) => s.addPhoto)`) to avoid composite-selector
object churn. `ActTierShell.handleFormSave` uses `getState()` (imperative,
not a render-phase hook) to call `saveVisionForm`.

## Current state (2026-05-31)

Phase C shipped: categorized objective-driven bottom rail + cross-stage arming
on the canvas (commits `e6030252` rail Parts A-D, not pushed). Field-action got
its own ops dashboard in the same session (`ActOpsDashboard`, commits
`90820e9e` + `94291d51`) but that is a `field-action` surface, NOT this module
(scope: field-action only). tsc-clean for all changed files; live preview
verified functionally via DOM (`preview_screenshot` hung on the WebGL canvas,
disclosed per [[project-screenshot-hang]]).

Three execution-panel + tools-rail follow-ups shipped later the same day
(commits `efd4c41f` boxed checklist -> `1135366d` per-objective Evidence ->
`1098cd58` dots navigator; ahead 25, not behind):
1. Right-rail checklist items are bordered cards matching the Evidence cards.
2. The Evidence section is per-objective (the `objectiveEvidence.ts` map above);
   "Route passable confirmation" now appears only on `s5-access` +
   `s2-infrastructure`, every objective shows at least a summary note,
   conformance-guarded.
3. The tools rail navigates by a vertical dots column (circle -> active gold
   dash) instead of a native scrollbar.
tsc clean (apps/web + packages/shared); conformance 6/6; live preview verified
with screenshots. ADR [[decisions/2026-05-31-atlas-act-evidence-perobjective-and-dots]].

Evidence + checklist persistence wired later the same day (commit `e6f06475`,
three files: `actEvidenceStore.ts` NEW, `ActTierExecutionPanel.tsx`,
`ActTierShell.tsx`). Closed the "visual-first, not persisted" gap: all
evidence capture, checklist progress, and s1-vision form values now survive
reload. Verified: write -> objective-switch -> hard reload all confirmed via
store-module imports + DOM probes.

s1-vision form → checklist wiring (commit `2624c3ca`, two files:
`planStratumStore.ts`, `ActTierShell.tsx`): saving a Vision tile modal now
also marks the matching checklist item complete via the new idempotent
`planStratumStore.setItemComplete` action. Re-saving is a no-op (the action
guards on `current.includes(itemId)`). The two stores are now fully coherent
for s1-vision: modal save simultaneously persists form text (actEvidenceStore)
and advances checklist progress (planStratumStore). tsc 0 errors.

Record-observation flow + exec-header containment + rail checklist progress
shipped later the same day (commits `6e5ff3bc` Slice 1 -> `63c23ce8` Slice 2 ->
`79c8c05f` Slice 3). The Record button now writes a `manual_observation`
`ObserveDataPoint` once the checklist + required evidence are satisfied (first
Act->Observe write path); the header + progress sit in one bordered region; the
rail reads "N/M done" from the checklist instead of "No tasks yet". tsc clean for
all five files (only foreign-WIP `ProtocolLayerPanel` errored, untouched); live
preview verified end-to-end via DOM probe + screenshots (button gate ->
localStorage data-point write -> relabel). ADR
[[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]].

Objective<->observation link + per-objective feed + Observe provenance shipped
later the same day (commits `389bff36` Slice A schema+store -> `67926c85` Slice B
Act feed -> `66aee783` Slice C Observe chip). `ObserveDataPoint` gained a nullable
`sourceObjectiveId` FK (persist `version` 1->2 with backfill migrate;
`getByObjective`/`getActiveByObjective` selectors); the Act write path stamps
`objective.id`; the exec panel's "This need's activity" became a real per-objective
feed (newest-first, filtered by `sourceObjectiveId`); repeat recordings allowed
(the `recorded` lock removed); the Observe `DomainObservationList` shows a gold
objective-title provenance chip on Act-emitted rows via
`findObjectiveAcrossCatalogues`. New conformance test
`observeDataPointObjectiveLink.test.ts` (default-null, round-trip, every universal
objective id resolves a title). tsc clean (apps/web + packages/shared; foreign
TanStack route-tree churn isolated, none in my files); live preview verified --
2 recorded points showed 2 feed rows + 2 Observe chips, button stayed armed, both
persisted with `sourceObjectiveId: "s2-terrain"`; test points cleaned up. This
**supersedes decision #2** of the record-observation ADR in part (domain-only link
-> domain link PLUS objective provenance). ADR
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]].

## Notes

- `ViewBDashboard` is preserved and still the tier-shell's dashboard-mode panel
  (only the field-action surface swapped it for `ActOpsDashboard`).
- TS gotcha: discriminant narrowing of `tool.arm` is DROPPED inside a nested
  `.find` closure -- hoist `const arm = tool.arm` before the closure.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
