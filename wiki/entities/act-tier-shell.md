# Act Tier Shell

**Type:** module (v3 Act surface) · **Status:** active (default Act page) · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/act/tier-shell/` · **Branch:** `main`

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
  **Category header row removed (2026-06-05):** the per-category collapsible
  header (chevron + label + count badge) was dropped for all categories; the
  tool grid renders unconditionally and tiles are unchanged. Collapse state +
  toggle and the chevron imports are gone. Catalog `category.label`s remain
  (still used for dots aria-labels). Commit `5f81657e` (not pushed).
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

### Adopt-from-map on read-existing objectives + draw snap-to-line/vertex (2026-06-04)

See [[decisions/2026-06-04-atlas-act-adopt-and-draw-snapping]] (commits `9d0ddae2`,
`9728c923`, not pushed).

- **Adopt-from-map (data-wiring only).** Because `ObserveDrawHost` is already mounted
  here and both adopt `MapToolId`s dispatch in its switch, restoring adopt-from-map into
  Act needed no new component: two catalogue entries (`adopt-building` arming
  `observe.built-environment.adopt-basemap`; `adopt-water` arming
  `observe.earth-water-ecology.adopt-water`) + the ids wired as the FIRST tool of the
  read-existing objectives (9 building-reading + 15 water-reading across all 12 land
  types' S2/S3) in `objectiveActTools.ts`. Adopt is a reading activity -> NOT on S4/S5
  design objectives. Guarded green by `actToolCoverage.test.ts`.
- **Draw snap-to-line/vertex.** `snapPoint.ts` gains an additive `snapDrawPoint`
  (vertices beat edges within the 8 px radius; legacy `snapPoint` untouched). New
  `observe/components/draw/snapDrawModes.ts` wraps stock line/polygon MapboxDraw modes and
  rewrites `e.lngLat` on click/tap/mouse-move (mirrors the `clickDeleteDirectSelect`
  custom-mode precedent). `useMapboxDrawTool` gains opt-in `snap?`/`getSnapTargets?`
  (default false = unchanged; `draw_point` never snaps). New `usePlanSnapTargets`
  assembles targets from livestock fences+paddocks, BE footprints+lines, and the parcel
  boundary. `FenceLineTool`/`PaddockTool` enable it; `PlanDrawHost` threads
  `parcelBoundary`. Other line/polygon tools opt in via the same two props.
  **Rolled out same day (commit `aecc6322`, not pushed):** the opt-in now covers every
  remaining Plan line/polygon path — the 8 dedicated tools (FlowConnector, MonitoringTransect,
  PathLine, UtilityRun, WaterSwale, WaterCatchment, ZonePolygon, CropArea), the design-element
  host (`useDesignElementDrawTool`/`PlanDesignElementHost`), and Plan BE proposed structures
  (`BeV2ExistingTool`, snap driven from `PlanDrawHost` so Observe stays snap-off) — all reusing
  the same shared `usePlanSnapTargets`.
  **Deduped (commit `72aa79ed`, not pushed):** the 10 dedicated/livestock tools no longer call
  `usePlanSnapTargets` themselves or take `parcelBoundary` — they consume a `getSnapTargets`
  prop supplied by `PlanDrawHost`'s single instance (the same one driving the Plan-BE branch),
  collapsing 10 duplicate hook calls into one. `PlanDesignElementHost` keeps its own call (it
  still needs `parcelBoundary` for placement validation).

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

- `act/tier-shell` — dashboard mode (S1 landing; always reachable)
- `act/tier-shell/$objectiveId` — objective-execution mode; `beforeLoad` guard redirects to `act/tier-shell` if the objective is locked by the Plan prerequisite gate
- `act/tier-shell/stratum/$stratumId` — stratum-bearing tier shell (URL-parity with Plan's `plan/stratum/$stratumId`); `beforeLoad` guard redirects to `act/tier-shell` if the stratum is locked

Both guarded routes use `buildActLockContext(projectId)` — reads hydrated Zustand stores synchronously, runs `computeEffectiveProgress` + `computeAllObjectiveStatuses` + `computeAllStratumStates`, returns `undefined` when DEV unlock (`useDevUnlockStore.unlockAll`) is on. Guard short-circuits on unknown project or unknown objective id. See [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]].

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

### Protocols rail: stratum scope + clickable cards + right-rail detail (2026-06-04)

Made the Act Protocol surface symmetric with the Objective surface (commit
`e15e04e9`, 9 files). Three coordinated changes, all back-compat (every new
panel/card prop is `optional` -> the Plan rail and its tests are byte-identical):

- **Stratum scope.** `ProtocolLayerPanel` gained optional `activeStratumId`;
  when set (Act only) it maps `filterProtocolGroups(groups, activeStratumId)`
  (the pure, tested helper in `useProtocolLibrary.ts`; `ProtocolTierGroup.stratumId`
  already populated) instead of all 7 strata, and the header "N templates /
  N triggered" counts derive from `visibleGroups`/`visibleTemplates` so they
  match what renders. `ActTierShell` passes `selectedStratumId` (from
  `resolveActStratumId`, never null). Plan Protocol Mode is unchanged.
- **Clickable cards.** `ProtocolLibraryCard` gained optional `onSelect` +
  `selected`: when `onSelect` is set the card becomes `role="button"`,
  `tabIndex={0}`, fires on click + Enter/Space, gets `cursor:pointer`,
  `data-selected`, and a `C.blue` selected border; inert (no role/data-selected)
  otherwise. `ProtocolLayerPanel` threads `onSelectProtocol`/`selectedProtocolId`
  to each card; `ActTierObjectiveRail` threads all three from shell to panel.
- **Right-rail detail (Q2: "card + activation controls").** New
  `ActProtocolDetailPane.tsx` renders the FULL `ProtocolLibraryCard`
  (`emphasis="normal"`, not collapsed -> verbatim Amanah `scopeNotes` preserved,
  testid `protocol-amanah-caution`) plus an activation control row wired to
  `protocolStore` (`activateProtocol`/`deactivateProtocol`/`suspendProtocol`):
  active|triggered -> Deactivate + Suspend; suspended -> Resume + Deactivate;
  else -> Activate. Unknown templateId -> empty state. NO store change.
  `ActTierShell` holds `selectedProtocolId` + `handleSelectProtocol` (toggle-off
  on re-click), a contextual right tab labelled **"Protocols"** (`ShieldCheck`,
  `disabled={!selectedProtocolId}`) in protocols mode vs the existing "Objective"
  tab otherwise, and two effects: clear the selection + drop detail->dashboard on
  stratum change, and reconcile `rightMode` on rail-mode change.

**Q1 (triggered visibility) needed no code.** Strict left-rail stratum scoping
hides nothing: triggered protocols still surface in the **Dashboard tab** via the
unchanged, project-scoped (all-strata) `TriggeredProtocolsPanel` in
`ActOpsDashboard`. That panel correctly returns `null` when zero protocols are
status `'triggered'` (activation != triggered) -- an empty render is expected,
not a scoping regression.

tsc clean (8GB heap); 42 bounded vitest green
(`ProtocolLayerPanel.act`/`ProtocolLibraryCard`/`ActProtocolDetailPane`/`ActTierObjectiveRail`,
`--pool=forks --testTimeout=20000`). Live DOM proof on a compost project's Act
tier shell: (a) only the selected stratum heading renders (S6 -> 9 templates);
(b) card click opens the detail pane (full card + IF body + Activate) and flips
the right tab to "Protocols", card `data-selected`; (c) Activate flips card
`data-protocol-status` to `active` + control to Deactivate/Suspend; (d) switching
spine stratum to S5 cleared the selection, removed the pane, and disabled the
right "Protocols" tab; (e) Dashboard tab mounts (Alerts/Priorities/Events).
Commit not pushed ([[project-branch-rebase]]). ADR
[[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]]; Log
[[log/2026-06-04-atlas-act-protocol-stratum-scope-clickable-detail]].

## Protocols rail: URL persistence + bulk activation (2026-06-04)

Closes the two items the stratum-scope/detail slice above deferred:
selection no longer survived a reload, and protocols could only be
activated one at a time. Operator decisions (AskUserQuestion): persist via
**URL search params** (no new store), bulk UX = **Both** (per-card
multi-select + one-click "Activate all in stratum"), Amanah = **include
with confirmation**.

**Feature 1 -- URL-persisted selection + mode.** `railMode` /
`selectedProtocolId` are now **derived** from `useSearch({strict:false})`
(`?mode=protocols&protocol=<templateId>` on `v3ActTierShellStratumRoute`),
not session-local `useState` -- single source of truth, deep-linkable,
mirrors `ObserveLayout`'s `?section=` pattern. `validateSearch` coerces both
keys (`mode` -> `'protocols'|undefined`, `protocol` -> non-empty string |
`undefined`). `rightMode` stays local (the Dashboard-tab toggle is
ephemeral, must not pollute the URL). **Load-bearing detail:** TanStack
`navigate` REPLACES `search`, so every nav helper now passes `search`
explicitly -- `handleSelectProtocol` (toggle-off preserved),
`handleRailModeChange` (replaces `setRailMode`), `goToStratum` (preserves
`mode`, **drops** `protocol` since a selection may belong to a now-hidden
stratum), `goToObjective` (`search:{}`). The stratum-change hygiene effect
dropped its `setSelectedProtocolId(null)` (no setter survives).

**Feature 2 -- bulk activation.** New optional `bulkActivation?` prop on the
shared `ProtocolLayerPanel` (Act-only; Plan rail + default Act rail
byte-identical). Select-mode state (`selectMode`/`selectedIds`/`confirmOpen`/
`pending`) lives **locally in the panel** (drives nothing outside it). A
header toolbar (`protocol-bulk-toolbar`, gated on `isAct && bulkActivation`)
offers a "Select" toggle then "Activate all (N)" / "Activate selected (M)".
Eligible set = the visible `filterProtocolGroups`-scoped group with status
!== `'active'`. New `protocolStore.activateProtocols(projectId, ids[])`
batch action folds the internal `upsert` over the ids in **one `set`** (one
re-render; empty-list no-op; **no persist version bump** -- record shape
unchanged). Threaded shell -> `ActTierObjectiveRail` (`bulkActivation?`) ->
panel; `ActTierShell` passes `bulkActivation` (operator chose Both).

**Amanah -- include with confirmation.** New presentational
`ProtocolBulkConfirmOverlay.tsx` (reuses `ProtocolApprovalOverlay`'s
`role="dialog"`/`aria-modal`/backdrop-cancel shell) lists every
Amanah-flagged protocol (`scopeNotes` truthy) with its **verbatim**
`scopeNotes` (gold, matching the card's `protocol-amanah-caution`) before
any flagged activation -- never collapsed or reworded
([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]). Confirm
calls `activateProtocols` then exits select-mode; Cancel activates nothing.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 28/28 -- incl. new
`ProtocolLayerPanel.bulk.test.tsx` (6), `ProtocolBulkConfirmOverlay.test.tsx`,
`protocolStore.activateProtocols` unit, and the untouched Plan/Act parity
suites. **Live DOM proof** ([[project-screenshot-hang]]) on "Three Streams
Farm" (regenerative_farm): entering Protocols mode set `?mode=protocols`; a
card click set `&protocol=u-s6-yield-shortfall` + `data-selected`; **hard
reload restored both**; stratum S6->S5 dropped `protocol`, kept
`mode=protocols`; Select -> "Activate all (5)" -> confirm overlay -> Confirm
wrote 5 active records to `protocolStore`. Commit `2f2012a0` ("feat(act):
persist protocol selection in URL + bulk-activate stratum"), 9 files,
+774/-33, explicit pathspec (no foreign WIP), **not pushed**
([[project-branch-rebase]]). ADR
[[decisions/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]]; Log
[[log/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]].

## Protocols rail: bulk suspend / deactivate verbs (2026-06-04)

Rounds out the bulk toolbar: it was activate-only; a steward can now bulk
**suspend** and **deactivate** the visible stratum's protocols too. Operator
decisions (AskUserQuestion): toolbar layout = **verb selector + Apply
all/selected** (a segmented `[Activate / Suspend / Deactivate]` toggle picks
the action; two buttons compute N/M against that verb's eligibility);
confirmation = **all three confirm** (every bulk action shows the overlay; the
Amanah verbatim-`scopeNotes` block renders for **activate only**).

**Store -- two batch actions.** `protocolStore.suspendProtocols(projectId,
ids[])` and `deactivateProtocols(projectId, ids[])`, mirroring
`activateProtocols`: one `set()` each, empty-list no-op, **no persist bump**
(record shape unchanged). `suspendProtocols` `.map`s **existing** matching
records to `status:'suspended'` -- never creates a record (suspending an
unactivated protocol is a no-op, same as the singular). `deactivateProtocols`
`.filter`s out matching records (batch of the record-removing
`deactivateProtocol`).

**Overlay -- generalized to a verb.** `ProtocolBulkConfirmOverlay` gains an
`action?: 'activate'|'suspend'|'deactivate'` prop (**default `'activate'`** --
existing overlay tests untouched). `ACTION_META` keys per-verb title/subtitle/
confirm-button styling: activate green (`C.green`+`CA('green',.16)`), suspend
amber (`C.amber`+`CA('amber',.14)`), deactivate danger (`C.red` border+text on
`transparent` -- `CA` has no `red` triplet, so no tint). The Amanah block is
gated `action === 'activate' && flagged.length > 0`: suspend/deactivate
disengage a protocol (the **safe direction**) and carry no fiqh risk, so they
correctly omit it ([[feedback-csa-in-catalogues]],
[[fiqh-csra-erased-2026-05-04]]).

**Panel -- verb selector + per-verb eligibility.** New local
`bulkAction` state (default `'activate'`); `BULK_VERBS` drives a segmented
toggle (`protocol-bulk-verb-activate|suspend|deactivate`, `aria-pressed`). The
`eligibleTemplates` memo now keys on the verb: **activate** = `status !==
'active'`; **suspend** = `status === 'active' || 'triggered'`; **deactivate**
= `status !== undefined`. The two activate buttons were renamed/​reframed to
`protocol-bulk-apply-all` ("Apply to all (N)") / `protocol-bulk-apply-selected`
("Apply to selected (M)"); `onConfirm` dispatches the matching batch action by
`bulkAction`, then exits select-mode. Plan rail + default Act rail still
byte-identical (`bulkEnabled` gate); single-protocol detail flow untouched.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 76/76 -- new
`protocolStore.bulkSuspendDeactivate` (9), extended
`ProtocolBulkConfirmOverlay` (6, incl. Amanah-absent for suspend/deactivate
even when `flagged` non-empty) + evolved `ProtocolLayerPanel.bulk` (8, new
testids + suspend/deactivate verb flows), plus untouched parity suites.
**Live DOM proof** ([[project-screenshot-hang]]) on MTC S6 (8 cards): the verb
toggle drove per-verb eligibility (Activate=8 / Suspend=0 / Deactivate=0 with
no records), then a full **activate -> suspend -> deactivate** lifecycle --
Apply-all activated 8, Suspend recomputed to 8 and flipped all to
`data-protocol-status="suspended"` (overlay showed **no** Amanah), Deactivate
removed all 8 (status back to `none`); store left net-zero. `preview_screenshot`
hung (transient -- dead API + open modal), DOM-asserted via `preview_eval`
instead. Commit `35275a3c` ("feat(act): bulk suspend/deactivate verbs for
Protocols toolbar"), 6 files, +453/-67, explicit pathspec (no foreign WIP),
**not pushed** ([[project-branch-rebase]]). ADR
[[decisions/2026-06-04-atlas-act-protocol-bulk-suspend-deactivate]]; Log
[[log/2026-06-04-atlas-act-protocol-bulk-suspend-deactivate]].

## Protocols rail: verb keyboard radiogroup + bulk-undo toast (2026-06-05)

Closes the two affordances the bulk-suspend/deactivate slice explicitly
deferred. Operator decisions (AskUserQuestion): undo surface = **toast with an
Undo action** (extend the shared `Toast.tsx`, which had no action support);
verb a11y = **upgrade to canonical `role="radiogroup"`/`role="radio"`/
`aria-checked`** (replacing `role="group"`/`aria-pressed`), with arrow-key
roving mirroring `Tabs.tsx`.

**Toast -- optional action button.** `Toast.tsx` gains
`interface ToastAction { label; onClick }`, an `action?` on `ToastItem`, a
trailing `action?` arg on `add(type, message, duration?, action?)` (all existing
`toast.*` calls back-compat), and one public helper `toast.action(type, msg,
action, duration=8000)`. The button (`data-testid="toast-action"`) renders after
the message; it **`e.stopPropagation()`** before running `onClick` then
`dismiss(item.id)`, so the outer click-to-dismiss never double-fires.
`useToastStore` is exported (additive, for test reset).

**Store -- one uniform reverse primitive.**
`protocolStore.restoreProtocolRecords(projectId, affectedTemplateIds[],
priorRecords[])` reverses any verb in a single `set`: empty-list no-op, else
remove **every** affected id for the project then re-append `priorRecords`.
`affectedTemplateIds` is the **full applied set** (not just ids that had a
record), so activate-of-new records are deleted on undo; `priorRecords` (the
pre-mutation snapshot, full shape incl. `deferredUntil`/`lastLoggedAt`) restore
prior status / re-insert removed records. No persist bump (shape unchanged).

**Panel -- radiogroup + undo wiring.** The verb group div becomes
`role="radiogroup"` with a `verbGroupRef` + `onVerbKeyDown`; each button gets
`role="radio"`, `data-verb={key}`, `aria-checked={active}` (was `aria-pressed`),
roving `tabIndex={active ? 0 : -1}`. `onVerbKeyDown` mirrors `Tabs.tsx`: query
`button[role="radio"]`, find `document.activeElement`, ArrowRight/Down
`(idx+1)%n`, ArrowLeft/Up `(idx-1+n)%n`, Home `[0]`, End `[n-1]` (wraps),
`Escape` exits select-mode; on match `preventDefault(); next.focus();
setBulkAction(next.dataset.verb)`. `onConfirm` snapshots `priorRecords` (filter
`records` by project + applied ids) **before** dispatch, then after the batch
action fires `toast.action('success', '{Verbpast} N protocol(s)', { label:
'Undo', onClick: () => restoreProtocolRecords(projectId, ids, priorRecords) },
8000)`. Undo offered for all three verbs (the primitive reverses each uniformly).
Testids/`BULK_VERBS` unchanged; Plan rail + default Act rail byte-identical.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) green -- new `Toast` action-button (3) + new
`protocolStore.restoreProtocolRecords` (7, incl. activate-of-new->delete,
suspend/activate-of-suspended->prior status, deactivate->full-shape re-insert,
empty no-op, project scoping, idempotent-twice) + evolved
`ProtocolLayerPanel.bulk` (14 -- `aria-pressed`->`aria-checked` + radiogroup
role, 5 keyboard cases, 1 undo round-trip). **Live DOM proof**
([[project-screenshot-hang]]) on MTC S6 (8 cards): ArrowRight moved
focus+`aria-checked`+roving `tabIndex` Activate->Suspend and recomputed
`Apply to all (8)`->`(0)`; Activate `Apply to all (8)` -> confirm `Activate 8`
-> 8 records created -> toast `"Activated 8 protocols [Undo]"` -> clicked Undo ->
all 8 deleted, `mtcAfterUndo === mtcBefore` (store net-zero). `preview_screenshot`
skipped (transient dead-API unmount cycling), DOM-asserted via `preview_eval`
in one IIFE. Commit `ffb82bcf` ("feat(act-protocols): keyboard radiogroup +
bulk-undo toast"), 6 files, +435/-9, explicit pathspec (foreign `apiClient.ts`/
`syncManifest.ts` WIP unstaged), **not pushed** ([[project-branch-rebase]]). ADR
[[decisions/2026-06-05-atlas-act-protocol-keyboard-bulk-undo]]; Log
[[log/2026-06-05-atlas-act-protocol-keyboard-bulk-undo]].

## Protocols rail: per-protocol threshold editor (2026-06-05)

> **RELOCATED TO PLAN (2026-06-05, commit `769074f2`).** On operator correction
> ("protocols are editable in **Plan**, not ACT"), the editing UI was moved off
> the Act detail pane to the Plan protocol-detail surface
> (`ProtocolDetailColumn`); the editor file moved
> `act/tier-shell/ActProtocolThresholdEditor.tsx` ->
> `plan/strata/ProtocolThresholdEditor.tsx` and its testids `act-threshold-*` ->
> `protocol-threshold-*`. **Act now displays the Plan-set threshold values
> read-only** -- `ActProtocolDetailPane` keeps `outputs={outputsFor(template.id)}`
> on its card but no longer mounts the editor. The store slice (v6),
> `outputsFor` merge, and `extractConditionTokens` are stage-agnostic and
> unchanged. ADR
> [[decisions/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]]; Log
> [[log/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]]. The
> description below documents the original (Act) build for history -- read it for
> the store/hook/editor internals, which still hold; only the **mount surface**
> moved to Plan.

> **Plan protocol list: select/deselect-all toggle (2026-06-05, commit
> `6cb15db6`).** The Plan Protocol-mode center list (`ProtocolColumn`, the
> multi-select that drives the `ProtocolDetailColumn` stack) gained a single
> **"Select all" / "Deselect all"** toggle in its header
> (`protocol-select-all-toggle`, `aria-pressed`), mirroring the Act rail's "Apply
> to all" but with no confirmation overlay (selection is non-destructive). It
> selects or clears every visible (stratum-scoped) protocol in one click and is
> hidden in the empty state. UI-only: `ProtocolColumn` gains an optional
> `onToggleAll` prop + a locally-computed `allSelected`; `PlanStratumShell`
> derives `visibleProtocolIds` + a functional-updater `toggleAllProtocols`. No
> store/persist change. Log
> [[log/2026-06-05-atlas-plan-protocol-select-all]] (no ADR).

A standing protocol's trigger condition is free-text prose carrying bracketed
`[token]` placeholders (e.g. `[reserve threshold]` in "IF stored water falls
below [reserve threshold]"). Those tokens ARE the adjustable thresholds, but the
Act surface had **no UI to set them**: `useProtocolLibrary` derived its
substitution `outputs` solely from the legacy **S6 `s6-yield-flows`
parameterGroup**, whose 5 tokens (`approved threshold`, `approved day limit`,
`approved recovery target`, `configured window`, `emergency threshold`) **never
intersect** the ~32 distinct tokens in the resolved per-type Act catalogues
(`resolveProjectProtocols` -> `universal.ts` + per-type files). So every Act
condition rendered a verbatim, uneditable bracket. (Widening the parameterGroup
is blocked anyway -- `protocolOutputs.test.ts` has an orphan guard requiring
every S6 param be used by a *legacy* template.) Triggering is manual (no eval
engine; `autoFill.ts` only string-splits), so "adjust the parameters that
trigger" means editing the **value substituted into the human-read condition**,
not building a comparison engine.

Operator decisions (AskUserQuestion): value scope = **per-protocol** (override
keyed `(projectId, templateId, token)` so a shared token name holds a distinct
value on each protocol); coverage = **full now** (a small additive persisted
override slice so ANY `[token]` in ANY active protocol's condition is editable);
edit UX = **inline live-persist** section in the Act protocol detail pane.

**Store -- additive override slice (v5->v6).** `planStratumStore` gains
`protocolTokenOverridesByProject: Record<projectId, Record<templateId,
Record<token, string>>>` (with a frozen `EMPTY_TOKEN_OVERRIDES`), two actions
`setProtocolTokenOverride(projectId, templateId, token, value)` /
`clearProtocolTokenOverrides(projectId, templateId)`, and a stable
`selectProjectProtocolOverrides(state, projectId)` selector (frozen-empty when
absent). Migration bumps `version: 5 -> 6` with an additive backfill (`?? {}`),
mirroring the v4->v5 `valuesByProject` step; `partialize` + `cloneForProject`
extended. `discardObjectivesProgress` is objective-keyed and does NOT clear the
template-keyed slice -- inert leftovers on project-type change are acceptable for
v1 (documented in code).

**Hook -- per-template merge.** `useProtocolLibrary` selects the project's
override map with the stable selector and returns a memoised
`outputsFor(templateId) = { ...outputs, ...(overrides[templateId] ?? {}) }`
(memo deps `[outputs, protocolOverrides]`). The base `outputs` return is kept
for back-compat; templates with no overrides return the **identical base ref**,
so Plan-mode columns (still on base `outputs`) are byte-unaffected.

**Editor + wiring.** New `ActProtocolThresholdEditor.tsx` (props
`{ projectId, template }`) exports a pure `extractConditionTokens(condition)`
(deduped, first-seen order via `renderConditionSegments(condition, {})`),
returns `null` when the condition has no tokens, else renders one text input per
distinct token (`act-threshold-input-${token}`, label/placeholder = `[${token}]`,
gold filled border, per-keystroke `setProtocolTokenOverride`) under an "Adjust
thresholds" header with a conditional `Reset` (`act-threshold-reset`, shown only
when a value exists -> `clearProtocolTokenOverrides`) and a per-protocol scope
footer hint. It subscribes inline via `s.protocolTokenOverridesByProject[pid]
?.[tid]` (indexes, never derives -> no Zustand v5 loop).
`ActProtocolDetailPane` destructures `outputsFor` and renders
`<ProtocolLibraryCard outputs={outputsFor(template.id)} />` so the IF/THEN
substitutes live, mounting the editor between the card and the activation-control
row. `ProtocolLayerPanel` list cards likewise use `outputsFor(t.id)`.

**Amanah.** Editing a numeric/interval threshold is the steward setting their
own approved operating bound -- no riba/gharar/`bay' ma laysa 'indak` surface.
The verbatim `scopeNotes` block stays rendered by `ProtocolLibraryCard`, outside
this editor; no catalogue/schema/`buildProtocolOutputs` change (orphan guard
intact).

**Verified:** web `tsc` EXIT 0 (8GB heap; caught + fixed a real
`template.title`->`template.name`); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 19/19 -- new
`planStratumStore.protocolOverrides` (12: set/clear round-trip, per-(project,
template) isolation, empty-string verbatim, clear no-op same-ref, stable
frozen-empty selector, no-touch-other-slices, clone deep-copy, v5->v6 migration
backfill+preserve, v5-blob rehydrate) + `ActProtocolThresholdEditor` (7, via the
FULL `ActProtocolDetailPane`: 3 `extractConditionTokens` units, one-input-per-
token, no-editor-for-no-token, typing writes override + card substitutes live,
Reset clears + card returns to bracket + reset control hides). **Live DOM proof**
([[project-screenshot-hang]]) on MTC S5 `u-s5-water-store-low`: selecting the
card mounted the editor; typing "20% of capacity" into
`act-threshold-input-reserve threshold` substituted live into the card IF
("stored water falls below 20% of capacity", gold) -- **screenshot confirmed**;
Reset returned the verbatim `[reserve threshold]` and hid the control; store left
net-zero. The no-token protocol `u-s3-flow-anomaly-reassess` mounted the pane but
NO editor (correct). Commit `b79f8f50` ("feat(act): per-protocol threshold editor
for Act-stage standing protocols"), 7 files, +759/-7, explicit pathspec (foreign
`ActOpsDashboard`/`ActTierShell`/`ActTierWeatherPanel*`/`_tsc_review.txt`/wiki WIP
unstaged), **not pushed** ([[project-branch-rebase]]). ADR
[[decisions/2026-06-05-atlas-act-protocol-threshold-editor]]; Log
[[log/2026-06-05-atlas-act-protocol-threshold-editor]].

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

## Floating MapToolbar restored (2026-06-04)

After the toggle removal made `ActTierShell` the only reachable Act layout, the
Act map had **no** floating control bar -- `MapToolbar` (the docked basemap +
measurement bar Plan/Observe carry) was mounted only in the legacy
command-centre `ActLayout` branch. It is now mounted on the tier-shell canvas
(`011d4037`): one import + one element inside the `DiagnoseMap`
`{({ map }) => ...}` closure, just after `BaseMapCard` --
`<MapToolbar map={map} projectId={params.projectId ?? null}
boundary={safeBoundary ?? null} showBoundary={false} />`. `showBoundary={false}`
suppresses the draw/import-boundary buttons, so the bar exposes only Basemap +
Measure distance/elevation/area + Return-to-property -- Act executes against
existing features, it does not author geometry. No new component, no
`MapToolbar` prop change, no CSS (`.dock` floats it bottom-left). Log:
[[log/2026-06-04-atlas-act-floating-maptoolbar-restored]].

## Floating PDF-export toolbar restored (2026-06-05)

The Act tier-shell map now also carries the **floating "Export sheet" pill** --
the Plan-stage `MapSheetExportControl` mounted verbatim (`a5c7da3f`). It opens a
4-type picker (Master Plan / Base Map / Zone Map / Planting Plan), captures the
live MapLibre canvas via `captureMapImage`, POSTs through `api.exports.generate`,
and surfaces a "Download PDF" link -- identical to the Plan design canvas. No
map-config change was needed: `DiagnoseMap` already sets
`preserveDrawingBuffer: true` (what `captureMapImage` requires) and exposes the
live `map` in its `{({ map }) => ...}` closure.

Mount: one import + `<MapSheetExportControl map={map} projectId={id}
anchor="top-right" />` as a sibling of `MapToolbar` inside the `DiagnoseMap`
closure. The only shared-component change is an additive `anchor` prop
(`"top-left" | "top-right"`, default `"top-left"`) that swaps the floating
container's horizontal offset/alignment -- Act anchors **top-right** to clear the
top-left `BaseMapCard` (bottom corners hold `MapToolbar` bottom-left and the
`SectorCompass` overlay bottom-right). The default preserves Plan/DesignPage
behavior exactly.

**Known limitation, now fixed (`09b92fea`):** `api.exports.generate` requires a
real server project UUID, but `MapSheetExportControl` was passing its `projectId`
prop -- the **local** id -- straight to the exports API. That id-space confusion
meant Plan-stage export was already broken for **every synced project** (local
`id` != `serverId` -> 404); the `mtc` seed-only demo (no `serverId`, builtin,
intentionally never synced) just surfaced it loudly as `invalid input syntax for
type uuid: "mtc"`. The control now resolves the backing project from
`useProjectStore` by the local id and sends its **`serverId`** to the API; store
filtering for zones/guilds/crops still uses the local `projectId`. When no
`serverId` exists (the `mtc` builtin or any unsynced project) the picker is
**disabled and annotated** -- "PDF export isn't available for the demo project."
(builtin) or "Save this project to the server to enable PDF export." (regular
unsynced) -- instead of firing a request the backend rejects, matching the
`!!serverId` gating precedent (`TaskProofPanel`, `useActObjectiveTaskBridge`).
Both mounts (Plan `DesignPage`, Act `ActTierShell`) keep passing `projectId`
unchanged; the component resolves `serverId` internally. "Seed a server record
for `mtc`" was rejected -- builtins never sync (`syncProjectNow()` no-ops on
`isBuiltin`). The UI restore (pill top-right, popover, capture->POST) is fully
DOM-proven. Logs: [[log/2026-06-05-act-tier-pdf-export-toolbar]],
[[log/2026-06-05-mapsheet-export-server-id-aware]].

## SectorCompass HUD -> right-rail sectors editor (2026-06-04)

The floating `SectorCompassOverlay` HUD on the Act map became a **click target**
that takes the right rail over with a full-CRUD sectors editor -- a third
rail-takeover alongside the as-built popover (`d914473c`). New
`apps/web/src/v3/act/sectors/`:

- `actSectorsEditorStore.ts` -- a tiny `active`/`open`/`close` singleton (the
  as-built store template minus payload/capture) tracking whether the rail is
  taken over.
- `SectorsEditorPanel.tsx` + `.module.css` -- rail-width editor that **reuses
  the shared sectors data layer** (`useExternalForcesStore` add/update/remove +
  `newAnnotationId('sec')` + `computedSectorRows`). Manual sectors are editable
  (bearing / type / arc / intensity / add / remove); the auto-derived wind/solar
  "computed climate layers" are listed read-only, mirroring the Observe
  `SectorCompassDetail`. A **Done** button calls `close()`. No new persistence --
  edits write to the same store the compass reads, so the HUD updates live.

Wiring: `SectorCompassOverlay` gained an **opt-in** `onOpenEditor?: () => void`
prop; when supplied the card renders as a `<button aria-label="Edit sectors">`,
else it stays the read-only Observe HUD (the overlay never imports an Act store
-- decoupled by callback). `ActTierShell` reads `sectorsEditorActive`, passes an
opener that first `close()`s any as-built session (the two takeovers are
mutually exclusive), and adds a third rail branch
(`asBuiltActive ? ... : sectorsEditorActive ? <SectorsEditorPanel> : normal`) --
as-built keeps precedence; the Dashboard/Objective toggle hides while either is
active. The HUD is reachable exactly when the compass is visible (matrix
`sectors` toggle on + a centroid or >=1 sector). Verified tsc 0, bounded vitest
41 passed (incl. new store test), preview DOM proof of click -> swap + CRUD +
Done revert. Log: [[log/2026-06-04-atlas-act-sector-compass-rail-editor]].

**Follow-up (`9cafb5c3`):** richer per-row authoring in `SectorsEditorPanel`.
Each editable sector row now shows (a) a **compact compass glyph** in a new
leading "Dir" column, drawn from the row's own `bearingDeg/arcDeg/type` via a
local 22px helper mirroring `SectorCompassDiagram`'s bearing->wedge math (the
shared diagram file untouched), updating live as those fields change; and (b)
an **editable notes field** (full-width sub-row) bound to the pre-existing
`SectorArrow.notes` through `updateSector(id, { notes })` -- no schema/store
change. Computed wind/solar rows stay read-only with a muted Dir cell and the
divider `colSpan` bumped 5->6. Presentational only; one-file change verified by
tsc (file clean), bounded vitest (36 passed), and preview DOM proof of the glyph
live-update + notes round-trip + Done revert (map screenshot hung, known WebGL
issue). Log: [[log/2026-06-04-atlas-sectors-editor-glyph-notes]].

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

## Weather drill-down: forecast in the right rail (2026-06-05)

The Dashboard-mode `WeatherStrip` (mounted by `ActOpsDashboard`) has two buttons
-- the weather strip itself ("Open weather forecast") and the "7-day ->" link
("Open full weather forecast") -- both calling its `onOpen` prop. In the
tier-shell that prop was wired to a literal no-op (`onOpen={noop}`), so **both
buttons were dead**. The legacy `ActOpsAside`/map-first path opens the forecast
via a slide-up (`ActModuleSlideUp`), but the tier-shell mounts no slide-up. The
operator asked for the forecast to load **in the same right sidebar**, not a
modal/slide-up.

Modeled as a drill-down **sub-view of Dashboard mode** (`rightMode` stays
`'dashboard'`; the Dashboard tab stays active). A `weatherOpen` boolean in
`ActTierShell` gates the dashboard branch between the cards and the forecast:

- New `ActTierWeatherPanel.tsx` (+ `.module.css`) -- a back-header
  (`ChevronLeft` + "Dashboard", aria-label "Back to dashboard") over the shared
  `WeatherForecastCard` (Open-Meteo 7-day, reused verbatim; `onSwitchToMap` is a
  no-op here -- no map-switch affordance in the rail).
- `ActOpsDashboard.tsx` gained an optional `onOpenWeather?: () => void`, passed
  to `WeatherStrip` as `onOpen={onOpenWeather ?? noop}`. The `noop` fallback is
  kept so the **map-first mount** (`ActMapFirstLayout`, no right-rail target)
  stays inert -- pre-existing, out of scope.
- `ActTierShell.tsx`: `const [weatherOpen, setWeatherOpen] = useState(false)`;
  the dashboard fallback branch now renders `weatherOpen ? <ActTierWeatherPanel
  project onBack={() => setWeatherOpen(false)} /> : <ActOpsDashboard
  onOpenWeather={() => setWeatherOpen(true)} />`. The Dashboard tab onClick also
  clears it, and `useEffect(() => { if (rightMode === 'detail')
  setWeatherOpen(false); }, [rightMode])` resets it whenever an
  objective/protocol detail takes the rail -- so the forecast never reappears
  unexpectedly.

No change to `WeatherStrip.tsx` (its `onOpen` contract was already correct --
only its mount was a no-op). Verified: tsc 0 for my files (the only tsc errors
are untracked foreign WIP); bounded vitest `actToolCoverage` 17/17. Preview DOM
proof on `/v3/project/mtc/act/tier-shell/stratum/s3-systems-reading`: strip
click -> forecast in right rail (dashboard cards gone, back button + 7-day /
Next 24 / Open-Meteo present); back -> cards return; "7-day ->" link -> forecast
opens too; select objective then Dashboard tab -> cards (not forecast),
confirming the reset effect. `preview_screenshot` hangs on the WebGL map,
[[project-screenshot-hang]]. One explicit-path commit `a6c3b042` (not pushed).
Log: [[log/2026-06-05-act-tier-weather-drilldown]].

**Follow-up: rail-layout forecast (commit `043dd979`, not pushed).** Operator
selected the forecast hero and asked to "remove header and move farm signals
section to very top." Added a `railLayout?: boolean` prop to the shared
`WeatherForecastCard`; `ActTierWeatherPanel` passes it. When set it (a) drops the
`shared.hero` header — the panel already supplies the "Dashboard" back-header, so
the "Weather forecast" title was redundant — and (b) floats the **Farm signals**
section to the very top, above Current conditions (the section is extracted to a
`signalsSection` const, rendered `{railLayout && signalsSection}` first or
`{!railLayout && signalsSection}` in its original slot). Prop **defaults to
false**, so the legacy `ActModuleSlideUp` mount keeps the full layout (hero +
signals in original order) untouched. Verified: tsc 0 for my files; preview DOM
proof — `_hero_` gone (`heroPresent:false`), first live section is Current
conditions because the MTC window currently derives **zero** farm signals
(`signalRowPresent:false`); the signals-first ordering is structural (code), not
data-demonstrable until a frost/rain/spray/heat signal is active. Note: the
earlier proof's "farm signals present" was matching the hero *lede* text ("frost
signals to time field work"), now removed.

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

## Objective->tool overrides: off_grid (2026-06-03)

Seventh per-type catalogue wired (audit remediation R1/R3), after homestead,
regen-farm, market-garden, orchard, livestock_operation and conservation. All
**27 `ofg-*` off-grid objectives** carry explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`
entries; off_grid ships **no standalone secondary layer and no patches**, so
this is a primary-only wiring (and a primary-only ratchet). **13 grounded**,
concentrated in the S2/S3 site & systems surveys (water-sources-yield->
spring/watercourse/catchment/wells, energy-generation-potential->sun-sector/
wind-sector/watercourse/vegetation, access-road->roads/path/hazard-zone,
fire-risk-evacuation->fire-sector/vegetation/path/hazard-zone) and the S5
infrastructure block (water-system->wells/spring/tanks/water-lines,
energy-system->sun-sector/power/buildings/tanks, shelter-thermal->dwellings/
sun-sector/tanks, food-production->beds/orchards/paddocks/buildings,
comms-emergency->buildings/power/note); **14 intentional `[]`** (s1 philosophy/
redundancy, the whole s4 strategy/redundancy band with infra sited in s5, the
s3 energy-demand calc, the s6 monitoring-protocol band, and the s7 phasing
band). **Amanah:** every objective is life-safety resilience; no sales channel,
advance purchase, or financing instrument -> clean throughout (no scopeNotes
flag). Before this the off_grid objectives fell through
`STRATUM_ACT_TOOLS_DEFAULT` (surveys & infrastructure surfaced the
access-utilities set instead of source/structure/climate-sector/production
families). **R3:** `actToolCoverage.test.ts` ratcheted with an off-grid
assertion over `OFF_GRID_PRIMARY_OBJECTIVES`. Verified: shared `tsc` EXIT 0;
audit Gap A **141->114**, Gap B 0, Gap C 74->85; bounded `--pool=forks`
`actToolCoverage` 12/12, `objectiveObserveDomains` 8/8,
`resolveProjectObjectives` 25/25. Commit `ee3af9b1`, not pushed (the code commit
also swept in 3 unrelated pre-staged files -- `observe/lens` liveBundle.ts/test
+ types.ts -- from out-of-band work; the off_grid change is correct &
self-contained, un-bundling needs amend/reset, forbidden on this rebased branch,
left for operator; subsequent commits use `git commit -- <pathspec>`). Gap A now
114 across the remaining primary types (agritourism, ecovillage, education,
wellness). Log: [[log/2026-06-03-olos-act-offgrid-overrides]].

