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
- `ActRailModeToggle.tsx` — two-segment radiogroup ("Objectives" / "Protocols")
  rendered at the top of the left rail (2026-05-31). Props:
  `{ mode: RailMode; onChange; attentionCount: number }`. When
  `attentionCount > 0` an amber pill badge (`data-testid="act-rail-protocol-badge"`,
  `--color-gold-brand`) appears on the Protocols segment. Styled with Act
  `--color-*` vars, NOT the spine hard-coded palette.
- `ActTierObjectiveRail.tsx` / `ActTierObjectiveCard.tsx` — LEFT rail with real
  **"N/M done" checklist chips** (2026-05-31): fed by `computeChecklistProgress`
  (checklist completion), not field actions, so a populated checklist no longer
  reads "No tasks yet". Map markers keep the field-action progress. Also renders
  `ActRailModeToggle` at the top of `.railPanel` (2026-05-31). In
  `mode === 'protocols'` mounts `ProtocolLayerPanel` (from `plan/strata/`,
  reused not forked) in a `flex:1; min-height:0` `.railProtocolBody` wrapper so
  the panel fills and scrolls; the objective list is hidden. In
  `mode === 'objectives'` (default) renders the existing header + list unchanged.
  Card title renders `objective.shortTitle ?? objective.title` (2026-06-01,
  `5832c9e2`), matching Plan `ObjectiveCard` so the same objective reads
  identically across Act and Plan (e.g. "Terrain & topography", not the long form).
  **Header REPLACES with the selected objective's detail** (2026-06-02, `c7f02afc`):
  when an objective is selected the `.railHeader` swaps from the stratum context to
  the objective short title + focused question + decision progress (verified/total,
  state colour cue) + completion gate + act-handoff + resolved act-tool chips
  (`getObjectiveActTools` -> `resolveActTools`, capped at 6 + "+N more"); reverts to
  the stratum header when nothing is selected; the eyebrow keeps naming the stratum
  throughout. For resource-flow objectives it also shows a **live closed-loop
  material-flow count** ("N flows, M closed-loop") read from `useClosedLoopStore`
  scoped to the project. The flow-block gate (`isResourceFlowObjective`, broadened
  in commit `4e4b9b34` then `35e8cd3c`,
  [[log/2026-06-02-atlas-act-rail-flow-gate-broaden]] /
  [[log/2026-06-02-atlas-act-rail-flow-gate-maximalist]]) is an OR over three
  signals: the id pattern (`/resource-flow|waste|material-flow/`, matching homestead
  `hms-s2-resource-flows`); the resolved act-tools including ANY member of the
  **maximalist material source/sink set** `FLOW_TOOL_IDS` (18 ids:
  flow-connector; compost/fertility-unit; watercourse/spring/storage/swale/sink/tanks/wells;
  crops/orchards/beds; paddocks/pasture/barns; harvest/livestock) -- so water,
  production, livestock and integration objectives all light, not just compost-
  bearing ones (deliberate operator choice favouring discoverability over signal
  density; flows are project-scoped so the block degrades gracefully to "No material
  flows recorded yet", making breadth low-cost); and a focused-question/title prose
  match (`waste-to-input|closed[- ]loop|material flow|feedback loop|nutrient cycl`
  plus `grey[- ]?water|rainwater harvest|water re-?use|water recycl` for greywater /
  water-reuse objectives that resolve to no flow tool). The gate stays a gate --
  form-only objectives (e.g. `s1-vision`) stay dark. The dedicated **`flow-connector`
  Act tool** (label "Material flow", category Water & Hydrology, arm kind `flow`;
  [[log/2026-06-02-atlas-act-flow-connector-tool]]) is now the single strongest flow
  signal and the only Act tool that actually AUTHORS a flow: activating it opens an
  Act-owned, Modal-based list-capture popover (`actFlowPopoverStore` +
  `ActFlowConnectorPopover`) that appends a `MaterialFlow` (origin `list`, default
  materialKind `greywater`) to `closedLoopStore` via `addMaterialFlow` -- mirroring
  Plan's `WasteVectorListView` and reusing `useFlowEndpointOptions` +
  `MATERIAL_KIND_CONFIG`; endpoints accept structured features or free text, with
  closed-loop credit requiring both pinned. The popover now renders LIVE credit
  guidance (`flowCreditStatus.ts` -- `earned` / `prompt` / `no-features`) that reflects
  the current From/To selections at author time (positive green note when both are
  pinned; the `no-features` state replaces "pin both" advice when the project has no
  mapped features); guidance only -- it never gates Save
  ([[log/2026-06-02-atlas-act-flow-connector-credit-guidance]]). It is deliberately isolated from Plan's
  `useInlineFormStore` host so it works on the tier-shell (which does not mount
  `InlineFeaturePopover`), and is attached to `s6-integration-design` (default) and
  `s5-water-infrastructure` (override) objectives. New sibling stylesheet
  `ActTierObjectiveRail.module.css` holds the objective-detail classes so
  `ActTierShell.module.css` (foreign WIP) stays untouched.
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

## Objectives/Protocols rail mode toggle (2026-05-31)

The LEFT rail's header now carries an Objectives/Protocols segmented control
(`ActRailModeToggle`, commit `15d797c1`). `ActTierShell` holds
`useState<RailMode>('objectives')` (not persisted; URL/store persistence
deferred). The amber attention badge feeds from `useTriggeredProtocols(id).length`.
Protocol view reuses `ProtocolLayerPanel` from `plan/strata/` (not forked).
`primaryTypeId`/`secondaryTypeIds` derived from
`project.metadata?.projectTypeRecord` (same pattern as Plan).

Tests: `ActRailModeToggle.test.tsx` (5) + `ActTierObjectiveRail.test.tsx` (6,
+4 for the objective-detail header: stratum-header when none selected, header
REPLACES on select, and a live closed-loop flow count for resource-flow
objectives -- 2026-06-02).

ADR: [[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]].
Log: [[log/2026-05-31-act-protocol-rail-plan-header]].

## As-built deviation capture (2026-06-01)

The tier shell now hosts the **Act side** of the closed-loop as-built deviation
feature ([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]], Slices 1-2 of 5).
A steward can record that reality has diverged from the Plan design on a specific
placed feature WITHOUT mutating the Plan store; the edit is written only to Observe
as a divergent `ObserveDataPoint`, and the existing `usePlanRevisionFlagSync` lights
the Plan divergence pill + `CyclicalReviewBanner` with zero trigger-layer changes.
Preserves "Act adds, it does not edit Plan decisions".

