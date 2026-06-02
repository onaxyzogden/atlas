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

Tests: `ActRailModeToggle.test.tsx` (5) + `ActTierObjectiveRail.test.tsx` (2);
31/31 tier-shell tests total.

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

## Notes

- `ViewBDashboard` is preserved and still the tier-shell's dashboard-mode panel
  (only the field-action surface swapped it for `ActOpsDashboard`).
- TS gotcha: discriminant narrowing of `tool.arm` is DROPPED inside a nested
  `.find` closure -- hoist `const arm = tool.arm` before the closure.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