## Objective->tool overrides: agritourism (2026-06-03)

Eighth per-type catalogue wired (audit remediation R1/R3), after homestead,
regen-farm, market-garden, orchard, livestock_operation, conservation and
off_grid. All **34 `ag-*` agritourism objectives** carry explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries; agritourism ships **no standalone
secondary layer and no patches**, so this is a primary-only wiring (and a
primary-only ratchet). **Count is 34 not 29** -- the eco-resort / glamping
extension grew the catalogue out-of-band (commits `89541b55`+`15680301`:
AG-S3.7, AG-S4.9, AG-S5.9, AG-S5.10, AG-S7.8); the ratchet reads
`AGRITOURISM_PRIMARY_OBJECTIVES` live, so the grown set was covered
automatically. **19 grounded**, concentrated in the S2/S3 surveys
(arrival-experience->roads/parking/gates/path/hazard-zone, hospitality-infra->
buildings/dwellings/barns, landscape-context->neighbour-pin/catchment/
hazard-zone/note, water-sanitation-demand->spring/watercourse/wells/storage,
sensory-environment->note/vegetation/wind-sector, emergency-access->roads/path/
fire-sector/hazard-zone, food-production-capacity->crops/orchards/beds/paddocks/
buildings, ecological-carrying-capacity->soil/erosion/wildlife-sector/
buffer-ring/zone) and the S4 zoning + S5 design block (circulation->zone/path/
buffer-ring/fencing, safety-compliance->fire-sector/hazard-zone/path,
biosecurity-zoning->buffer-ring/fencing/gates/zone, accommodation->dwellings/
buildings, dining-infra->buildings/barns, programming-infra->path/buildings/
zone, sanitation-infra->buildings/tanks/water-lines, safety-infra->path/
fire-sector/roads/hazard-zone, dispersed-siting->dwellings/zone/path/
buffer-ring, decentralised-servicing->tanks/water-lines/catchment/power), plus
food-integration->harvest; **15 intentional `[]`** (s1 vision/capacity/
regulatory, s2 seasonal-patterns, s4 service-model/food-strategy/revenue-model,
s6 experience-feedback/compliance-monitoring/load-monitoring, the whole s7
staffing/booking/phased-launch/adaptive/seasonal-resilience band). **Amanah:**
AG-S4.8 (revenue model) carries the membership / season-pass Amanah scopeNote in
the **catalogue** (*bay` ma laysa `indak* / gharar -- membership-benefit-not-
advance-purchase, cancellable/pro-rata-refundable, genuine non-stay substance,
bounded by the AG-S3.7 carrying-capacity ceiling, routed to Scholar Council);
the Act layer maps AG-S4.8 to `[]` so **no act surface engages the sales
instrument** -- mirroring market_garden's CSA-flagged s1 (MGD-S1.4/S1.6) and
livestock's CSA-flagged s7 (LVS-S7.7); no fiqh re-encoded at the Act layer.
AG-S7.8 is explicitly operational planning, not a sales surface, also `[]`.
Before this the agritourism objectives fell through `STRATUM_ACT_TOOLS_DEFAULT`
(surveys & design surfaced the access-utilities set instead of access/structure/
climate-sector/zoning families). **R3:** `actToolCoverage.test.ts` ratcheted
with an agritourism assertion over `AGRITOURISM_PRIMARY_OBJECTIVES`. Verified:
shared `tsc` EXIT 0; audit Gap A **114->80**, Gap B 0, Gap C 85->97 (87
intentional / 10 default-driven); bounded `--pool=forks` `actToolCoverage`
13/13, `objectiveObserveDomains` 8/8, `resolveProjectObjectives` 25/25. Clean
commit `a1f9b042` via `git commit -- <pathspec>` (the off_grid `ee3af9b1`
index-pollution lesson -- captured exactly the 3 intended files despite heavy
out-of-band working-tree changes), not pushed. Gap A now **80** across the
remaining primary types (ecovillage, education, wellness). Log:
[[log/2026-06-03-olos-act-agritourism-overrides]].