New `apps/web/src/v3/act/asBuilt/` + the crop click seam:
- `ActFeatureClickHandler.tsx` (`layers/`) -- crop-area click seam on
  `plan-data-poly-fill` (mirrors `ActStructureClickHandler`); opens the popover at
  the click point. Slice 2 handles crop areas; paddock + zone arrive in Slice 4.
- `ActAsBuiltPopover.tsx` + `actAsBuiltPopoverStore.ts` -- Act-scoped singleton
  popover (mirrors `actStructurePopoverStore`, sidestepping the `inlineFormStore`
  module-singleton collision; works on the default tier-shell, which does not mount
  `InlineFeaturePopover`). Reuses `buildCropEditSchema(crop, NOOP_UPDATE, [])` for
  the field set ONLY -- `NOOP_UPDATE` never touches `cropStore`.
- `attributeDiff.ts` -- pure `buildAttributeDiff` (one field -> scalar; select ->
  human option label; many -> one bundled `key+key` diff).
- `recordAsBuiltDeviation.ts` -- emits one divergent `ObserveDataPoint`
  (`sourceType:'divergence_evidence'`, `statusOutput:'needs_investigation'`,
  `domainId: domainForFeatureKind(kind)`, `sourceFeatureRef:{kind,id}`, centroid
  geometry, the `AsBuiltDiff` in `measurementValue`, `capturedBy:'act-as-built'`).
- `ActTierShell.tsx` mounts both new components (+4 lines).

The substrate lives in `@ogden/shared` (`AsBuiltFeatureKind` /
`ObserveSourceFeatureRefSchema` / `AsBuiltDiffSchema` / `asAsBuiltDiff` on
`dataPoint.schema.ts`; `featureRefDomain.ts` `domainForFeatureKind`) and
`observeDataPointStore` (persist v2->v3 + `acknowledgeDataPoint` soft-supersede).
The feature-kind -> domain map (cropArea->plants-food, paddock->animals-livestock,
structure->built-infrastructure, zone->land-base) is what lands the divergence on
the right objective by DOMAIN overlap.

**Project-type caveat (load-bearing for Slice 3):** the verification gate's
`s6-yield-flows` is the STATIC skeleton stratum-6 id; regenerative_farm projects
resolve different stratum-6 ids (`s6-monitoring` / `rf-s6-biodiversity-monitoring` /
`rf-s6-enterprise-integration`), each owning `plants-food`. The loop forces whichever
objectives own the domain, so it works across project types -- the Slice-3
reconciliation card must read by domain overlap, never a hardcoded id. tsc 0;
42 tests green. Log: [[log/2026-06-01-atlas-act-asbuilt-deviation-slice1-2]].

**As-built form moved into the right rail (2026-06-03, `ce1bcad5`).** The
`ActAsBuiltPopover` no longer floats over the map. It gained a
`variant?: 'floating' | 'panel'` prop (default `'floating'`) + optional `map`;
the panel variant skips the anchor->screen projection, click-outside, and
hide-while-drawing logic (the rail has no `map` instance) and renders with a new
`.panel` CSS class. `ActTierShell` reads
`useActAsBuiltPopoverStore((s) => s.active != null)` and, while a deviation is
active, replaces the right-rail body with the panel form and **hides** the
Dashboard/Objective toggle; clearing `active` (Record/Cancel) reverts the rail.
The floating canvas mount was removed; `ActFeatureClickHandler`,
`ActStructurePopover` (its "Record as-built change" hand-off still sets
`active`), and `ActAsBuiltDrawHandler` (arms the on-map redraw) stay on the
canvas. Log: [[log/2026-06-03-atlas-act-shell-toggle-removed-asbuilt-into-right-rail]].

## Act shell toggle removed (2026-06-03)

The floating `ActShellToggle` ("Tier shell / Field actions / Command centre")
is **gone from every mounted Act layout** (`ce1bcad5`): the `styles.toggleFloat`
block in `ActTierShell`, the toggle in `ActMapFirstLayout`, and the inline
command-centre toggle in `ActLayout`, along with all the now-dead
`shellMode` / `onShellModeChange` prop plumbing (`ActTierShell` and
`ActMapFirstLayout` are now prop-less; `ActLayout` lost
`handleActShellModeChange`). Per [[feedback-no-deletion]] the legacy layout
components (`ActMapFirstLayout`, unmounted `ActFieldActionLayout`, the
command-centre `StageShell` branch), `ActShellToggle.tsx` itself, and
`getActShellMode` (still drives the `ActLayout` branch) all stay on disk. The
toggle was the **only writer** of a non-`tier-shell` mode, so no project can
newly enter a legacy mode via UI; a project already persisted in a legacy mode
still resolves through the kept branches. Log:
[[log/2026-06-03-atlas-act-shell-toggle-removed-asbuilt-into-right-rail]].

## Exec panel: scroll containment + Raise-follow-up-need (2026-06-01)

Two right-rail `ActTierExecutionPanel` follow-ups
([[log/2026-06-01-atlas-act-exec-panel-scroll-raise-need]]):

- **Slice 1 (CSS, committed `eae3644f`):** the panel's bottom bento (Record
  button) was clipped until the whole rail scrolled. Fixed by giving `.execPanel`
  `height: 100%`, `.execHeaderBox` `flex: 0 0 auto`, and `.execBody`
  `flex: 1 1 auto; min-height: 0; overflow-y: auto`. The objective title +
  progress bar now act as a fixed header while ONLY the body (Checklist /
  Evidence / activity / Record) scrolls. No JSX change (header/body were already
  sibling blocks).
- **Slice 2 (TSX + 1 CSS rule):** the inert "+ Raise follow-up need" link now
  opens the shared `RaiseNeedForm` in a `Modal` and creates a tracked
  `ObservationNeed` via `buildRaisedNeed` + `useObservationNeedStore.createNeed`
  (`origin: 'manual'`, `module = getPrimaryDomainForObjective(objective)` since
  `ObserveModule = UniversalDomain`, target = mean of existing need centers with
  `[-78.2, 44.5]` MTC fallback). Mirrors the Command Centre `raiseManual` path.
  The need surfaces in the Observe Command Centre + `DomainObservationNeeds`, NOT
  the panel's "This need's activity" feed (that reads `observeDataPointStore`); an
  inline `.raisedConfirm` line is the in-panel confirmation. Preview-verified
  (modal opened, need persisted under `createdByProject`); tsc 0.

**Rebase-race note (institutional).** Slice 2 verified but was NOT yet committed
when an out-of-band rebase actor ran `git add` + commit on `feat/atlas-permaculture`.
That sweep folded my uncommitted Slice 2 edits into the foreign commit
`c640acbb` ("typed read-only recap...", the AnswerRecap / `resolveAnswerSpec` /
effectiveProgress refactor). The hunk-only patch-against-HEAD stage I had prepared
was reset to an empty index, so my own `git commit -F` was a no-op. Net: the Slice 2
code is live and intact in HEAD (verified: all 5 edits + `.raisedConfirm` present in
`c640acbb`), but co-mingled with foreign work under a foreign message and without my
attribution trailer. No history surgery was attempted (foreign commit carries
substantial foreign work; branch is rebased externally). Reinforces
[[feedback-commit-immediately-on-rebased-branches]]: on this branch, commit the
instant a slice verifies -- the window between verify and commit is where the sweep
strikes.

## Answer recap: typed read-only prefill of wizard/vision answers (2026-06-01)

Objective checklist items that re-ask questions already answered in project
creation now render a prefilled, read-only recap IN THE ORIGINAL CONTROL STYLE
(selected chip / chip row / band pills / steward lines / prose) plus an "Edit in
Plan" link, instead of a blank checkbox/text prompt
([[decisions/2026-06-01-atlas-act-answerspec-typed-recap]], commit `c640acbb`).
The item auto-satisfies from `ProjectMetadata` -- no re-entry in Act.

- `AnswerRecap.tsx` (+ `.module.css`) -- typed read-only renderer. Guards
  `if (!spec) / if (!resolved.isAnswered) return null`. Switches on `fieldType`:
  `single_select` -> one `.chipSelected`; `multi_select` -> `.chip` row;
  `band` -> `.bandPill` row; `steward` -> `.stewardLine` list; `text` -> prose.
  A static green `.recapCheck` stands in for the (absent) interactive checkbox;
  the "Edit in Plan" link `navigate`s by `editRoute` (`wizard-step` ->
  `/v3/project/$projectId/wizard/$step`; `plan-type` -> `/v3/project/$projectId/plan`).
- `ActTierExecutionPanel.tsx` -- the checklist `.map` now selects the whole
  `metadata` (was `?.metadata?.projectTypeRecord`) and renders `<AnswerRecap>` IN
  PLACE OF the bare checkbox `<label>` when `item.answerSpec &&
  resolveAnswerSpec(metadata, item.answerSpec).isAnswered`; every other item
  falls through to the checkbox unchanged. The generic `summary-note` Evidence is
  untouched -- the recap supplements evidence, does not replace it.
- **Resolver + label registry live in `apps/web/src/v3/strata/`, NOT shared**:
  `resolveAnswerSpec.ts` (pure dotted-path reader; multi-value + object-of-arrays
  flatten; band all-axes rule; steward "Name <email>" format; render-safe when
  metadata null) and `answerOptionLabels.ts` (`labelForOption`, built from the
  apps/web-only `visionBuilderQuestions.ts` -- a shared placement would force a
  forbidden shared -> web import).
- **Auto-satisfy reuses the existing progress union:** `computeEffectiveProgress`
  gained a 5th `metadata?` arg that unions any answered-`answerSpec` item into the
  flat completion map (same idempotent mechanic as the bespoke S1 derivations);
  `useEffectiveChecklistProgress` / `usePortfolioPlanProgress` / `useProjectUrgency`
  thread `project.metadata` through, so Plan/Act/Portfolio/Home stay coherent with
  no per-surface change.
- **Substrate in `@ogden/shared`:** optional `AnswerSpecSchema` on
  `PlanDecisionChecklistItemSchema` (all `.optional()`, additive); `ckA(id, label,
  answerSpec)` authoring helper; `s1-vision-c1/c2/c3` answerSpecs in `universal.ts`.
- **Preserved** the two legacy `deriveStratum1*Map` derivations (retire only once
  their items carry answerSpec) -- no-deletion-in-revamps.
- Tests: `resolveAnswerSpec` (8) + a `computeEffectiveProgress` union case; tsc 0
  (web + shared); 908 green. Live-verified on "Baseline Test Homestead" --
  project-type "Regenerative Farm" selected chip + "Edit in Plan"; data-less
  vision items fall back to plain checkboxes. Note `c640acbb` co-mingles the
  pre-existing "Raise follow-up need" wiring (inseparable in the working tree;
  disclosed in the commit message).
Log: [[log/2026-06-01-atlas-act-answerspec-typed-recap]].

## Answer recap: value+Edit-in-Plan moved into the Vision forms modal (2026-06-01)