## Objective->tool overrides: ecovillage (2026-06-03)

Ninth per-type catalogue wired (audit remediation R1/R3), after homestead,
regen-farm, market-garden, orchard, livestock_operation, conservation, off_grid
and agritourism. All **31 `ev-*` ecovillage objectives** carry explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries; ecovillage is **primary-only**
(`canBeSecondary: false`, no standalone secondary layer, no patches), so this is
a primary-only wiring (and a primary-only ratchet). **Count is 31 not 29** -- the
catalogue header's "29" is a stale pre-v1.2 summary; per-tier sub-headers and
v1.2 totals yield 31 (v1.2 appended EV-S7.9 adaptive-management). **13 grounded**,
concentrated in the S2/S3 site & systems surveys (carrying-capacity->zone/
buffer-ring/note, tenure-boundary->path/gates/fencing/note, landscape-vectors->
neighbour-pin/catchment/runoff-path/hazard-zone/note, water-yield->watercourse/
spring/catchment/storage/wells, waste-cycling->soil/compost/zone/watercourse,
energy-potential->sun-sector/wind-sector/watercourse/vegetation/power,
infra-condition->buildings/barns/roads/path/power/water-lines) and the S5 design
block (cluster-layout->dwellings/zone/buffer-ring/path/fire-sector,
communal-systems->buildings/barns, sanitation-waste->tanks/water-lines/compost/
swale/buildings, energy-system->sun-sector/power/buildings/tanks, food-zones->
beds/crops/orchards/water-lines/buildings/zone), plus the S4 housing-cluster
zoning framework->zone/buffer-ring; **18 intentional `[]`** (the whole S1
governance band -- legal/tenure/governance, provision-balance, conflict-framework
-- the S2 social-fabric survey, the S4 settlement/infra/food strategies and both
financial objectives, the S6 monitoring band, the whole S7 phasing/launch/
onboarding/adaptive/exit band). **Amanah:** EV-S4.8 (financial contribution &
shared economics) and EV-S7.5 (communal financial plan & contribution schedule)
are communal member cost-sharing among co-owners (member buy-in, levies,
reserves) -- NOT advance sale of future yield -- encoded verbatim per the
operator's 2026-05-29 no-gating authorisation; both map to `[]` (financial
decisions), so no act surface engages a contribution instrument; no fiqh
re-encoded at the Act layer. Before this the ecovillage objectives fell through
`STRATUM_ACT_TOOLS_DEFAULT` (surveys & design surfaced the access-utilities set
instead of source/structure/climate-sector/zoning families). **R3:**
`actToolCoverage.test.ts` ratcheted with an ecovillage assertion over
`ECOVILLAGE_PRIMARY_OBJECTIVES`. Verified: shared `tsc` EXIT 0; audit Gap A
**80->49**, Gap B 0, Gap C 97->112 (105 intentional / 7 default-driven); bounded
`--pool=forks` `actToolCoverage` 14/14, `objectiveObserveDomains` 8/8,
`resolveProjectObjectives` 25/25. Clean commit `71c4671f` via
`git commit -- <pathspec>`, not pushed. **Blemish:** the code commit's message
body miscounts the split as "19 grounded / 12 []"; the authoritative split is
**13 grounded / 18 []** (audit +18 intentional delta) -- code/tests/audit
correct, only the message prose wrong; a fix needs `--amend` (forbidden on this
rebased branch), left for the operator. Gap A now **49** across the remaining
primary types (education, wellness). Log:
[[log/2026-06-03-olos-act-ecovillage-overrides]].