The three prefilled `s1-vision` answers (project type `c1`, success criteria
`c2`, capital `c3`) previously appeared TWICE and inconsistently: a read-only
recap card (value + "Edit in Plan" button) in the right sidebar, AND an empty
re-ask textarea tab in the Vision forms modal (formId === checklist item id,
1:1). The operator asked that the project type and the "Edit in Plan" affordance
live in the modal TabsPanel, not the sidebar. Consolidated (commit `6e8bb88c`,
11 files, one cohesive commit):

- **New shared `AnswerValue.tsx` (+ `.module.css`)** -- the typed VALUE renderer
  extracted verbatim out of `AnswerRecap` (`single_select` chip / `multi_select`
  chip row / `band` pills / `steward` list / `text` prose, via `labelForOption`).
  Single source of truth for value rendering across both surfaces. The value
  pills keep their LIGHT hardcoded colors -- legible as light-on-dark tags on the
  dark BentoBox modal.
- **New shared `EditInPlanButton.tsx` (+ `.module.css`)** -- the Edit-in-Plan
  `useNavigate` deep-link extracted from `AnswerRecap.onEdit` (`wizard-step` ->
  `/v3/project/$projectId/wizard/$step`; `plan-type` -> `/v3/project/$projectId/plan`).
  Dark gold token styling (`--color-gold-brand`) for the modal context.
- **Sidebar `AnswerRecap`** keeps the recap value (now via `<AnswerValue>`) but
  DROPS the "Edit in Plan" button, its `onEdit`/`useNavigate`/`Pencil`, the local
  `renderValue`, and the `projectId` prop; the moved value CSS is deleted from
  `AnswerRecap.module.css`.
- **`VisionFormsTabsModal`** is now recap-aware: new props `projectId`,
  `metadata`, `checklistItems`. A tab whose formId maps to an answered
  `answerSpec` renders read-only -- prompt + `<AnswerValue>` + hint
  ("Answered in Plan - edit there to change") + `<EditInPlanButton>`, NO textarea,
  Save disabled. Non-prefilled tabs keep the textarea capture path. The captured
  dot shows for recap tabs too.
- **`ActTierShell`** threads `projectId={id}`, `metadata={project.metadata ?? null}`,
  `checklistItems={selectedObjective?.checklist ?? []}` into the modal. Non-vision
  categories carry no answerSpec items, so they resolve `isRecap=false` and are
  unchanged.

Test defaults gained the three new required props (empty `checklistItems`
preserves the textarea-path coverage; the recap path is covered in preview).
tsc clean; modal suite 6/6. Live-verified on the operator's project: sidebar
recap shows the value with `editLinks: 0`; the Primary-purpose modal tab shows
"Regenerative Farm" + Edit-in-Plan with `modalTextareas: 0` and Save disabled;
Edit-in-Plan on the project-type tab navigates to `/v3/project/<id>/plan`. The
foreign-WIP-heavy working tree was navigated by staging only my 11 files
(`git diff --cached --name-only` verified, never `git add -A`).
Log: [[log/2026-06-01-atlas-act-answer-recap-into-modal]].

**Follow-up -- dark-mode token fix (2026-06-01, `9a53c310`):** the recap card +
value chips rendered as a LIGHT (cream/beige) card on the dark sidebar under
active dark mode -- the "light pills legible as light-on-dark tags" assumption
above held for the dark modal but NOT for the recap CARD chrome on the dark
sidebar, which used hardcoded light hex that never consulted the active
`data-theme`. Both modules were de-hardcoded to the project's theme tokens so
the surfaces follow the active theme (dark card on dark, light on light):
- `AnswerRecap.module.css` -- `.recap` -> `--color-surface` bg /
  `--color-border`; `.recapCheck` -> `--color-accent` / `--color-on-accent`;
  `.recapLabel` -> `--color-text`.
- `AnswerValue.module.css` -- `.chip` -> `--color-surface-alt` /
  `--color-border` / `--color-text`; `.chipSelected` -> `--color-success(-muted)`
  (sage-green); `.bandPill` -> `--color-info(-muted)` (info-blue); steward/text
  -> `--color-text(-muted)`. Semantic meaning preserved (selected single_select =
  sage, band = info-blue). Verified live in dark mode via `preview_eval`:
  `.recap` resolves to the dark surface with light text, the plain
  "Residential / Live-In" chip reads surface-alt, the selected "Regenerative
  Farm" chip reads sage-green. tsc/CSS-only; 2 files, staged by explicit path
  (two foreign `ProofSyncIndicator.tsx` files unstaged first). Not pushed.

## Trigger Recognition sheet on proof capture (2026-06-02)

`ActTierExecutionPanel` is the Act proof-capture mount point for the OLOS Protocol
System's **Trigger Recognition** flow ([[decisions/2026-06-02-olos-protocol-tier-slice]],
the thin end-to-end slice). After `handleRecord()` records the observation, the panel
selects the highest-priority **active RESPOND** template relevant to the objective's
domain (via `useProtocolLibrary` + `FEEDS_TO_MODULE` from
`v3/act/data/protocolFeedsMap.ts`) and conditionally renders
`<TriggerRecognitionSheet>` (in `apps/web/src/v3/act/protocols/`). `onResolve(status)`
calls the new `protocolStore.recordActivation({... recipeSnapshot captured now,
triggerContext:'act_proof_capture'})` (an immutable `ProtocolActivation`) and, on
`'confirmed'`, also calls the existing `markTriggered(projectId, template.id)` --
bridging the new activation history to the legacy triggered lifecycle / Act badge.
Additive only; all existing panel behaviour intact. The activation then surfaces on
the Protocol Dashboard peer route (commit `0f3ab43f`). See [[entities/protocols-dashboard]].

## Answer recap: stewardship + secondary-type extensions (2026-06-01)

Follow-up authoring slice extending the answerSpec recap to the two remaining
source-backed answer kinds the operator asked for, with **no new runtime code**
-- the `steward` and `multi_select` fieldTypes and the `projectSecondaryType`
option set were already fully supported from `c640acbb` (commit `4acef400`,
4 files):

- **Stewardship -- `s1-stewardship-c1` only.** Added a `steward` answerSpec
  (`sourceField: ['team.primarySteward', 'team.coStewards']`, edit ->
  `wizard-step team`) to the item in the **legacy fallback skeleton**
  (`stratumObjectives.ts`). The roster renders read-only as `Name <email>` /
  name / email lines instead of re-asking; auto-satisfies via the progress
  union. **Reach is legacy/untyped projects only** -- the s1-stewardship
  objective exists ONLY in the static skeleton (`PLAN_STRATUM_OBJECTIVES`,
  the level-3 fallback in `useProjectObjectives.resolveFromInputs`); both
  per-type catalogues and the universal catalogue omit it. `s1-stewardship-c2`
  (role-filtered invites) is left untouched on its legacy
  `deriveStratum1StewardshipMap` derivation -- the declarative `steward` field
  can't express its contractor/landowner/reviewer filter. Operator-confirmed
  this limited reach.
- **Secondary type -- new `s1-vision-c4` item** in `universal.ts` (the primary
  type was already `s1-vision-c1`). Optional `ckA` item: `multi_select` /
  `projectSecondaryType` / `projectTypeRecord.secondaryTypeIds` / edit
  `plan-type`. **Also added to the `s1-vision-dg1` "Purpose & intent" decision
  group** -- s1-vision is partitioned (dg1+dg2) and `expectFullPartition` in
  `catalogues.test.ts` requires every checklist item in exactly one group, so
  authoring the item without grouping it would break the invariant. `optional`
  keeps an unset secondary type (falls through to a plain checkbox) from
  dragging required progress.
- Tests: `resolveAnswerSpec` steward case rewritten to the REAL team shape
  (`primarySteward` + `coStewards`, replacing a fabricated `team.members` shape
  that never existed in `ProjectMetadata`) plus an unanswered case (9 total);
  `catalogues.test.ts` asserts the `s1-vision-c4` recap item (optional +
  `projectSecondaryType` + `secondaryTypeIds`).
- Verified: shared suite 896 green; web `resolveAnswerSpec` (9) +
  `computeEffectiveProgress` (5) green (other web failures are a pre-existing,
  unrelated Act-module-taxonomy refactor in the working tree, none in my files).
  Live-screenshotted both recaps: the c4 "Residential / Live-In" secondary chip
  on "Baseline Test Homestead" (regen_farm + residential), and the steward
  roster (Aisha/Bilal/Omar) on a static-skeleton project ("k") with injected
  `team` fixture data (reverted after). Staged only the 4 files explicitly
  (never `git add -A`; foreign-WIP-heavy tree).
Log: [[log/2026-06-01-atlas-act-answerspec-stewardship-secondary-type]].

## Answer recap: steward recap extended to per-type projects (2026-06-01)

Closes the limited-reach caveat above. The steward recap only reached
legacy/untyped projects because s1-stewardship lives solely in the level-3
static skeleton; typed projects resolve (levels 1-2) to the per-type + universal
catalogues, which had **no stewardship surface at all**. Operator chose
(AskUserQuestion) **Option A** -- a steward item inside the existing Vision card
-- over a standalone stewardship objective (which would trip the 5-15-item
catalogue floor and break five per-type resolution count tests). Commit
`6223ade6`, 2 files, +35.

- `universal.ts`: optional `s1-vision-steward` `ckA` item (`fieldType: steward`,
  `sourceField: ['team.primarySteward','team.coStewards']`, edit ->
  `wizard-step team`) on the `s1-vision` objective, appended to the
  `s1-vision-dg1` "Purpose & intent" group (partition invariant). Every primary
  type inherits the shared universal set, so the roster recap now reaches **all
  typed projects** at once. Auto-satisfies via `computeEffectiveProgress`
  independently of the legacy `deriveStratum1StewardshipMap` bridge
  (`effectiveProgress.ts` iterates resolved objectives' own checklist via
  `resolveAnswerSpec`); bridge untouched.
- `catalogues.test.ts`: assertion that `s1-vision-steward` exists in the
  **regen+residential resolved set** (proves per-type reach), optional, steward
  answerSpec.
- Verified: shared typecheck clean; shared suite **897 green** (incl.
  `expectFullPartition` + unchanged per-type counts); web typecheck clean.
  **Live UI screenshot blocked** -- the dev bundle would not render (blank across
  routes) due to a foreign out-of-band deletion of
  `apps/web/src/v3/act/field-action/proof/ProofSyncIndicator.tsx` (` D` in git
  status) leaving a dangling vite import. Not my change; not touched. Per the
  no-claim-without-screenshot rule the live render is NOT asserted; the
  `AnswerRecap` steward renderer is unchanged from the prior slice (already
  screenshotted on "k"), and the core fix is proven by the green
  per-type-resolved test. Injected/reverted a `team` fixture on "Baseline Test
  Homestead" while attempting verification.

## Protocol-deviation Review flags: universal-objective re-target (2026-06-03)

Tier 1 of the protocol-downstream-objective Review-flag feature closed at the
T1.10 gate. A confirmed field protocol activation that **deviates** from the
steward-authored `expectedRate` (`{count, per:'season'|'cycle'}`) raises a
non-destructive amber **"Review"** flag on a downstream Plan objective. The
store-free helper `v3/act/protocols/evaluateAndRaiseFlags.ts` (called from
`ActTierExecutionPanel` after `handleRecord`) windows the confirmed firings, runs
the pure `evaluateDeviation` policy, and raises a primary flag + a one-hop cascade.
`ObjectiveColumn`/`ObjectiveCard` render an `objective-review-flag-<id>` chip from
`useReviewFlagCountsByObjective`; the detail panel resolves/dismisses it.