## Objective->tool overrides: education (2026-06-03)

Tenth per-type catalogue wired (audit remediation R1/R3), after homestead,
regen-farm, market-garden, orchard, livestock_operation, conservation, off_grid,
agritourism and ecovillage. All **22 `edu-*` education objectives** carry
explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries; education is **primary-only**
(no standalone secondary layer, no patches), so this is a primary-only wiring
(and a primary-only ratchet). **11 grounded**, concentrated in the S2/S3 site &
demo surveys (teaching-infrastructure->buildings/zone/path/note, learning-
potential->soil/watercourse/vegetation/crops/note, landscape-vectors->neighbour-
pin/catchment/hazard-zone/note, learner-access-safety->path/hazard-zone/parking/
fencing/buildings, demo-baseline->soil/crops/vegetation/water-lines) and the
S4/S5 teaching-zone & demo-plot design block (teaching-zone-allocation->buildings/
zone/path/beds, safety-risk-framework->hazard-zone/fencing/path, teaching-spaces->
buildings/zone, demo-plots-signage->beds/crops/path/note, learner-amenity->
buildings/water-lines/zone, food-kitchen->buildings/barns); **11 intentional
`[]`** (the whole S1 decision band incl. the regulatory hard gate, the S4
program-delivery and food-hospitality strategies, the S6 evaluation/compliance/
adaptive monitors, the whole S7 launch/onboarding/financial band). **Amanah:**
EDU-S7.6 (financial viability) is ordinary fee-for-service / break-even budgeting
(course fees, grants) -- no riba, no gharar, no advance sale -- mapped to `[]`
(financial decision), so no act surface engages a money instrument; the
regulatory/safety/launch hard gates stay honoured at the catalogue layer, the two
pure-decision gates map to `[]` and safety-risk-framework gets its spatial half;
no fiqh re-encoded at the Act layer. Before this the education objectives fell
through `STRATUM_ACT_TOOLS_DEFAULT` (surveys & design surfaced the access-
utilities set instead of structure/zoning/survey/safety families). **R3:**
`actToolCoverage.test.ts` ratcheted with an education assertion over
`EDUCATION_PRIMARY_OBJECTIVES`. Verified: shared `tsc` EXIT 0; audit Gap A
**49->27**, Gap B 0, Gap C 112->120 (116 intentional / 4 default-driven); bounded
`--pool=forks` `actToolCoverage` 15/15, `objectiveObserveDomains` 8/8,
`resolveProjectObjectives` 25/25. Clean commit `ac98a686` via
`git commit -- <pathspec>`, not pushed; commit-message body states the correct
**11 grounded / 11 []** split (the ecovillage `71c4671f` miscount lesson applied).
Gap A now **27** across the last remaining primary type (wellness). Log:
[[log/2026-06-03-olos-act-education-overrides]].