**Key finding (Gate 1E).** Emission originally targeted `s6-yield-flows` /
`s7-phasing` -- the **legacy static skeleton** ids that render ONLY for null-type
projects (Level-3 `useProjectObjectives` fallback). Every typed (wizard-created)
project resolves from the **universal catalogues**, whose s6/s7 slots are
`s6-monitoring` (U-S6.1) / `s7-phase1` (U-S7.1) in the same strata -- so the chip
could never surface on a real project. Re-targeted to the universal ids (steward
decision "map to universal"; the two taxonomies share no back-reference). This is
the same two-taxonomy gotcha the as-built loop above sidesteps by forcing by
domain. Accepted caveat: null-type/legacy projects no longer chip. Tier 2's
pending `FEEDS_TO_OBJECTIVE` table carries the same hazard (flagged).

58/58 Tier-1 review-flag tests + `tsc` 0; NOT browser-verified (preview dead,
[[project-screenshot-hang]]). Commit `748a7eb9`, not pushed. **Stopped for steward
review before Tier 2.** ADR
[[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]]; Log:
[[log/2026-06-03-atlas-deviation-flag-universal-objective-retarget]].

## Protocol-deviation Review flags: Tier 2 event-driven routing (2026-06-03)

Tier 2 closed: flagging now covers all **10** `STANDARD_PROTOCOL_TEMPLATES`, not
just the 5 S6-bound ones. The other 5 are **event-driven** (cyclical/judgment) and
route to the **deep** universal Plan objective their deviation contradicts via a
new hand table `packages/shared/src/constants/protocol/feedsToObjective.ts`
(`FEEDS_TO_OBJECTIVE`): post-rotation-impact->`[s3-soil]`,
pre-rotation-paddock->`[s6-monitoring]`,
water-trough-inspection->`[s5-water-infrastructure]`,
seasonal-stocking-rate->`[s6-monitoring,s7-phase1]`,
silvopasture-pest-diversion->`[s4-zones]`. `TEMPLATE_DEPTH` grew 5->10
(soil/water/zones for deep-stratum events, threshold for the two yield-monitoring
events).

`evaluateAndRaiseFlags.ts` branches on `S6_BOUND_TEMPLATE_IDS.has(templateId)`:
s6-bound keeps the primary+cascade emission; event-driven raises **one plain flag
per mapped target** (no cascade, no `downstream of` prefix); an unmapped/custom
template raises **nothing**. The caller (`resolveTrigger`) was already generic over
`templateId`, so no caller change. Two drift-guard tests keep the two hand tables'
key sets in lockstep with the template list.

39/39 shared protocol specs + 61/61 web review-flag specs + `tsc` 0 (shared & web).
**Browser-verified live on MTC** (closes the Tier-1 deferred check): the
`s5-water-infrastructure` Plan S5 card mounts, an injected water-trough
over-deviation flag surfaced the amber **Review** chip on it, and **Resolve**
cleared it; `preview_screenshot` hung so proof is the DOM/testid assertion
([[project-screenshot-hang]]). Commits `3b9b1b4a`+`cd3d7870` (T2.1),
`fc6c6013`+`a981ef74` (T2.2), not pushed. **Feature complete (Tier 1 + Tier 2).**
ADR [[decisions/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]]; Log:
[[log/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]].

## Objective->tool coverage audit + homestead overrides (2026-06-03)

A deterministic, read-only audit answered the standing operator question — *does
every objective have an Act-stage tool to complete AND record completion of its
task set?* NEW `scripts/audit-act-objective-coverage.ts` (`tsx`) drives the SAME
`@ogden/shared` resolvers this surface uses (`resolveProjectObjectives`,
`getObjectiveActTools`, `getObjectiveEvidence`, `getPrimaryDomainForObjective`)
across all **14** types (13 primary + `residential` as a secondary layer) and
emits a per-objective matrix to `scripts/audit-out/act-objective-coverage.md`;
human-readable classification + remediation live in
`scripts/audit-out/act-coverage-findings.md`.

**Direct answer:** every objective is completable AND recordable today via this
module's universal `ActTierExecutionPanel` (Checklist + always-present Evidence +
the gated Record-observation button). The three gap classes are about
*precision*, not availability:
- **Gap A** — objective falls through the coarse `STRATUM_ACT_TOOLS_DEFAULT`
  instead of a precise per-type override. `OBJECTIVE_ACT_TOOLS_OVERRIDE` only
  keyed universal `s*` + `silv-*`, leaving the other 12 type catalogues coarse —
  the same misalignment that forced the 2026-06-01 silvopasture overrides.
- **Gap B = 0** — the Record button is NEVER structurally blocked by a null
  primary Observe domain. No remediation needed.
- **Gap C** — `[]` bottom-rail tools: 11 intentional (decision/strategy
  objectives served by checklist + summary-note) + 30 accidental s1 vision
  empties.

**R1 (done).** 15 explicit `hms-*` `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries in
`objectiveActTools.ts` — 8 spatial objectives grounded (each tool id verified
against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool), 7
decision/financial objectives set to a gap-noted `[]` (also corrected 6 that had
shown misaligned stratum-default tools, e.g. buildings/barns/tanks on a budget
objective). **R3 (done):** `actToolCoverage.test.ts` ratcheted with a homestead
assertion (every `hms-*` has an explicit override entry; `[]` satisfies it).
**R2 DEFERRED:** form-arm tools for the 30 s1 empties are NOT fabricated — the
existing form tools are hardwired to universal `s1-vision-c*` formIds/prompts and
new per-type prompts would be invented operator-reviewed catalogue content; the
universal `s1-vision` (with form arms) already resolves into every project.

Audit re-run after R1: Gap A 271→256, Gap B 0, Gap C 41→47. Bounded
`--pool=forks` ([[feedback-vitest-bounded-runs]]): `actToolCoverage` 6/6,
`objectiveObserveDomains` green, `resolveProjectObjectives` 24/25 (the 1 failure
proven pre-existing/unrelated — stale agritourism AG-S4.8 count assertion,
`15680301`; flagged, not fixed). Commit `61a56ae6`, not pushed. The other 11
primary types (256 Gap-A objectives) follow with the same grounded-candidate
method. ADR [[decisions/2026-06-03-olos-act-objective-coverage-audit]]; Log:
[[log/2026-06-03-olos-act-objective-coverage-audit]].

## Objective->tool overrides: regenerative_farm (2026-06-03)

Second per-type catalogue wired after homestead. All **13 `rf-*`** objectives
now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries in
`objectiveActTools.ts`: **10 spatial** grounded (each id verified against a real
`rf-*` checklist item + a mountable `ACT_TOOL_CATALOG` tool — e.g.
land-health->erosion/soil/drainage/vegetation, nutrient-cycling->soil/compost/
fertility-unit/flow-connector, fertility-system->compost/fertility-unit/paddocks/
crops/transect, windbreaks->vegetation/wind-sector/wildlife-sector/fire-sector/
buffer-ring), **3 intentional `[]`** (`rf-s1-enterprise-mix` decision,
`rf-s7-enterprise-sequencing` decision, `rf-s7-cash-flow` financial — Amanah-clean
per c5 "no capital formation or investor structure content"). Before this the 13
fell through `STRATUM_ACT_TOOLS_DEFAULT` with a severe misfit (S3 nutrient/pest
showed access-utilities, S4 strategy showed roads/fencing, S5 fertility/windbreaks
showed the water-line set). **R3:** `actToolCoverage.test.ts` ratcheted with a
regen-farm assertion (intentional `[]` satisfies it). Verified: shared `tsc` EXIT
0; audit Gap A **256->243**, Gap B 0, Gap C 47->49; bounded `--pool=forks`
`actToolCoverage` 7/7, `objectiveObserveDomains` 8/8, `resolveProjectObjectives`
25/25 (the prior pre-existing agritourism count failure is no longer present).
Commit `187c4f6f`, not pushed. Gap A now 243 across the other 11 primary types
(market_garden / orchard next). Log:
[[log/2026-06-03-olos-act-regen-farm-overrides]].

## Objective->tool overrides: market_garden (2026-06-03)

Third per-type catalogue wired after homestead and regen-farm. All **24 `mgd-*`**
objectives now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries in
`objectiveActTools.ts`: **18 spatial/field-log** grounded (each id verified
against a real `mgd-*` checklist item + a mountable `ACT_TOOL_CATALOG` tool —
e.g. water-access->watercourse/spring/catchment/storage/wells,
crop-rotation-bed-layout->beds/crops/zone, fertility-strategy->compost/
fertility-unit/crops/flow-connector, bed-infra->beds/crops/path/vegetation/
buildings, wash-pack->buildings/barns/tanks, crop-calendar->crops/frost-pocket/
harvest), **6 intentional `[]`** (s1 production-targets-sales / growing-system-
philosophy / market-channels — first & third carry CSA Amanah scopeNotes flags,
left verbatim, off-site decisions; s6 sales-revenue-tracking + adaptive-management;
s7 financial-viability MGD-S7.5 break-even, Amanah-clean). Before this the 24
fell through `STRATUM_ACT_TOOLS_DEFAULT` with the same misfit class as regen (S3
water/pest showed access-utilities, S4 strategy showed roads/fencing, S5
infrastructure showed the water-line set). **R3:** `actToolCoverage.test.ts`
ratcheted with a market-garden assertion (intentional `[]` satisfies it).
Verified: shared `tsc` EXIT 0; audit Gap A **243->219**, Gap B 0, Gap C 49->52;
bounded `--pool=forks` `actToolCoverage` 8/8, `objectiveObserveDomains` 8/8,
`resolveProjectObjectives` 25/25. Commit `3c340134`, not pushed. Gap A now 219
across the other 10 primary types (orchard next). Log:
[[log/2026-06-03-olos-act-market-garden-overrides]].

## Objective->tool overrides: orchard (2026-06-03)

Fourth per-type catalogue wired after homestead, regen-farm and market_garden.
All **30 orchard objectives** now carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`
entries in `objectiveActTools.ts` — the **25 `orch-*`** primary plus the **5
`orch-sec-*`** standalone additive objectives (which surface when orchard is a
secondary type, the same situation that forced the silvopasture-secondary
overrides): **19 grounded** (each id verified against a real checklist item + a
mountable `ACT_TOOL_CATALOG` tool — e.g. frost-drainage->frost-pocket/drainage/
sun-sector, planting-layout->orchards/zone/frost-pocket, guild-plan->orchards/
vegetation, tree-protection->fencing/buffer-ring, phenological-monitoring->
frost-pocket/harvest/transect, sec-climate-chill-fit->frost-pocket/sun-sector/
hazard-zone), **11 intentional `[]`** (s1 species-philosophy/production-intent/
provenance-sourcing, `orch-s4-species-mix` + `orch-s4-succession-management`,
`orch-s6-adaptive-management`, s7 planting-establishment/succession-plan/
financial-viability ORCH-S7.6 Amanah-clean, `orch-sec-s4-species-pollination` +
`orch-sec-s6-perennial-care`). The 4 `ORCHARD_SECONDARY_PATCHES` inject into
universal objectives (`s4-water-strategy`/`s5-soil-improvement`/`s2-ecology`/
`s7-phase1`) already carrying universal overrides — no work. Before this the
orchard objectives fell through `STRATUM_ACT_TOOLS_DEFAULT` with the familiar
misfit (S3 rootzone/pest showed access-utilities, S4/S5 perennial design showed
roads/fencing or the water-line set). **R3:** `actToolCoverage.test.ts`
ratcheted with an orchard assertion over the primary + secondary union (mirrors
silvopasture). Verified: shared `tsc` EXIT 0; audit Gap A **219->194** (25
orch-* primary enumerated; the 5 orch-sec-* wired+ratcheted but not separately
walked by the per-type audit), Gap B 0, Gap C 52->58; bounded `--pool=forks`
`actToolCoverage` 9/9, `objectiveObserveDomains` 8/8, `resolveProjectObjectives`
25/25. Commit `da4a96f2`, not pushed. Gap A now 194 across the other 9 primary
types. Log: [[log/2026-06-03-olos-act-orchard-overrides]].