## Objective->tool overrides: wellness (2026-06-03) -- Gap A CLOSED

Eleventh -- and final primary -- per-type catalogue wired (audit remediation
R1/R3), after homestead, regen-farm, market-garden, orchard,
livestock_operation, conservation, off_grid, agritourism, ecovillage and
education. All **32 wellness objectives** carry explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries -- **27 `well-*` primary + 5 `well-sec-*`
secondary**; wellness ships a standalone **additive secondary overlay layer**
(no patches), so this is a primary+secondary wiring (and a primary+secondary
union ratchet, like silvopasture/orchard). **13 grounded** (all primary),
concentrated in the S2/S3 surveys (sensory-environment->zone/roads/neighbour-
pin/note, retreat-infrastructure->buildings/dwellings/note, landscape-context->
neighbour-pin/catchment/hazard-zone/high-point/note, privacy-gradient->buffer-
ring/vegetation/neighbour-pin/watercourse/note, acoustic-conditions->zone/roads/
neighbour-pin/note, water-features->spring/watercourse/water/note, healing-
garden-ecology->vegetation/soil/sun-sector/note) and the S5 design block
(treatment-spaces->buildings/zone, healing-garden-design->beds/vegetation/
watercourse/path/zone, guest-accommodation->dwellings/zone, privacy-screening->
buffer-ring/vegetation/fencing, dining-nourishment->buildings/barns), plus the
S4 privacy-zone-hierarchy zoning framework->zone/buffer-ring; **19 intentional
`[]`** (the whole S1 decision band incl. the regulatory hard gate, the S4
standards/program/healing-garden-strategy/safeguarding decisions, the S6
monitoring band, the whole S7 launch/onboarding/adaptive band, and every one of
the 5 `well-sec-*` overlays -- all philosophy/regulatory/standards/program/
safeguarding decisions the host primary's spatial work already serves).
**Amanah:** wellness is therapeutic land stewardship (guest healing, sensory
design, safeguarding, practitioner standards); no sales channel, advance
purchase, or financing instrument (WELL-S7.6 reviews "financial data" but
defines no money instrument; no fee/booking objective exists) -- clean
throughout, no fiqh re-encoded at the Act layer. Before this the wellness
objectives fell through `STRATUM_ACT_TOOLS_DEFAULT` (surveys & design surfaced
the access-utilities set instead of structure/zoning/survey/screening families).
**R3:** `actToolCoverage.test.ts` ratcheted with a wellness assertion over the
`WELLNESS_PRIMARY_OBJECTIVES` + `WELLNESS_SECONDARY_OBJECTIVES` union. Verified:
shared `tsc` EXIT 0; audit **Gap A 27->0** (every objective across all 14 types
now explicitly wired), Gap B 0, Gap C 120->130 (130 intentional / 0
default-driven); bounded `--pool=forks` `actToolCoverage` 16/16,
`objectiveObserveDomains` 8/8, `resolveProjectObjectives` 25/25. Clean commit
`1c737085` via `git commit -- <pathspec>`, not pushed; commit-message body states
the correct **13 grounded / 19 []** split. **This closes Gap A:** R1 is complete
across the universal layer, all 11 primary types and every secondary layer; the
coarse `STRATUM_ACT_TOOLS_DEFAULT` is no longer reached by any catalogue
objective (it remains only as a safety net the ratchet would also catch). R2
(form-arm tools) stays deferred. Log:
[[log/2026-06-03-olos-act-wellness-overrides]].

## R2: per-item s1 intent capture forms (2026-06-03)

Closes the R2 arm that the R1 entries above left "deferred". The per-type s1
vision/intent objectives were the last objectives lacking an Act tool to
**complete and record** their task: R1 had set them to an intentional `[]`
(relying on the universal `s1-vision` form arms for project-level capture). R2
gives each its OWN per-checklist-item capture forms.

**Convention (per-checklist-item, full integration):** `catalogue id == formId
== real checklist-item id` (e.g. `hms-s1-household-needs-c1`). The form pipeline
is fully generic -- `ActTierShell.handleFormSave(formId, text)` persists via
`saveVisionForm` AND calls `setItemComplete(projectId, objectiveId, formId)`;
because the formId IS the checklist-item id, **saving a form ticks that checklist
box and advances the objective progress bar**. `VisionFormModal` renders
generically from each entry's `prompt`; no modal/store edits were needed. Adding
a catalog `{kind:'form', formId, prompt}` entry + listing its id in the override
map is sufficient.

**Scope:** **222 form tools** across **36 s1 intent objectives** (32 primary + 4
additive secondary) spanning all 12 permaculture types. Each objective's override
flipped from `[]` to its per-item form-id array. Prompts are the **verbatim**
checklist-item text from each type catalogue (ASCII-normalized; the lone
apostrophe `ag-s1-experience-vision-c4` "farm's" uses a double-quoted string).
Icons reuse the already-imported lucide set (no import churn).

**Amanah / verbatim flags:** `con-s1-tenure-covenant` keeps "carbon credits" /
"carbon agreement" verbatim in its prompts (no silent omission/rewording); the
Amanah scope flags live on the objective content, not the form tool. All 36
objectives are land-stewardship / production / governance / compliance intent
capture -- clean.

**R3 (R2 ratchet):** `actToolCoverage.test.ts` gains `every s1 intent objective
resolves to per-item form-arm capture tools (R2)` -- asserts each of the 36
objectives resolves to >= 1 tool AND every tool is a form arm. A regression back
to `[]` or a non-form tool trips it.

**Verified:** shared `tsc` EXIT 0; `actToolCoverage` **17/17** (forks, 20s),
incl. the new ratchet and the all-id resolution sweep over the 222 new ids; audit
**Gap A 0 / Gap B 0 / Gap C 130->98** (all intentional, 0 default-driven -- the
32 primary intent objectives left the empty set; the 4 additive secondaries wire
correctly but sit outside the primary-objective Gap C universe). Commits
(not pushed): `426952b1` (regen_farm+market_garden+orchard), `090a778a`
(livestock+conservation+off_grid+agritourism+ecovillage+education+wellness),
`b52a5cab` (ratchet), after `ec71a9ad` (homestead) + `7e077900` (silvopasture)
earlier in the session. **This completes the standing Act-coverage task:** every
objective across all types now has an Act tool to complete/record its work.
Log: [[log/2026-06-03-olos-act-r2-s1-intent-capture-forms]].

## Formal proof/verification path (OLOS fork, 2026-06-04)

The lightweight completion path above (form-arm capture / `ObserveDataPoint`
self-record) records **that** work happened but carries no structured proof and
no separate-party verification. The 2026-06-03 Act coverage audit flagged a full
formal layer (`olos_act_tasks` / `olos_proof_records` / `olos_verification_records`)
already built in the API but not wired to the UI. The operator chose to **wire
formal & replace lightweight** (multi-session) via a two-party model
([[decisions/2026-06-04-olos-proof-verification-fork]]).

The first slice (2026-06-04, [[log/2026-06-04-olos-proof-verification-slice]])
wires it end-to-end for one task behind a **default-off** flag,
`isOlosFormalProofEnabled()` (`apps/web/src/config/olosFlags.ts`; localStorage key
`ogden-flag-olos-formal-proof` or `VITE_OLOS_FORMAL_PROOF_ENABLED`):

- **Surface:** `apps/web/src/v3/olos/handoff/TaskProofPanel.tsx`, mounted **per
  task inside `ActFeedbackLoop.tsx`** (the Act->upstream return path that already
  lists synced ActTasks and resolves serverId + member roster). Flag off = the
  loop is byte-identical and the lightweight path is untouched.
- **Two-party model:** a submitter (owner/designer) captures `ProofRecord`s
  (note/measurement/fileUri/...); a separate reviewer (owner/designer/reviewer)
  signs off with a `VerificationRecord`. RBAC mirrors the API gates; both require
  a serverId (synced capability).
- **Two key invariants:** (1) proofs must be **server-saved before** a
  verification can cite them (`proofRecordIds` is `uuid[]`; sign-off disabled
  until >=1 proof has a UUID); (2) the verifications API **never auto-transitions**
  the task, so sign-off owns an explicit **second write** — set ActTask status to
  `verified-complete` (pass) / `needs-rework` (else) and push it (mirrors the
  2026-05-29 assignment-substrate two-write pattern).
- **serverId discipline:** `useTaskProofSync` + the proof/verification stores'
  `pullForTask`/`pushOne` take serverId, normalise each record's `projectId` back
  to local on write, and drop the local-id draft on create (the same fix
  `actTaskStore` got on 2026-05-29).

Roadmapped next: live e2e smoke (NOT YET RUN), then the multi-session
`ObserveDataPoint` retirement migration.

## Notes

- `ViewBDashboard` is preserved and still the tier-shell's dashboard-mode panel
  (only the field-action surface swapped it for `ActOpsDashboard`).
- TS gotcha: discriminant narrowing of `tool.arm` is DROPPED inside a nested
  `.find` closure -- hoist `const arm = tool.arm` before the closure.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).

## Plan prerequisite gate: deep-link protection (2026-06-07)

Two TanStack Router v1 `beforeLoad` guards close the deep-link bypass gap that
existed after `67d184c9` wired `STRATUM_PREREQS` into the `obj()` authoring helper.
The interactive paths (handleSelectObjective / handleSelectStratum in ActTierShell)
already enforced the gate; direct URL navigation bypassed it entirely.

Commit `e0a65aca` (`apps/web/src/routes/index.tsx`, 87 insertions):

**`buildActLockContext(projectId)`** -- shared synchronous helper called by both
guards. Reads `useProjectStore` + `usePlanStratumProgressStore` via `.getState()`
(synchronous; Zustand persist middleware hydrates from localStorage before the
first render). Derives `computeEffectiveProgress` -> `computeAllObjectiveStatuses`.
Returns `{ statuses, objectives }` or `undefined` (project not found, or
`import.meta.env.DEV && useDevUnlockStore.getState().unlockAll`).

**Objective guard** (`v3ActTierShellObjectiveRoute`): if
`statuses[objectiveId] ?? 'locked'` === `'locked'`, throws
`redirect({ to: '/v3/project/$projectId/act/tier-shell', params: { projectId } })`.
Unknown objectiveId passes through (component handles gracefully).

**Stratum guard** (`v3ActTierShellStratumRoute`): calls `computeAllStratumStates`
on `PLAN_STRATA.map(s => s.id)` + the objective statuses map; if
`stratumStates[stratumId] ?? 'locked'` === `'locked'`, same redirect target.

**Smoke-verified** via `window.__TSR_ROUTER__.navigate()` on MTC:
- locked objective -> redirects to `act/tier-shell` (PASS)
- unlocked objective -> renders (PASS)
- locked stratum -> redirects to `act/tier-shell` (PASS)
- DEV unlock ON -> no redirect for same locked URLs (PASS)
- DEV unlock OFF -> redirects again (PASS)

ADR: [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]].

## EvLegalGovernanceCapture: ev-s1-legal-governance 8-decision Tier-0 surface (SP1 Group 2, 2026-06-07)

Second BUILD group of the OLOS mockup-batch rollout (Ecovillage vertical), after
the Boundaries re-decompose (Group 1). Gives the Ecovillage objective
`ev-s1-legal-governance` (EV-S1.4 "Legal entity, tenure & governance model") a
bespoke 8-decision Decision Workbench faithful to the operator mockup
`olos_legal_entity_tenure_financial.html`. Clones the proven self-routing capture
pattern (Boundaries / Stakeholders / Stewards): ONE `isLegalGovernance` flag +
ONE body-router arm in `DecisionWorkingPanel`, with a pure TOTAL
`legalGovernanceModeFor(itemId)` driving both the right-panel body and the
`DecisionList` mode badge.

**New file:** `EvLegalGovernanceCapture.tsx` (+ test). Exports
`legalGovernanceModeFor` / `decodeLegalGovernance` / `isLegalGovernanceValid` /
`summariseLegalGovernance` / `emitLegalGovernance` (private `encodeLegalGovernance`).

**Eight modes (item -> mode -> badge):** c1 `legalEntityPicker` (Entity options,
5 choice cards), **c8 `jurisdiction`** (Jurisdiction; country + province +
reg-office selects + read-only jurisdiction note), c2 `entityDecisionRecord`
(Decision record; 3 textareas), c3 `tenureModel` (Tenure model; 4 cards), c4
`decisionFramework` (Decision framework; 4 cards + quorum), c5
`financialGovernance` (Financial governance; banking cards + 3 thresholds +
FY-end), c6 `membershipRegister` (Membership register; 2 multi-select checklists),
c7 `legalAdviceGate` (Legal advice gate; **HARD GATE**).

**c8 is a NEW catalogue item** added additively at slot 2 of dg1 in
`ecovillage.ts` (objective now 8 items / dg1 holds 3; item ids are arbitrary
strings, so c2-c7 were not renumbered; no item retired -> no persisted-value
orphaning).

**FIVE coupled id sources (load-bearing).** A per-item id for this objective is
referenced from: (1) `ecovillage.ts` checklist, (2) `ecovillage.ts` dg1.itemIds,
(3) `objectiveActTools.ts` OBJECTIVE_ACT_TOOLS_OVERRIDE, (4) `actToolCatalog.ts`
ACT_TOOL_CATALOG, (5) the capture's `legalGovernanceModeFor`. The initial edit
updated only 1-3; source 4 was missed, turning `actToolCoverage.test.ts` red and
leaving c8's panel without a header prompt. `actToolCoverage.test.ts` is the guard
for a missed ACT_TOOL_CATALOG entry.

**c7 legal-advice HARD GATE:** `isLegalGovernanceValid` for c7 is true only when
`adviceScope.length >= 5 && adviceWritten === 'yes'` (the scope checklist has
exactly 5 items). Record disabled + gate note "Clear all 5 advice-scope items and
confirm written advice before recording" until cleared; `adviceDate` recorded but
not gated. Mirrors the Group 1 c4 title-checker gate.

**FormValue encoding:** flat `string | string[]`; scalars as strings, c6
rights/obligations as independent string arrays (not zipped rows);
`encodeLegalGovernance` is the exact inverse of `decodeLegalGovernance` per mode
(round-trip unit-tested); decoders TOTAL; no object array / no `any`.

**No store / no DecisionWorkingPanel-shape change** beyond the one flag + four
arms; predicate widen only -- `ev-s1-legal-governance` added to
`TIER_ZERO_OBJECTIVE_IDS`; persists via the existing
`actEvidenceStore.visionFormData[itemId]` path.

**Amanah:** c5 financial-governance covers custody/authorisation/reporting only
(no riba, no gharar); equity-share tenure + share-company options are
musharaka-like ownership, not riba; no CSA/advance-purchase/CSRA/salam framing, so
no Scholar-Council routing required (unlike Group 3). One-line Amanah comment on
the c5 mode.

ADR: [[decisions/2026-06-07-atlas-ev-legal-governance-capture]]; Log:
[[log/2026-06-07-atlas-ev-legal-governance-capture]].

## Boundaries: s1-boundaries reverted to the 7-item mixed-mode mockup (2026-06-08)

The shipped 5-register `s1-boundaries` surface (SP1 Group 1,
[[decisions/2026-06-07-atlas-boundaries-redecompose]]) was **reverted for this
objective** to the EARLIER 7-item mixed-mode shape, on operator instruction to
match `olos_boundaries_legal_mixed_surface.html`. The mixed surface had been
preserved as `BoundaryCaptureLegacy.tsx` precisely for this; the revival is a
catalogue re-decompose + import swap (no change to the legacy component's
resolver/decode/encode/valid/summarise).

- **Catalogue (`universal.ts`):** `s1-boundaries` rewritten to 7 items in mockup
  order `[c2, c1, c3, c4, c5, c6, c7]` / 2 groups -- dg1 "Title & boundary" =
  [c2, c1], dg2 "Legal & permit obligations" = [c3, c4, c5, c6, c7]. Title
  "Establish site boundaries & legal constraints"; verbatim mockup labels;
  completion gate; `actHandoff` "Legal & Boundary Constraints Brief"; ref
  `U-S1.2`. The 5 register ids retire (local-only surface, no migration).
- **Live capture:** `DecisionWorkingPanel` + `ActTierZeroWorkbench` re-point
  `./BoundaryCapture.js` -> `./BoundaryCaptureLegacy.js` (identical symbols).
  Modes: c2->map, c1->doc(titleDeed), c3->mapEntry, c4->decision(zoning),
  c5->decision(water), c6->doc(covenant), c7->decision(permits). Panel boundary
  gate-note arm rewritten per mode (c7/permits always valid -> no note).
- **Two new optional schema fields** on `PlanDecisionChecklistItemSchema`:
  `feedHint` (short centre-column chip) + `feedNote` (longer right-panel
  feeds-block callout); both free display text, distinct from the
  objective-id-typed `feedsInto`; `ck()` gained an `opts` param. Absent on every
  prior item -> all catalogues validate unchanged. `feedHint` on c3/c4/c5;
  `feedNote` on c1/c3/c4/c5/c6/c7.
- **`DecisionList` (shared, all gated):** opt-in `showGroups` prop (default
  false) renders `.dGroup` dividers per group; `MODE_ICONS` (doc->FileText,
  map->MapIcon, mapEntry->MapPin, decision->Scale) prepends a badge icon for
  known modes; a `feedHint` chip falls back to the `feedsInto`-derived chip.
  Workbench passes `showGroups={isBoundaryObjective}` and routes `feedNote` into
  `feedsLabel`. Stakeholders / legal-governance / every other Tier-0 surface are
  UNCHANGED (flat list, text-only badges). The lucide `Map` icon is imported
  `as MapIcon` to avoid shadowing the global `Map`.
- **No deletion:** the register `BoundaryCapture.tsx` + 44-test suite stay on
  disk, unwired. Filenames now inverted vs roles (register = dead, "Legacy" =
  live); rename deferred.

**Verified:** shared + web `tsc` EXIT 0; bounded `--pool=forks` green
(catalogues 105; DecisionWorkingPanel 55; DecisionList 23; BoundaryCaptureLegacy
57 live; BoundaryCapture 44 unwired; ActTierZeroWorkbench 37). Final
code-quality review APPROVE WITH NITS (no regression to other Tier-0 surfaces).
Live preview DOM-verified (`preview_screenshot` hung on the Act map canvas --
transient, [[project-screenshot-hang]]; used `preview_eval`): centre = 7 items
under 2 group dividers, all badges iconed, feed chips on c3/c4/c5; right panel =
correct body + verbatim `feedNote` callout + correct per-mode gate note. Commits
`15d9482b` (BR1) -> `38df407b` (BR3) -> `66a3202f` (BR4) -> `620cd45d` (BR5) ->
`4da47016` (BR6) -> `9d77a306` (polish). ADR
[[decisions/2026-06-08-atlas-boundaries-mixed-mode]]; Log
[[log/2026-06-08-atlas-boundaries-mixed-mode]].