## Objective->tool overrides: livestock_operation (2026-06-03)

Fifth per-type catalogue wired after homestead, regen-farm, market_garden and
orchard. All **30 livestock_operation objectives** now carry explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries in `objectiveActTools.ts` — the **23
`lvs-*`** primary plus the **7 `lvs-sec-*`** standalone additive objectives
(which surface when livestock is a secondary type, the same situation that
forced the silvopasture-secondary overrides): **17 grounded** (each id verified
against a real checklist item + a mountable `ACT_TOOL_CATALOG` tool, reusing the
silvopasture livestock vocabulary — e.g. forage-base->pasture/vegetation/
transect, stock-water-sources->watercourse/spring/storage/wells/tanks/water-
lines, paddock-layout->paddocks/gates/path/zone, fencing-water->fencing/water-
lines/tanks/storage, nutrient-cycling->paddocks/compost/pasture/transect/flow-
connector, sec-stock-infrastructure->fencing/barns/buildings/water-lines), **13
intentional `[]`** (s1 enterprise-vision/production-goals/welfare-ethic, s4
species-breed/stocking-rate/grazing-system, `lvs-s5-feed-budget`,
`lvs-s6-herd-health`, `lvs-s7-herd-buildup` sequencing, `lvs-s7-break-even`
Amanah-clean, `lvs-s7-marketing` off-site decision keeping its
bay-ma-laysa-indak Amanah scopeNotes flag for the meat-share/herd-share/CSA
surface, `lvs-sec-s1-enterprise-intent`, `lvs-sec-s4-species-stocking`). The 3
`LIVESTOCK_SECONDARY_PATCHES` inject into universal objectives (`s4-water-
strategy`/`s5-soil-improvement`/`s5-access`) already carrying universal
overrides — no work. Before this the livestock objectives fell through
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit (S2/S3 forage & water
showed access-utilities, S5 paddock/fencing/handling showed roads/fencing
generically). **R3:** `actToolCoverage.test.ts` ratcheted with a livestock
assertion over the primary + secondary union (mirrors orchard/silvopasture).
Verified: shared `tsc` EXIT 0; audit Gap A **194->171** (23 lvs-* primary
enumerated; the 7 lvs-sec-* wired+ratcheted but not separately walked by the
per-type audit), Gap B 0, Gap C 58->66; bounded `--pool=forks` `actToolCoverage`
10/10, `objectiveObserveDomains` 8/8, `resolveProjectObjectives` 25/25. Commit
`7da9fe8a`, not pushed. Gap A now 171 across the other 8 primary types. Log:
[[log/2026-06-03-olos-act-livestock-overrides]].

## Objective->tool overrides: conservation (2026-06-03)

Sixth per-type catalogue wired (audit remediation R1/R3), after homestead,
regen-farm, market-garden, orchard and livestock_operation. All **30 `con-*`
conservation objectives** carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`
entries; conservation ships **no standalone secondary layer and no patches**,
so this is a primary-only wiring (and a primary-only ratchet, like
homestead/regen/market-garden). **19 grounded** (reusing the regen/silvopasture
ecology vocabulary — e.g. baseline-condition->vegetation/zone/transect/
wildlife-sector, degradation-history->erosion/soil/drainage/hazard-zone,
water-regime-degradation->drainage/watercourse/sink/runoff-path,
native-planting-plan->vegetation/zone/water-lines, water-regime-infrastructure->
drainage/sink/swale/watercourse, fencing-exclusion->fencing/gates/wildlife-
sector, ecological-monitoring->transect/wildlife-sector); **11 intentional `[]`**
(s1 conservation-intent/intervention-philosophy/tenure-covenant,
`con-s4-native-species-provenance` selection, `con-s4-pest-invasive-strategy`
method decision, `con-s6-external-relations-compliance` reporting admin, and the
whole s7 band — phase1-priorities, longterm-timeline, funding-resourcing,
adaptive-management, volunteer-stewardship). **Amanah:** `con-s7-funding-
resourcing` references carbon & biodiversity credits (environmental-market
instruments, potential gharar) — encoded as catalogue content, routed to
Scholar Council, maps to `[]` regardless; no break-even/advance-sale objective
in the catalogue. Before this the conservation objectives fell through
`STRATUM_ACT_TOOLS_DEFAULT` (S2/S3 ecological surveys showed access-utilities/
water-line sets; S5 restoration design showed roads/fencing generically).
**R3:** `actToolCoverage.test.ts` ratcheted with a conservation assertion over
`CONSERVATION_PRIMARY_OBJECTIVES`. Verified: shared `tsc` EXIT 0; audit Gap A
**171->141**, Gap B 0, Gap C 66->74; bounded `--pool=forks` `actToolCoverage`
11/11, `objectiveObserveDomains` 8/8, `resolveProjectObjectives` 25/25. Commit
`923464a0`, not pushed (code-commit subject carries a stray `@` artifact from
accidental PowerShell here-string syntax in git-bash; tree/body/trailer correct;
amend/reset forbidden on this rebased branch, left for operator). Gap A now 141
across the remaining primary types (agritourism, ecovillage, education,
off_grid, wellness). Log: [[log/2026-06-03-olos-act-conservation-overrides]].

## Notes

- `ViewBDashboard` is preserved and still the tier-shell's dashboard-mode panel
  (only the field-action surface swapped it for `ActOpsDashboard`).
- TS gotcha: discriminant narrowing of `tool.arm` is DROPPED inside a nested
  `.find` closure -- hoist `const arm = tool.arm` before the closure.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