## Provision balance: 6-mode communal/private capture (2026-06-08)

`ev-s1-provision-balance` (EV-S1.5, 6 items c1..c6) gained a bespoke
`ProvisionBalanceCapture` from `olos_communal_private_provision.html` (SP1
Group 3), cloning the `EvLegalGovernanceCapture` multi-mode pattern: one
`provisionBalanceModeFor(itemId)` mapper (c1 `matrix` / c2 `food` / c3
`financial` / c4 `entitlement` / c5 `tension` / c6 `ratify`) + one
`isProvisionBalance` flag + one `DecisionWorkingPanel` arm. Per-mode
JSON-in-FormValue encoding; `decode` TOTAL/defensive (per-entry try/catch, never
fabricates seeds); `encode` lossless inverse (exported); stable member ids via
`makeMemberId()` in event handlers only. Two deliberate per-item
simplifications (a per-item capture cannot read sibling items): **c5 tension** =
FIXED verbatim scaffold whose resolutions persist (the mockup auto-derives the 3
tensions from c1/c2/c3); **c6 ratify** = starts EMPTY with "Add founding member"
(the mockup seeds demo members). Added to `TIER_ZERO_OBJECTIVE_IDS`; persists via
the existing `actEvidenceStore.visionFormData[itemId]` path; no store/schema
change. **Amanah:** the c3 financial mode renders the verbatim 2026-05-29-authorised
scope-note ("...communal cost-sharing models among members who collectively own
the asset -- not advance sale of future yield...") -- musharaka-like co-ownership,
no riba / `bay' ma laysa 'indak` / CSRA / salam. Commits `181f7396` -> `e7eed111`
-> `53243580` (drop dead `mode` param) -> `ad6dce78` (MOCKUP_REGISTRY triage) on
`main`. ADR [[decisions/2026-06-08-atlas-ev-provision-balance-capture]]; Log
[[log/2026-06-08-atlas-tier0-provision-affordance-phase1-close]]. SP1 Group 4
(`EvConflictFrameworkCapture`, `ev-s1-conflict-framework`) remains.

## Data-driven workbench affordance descriptor (Phase 2, 2026-06-08)

`ActTierZeroWorkbench` previously hard-coded three `is<X>Objective` id checks
driving the map-activation strips, the live stakeholder register strip, the
decision-group dividers, and the center-list mode mapper. New
`workbenchAffordances.ts` lifts those per-objective decisions into a static
descriptor table: `WorkbenchObjectiveAffordances { mapStrips; registerStrip;
showGroups; modeFor }`, a module-private `MAP` of the 3 existing entries (strings
transcribed VERBATIM from the prior inline JSX -> byte-identical DOM), and
`workbenchAffordancesFor(objectiveId)`. Any id WITHOUT an entry returns the frozen
shared `EMPTY_AFFORDANCES` (no strips, no groups, null modeFor) so an arbitrary
S2-S7 objective mounts the generic 2-pane workbench with zero special-casing and
never throws. The component now reads `workbenchAffordancesFor(activeObjective.id)`
and renders strips/badges/groups from it; the unconditional
`useStakeholderRegisterStore` hook + `stakeholderCount` useMemo (above the early
return, load-bearing per the Zustand v5 stable-snapshot rule) are untouched.
Operator scope ("Mechanism only, ids in Phase 3"): the live routed set stays the 5
S1 ids; S2-routability proved by a `s2-fake-carrying-capacity` test fixture; each
Phase-3 sub-phase adds its id alongside its capture. The
`TIER_ZERO_OBJECTIVE_IDS` -> "workbench-routed" rename is deferred as cosmetic.
Tests: `workbenchAffordances.test.ts` (9, happy-dom) + a new `ActTierZeroWorkbench`
S2-fixture render test. Single commit `0e7b2d37` on `main`. ADR
[[decisions/2026-06-08-atlas-workbench-affordance-descriptor]]; Log
[[log/2026-06-08-atlas-tier0-provision-affordance-phase1-close]].

## Phase 3a -- Land reading (S2): four multi-mode captures (2026-06-08/09)

First Phase-3 sub-phase of the OLOS-UI mockup adoption: the four S2 "land
reading" objectives each got a bespoke multi-mode capture in the third-column
body-router, all cloning the established EcologyCapture controlled contract
(CONTROLLED/pure -- `model = decode<X>(mode, value)` each render, full next model
via `onChange(encode<X>(...))`; a pure TOTAL `<x>ModeFor(itemId)` mapper; per-mode
discriminated-union models keyed on `kind`; flat per-item `FormValue` JSON
encoding; `decode` TOTAL/defensive and **never fabricates seeds**; `encode`
lossless inverse, exported; stable per-row ids via a module-scoped `makeRowId()`
in event handlers only). Each capture renders ONLY the `.rb` body blocks; the
panel owns all chrome.

| Capture | Objective | Items / modes | Commit |
|---|---|---|---|
| `TerrainCapture` | `s2-terrain` | 5: mapSource / slope / elevation / landform / erosion | `246cd649` (+`b4fe6832` ASCII fix) |
| `ClimateCapture` | `s2-climate` | 6: rainfall / temperature / wind / solar / fire / microclimate | `f50cd022` |
| `EcologyCapture` | `s2-ecology` | 5: vegetation / species / corridors / connectivity / waterHabitat | `2643e828` |
| `LandscapeContextCapture` | `ev-s2-landscape-vectors` | 6: landUse / sprayRisk / planning / community / disputes / catchment | `8db07f18` |

**Wiring per capture (5 sites):** (1) `DecisionWorkingPanel.tsx` import +
`is<X>?` flag on `DecisionPanelTarget` + decode-once block + validity / gate-note
/ record-summary / body-router arms; (2) `ActTierZeroWorkbench.tsx`
`buildDecisionTarget` -- `is<X> = item.id.startsWith('<prefix>-')`; (3)
`workbenchAffordances.ts` -- import the mapper + a `MAP` entry (`showGroups:true`,
empty strips, `modeFor` guarded by the id prefix); (4) `DecisionList.tsx`
`MODE_LABELS` entries; (5) `ActTierShell.tsx` -- objective id added to
`TIER_ZERO_OBJECTIVE_IDS`. This is exactly the Phase-2 affordance-descriptor
mechanism paying off: a new S2 objective needs one descriptor entry + the id in
the set, no `ActTierZeroWorkbench` special-casing.

**LandscapeContextCapture specifics.** Ports `olos_landscape_context.html` for
the ecovillage objective `ev-s2-landscape-vectors` (EV-S2.7, 6 items c1..c6, 3
decision groups). Four growable registers (`landUse`, `sprayRisk`, `community`,
`disputes`) via `makeRowId()`; `planning` = 4 fixed single-select environment
cards (selected starts null, action block only when selected); `catchment` =
**FIXED 4-vector contamination scaffold** (keys `agRunoff` / `roadRunoff` /
`wildfireAsh` / `industrialLegacy` with GENERIC non-site-specific titles+descs,
severity single-select + editable monitoring textarea; decode reconstructs all 4
in fixed order). This fixed-scaffold-with-generic-content choice mirrors the
ProvisionBalance c5 precedent and honours "decode never fabricates seeds": **NO
site-specific mockup demo prose was seeded** (no Ridgeline Road / Commonground /
Castlemaine / VCAT / 20,000 L). Allow-list `Set`s reject unknown enums ->
defaults; validity per mode (landUse >=1 named; sprayRisk >=1 named WITH severity;
planning selected != null; community >=1 named; disputes >=1 named OR non-empty
lessons; catchment >=1 vector with severity). `encode`/`isLandscapeValid`/
`summariseLandscape` carry an unused `mode` param (`void mode;`) for call-site
symmetry -- a deliberate minor divergence from the EcologyCapture template.

**Amanah:** all four captures are pure landscape / climate / ecology / planning /
contamination survey surfaces -- no finance, riba, gharar, or `bay' ma laysa
'indak`; cleared without Scholar-Council routing.

**Verified:** four isolated bounded `--pool=forks` suites
([[feedback-vitest-bounded-runs]]) -- Terrain 31, Climate 35, Ecology 28,
Landscape 33 = **127 tests green**; web `tsc` EXIT 0 (8GB heap); ASCII-only. Each
capture passed both review stages (spec-compliance then code-quality) per
subagent-driven-development.

**Surgical staging around a concurrent session.** A second Claude Code session was
committing an `ACT_COPY`/`copy/index.js` copy-refactor to the SAME three contended
wiring files (`DecisionWorkingPanel` / `ActTierZeroWorkbench` / `DecisionList`)
during the landscape build. A whole-file `git add` would have captured their
untracked, uncommitted `copy/` WIP into my commit (broken build). Resolved by
hunk-level staging: `git diff -U0 --no-color -- <file> | <filter> | git apply
--cached --unidiff-zero --recount`, where the filter drops any hunk containing a
foreign marker (`ACT_COPY` / `copy/index` / `feedsFallback`). `-U0` splits the
mixed import hunk so only my landscape import stages; `--recount` makes git apply
recompute line counts. Verified pre-commit: 0 foreign markers staged, 214
landscape markers staged, foreign hunks preserved unstaged + byte-identical in the
working tree. Landscape committed `8db07f18` (8 files, +2990) on `main`, explicit
pathspec, **not pushed**.

**Screenshot gate DEFERRED (not skipped).** The Phase-3a sub-phase gate requires
screenshot verification, but the four S2 captures are **not** registered in the
map-free `/v3/components` gallery harness, and the only other visual path is the
live workbench (dead dev API + map canvas, [[project-screenshot-hang]]). A clean
full-suite gate is additionally blocked while the concurrent session's
uncommitted `ACT_COPY` WIP sits in the working tree (it would test their
incomplete work, not my committed code). Follow-up: register the four captures in
the gallery, then batch-screenshot; run the clean full suite once the tree is
clear. Per CLAUDE.md no visual pass is claimed without a screenshot.

Log: [[log/2026-06-09-atlas-act-tier0-phase3a-land-reading]] (no separate ADR --
each capture is an instance of the EcologyCapture multi-mode pattern, already
recorded; the catchment fixed-scaffold + "decode never fabricates" decisions
mirror the provision-balance ADR).

## Phase 3c-iii -- Husbandry & welfare framework capture (2026-06-10)

`HusbandryCapture` wires the silvopasture objective `silv-sec-s4-husbandry-framework`
(SILV-S4.22, "A sound livestock husbandry & welfare framework", 6 items c1..c6, 3
decision groups) into the Tier-0 workbench. It follows the **advisory pure-FormValue**
contract of its siblings [[log/2026-06-10-atlas-livestock-intent-merge]] /
[[log/2026-06-09-atlas-grazing-capture-merge]] (no `projectId`, no store adapter --
the panel passes `siblingValues`, unused by every mode here). Modes c1..c6:
`health` (animal-health program -- vaccination / parasite / vet) / `breeding`
(strategy + seasonal calendar; ids `autumn`/`spring`/`aiet`, an out-of-set raw value
decodes to `null`) / `welfare` (five welfare domains) / `halal` (humane + halal
handling, the only gating mode) / `records` (NLIS + stock/health/halal/zakat
registers) / `labour` (seasonal labour fit). `isHusbandryValid` gates on `halal`
alone (pathway acknowledgement === true); c1-c3, c5-c6 are always-valid advisory
inputs.

**6-site wiring (the established recipe):** `ActTierShell` `TIER_ZERO_OBJECTIVE_IDS`;
`ActTierZeroWorkbench` `isHusbandry = item.id.startsWith('silv-sec-s4-husbandry-framework-')`
derivation + return field; `DecisionWorkingPanel` import + `isHusbandry?` flag +
mode decode + validity / summary / body arms (summary/validity take `(mode, value)`
only -- no siblingValues); `workbenchAffordances` MAP entry (advisory: no strips,
`showGroups:true`); `DecisionList` MODE_LABELS; `ComponentsDebugPage` c1..c6 gallery.
**Badge keys namespaced `hb-`** in `workbenchAffordances.modeFor`
(`hb-${husbandryModeFor(itemId)}`) with six matching `hb-*` `DecisionList` labels --
the same namespacing precedent as livestock-intent's `li-`, applied pre-emptively so
the generic mode keys (health/welfare/records/labour) never risk colliding with the
global label map; the component is untouched and `DecisionWorkingPanel` routes off
its own `husbandryModeFor` independently.

**Amanah -- copy-review gate cleared BEFORE wiring (operator-approved 2026-06-10),
two deltas authored:**
- **Delta A (Tasmiyah).** The c4 `HALAL_REQUIREMENTS` dhakah list explicitly includes
  Tasmiyah -- pronouncing the name of Allah (Bismillah, Allahu akbar) at slaughter --
  alongside the live-and-healthy animal, the swift severing cut, full blood drainage,
  blade-out-of-sight ihsan, and qiblah orientation. c4 also foregrounds the niyyah of
  halal stewardship and renders the Sahih Muslim 1955 ihsan hadith in the `welfare`
  mode.
- **Delta B (pig-output exclusion).** c4 carries an explicit interpretation block:
  the slaughter / meat pathway applies ONLY to stock raised for meat; working animals
  kept for non-food ecological or labour roles -- e.g. pigs (khinzir) for
  land-clearing, tilling, or waste cycling -- are **categorically excluded from the
  slaughter-for-consumption pathway; their flesh is never taken as human food.** This
  honours the pig ruling on the OUTPUT/YIELD side while the working presence stays
  permitted upstream, and **resolves the carried-forward flag** from the
  livestock-intent merge ([[fiqh-pigs-working-role-not-meat]]).
- **Commercial / certified-abattoir + off-farm sale pathway DEFERRED, not authored**
  (only the on-farm traditional pathway is described) -- consistent with the Amanah
  discipline around premature sale-channel framing ([[fiqh-csra-erased-2026-05-04]],
  [[feedback-csa-in-catalogues]]). Two regression tests assert delta A and delta B
  render, and the suite asserts the deferred commercial strings are ABSENT and that
  `halal` mode has exactly one checkbox.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) -- `HusbandryCapture` **22/22** (incl. the two
covenant-delta regressions) + the four wiring-site suites **131/131** (`DecisionList`
23, `workbenchAffordances` 13, `ActTierZeroWorkbench` 38, `DecisionWorkingPanel`)
green; ASCII-only. `packages/shared` untouched. Built + wired on a fresh
`origin/main`-based worktree `claude/husbandry-capture`; **NOT committed/pushed
pending operator sign-off** ([[project-structured-capture-on-main]],
[[project-branch-rebase]]). Screenshot gate deferred (the silvopasture captures are
not in the `/v3/components` map-free harness and the live workbench has a dead dev
API + map canvas, [[project-screenshot-hang]]); the c1..c6 gallery sections were
added to `ComponentsDebugPage` so a later batch screenshot can close it.

## OLOS UI/UX trust copy: central copy module (2026-06-09)

A separate concurrent session reworded every user-facing string on the v3
Plan -> Act -> Observe surfaces into a land-stewardship mentor register and
extracted them into a NEW central copy module **`apps/web/src/v3/copy/`**
(barrel `index.ts` + per-surface `plan.ts` / `act.ts` / `observe.ts` /
`shared.ts` + `__tests__/`) -- the 10 suggestions of `OLOS_UIUX_Suggestions.md`,
theme "This Thinks The Way I Think". The module lives in **`apps/web`, NOT
`packages/shared`** (React-surface chrome; shared stays UI-string-free): static
strings -> frozen consts; parameterized copy -> pure store-free functions
(`feedsFallback`, `observeSignalConfirmation`, `decisionCount`, plus Observe
helpers). On the Act surface specifically: `DecisionWorkingPanel.tsx` consumes
`ACT_COPY.workingPanel.*` (eyebrow "Working on", "Record this decision",
placeholders, defer labels "Not ready -- needs more observation" /
"Deferred -- needs observation" / "Will add later") and `ACT_COPY.divergence.*`
(in-sheet post-divergence confirmation after `markDiverged`, no app-level toast);
`ActTierZeroWorkbench.tsx` uses `feedsFallback(names)` for the "feeds into"
chrome (still preferring `item.feedNote`; authored per-item content stays in
seed). Suggestion 4 (visible Observe signal on first verified Act task) reuses
the existing `appendObserveFeedFor` emission -- no new feed plumbing -- and
since `FieldAction` carries no `domainId` the Act site calls
`observeSignalConfirmation(null)`. **Seed-data boundary held:** only chrome
templates moved; `feedsInto` / `feedHint` / `feedNote` stay in
`packages/shared`. Verified: web `tsc` EXIT 0 (8GB heap); `DecisionWorkingPanel`
55 + `fieldActionStore.observeWiring` 6 bounded `--pool=forks` green; preview
**screenshot** confirmed the Act copy live. ADR
[[decisions/2026-06-09-olos-uiux-copy-module]]; Log
[[log/2026-06-09-olos-uiux-copy-module]]; Observe side
[[entities/observe-dashboard]]. Amanah: pure copy reword, no finance framing
([[fiqh-csra-erased-2026-05-04]]).

## Labour per-person roster (2026-06-09)

`LabourInventoryCapture` (decision `s1-vision-labour`) was reworked from a single
guessed "whole team combined" weekly-hours figure into a **per-person roster**.
Each `PersonAvailability` carries its own weekly hours, four-season curve, and
skill+level list; the combined team hours, seasonal curve, and union skill list
become **derived read-only totals** (`deriveTeam`) that feed the unchanged
Capacity signal (`getCapBand`) and annual-rhythm chart. The change is strictly
additive: the legacy flat `hours`/`spring..winter`/`skills` keys are still
emitted, now recomputed from the roster, so downstream Act pacing is untouched and
no persisted decisions migrate. The roster persists as index-aligned parallel
`string[]` arrays (mirroring StewardCapture) plus a U+001F-packed `name::level`
cell per person; `decode` is back-compat — a value with no `rosterNames` collapses
into one synthetic `primary` person whose derived totals equal the old combined
fields. The roster **pre-fills from the sibling StewardCapture decision**
(`s1-vision-steward`) via the exported `rosterSeedFrom` helper (primary "You" +
each invited `team_member`/`contractor`, landowners skipped), wired through a new
`rosterSeed?` prop in `DecisionWorkingPanel` (display precedence: persisted >
seed > WHO-band default rows). UI is a list of expandable per-person rows over a
derived whole-team summary block. One explicit-path commit `98bbd73c` on `main`
(**not pushed**); tsc clean; 19 bounded vitest green; DOM-proven on
`/v3/components`. A foreign-WIP footer reorder in `DecisionWorkingPanel.tsx` was
left unstaged (only my four hunks committed, via `git apply --cached`). Log
[[log/2026-06-09-act-labour-per-person-roster]].

## ConflictFrameworkCapture: ev-s1-conflict-framework 7-decision Tier-0 surface (SP1 Group 4, 2026-06-10)

Closes the last SP1 ecovillage-S1 governance objective: **"A sound conflict
resolution & community agreement framework"** (`ev-s1-conflict-framework`). It had
no bespoke Act capture -- its decisions fell through to the generic form/textarea
fallback and the objective landed on the map shell, not the Tier-0 inline
workbench. Adopted the operator's `olos_governance_decision_dispute.html` mockup,
whose 7 decisions + 3 groups map 1:1 onto the catalogue's c1..c7 / dg1-dg3.

**`ConflictFrameworkCapture.tsx`** (+1275) is one controlled multi-mode capture
modelled on `ProvisionBalanceCapture` / `ForageCapture`: flat `FormValue`,
lucide-only icons, ASCII-only, ids minted only in handlers, decode TOTAL and
**never fabricates seed data**. `conflictFrameworkModeFor(itemId)` maps the 7
items to `decisionProcess` (c1) / `disputePathway` (c2) / `communityAgreements`
(c3) / `exitProcess` (c4) / `dissolution` (c5) / `reviewCadence` (c6) / `signOff`
(c7); a foreign id returns `null`. Unlike ProvisionBalance there are **no
`siblingValues`** -- every c-item is self-contained. FormValue keys are
`cf`-prefixed; agreements toggle via `.agreeCheck` buttons (aria-label = item
label, separate non-interactive title div); signatures serialize as
`cfSignatures` = `string[]` of `householdId::status`.

**c3 communityAgreements** preserves verbatim the one Islamic provision: "Halal
food standards observed in communal kitchen -- applies to all communal food
preparation" ([[feedback-csa-in-catalogues]] no-silent-omit discipline).

**c7 signOff is the pre-land-work HARD GATE.** `FOUNDING_HOUSEHOLDS` is a module
constant of the mockup's **4 STATIC households** (mc1 Sarah Mitchell / mc2 Marcus
Delacroix / mc3 Aroha & James Ngai / mc4 Elif Yildiz & family) carrying a
`SIMPLIFICATIONS:` header noting real-member wiring is a deferred follow-up.
`isConflictFrameworkValid('signOff', value)` returns true only when **every**
household is `signed` OR `reservations` (reservations recorded but non-blocking --
operator decision 2026-06-09). Live-verified: "Record this decision" disabled at
0/4, gate box flips to `pass` tone ("4/4 households signed ... Land work may now
begin.") and the button enables at 4/4.

**Wiring** mirrors Forage: `TIER_ZERO_OBJECTIVE_IDS` entry; `isConflictFramework`
flag in `buildDecisionTarget`; `workbenchAffordances` MAP entry (`showGroups:true`
+ `modeFor`); 7 `DecisionList` MODE_LABELS (Decision model / Dispute pathway /
Agreements / Exit process / Dissolution / Review cadence / Sign-off gate). The
`DecisionWorkingPanel` body-router arm (import + resolved mode + validity/gate/
summary/body arms) was authored here but **folded into the foreign labour commit
`23a2e8c2`** ("refactor(labour): eliminate hours/seasonal ambiguity") by an
out-of-band rebase -- already committed, so excluded from this slice's commit.

**Verified:** web + shared `tsc` clean; bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 81/81 green (ConflictFramework 32, DecisionList
23, workbenchAffordances 9, actToolCoverage 17). Live preview in ecovillage
project `0d5dd16c` ("kawartha lakes", dev strata-unlock): 3-pane Tier-0 workbench,
3 group headers + 7 mode badges, c1 body on load, c3 halal string, c7 gate
locked->unlocked. Screenshot tool hung (known transient, no console errors);
structured DOM-probe fallback per CLAUDE.md ([[project-screenshot-hang]]).

**Amanah:** community-governance / conflict-resolution / member-exit / dissolution
surface -- halal; no sale, advance-purchase, financing, CSRA, or salam framing;
the single Islamic provision preserved verbatim. Cleared without Scholar-Council
routing ([[fiqh-csra-erased-2026-05-04]]).

Commit `3fd0e235` (7 files, +2297) on `main`, explicit pathspec, **not pushed**.
Log [[log/2026-06-10-atlas-conflict-framework-tier0]]. **Deferred:** bind c7 to
the project's real member roster (replacing the static 4 households).

> **Branch note (2026-06-08):** the entire Phase 1 + Phase 2 structured-capture
> delta was merged into `main` out-of-band (merge `763415ee`); `main` is now the
> canonical working line, `feat/structured-capture-forms` is an ancestor.
> Phase 3 continues on `main`; nothing pushed without an explicit ask
> ([[project-structured-capture-on-main]], [[project-branch-rebase]]).
