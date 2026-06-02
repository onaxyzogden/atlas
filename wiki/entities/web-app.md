# Web App (Frontend)
**Type:** package
**Status:** active
**Path:** `apps/web/`

## Purpose
React SPA for property design, map visualization, dashboard analytics, financial modeling, and export. Local-first architecture with Zustand stores persisted to localStorage.

## CI / PR gating
PRs touching `apps/web/**`, `packages/shared/**`, or `pnpm-lock.yaml` are gated by `.github/workflows/web-ci.yml` (added 2026-05-25, `016c6d0b`) — three parallel jobs: **typecheck** (`pnpm --filter @ogden/web typecheck`, 8 GB-heap `tsc --noEmit`), **test** (`vitest`, node env), **build** (`tsc && vite build` + Playwright `prerender:showcase`, with `VITE_MAPTILER_KEY`). This closed the last monorepo PR-CI gap (api was already gated by `api-ci.yml` + `api-integration.yml`); previously only `deploy.yml` exercised web, and only on `push` to `main`. See [[log/2026-05-25-web-ci-gate]].

## Key Structure
```
src/
  components/
    ui/             — 16 reusable components (Button, Card, Modal, etc.)
    IconSidebar.tsx  — Main navigation sidebar
  features/
    _templates/     — SECTION_CONTEXT.md.tmpl (scaffold generator template)
    dashboard/      — DashboardView, DashboardSidebar, DashboardRouter, 14 dashboard pages
    climate/        — SolarClimateDashboard
    economics/      — EconomicsPanel
    regulatory/     — RegulatoryPanel
    scenarios/      — ScenarioPanel
    financial/      — Financial engine (cost, revenue, cashflow, break-even, mission)
    export/         — InvestorSummaryExport, ProjectSummaryExport, EducationalBookletExport
    fieldwork/      — FieldworkPanel, FieldNoteExport
    map/            — Map view, drawing tools, layer controls
    observe/        — OBSERVE-stage hub + 8 gap surfaces (steward, regional,
                      hazards, cross-section, soil tests, food-chain, sector
                      compass, SWOT journal, diagnosis report) — see
                      [[2026-04-29-observe-stage-ia-restructure]]
    plan/           — PLAN-stage hub + 16 spec-module surfaces (permanence,
                      runoff, swale/storage, zone layer, paths, plant DB +
                      guild + canopy, soil/waste, transect+solar, phasing +
                      seasonal tasks + budget, Holmgren checklist) — see
                      [[2026-04-29-plan-stage-ia-restructure]]
    act/            — ACT-stage hub (violet-bronze) + 13 spec-module surfaces
                      (BuildGantt, BudgetActuals, PilotPlots, Maintenance,
                      Irrigation, WasteRouting, OngoingSwot, HarvestLog,
                      Succession, NetworkCrm, CommunityEvents, HazardPlans,
                      AppropriateTech) — see
                      [[2026-04-29-act-stage-ia-restructure]]
    <slug>/         — 28 scaffolded §§2-29 feature folders (CONTEXT.md + Page.tsx + index.ts)
                      driven by [[feature-manifest]]. §1 uses legacy project/ folder.
  store/            — 32 Zustand stores
  lib/              — layerFetcher, geoParsers, scoring engine, tokens.ts (TS token bridge)
  pages/            — Top-level route pages
```

## Dashboard Groups (DashboardSidebar)
Group colors are now design tokens (`--color-group-*` in `tokens.css`).

| Group | Token | Items |
|-------|-------|-------|
| Grazing & Livestock | `--color-group-livestock` | Paddock Design, Herd Rotation, Grazing Analysis, Inventory & Health Ledger |
| Forestry | `--color-group-forestry` | Planting Tool, Forest Hub, Carbon Diagnostic, Nursery Ledger |
| Hydrology & Terrain | `--color-group-hydrology` | Cartographic, Hydrology, Ecological, Terrain, Stewardship, Solar & Climate |
| Finance | `--color-group-finance` | Economics, Scenarios, Investor Summary |
| Compliance | `--color-group-compliance` | Regulatory |
| Reporting & Portal | `--color-group-reporting` | Reports & Export, Public Portal, Educational Atlas |
| General | `--color-group-general` | Biomass, Siting Rules, Settings, Archive |

## Sidebar Stage Lens (3-stage Observe/Plan/Act — 2026-04-29)
- `features/navigation/taxonomy.ts` carries both `stage: StageKey` (S1–S5)
  and `stage3: Stage3Key` (`observe | plan | act`) on every NavItem.
- `uiStore.sidebarGrouping` defaults to `'stage3'`; `'stage' | 'phase' |
  'domainGroup'` remain available via `GroupingToggle` for power users.
- Mapping: S1 + S2 → observe · S3 design + S4 → plan · S3 operate + S5 →
  act. Decision: [[2026-04-29-observe-stage-ia-restructure]].
- Observe accordion is a 17-item flat list (Hub + 6 existing dashboards + 9
  new dashboardOnly observe surfaces + report exporter); `ObserveHub` is
  the default landing surface for the stage.
- Plan accordion adds `PlanHub` + 16 spec-module surfaces; see
  [[2026-04-29-plan-stage-ia-restructure]].
- Act accordion adds `ActHub` (pinned first, violet-bronze theme) + 13 new
  ACT spec-module surfaces; the 11 already-tagged ACT NavItems
  (`herd-rotation`, `livestock-inventory`, `nursery-ledger`,
  `investor-summary`, `reporting`, `portal`, `educational`, `moontrance`,
  `templates`, `fieldwork`, `history`) remain in place. See
  [[2026-04-29-act-stage-ia-restructure]].

## Cyclical Stage Navigator + Slide-up Top Bar (2026-05-18)
- Header stage navigator (`LevelNavigatorBar`, state via
  `LevelNavigatorContext` mounted by `V3LevelNavBridge`) is now a
  **cyclical 3-stage carousel**: `goPrev`/`goNext` and the context
  `prev`/`next` values use modulo wrap (`(activeIdx ± 1 + n) % n`), so
  both side controls are always present/active. No more linear dead-ends
  at the first/last stage.
- `report` removed from `V3LevelNavBridge` `LEVELS` array — the cycle is
  exactly `[observe, plan, act]`. The `/report` route and
  `parseV3Route` / `handleLevelChange` report branches are untouched
  (Report absorption into a module / left sidebar is separate future
  work). Direct `/report` URL resolves `findIndex -1 → 0` → shows
  "Observe" (accepted cosmetic side-effect on the soon-absorbed page).
- ACT + OBSERVE slide-up sheets now render the module navigation bar
  pinned at the top (`topBar` slot), matching PLAN — steward can switch
  modules without closing the detail sheet. OBSERVE uses a bespoke
  `observe/components/ModuleSlideUp.tsx` (not the shared one), so the
  `topBar` prop + `.topBar` CSS were added there manually.
- Test: `components/LevelNavigator/__tests__/LevelNavigatorCyclical.test.tsx`
  (3 cases — act→next=observe, observe→prev=act, plan interior).
- Pre-existing `validateDOMNesting` button-in-button warning in
  `ObserveModuleBar` is now doubled (bar mounts twice — bottomTray +
  topBar); flagged as separate out-of-scope cleanup task.

## Plan v3 — 8-Module Permaculture Scholar Iteration (2026-05-07)

The 8 Plan-stage modules surfaced through `PlanModuleBar` were each adjudicated against their OGDEN counterpart by the Permaculture Scholar (NotebookLM `5aa3dcf3-…`). Index ADR: [[2026-05-07-atlas-plan-modules-scholar-iteration]]; per-module ADRs filed same date. Final tally: **5 BUILD_FRESH (3 additive, 2 net-new) · 3 KEEP_ATLAS · 0 PORT_OGDEN**.

Card inventory after iteration, keyed by `MODULE_CARDS` `sectionId` in `apps/web/src/v3/plan/types.ts`:

- **Module 1 · Plant systems** (`plant-systems`) — *Build fresh:* `PlantDatabasePort` · `GuildBuilderPort` · `CanopySimulatorPort` (ported from OGDEN; see ADR `2026-05-07-atlas-plan-plants-scholar-build-fresh.md`).
- **Module 2 · Water management** (`water-management`) — *Build fresh:* `RunoffCalculatorPort` · `SwaleDrainPort` · `StoragePlacementPort` (ported from OGDEN; ADR `…-water-…`).
- **Module 3 · Zones & circulation** (`zone-circulation`) — *Additive:* legacy `ZoneLevelLayer` + `PathFrequencyEditor` retained as data entry; new `ZoneCirculationOverviewCard` (SVG mini-map + bbox-overlap validation).
- **Module 4 · Dynamic layering** (`dynamic-layering`) — *Additive:* legacy `PermanenceScalesCard` retained as `plan-permanence-scales` sub-tab; new `PermanenceLadderCard` at `plan-permanence-ladder` sub-tab (9-rank Yeomans bars + ordering-violation checks).
- **Module 5 · Soil fertility** (`soil-fertility`) — *Additive (4 sub-tabs):* legacy `SoilFertilityDesignerCard` (`plan-soil-fertility`) + `WasteVectorTool` (`plan-waste-vectors`) retained as data entry; new `ClosedLoopGraphCard` (`plan-closed-loop-graph`, ring-layout SVG + Holmgren P6 validations) + `SoilBaselineCard` (`plan-soil-baseline`, USDA texture-triangle classifier + limiting-factor remedies).
- **Module 6 · Cross-section & solar geometry** (`cross-section-solar`) — *Keep Atlas:* `TransectVerticalEditorCard` (~540L, typed-ref pins + winter/summer solstice altitude lines) unchanged. Four enhancements deferred: microclimate brackets, succession bands, slope-% annotations, sector-response callouts.
- **Module 7 · Phasing & budgeting** (`phasing-budgeting`) — *Keep Atlas:* `PhasingMatrixCard` + `SeasonalTaskCard` + `LaborBudgetSummaryCard` unchanged. Three enhancements deferred: optional `designLayer` enum on `PhaseTask`, capacity-validation against Client Survey, cumulative investment rollups.
- **Module 8 · Principle verification** (`principle-verification`) — *Keep Atlas:* `HolmgrenChecklistCard` (~187L, 12-principle reflective rubric + linked-feature multi-pick) unchanged. Three enhancements deferred: three-Ethics rollup, Mission Statement cross-check, missing-principle warnings + coverage matrix.

Cross-cutting follow-up: ported OGDEN cards (Modules 1, 2) still operate on mock inputs per the iteration's "visual-first port" cadence — wiring to real Zustand stores deferred.

## Stage Zero Vision Builder (2026-05-25)

Project intake is now a name-only form that routes to a structured
**Stage Zero questionnaire** producing a machine-readable Vision Profile
(per the `OLOS Stage Zero Vision Builder.md` spec). Lives under
`apps/web/src/v3/stage-zero/`:

- `data/visionBuilderQuestions.ts` — the question catalog. Each entry:
  `eyebrow`, `title`, `kind` (`single`|`multi`), `profilePath` (dotted
  path the answer writes into the Vision Profile), optional `visibleWhen`
  for conditionals (livestock questions gated by `hasLivestockInScope`,
  residential by `willLiveOnLand`).
- `useVisionBuilder.ts` — cursor + answers; derives the visible-question
  list (conditionals expand/collapse the total live) + progress.
- `lib/deriveActivatedModules.ts` — pure Vision Profile → activated-module
  preview (drives the bottom strip).
- `StageZeroVisionPage.tsx` + components (`VisionStageHeader`,
  `VisionQuestionCard`, `VisionUpcomingQuestions`, `VisionProfileSidebar`,
  `VisionActivationStrip`) — self-contained `--vb-*` dark/gold palette,
  full-screen takeover (`.page` fixed inset-0 z-600, above AppShell z-501).

The Vision Profile persists on `project.metadata.visionProfile`
(`ProjectMetadata` is `.passthrough()`, so no schema migration; lives in
`projectStore` under localStorage `ogden-projects`). **Module activation
is preview-only for the MVP** — the activation strip shows what the
profile *would* turn on but does not yet gate which Plan/Act modules
render (real gating deferred). `NewProjectPage` rewritten to name-only
create → `/v3/project/$projectId/stage-zero` (preserves
`?prefillTemplate`/`?orgId`/`?fullSetup`); the parcel **boundary moved to
OBSERVE** — `MapToolbar` gained a KML/KMZ/GeoJSON import button
(`parseGeoFile` → `onBoundaryImported` → `updateProject` persists FC +
`parcelAcreage`). The legacy `features/project/wizard/Step*` components
are preserved on disk; their `WizardData` interface was relocated from
`NewProjectPage` into `features/project/wizard/types.ts`. ADR:
[[2026-05-25-atlas-stage-zero-vision-builder]].

## Per-type objective model -- wizard Step 2 + on-the-fly resolution (2026-05-29)

Phase 2 of the OLOS UX plan. The fixed ~16-objective Plan spine skeleton is
replaced by a **per-project resolved** Universal + Primary + Secondary set
(shared engine documented in [[shared-package]] "Per-type objective model").
ADR: [[2026-05-29-atlas-per-type-objective-model]].

- **Wizard Step 2 Section A** (`v3/project-wizard/`): `WizardProjectTypeGrid`
  (required 12-card radiogroup), `WizardSecondaryPicker` (compatible-only,
  N/A hidden, A/M/X relation hints), `WizardTensionPanel` (amber, advisory --
  "I understand, continue" records a timestamped `TensionAck`, **never blocks
  Next**), mounted above the vision form in `WizardStep2Vision`. Selections
  write directly to `metadata.projectTypeRecord` (not `visionProfile`), so the
  resolver has one source of truth. `WizardStep3Team.finish` stamps an
  idempotent "wizard completion" `versionHistory` entry -- no resolved-set
  write (resolution is on the fly).
- **`v3/plan/tiers/useProjectObjectives.ts`** -- resolves at render via a
  4-tier fallback (`metadata.projectTypeRecord` -> bare `project.projectType`
  -> static `PLAN_TIER_OBJECTIVES`). **No new Zustand store** (deviation from
  the plan's recommended `projectObjectiveStore`); reload re-derives the
  identical set deterministically, so provenance survives without persistence.
- **14-consumer switch**: every reader of the static skeleton now routes
  through the resolved set (render/derive: `PlanTierShell`,
  `WizardCompletionScreen`, `home/StageStatusRow`, `home/useProjectUrgency`,
  `observe/.../usePlanRevisionFlagSync`, `act/field-action/ViewAObjectiveExecution`,
  `store/cycleAdvance`) or a project-scoped / global-union lookup
  (`tiers/DecisionChecklist`, `observe/.../useRevisionEvents`, Act
  `getObjectiveTitle`). MTC / untyped projects keep the static skeleton.
- **`tiers/DecisionChecklist`** renders an "Expanded by: <Type>" provenance
  chip for any checklist item the engine stamped `expandedBySecondaryId`
  (neutral filled pill, distinct from the gold feeds chips + green Stage Zero
  badge).

## Plan decision-group render in DecisionChecklist (2026-05-31)

`v3/plan/strata/DecisionChecklist.tsx` now groups the checklist when the
objective carries `decisionGroups[]` (see [[concepts/decision-groups]]): each
group renders a sub-header with its `label`, a "N items" count, and verbatim
`observeFeeds` chips, with the existing per-item checkboxes nested beneath.
When `decisionGroups` is empty it falls back to today's flat list (unencoded
catalogues + the static MTC skeleton are unaffected). Patch-injected groups
(`sourceSecondaryId != null`) reuse the established amber treatment -- the
`#e8a958` left-border + an "Added by <Type>" chip via `findProjectType`. No
new prop plumbing (the component already receives the full objective).
**Disclosed divergence:** per-item checkboxes are kept (not groups-only)
because `planStratumProgressStore` is keyed on item ids; a groups-only display
with group-level completion is a deliberate later refinement. Tests in
`v3/plan/strata/__tests__/DecisionChecklist.test.tsx` (happy-dom) cover
grouped render, item bucketing, feed chips, amber attribution, and flat
fallback. ADR: [[decisions/2026-05-31-atlas-decision-groups-encode]].

## Objective -> formula binding: live livestock calculators + auto-satisfy (2026-06-02)

The silvopasture/livestock Plan objectives now join the two systems they were
authored independently of: the legacy **livestock formula engine** (pure,
tested `compute*` functions in `features/livestock/`) and the **map draw
tools**. Shared carries ids + config (the optional `formulaBinding` schema +
`ckF`, [[entities/shared-package]]); apps/web joins each id to the real
function/widget.

- **`v3/plan/strata/formulaCatalog.ts`** -- exhaustive
  `Record<ObjectiveFormulaId, FormulaSpec>` (`{ id, label, Widget: lazy(),
  summarize }`) + `resolveFormula(id)`. Each `summarize(projectId)` is
  **hook-free** (reads stores via `*.getState()`, filtered to
  `p.projectId === projectId`) returning `{ hasResult, display }`; each `Widget`
  is `lazy()`. Two NEW pure, ecological-only math modules back widgets:
  `features/livestock/stockWaterDemandMath.ts` and
  `features/livestock/forageCarryingCapacityMath.ts` (reuse `LIVESTOCK_SPECIES`
  + `AU_FACTORS`). The S7 `enterprise-break-even` entry ships a deliberate
  **placeholder** (`formula-widgets/BreakEvenPlaceholderWidget.tsx`, no
  inputs/numbers/financial framing; `summarize` always `{ hasResult:false }`) --
  financial wiring deferred under Scholar Council ([[fiqh-csra-erased-2026-05-04]]).
- **`FormulaResultSection.tsx`** (+ CSS) in `ObjectiveDetailPanel` collects
  `objective.checklist.filter(i => i.formulaBinding)`, returns `null` when none
  (non-livestock panels untouched, no chunk cost), renders each widget inside
  `Suspense` + a `CardErrorBoundary`.
- **Auto-satisfy via the existing pure union.** `effectiveProgress.ts` gains an
  OPTIONAL **6th arg** `formulaSatisfiedItemIds?: ReadonlySet<string>` unioned
  into the flat map exactly like the answerSpec (5th-arg) path -- the module
  imports no store and stays pure. New `useObjectiveFormulaProgress.ts` does the
  store reads: `collectFormulaSatisfiedItemIds(projectId, objectives)`
  (React-free) + the hook (subscribes livestock/rotation/site-data slices). All
  three effective-progress consumers (`useEffectiveChecklistProgress`,
  `usePortfolioPlanProgress`, `useProjectUrgency`) thread the per-project Set, so
  a computed formula advances Plan/Portfolio/Home through one source of truth.

ADR [[decisions/2026-06-02-atlas-objective-formula-binding]]; Log:
[[log/2026-06-02-atlas-objective-formula-binding]].

## Portfolio Home P7 -- Dashboard polish, summary bar, access control, nav model (2026-05-31)

Phase 7 of the OLOS Portfolio Home epic (`OLOS_Portfolio_Home_Spec_v1.0`) at
`v3/portfolio/`. The multi-project surface (`/v3/portfolio`) is the forward
"all projects" landing for stewards with 2+ projects.

- **`portfolioModel.ts`** -- `portfolioAccess(project, roleMap)` is the single
  source of truth for the spec's §8 access matrix: returns
  `{ role, isOwnerTier, canEdit, isContractor }`, deriving every gate from
  `hasCapability(role, cap)` (`@ogden/shared`), never role-name literals.
  Local-only projects (no `serverId`) resolve to owner-tier. There is **no
  `admin` ProjectRole**, so New-project stays open to all authed users
  (creating ⇒ owner). Also exports `projectTypeBadges(p)` (shared by card +
  rail) and `STAGE_PAINT` (the High-Tech Earth stage hexes; mirror of the
  `--color-stage-*` tokens -- MapLibre can't read CSS vars).
- **`PortfolioSummaryBar.tsx`** (in `PortfolioDashboardView` above `.grid`) --
  total projects, total area (Σ numeric `p.acreage`, dominant `units`),
  per-stage `STAGE_PAINT` count chips, open-divergences metric; each tappable,
  driving a `stageFilter` + `divergedOnly` state lifted into
  `PortfolioDashboardView` (no new store).
- **`ProjectUrgencyCard.tsx`** -- full §3.3 BentoBox composition: stage colour
  bar, serif name, type badges, stage + active-stratum + Plan-progress bar,
  last-activity line, urgency-chip alert row (the old chip logic, preserved),
  area, explicit Open CTA. Stage + Plan progress are computed once in the
  parent (`usePortfolioStages`, `usePortfolioPlanProgress`) and passed as
  props -- no per-card store subscriptions in the grid. `RoleBadge` kept for
  non-steward roles. The `stage` prop is required.
- **`usePortfolioContractorRedirect.ts`** -- component-level effect (roles are
  async, so NOT in `beforeLoad`): a contractor-somewhere / owner-tier-nowhere
  viewer is redirected to their assigned project's Act surface, avoiding the
  PerProjectHomePage contractor empty-state dead-end.
- **Nav model §6** -- `landingRoute` (`routes/index.tsx`) `beforeLoad` is a
  sync project-count branch on `useProjectStore.getState()` (zustand-persist,
  hydrates synchronously): 0 → `/home`, 1 → `/v3/project/$id/home`, 2+ →
  `/v3/portfolio`; no role logic. `AppShell.tsx` "All Projects → `/v3/project`"
  repointed to `/v3/portfolio` "Portfolio".
- **Compare gating** -- cross-project Observe compare entry points hidden in
  `PortfolioProjectList` (new `canCompare` prop) + `DomainDetailHeader`;
  `PortfolioObserveComparePage` short-circuits to a read-only notice when the
  viewer is owner-tier on no project.

Commit `6bdbb80c` (17 files). Web tsc clean (own files);
`ProjectUrgencyCard` 3/3. P1-P6 of this four-zone spec were code-committed but
not previously logged in the wiki. ADR
[[decisions/2026-05-31-atlas-portfolio-home-p7]]; log
[[log/2026-05-31-portfolio-home-p7]]; continues
[[log/2026-05-28-portfolio-home-slice53]].

## Portfolio Home P1-P6 -- four-zone map, rails, stage colouring, climate util, relationships, cross-project Observe (2026-05-30/31)

The foundation the P7 section above polishes -- Phases 1-6 of the OLOS
Portfolio Home epic (`OLOS_Portfolio_Home_Spec_v1.0`) at `v3/portfolio/`,
code-committed in prior sessions and **wiki-backfilled 2026-05-31 from commit
history**. Per-phase logs hold the detail; the surface in brief:

- **P1 -- four-zone shell + multi-boundary map** (`37f0d062`). `/v3/portfolio`
  defaults to a four-zone **Map** view (left project list / centre multi-boundary
  MapLibre map / right + bottom rails) with a top-bar toggle preserving the
  existing urgency-card grid as the **Dashboard** view (grid extracted verbatim,
  [[feedback-no-deletion]]). `portfolioModel.ts` (`PortfolioStage`, `STAGE_PAINT`,
  coarse `derivePortfolioStage`, boundary FeatureCollection / centroid / area);
  `PortfolioMap.tsx` (MapLibre host reusing `lib/maplibre` + basemap store +
  `MapTokenMissing`, data-driven paint, idempotent `styledata` re-add, DOM pins,
  feature-state selection + fly-to); `PortfolioProjectList`; `PortfolioViewToggle`
  + `PortfolioDashboardView`. See [[log/2026-05-30-portfolio-home-p1-four-zone-shell]].
- **P2 -- at-a-glance + stage rails** (`7a0ff085` + mount follow-up `15bd29a2`).
  `usePortfolioBriefing` (read-only composing hook, reuses the same shared
  selectors + `useProjectUrgency` the other surfaces use, no mutators);
  `PortfolioAtAGlanceRail` (§2.4); `PortfolioStageRail` (§2.5, High-Tech Earth
  tokens, navigates into the per-project stage). See
  [[log/2026-05-30-portfolio-home-p2-rails]].
- **P3 -- §2.6 stage colouring unified + mobile** (`203b5d39`). Ratifies §2.6
  onto the existing High-Tech Earth stage tokens; reconciles `STAGE_PAINT`
  (plan #38a3a5 / act #d9a036 / observe #6c8294); extracts `OUTSTANDING_STATUSES`
  + `deriveStageFromSignals`; new `usePortfolioStages` computes the live stage for
  **every** project (fixing P1's coarse all-teal paint); mobile slide-up list +
  bottom-sheet rail. See [[log/2026-05-31-portfolio-home-p3-stage-colouring-mobile]].
- **P4 -- climate-context util (shared)** (`0b8c8ef7`). `deriveClimateContext`
  in `@ogden/shared` (see [[entities/shared-package]]). Consumed by P6's badge.
  See [[log/2026-05-31-portfolio-home-p4-climate-context]].
- **P5 -- cross-project relationships (full-stack)** (`d1c9a7ff` backend +
  `e52c1b27` frontend). `crossRelationshipStore` (API-synced, not persisted),
  `apiClient.crossRelationships`, `PortfolioMap` relationship lines + off-by-default
  Connections toggle + two-pin creation, rail relationships list, `--rel-*` tokens.
  Kept distinct from the within-project Needs & Yields graph. Display/awareness
  metadata only -- zero effect on Plan/Act/Observe (§9.4). Backend in
  [[entities/api]]. See [[log/2026-05-31-portfolio-home-p5-cross-project-relationships]].
- **P6 -- cross-project Observe comparison** (`070d4026`). `/v3/portfolio/observe-compare`;
  **frontend-only** (derives from the client-side P4 `useObserveDataPointStore`;
  disclosed divergence from the plan's full-stack P6). `observeCompareModel.ts`,
  inline-SVG `ComparisonChart`, `PortfolioObserveComparePage` (min-2 / max-5,
  shared-domain intersection, climate badges). Strictly read-only. See
  [[log/2026-05-31-portfolio-home-p6-cross-project-observe]].

ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]] (the epic's only ADR);
index in [[log]].

## Act Tier Shell -- promoted to the default Act page (2026-05-30)

The Act stage now opens on a **map-centric 4-rail tier shell** by default, the
sibling of the Plan stratum spine. `ActShellMode` is a 3-way per-project toggle
`'tier-shell' | 'field-action' | 'command-centre'`; `getActShellMode`'s default
is `'tier-shell'` (explicit per-project values still win -- toggle invariant, no
persist migration). The two legacy Act shells stay reachable behind
`ActShellToggle` per [[feedback-no-deletion]], and the throwaway prototype at
`act/tier-prototype` (`ActProtoTierShell`) is left untouched -- the real shell
*copies* its structure, never imports it. ADR
[[2026-05-30-atlas-act-tier-shell-promotion]]; log
[[log/2026-05-30-act-tier-shell-promotion]].

- **`v3/act/tier-shell/`** -- `ActTierShell` is the entry: objective selection is
  URL-driven (static-prefixed routes `act/tier-shell` + `act/tier-shell/$objectiveId`,
  since two dynamic siblings under `act/` are impossible -- `act/$module` exists);
  `selectedStratumId` / right-mode / armed-module are local state. The spine mounts
  ABOVE `StageShell` (no top slot), with the four rails in the 5 slots: TOP
  `ActTierSpine` (real per-stratum execution states), LEFT
  `ActTierObjectiveRail`+`ActTierObjectiveCard` (`useProjectObjectives` filtered by
  stratum, real "N/M verified" chips), CENTER the full read-only Act substrate +
  `ActDrawHost`, RIGHT the already-real `ViewBDashboard` / `ViewAObjectiveExecution`
  behind a dashboard/detail toggle, BOTTOM `ActTierToolsRail`. `objectiveProgress.ts`
  computes per-objective progress ONCE, shared by the left rail and the map markers
  so they cannot drift.
- **`v3/act/tier-shell/ActTierToolsRail`** arms map tools for real:
  `setActiveModule` + `useMapToolStore.setActiveTool`, picked up by the inline
  `ActDrawHost`; the armed tool highlights via `data-active`. The `QUICK_LOGS`
  registry was extracted from `ActTools.tsx` to a shared `v3/act/quickLogs.ts` so
  the rail and `ActTools` share one source.
- **Stratum execution state** comes from the new shared
  `computeAllActStratumStates` (see [[shared-package]]), which -- unlike Plan's
  `computeStratumState` -- **never returns `locked`** (Act execution reaches every
  stratum). Objective markers are now **real** (2026-05-31, [[log/2026-05-31-act-tier-shell-followups]]):
  pure `tier-shell/objectiveMarkerGeometry.ts` (`representativePoint` +
  `computeObjectiveMarkerPositions`) sites each pin at the centroid of its
  objective's field-action `locationGeometry` (Point/LineString/Polygon via
  `lib/geo.ts` `polygonCentroid`); objectives with no logged geometry render
  **no pin** (hide-until-real, no synthetic fallback -- ADR
  [[decisions/2026-05-31-atlas-act-objective-marker-geometry]]). MTC's seed logs no
  geometry so it shows zero objective pins today. `ViewAObjectiveExecution`'s
  "Back to all tasks" is now mode-aware -- it resolves `getActShellMode` inside ViewA
  and returns to `act/tier-shell` vs `act/field-action` for whichever shell is active.

## Zustand Stores (25)
All use `persist` middleware with localStorage. Key stores:
- `projectStore` — project CRUD, active project selection. `applyBuiltinsToStore`
  now preserves the existing local UUID (keeps IndexedDB `boundary:<id>` entries
  valid) and user-drawn parcel boundaries across builtin re-seeds. See
  [[2026-05-07-atlas-crash-fix-rail-refactor-data-improvements]].
- `zoneStore` — land zones (13 categories). Owns `Z_TO_CATEGORIES` /
  `defaultCategoryForZ` (single source for Z-level→category, read by
  `ZonePolygonTool` + zone generators); `LandZone` carries optional
  `isHomeCentre` + `seedProvenance` (`'manual' | 'ring-seed'`).
  **Zone-generator seam** (`v3/plan/engine/zoneGenerators/`): pure
  `(context) → LandZone[]` generators (`ringSeedGenerator` first) — the
  caller `addZone`s the output so generated zones ride the existing
  `temporal` undo + draw/edit tools. `GenerateSiteDesignBar` exposes a
  zero-state "Seed zones from rings" shortcut. See
  [[2026-05-15-atlas-zone-generator-seam-ring-seeding]].
- `structureStore` — structures (20 types)
- `livestockStore` — paddocks + livestock species
- `cropStore` — crop areas (10 types)
- `pathStore` — paths/roads (11 types)
- `utilityStore` — utilities (15 types)
- `scenarioStore` — design scenario snapshots (v2, full dollars)
- `financialStore` — region, mission weights, overrides
- `fieldworkStore` — field notes, walk routes, punch lists
- `siteDataStore` — cached layer data (fetch-driven, ephemeral). Now tracks
  `lastCenter` + `lastCountry` per project; when `refreshProject` detects a
  centroid shift >1km or country change, stale jurisdiction data is cleared
  before the new fetch runs (prevents Ontario scores from labelling a Michigan
  parcel during a reload). See [[2026-05-07-atlas-crash-fix-rail-refactor-data-improvements]].
- **Site-annotations namespace stores (2026-04-30, 7 stores):**
  `externalForcesStore` (hazards + sectors), `topographyStore` (transects
  with `verticalRefs` discriminated union), `ecologyStore` (ecology +
  succession), `waterSystemsStore` (earthworks + storageInfra),
  `polycultureStore` (guilds + species), `closedLoopStore` (wasteVectors
  + wasteVectorRuns + fertilityInfra), `swotStore`. Replaces the legacy
  `siteAnnotationsStore` v3 god-store via Permaculture-Scholar-aligned
  consolidation (Holmgren P8) — see [[site-annotations-store]] and
  [[2026-04-30-site-annotations-store-scholar-aligned-namespaces]].
  One-time `migrateLegacyBlob()` runs at boot in `main.tsx`.
- `commentStore` — design comments
- **PLAN-stage stores (2026-04-29):** `principleCheckStore` — Holmgren
  12-principle checks per project.
- **ACT-stage stores (2026-04-29):** `actualsStore` (per-task est-vs-actual
  ledger), `pilotPlotStore`, `maintenanceStore` (5-cadence tasks),
  `harvestLogStore`, `successionStore`, `networkStore` (external CRM —
  distinct from `memberStore`), `communityEventStore`,
  `appropriateTechStore`. All `ogden-act-<slug>` v1.

## Map / Geocoding
- Tile renderer: MapLibre GL (open-source)
- Tile provider: **MapTiler** (`VITE_MAPTILER_KEY`) — migrated from Mapbox 2026-04-11/12
- Satellite basemap: **Esri World Imagery** (free, no token, ~z19) since 2026-05-15 — inline `ESRI_WORLD_IMAGERY_STYLE` raster style in `maplibre.ts` with MapTiler glyphs fallback; MapTiler satellite retained via the **Hybrid** style. See ADR 2026-05-15-atlas-satellite-basemap-esri-world-imagery
- Offline tile-precache (`tilePrecache.ts`) also warms **Esri World Imagery** (`server.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}`, no key) since 2026-05-15 — Workbox `StaleWhileRevalidate` rule routes both the live raster source and the precache warmer into the shared `ogden-map-tiles` cache, so offline tiles match the online Satellite basemap; works on the keyless public deploy. See ADR 2026-05-15-atlas-offline-tile-precache-esri-parity
- Style URLs (MapTiler, non-satellite): `https://api.maptiler.com/maps/{topo|topo-v2|streets|hybrid}/style.json?key=...`
- Geocoding: **MapTiler** (`https://api.maptiler.com/geocoding/{query}.json?key=...`) — used in `MapCanvas.tsx` and `StepBoundary.tsx`
- Terrain DEM: still `mapbox://` protocol in `TerrainControls.tsx` + `HydrologyPanel.tsx` — **pending migration**
- Token exported as `mapboxToken` from `maplibre.ts` (name preserved for import compatibility)

## Current State
- **Data-derived Observe progress + soft Observe→Plan gate (2026-05-23)** —
  the Observe progress segments (`ObserveModuleBar` + header `LevelNavigator`
  carousel) are no longer decorative. A new **pure engine**
  `v3/observe/progress/objectives.ts` (`OBSERVE_OBJECTIVES` registry +
  `evaluateModule`/`evaluateObserve`, no React/store) evaluates each module's
  required + optional objectives as predicates over persisted store data;
  `useObserveProgress.ts` (raw subscriptions + one `useMemo`, selector-stability
  rule) feeds real `PillarTask[]` into the **existing** `taskColorFn`/`columnId`
  + `gateIndicators` rendering — so both surfaces light up with **zero rendering
  changes**. `V3LevelNavBridge` now emits real tasks + a gate diamond after
  `swot-synthesis`; `ObserveReadyCue` ticks from the same progress. A **soft**
  `StageGateOverlay` (mounted in `PlanLayout`) lists remaining required
  objectives with **"Continue anyway"** (persisted per-project in new
  `stageGateOverrideStore`) — navigation never hard-blocked. Required: one
  objective/module (boundary · built feature · hazard-or-sector · contour-or-marker
  · any earth-water-ecology obs · zone-or-patch · SWOT entry) + 1–3 optional each.
  Observe-only this round; Plan→Act gating is a follow-up. The manual
  `observeHowChecksStore` How-checks stay guidance-only. See
  [[2026-05-23-atlas-observe-data-derived-progress-gate]].
- **Vision Layout UX consolidation (2026-05-17)** — three Vision Layout
  (also `terrain3d`) Plan-canvas rough edges fixed, no behavior/layer
  deletion. `BaseMapCard` gained an optional `hiddenOverlays` prop (mount
  site declares its dead overlay keys; filter =
  `STAGE_HIDDEN[stage] ∪ hiddenOverlays`); `VisionLayoutCanvas` passes
  `VISION_DEAD_OVERLAYS=['sunPath','zoneRings']`. `zones`/`zoneRings`
  legend labels corrected (Z1–Z5). `CustomModelPalette` relocated from a
  floating bottom-right card into the left `PlanTools` rail (restyled as
  a rail `<section>`, gated `usePlanView() ∈ {vision,terrain3d}`).
  `InlineFeaturePopover` re-anchored top-right → bottom-right. See
  `decisions/2026-05-17-atlas-vision-layout-ux-consolidation.md`.
- **Seeded-zones overlay show/hide toggle (2026-05-17)** — generator-seeded
  ("ring-seed") `LandZone`s can now be hidden on the Plan map via a new
  `matrixTogglesStore.seededZones` toggle in the BaseMapCard "Overlays"
  legend (**defaults ON**, persist `version` 11→12, `migrate` `?? true`).
  Implemented with maplibre `setFilter` on the shared
  `plan-data-poly-fill`/`poly-line`/`label` layers
  (`coalesce(seedProvenance,'manual') != 'ring-seed'` when off — only
  ring-seed features ever dropped) + match-nothing on the seeded-only
  `poly-seed-line`; legend row stage-scoped to Plan. No deletion. See
  [[2026-05-17-atlas-seeded-zones-overlay-toggle]].
- **Full `syncService` coverage Phases 1–2 (2026-05-17)** — `lib/syncManifest.ts`
  is the single source of truth: every project-scoped `ogden-` persist store
  is classified (`typed-design-feature`/`typed-table`/`versioned-blob`) and a
  Vitest coverage guard fails the build on any unclassified store (closes the
  original P0-1 enumeration gap). A generic versioned-blob transport
  (`blobSync.ts`, `'state-blob'` queue type, `project_state_blobs` table +
  `routes/project-state/`, debounced subscription loop over all 62 blob
  stores) is wired but **default-off** behind `FLAGS.SYNC_STATE_BLOBS`.
  **Phase 4 (2026-05-17, same flag):** the read side is now complete —
  `hydrateProjectStateBlobs` (in `initialSync`, inside `isSyncing`) +
  `applyForProject` on all 62 descriptors (project-isolated) restores
  device B; version-skew guard skips newer blobs; `temporal()` undo
  cleared post-hydrate; 409 surfaces visibly (`connectivityStore
  .conflictedStores` badge + toast, no silent clobber). End-to-end
  functionally complete. **Phase 5 (2026-05-17, same flag):** the flag
  is now browser-functional — `vite.config.ts` `define:` was missing
  `FEATURE_SYNC_STATE_BLOBS` so it was permanently `false` in-browser
  (fixed + a text-level guard test); `OfflineBanner` gained a
  highest-priority dismissible conflict bar; `ProjectBundleBar` is
  flag-aware (calm "syncs to your account" when on, not deleted);
  `projectState.test.ts` pins cold-start + designer write-role. Single
  boolean (no per-store map); **Phase 3 typed tables (veg/succession)
  deferred**; 5.7 manual two-device A→B matrix is an operator action
  before enabling the flag for testers. `projectBundle.ts` remains the
  offline backup. See
  [Phase 1–2 ADR](../decisions/2026-05-17-atlas-syncservice-coverage-phase1-2.md),
  [Phase 4 ADR](../decisions/2026-05-17-atlas-syncservice-coverage-phase4.md),
  [Phase 5 ADR](../decisions/2026-05-17-atlas-syncservice-coverage-phase5.md).
  **Phase 3 (2026-05-17, same flag) — last deferred item closed:**
  `ogden-vegetation` + `ogden-act-succession` now have real Postgres
  tables (migration `028`, `id text`), shared Zod schemas (optional
  client-minted id — `machinery_items` idiom), `design-features`-shaped
  Fastify routes (owner-only delete), a dedicated client write-through
  (**client-supplied id, no serverId/no writeback** so vegetation's
  `temporal()` undo stays clean; failures enqueue typed
  `'vegetation'`/`'succession'` retry ops) and `hydrateTypedTables`
  device-B restore (server-wins per id, local-only pushed up, no
  cross-project clobber). Coverage guard pins both `typed-table` so the
  blob loop can never double-write them. Full plan now complete; only the
  5.7 manual matrix remains operational. See
  [Phase 3 ADR](../decisions/2026-05-17-atlas-syncservice-coverage-phase3.md).
  **syncManifest B-series backfill (2026-05-18):** the coverage guard was
  *failing on the branch* (a real bug, masked by a now-fixed vitest
  react-resolution issue) — four project-scoped stores added by B/A feature
  work were unregistered and would silently never sync. Classified all four
  `versioned-blob` from their actual data shape: `ogden-rotation-plan`,
  `ogden-compost-cycle`, `ogden-succession-path` (`byProject`) +
  `ogden-habitat-features` (`projectId-tagged`, `usesTemporal`, mirrors
  `ogden-soil-samples`). Incidental: worktree `vitest.config.ts` react
  alias moved to a `createRequire` resolver — the old hard-coded
  `../../node_modules/react` path doesn't exist in a worktree and was
  silently collapsing the whole suite to "0 tests" (the masking cause).
  Full suite **1162/1162, 99 files**, zero regressions. Main-tree
  `vitest.config.ts` still has the old path — upstream port recommended.
  See [B-series backfill ADR](../decisions/2026-05-18-atlas-syncmanifest-bseries-store-backfill.md).

  **syncManifest Stage-0/compass backfill (2026-05-25):** the coverage
  guard was *failing on the branch* again — seven more project-scoped
  stores accreted by True-North / Stage-Compass / objective-card work
  were unregistered and would silently never sync. Classified all seven
  `versioned-blob`/`byProject` from their actual shape:
  `ogden-observation-needs` (two byProject maps → custom `select`/`apply`),
  `ogden-true-north` (`profilesByProject`), `ogden-atlas-act-compass` /
  `-observe-compass` / `-plan-compass` (byProject; SEED is a read-time
  fallback, not persisted — syncing the overrides is correct),
  `ogden-atlas-objective-summaries` (nested `byStage→byProject` → custom
  shape spanning all stages), and `ogden-atlas-stage-gate-override`
  (byProject). Guard back to **10/10**, `tsc --noEmit` exit 0. Commit
  `23490e0b`. See [[log/2026-05-25-syncmanifest-stage0-compass-backfill]].
  **Dev-observability follow-up (2026-05-25, `05096b06`):** the prior
  "known issue" — `initialSync` 401s for non-UUID demo projects like
  `mtc` — was inaccurate. The client never sends a non-UUID id:
  `enqueueVersionedBlob` (`syncService.ts:1216`) **silently returns**
  when the active project has no `serverId`, so `mtc` is skipped before
  any request; `mtc` is also a **builtin** (RBAC viewer-only → blob PUT
  rejected even with a UUID); and the whole loop is **default-off**
  behind `FLAGS.SYNC_STATE_BLOBS`. No server/DB/RBAC/validation change —
  the no-`serverId` skip now emits a **dev-only, de-duped** `console.info`
  so a tester sees *why* nothing syncs and reaches for a created/owned
  project. Enable the loop in dev with
  `$env:FEATURE_SYNC_STATE_BLOBS='true'; npm run dev`. Round-trip proof:
  `syncManifestRoundTrip.test.ts` 76/76 (auto-covers the 7 stores). See
  [[log/2026-05-25-versioned-blob-skip-dev-observability]].
  **Ramp Stage 1 — real-Postgres validation (2026-05-25, `e6b48857`):** the
  first run of `blobSync.integration` (A/B/C) against a live DB caught **two
  latent `/project-state` route bugs invisible to the FIFO mock**, both of
  which would hit every user on flag-flip. (1) `rev` (`BIGINT`) returns from
  postgres.js as a **string** → `ProjectStateBlob.parse` (`z.number`) threw
  → **422 on every successful PUT**; coerced in `parseRow`. (2) the PUT
  pre-stringified then cast `::jsonb`, **double-encoding** the payload into a
  jsonb string scalar; the client does no `JSON.parse`, so hydration would
  load stores with a string — fixed with `${db.json(...)}::jsonb`. The flag
  was thus **not flip-ready** before `e6b48857`; the Stage 2 operator matrix
  must run on a build that includes it. See
  [[log/2026-05-25-blobsync-stage1-validation-two-latent-bugs]].
  **Ramp Stage 2 — operator A–E matrix, best-effort auto-drive (2026-05-25):**
  drove §5.7 **A/B/C/E** through a live, genuinely flag-on browser build on an
  `e6b48857`-inclusive build (migrated `postgis:16-3.4` on 5433 + API + preview
  5205) — **all four PASS**. A: store edit → debounced subscribe → PUT 200 →
  physical `jsonb_typeof=object` rows. B: clean local + reload hydrates all
  slices. C: genuine cross-device 409 via out-of-band write → Connectivity chip
  + toast, local not clobbered, recovery bumps rev. E: relabel + Export/Import
  intact (~332KB bundle). **D-skew + the genuine two-physical-device sign-off
  remain the operator's.** Central fix: the `.claude/launch.json` `web-sync`
  entry's `set "VAR=true" &&` form dropped the env var under the preview
  launcher's `cmd /c` spawn (inner quotes) → build came up flag-off; corrected
  to quote-free `set VAR=true&& …`. **Stages 3 (soak) + 4 (flip) remain gated;**
  `flags.ts`/`vite.config.ts` untouched. See
  [[log/2026-05-25-blobsync-stage2-operator-matrix-autodrive]].
- **Backend acreage integrity / Full hardening (2026-05-17)** — closes the
  *online* hole the P0 guard deferred. New pure shared
  `lib/geojsonGeometry.ts` `extractPolygonalGeometry` normalizes the client's
  GeoJSON **FeatureCollection** to a bare Polygon/MultiPolygon before PostGIS
  `ST_GeomFromGeoJSON` (which rejects FeatureCollections → NULL → acreage 0);
  used by both `projects` `/boundary` and `templates` `/instantiate` (4xx /
  skip-UPDATE on nothing — never write a confident 0). `project.schema.ts`
  `parcelBoundaryGeojson` tightened from `z.unknown()` to a shape-only
  GeoJSON union. `syncService.applyServerAcreage` guard hardened to reject
  `acreage <= 0` so a server 0 can never clobber the canonical client
  geodesic acreage. See
  [ADR](../decisions/2026-05-17-atlas-backend-acreage-hardening.md).
- **Parcel-area integrity guard (2026-05-16)** — a project with
  missing/zero parcel area can no longer present as "0 ha · Supported".
  `v3/data/parcelIntegrity.ts` is the single integrity-decision module;
  `adaptLocalProject.ts` is the sole guard seam (`!isParcelAreaValid` ⇒
  explicit `INSUFFICIENT_DATA_VERDICT` + `INTEGRITY_BLOCKER`, bypassing
  `adaptVerdict`/`VERDICT_TABLE`); `ProjectLocation.areaKnown?` added; all
  5 area-display surfaces share `formatLocationArea`. Water balance no
  longer silently reads `0.0 m³` from an unset catchment area — Network /
  Catchments cards gate the aggregate on `incompleteCatchments(...)`,
  pre-fill surface-aware non-zero defaults, and offer ground-only
  one-click parcel-area (`lib/geo.ts` `parcelAreaM2`). See
  [`2026-05-16-atlas-parcel-integrity-guard.md`](../decisions/2026-05-16-atlas-parcel-integrity-guard.md).
  Deferred: backend `ST_GeomFromGeoJSON(FeatureCollection)`→0 +
  `applyServerAcreage` overwrite (online-only).
- Map + drawing tools: **production-ready** (MapTiler tiles + geocoding live)
- Dashboard: 14 pages, mixed live/demo data
- Financial engine: **working** (client-side, ~8 sub-engines)
- Branch coverage (`computeScores.ts`): **84.61%** (138 tests passing, target >80% met 2026-04-12)
- All stores: **localStorage-only** (no backend sync — `serverId` field prepared but unused)
- Auth guard: **commented out** for dev convenience
- **Atlas v3.0 lifecycle shell** (parallel route tree, 2026-04-28) — all 7
  stages live under `/v3/project/:id/{home,discover,diagnose,design,prove,build,operate,report}`.
  Mock-only via [`useV3Project`](../../apps/web/src/v3/data/useV3Project.ts).
  No MapboxGL imports anywhere in v3. v2 `/project/$projectId` workspace
  remains mounted; cutover deferred to v3.1. See decision record
  [`2026-04-28-atlas-v3-mock-first-lifecycle-shell.md`](../decisions/2026-04-28-atlas-v3-mock-first-lifecycle-shell.md)
  and backlog [`apps/web/src/v3/BACKLOG-v3.1.md`](../../apps/web/src/v3/BACKLOG-v3.1.md).

  **Stage right-rail ownership (2026-05-07):** `LandOsShell.rail` is now
  optional. Design / Prove / Operate (`SELF_RAILED_STAGES`) own their right rail
  by passing a stage-specific component to `StageShell.rightRail`; the
  outer `LandOsShell` rail track is omitted entirely for those stages.
  `V3ProjectLayout` passes `rail={undefined}` for self-railed stages;
  `DecisionRail` short-circuits on them as a belt-and-suspenders guard.

  **DiagnoseMap crash-fix pattern (2026-05-07):** `DiagnoseMap` calls
  `setMap(null); m.remove()` in cleanup. `m.remove()` destroys `map.style`
  synchronously, but React fires children's old cleanup effects afterward
  with a stale map reference — any MapLibre API call inside those cleanups
  throws. All components rendered inside `DiagnoseMap` that attach cleanup
  effects calling MapLibre APIs must wrap those calls in
  `try { … } catch { /* map already removed */ }`.
  Fixed components: `ObserveAnnotationLayers` (commit `4da754f`),
  `AnnotationDragHandler` (commit `88b6556`). `AnnotationVertexEditHandler`
  was already guarded. See [[2026-05-07-atlas-crash-fix-rail-refactor-data-improvements]].

  **Slide-up `topBar` slot (2026-05-15):** the shared
  `_shared/moduleNav/ModuleSlideUp` exposes an optional
  `topBar?: ReactNode` rendered as the first sheet child (above
  `<header>`). Plan feeds the *same stateless `PlanModuleBar` element*
  into both `StageShell.bottomTray` (closed) and the slide-up `topBar`
  (open) so the module navigator stays reachable while a module page is
  open. Additive/backward-compatible — Act/Observe omit `topBar`. Plan
  map view also now opens on Vision Layout (`PLAN_VIEWS` =
  `['vision','current','terrain3d']`). See
  [[2026-05-15-atlas-plan-modulebar-in-slideup-and-view-order]].

  **New-project wizard → v3 cutover + adapter-seam location
  (2026-05-16):** the wizard's "Create Project" now redirects to
  `/v3/project/$projectId/observe` (was legacy `/project/$projectId`).
  This is a *wizard-level* cutover only — the v2 workspace stays
  mounted and URL-routable (nuances the "cutover deferred to v3.1"
  line above; only the post-create destination moved, nothing
  deleted). Location now propagates through the **single v2→v3
  adapter seam**: `ProjectLocation` carries `center?: [number, number]`
  (`[lng, lat]`; precedence `boundary → center → fallback`),
  `adaptLocalProject.metadataCenter()` derives it from
  `metadata.centerLng/centerLat`, and Observe/Plan(×3 sinks)/Act read
  `v3Project?.location.center ?? FALLBACK_CENTROID` into `DiagnoseMap`.
  Layouts must **not** re-read `LocalProject.metadata` directly — the
  adapter is the typed contract. Closes the
  [[2026-04-27-project-intake-map-centering]] deferred item. See
  [[2026-05-16-atlas-wizard-v3-bridge-location-propagation]].

  **Act §5.2 Plan-Execution Tracker — new `tracker` module
  (2026-05-16):** the v3 Act taxonomy (`v3/act/types.ts` `ACT_MODULES`)
  gained a module `'tracker'` ordered **first** — the §5.2 interactive
  task ledger over `phaseStore`. `PhaseTask` gained additive optional
  `done?`/`doneAt?` and `phaseStore` a `toggleTaskDone(phaseId,
  taskId)` action (no persist version bump — mirrors the
  `isMaintenanceTask?` precedent; deliberately does **not** set
  `status:'overridden'` so a checked box doesn't freeze the row against
  Goal-Compass regeneration). New card
  `features/act/PlanExecutionTrackerCard.tsx` (phase-ordered incl.
  synthetic regen `order 1` / maintenance `order 99`, overall + per-
  phase progress %, overdue vs `scheduledStart`, optional by-
  designLayer pivot). **Forward guardrail:** the Act-module set now has
  two hand-synced sources of truth — `ActModule` (UI) and `ActModuleId`
  (`@ogden/shared` telemetry); adding an Act module requires editing
  **both** or tsc fails at the telemetry call sites. See
  [[2026-05-16-atlas-act-plan-execution-tracker]].

  **Command Centre shell bounding (2026-05-25):** the shared stage-agnostic
  `CommandCentreShell` (`v3/command/shell/`, used by Observe/Plan/Act) clipped
  its bottom "Open Work Items" tray — but only on Act's **All Modules /
  Tracker** tabs. Root `.shell` grid (`auto minmax(0,1fr) auto`) is the sole
  direct child of AppShell's `.main` (`flex:1; position:relative;
  overflow:hidden`). Two `.shell` facts combined: (1) `height:100%` didn't
  reliably bound the grid → auto-height → the `1fr` body row stretched to the
  **tallest column** (Act's tall right ops rail) and pushed the `auto` tray
  below the viewport where `.main{overflow:hidden}` clipped it (worst on the
  tallest-rail tabs; the carousel is horizontal so item count widens, not
  heightens); (2) no explicit grid **column** → implicit `auto` column grew to
  the widest row's max-content, blowing the body out (~9710px) and shoving the
  rail off-screen. **CSS-only fix in `.shell`:** `height:100%` →
  `position:absolute; inset:0` (definite height; grid clamps, sidebar/rail
  scroll internally, tray always visible) + add
  `grid-template-columns: minmax(0,1fr)`. One sheet fixes all three stages;
  covenant-clean (no JSX/store/schema). Commit `2368e687`; ADR
  [[2026-05-25-atlas-command-centre-shell-bounding]]; log
  [[log/2026-05-25-command-centre-shell-bounding]]. Continues the prior
  Observe-shell grid-track fix [[log/2026-05-25-command-centre-tray-and-waterrouter-fixes]].

  **D0 — the operating-loop WorkItem spine (2026-05-18):** a new
  canonical store `store/workItemStore.ts` (`ogden-work-items`,
  projectId-tagged, `versioned-blob` sync class — no DB migration)
  supersedes the five legacy planned-work stores (`phaseStore`
  `PhaseTask`, `fieldTaskStore`, `maintenanceStore`,
  `scheduledLivestockMoveStore`, `nurseryStore` `PropagationBatch`).
  Schema is `@ogden/shared` `workItem.schema.ts` (union superset,
  `.passthrough()`). `workItemStore.migration.ts` is the idempotent
  one-time supersede; legacy stores **retained, write-dead** for
  rollback (no-deletion covenant). Goal Compass emits `WorkItem[]` via
  `v3/plan/engine/goalCompass/goalCompassSpineSync.ts` with the
  generated-vs-overridden contract re-implemented byte-for-byte; nursery
  `replacePlantingCalendarBatches` wholesale-regen contract ported.
  Append-only event-logs keep their own stores, gaining an additive
  `workItemId?` proof-link. `PlanExecutionTrackerCard.tsx` is the D0
  proof surface — now grouped by phaseStore phases with a synthetic
  `Operations (unphased)` bucket for `phaseId==null` rows; done-toggle
  routes through `workItemStore.toggleDone`. Re-pointed readers
  (clean cut-overs): `useEventAggregator.ts`, `v3/act/ops/
  TodaysPriorities.tsx`. See [[2026-05-18-atlas-d0-workitem-spine]].

  **D0.1 — coupled reader/writer cut-overs + `seedSaving` carry
  (2026-05-18):** the deferred deep CRUD surfaces now read **and write**
  the spine. `seedSaving` added to `workItem.schema.ts` +
  `propagationBatchToWorkItem` (closes D0's 2nd lossy gap; migration
  test asserts it). Pattern: **project spine `WorkItem`s back into the
  legacy row shape the render block expects** so display is
  byte-unchanged, and writers redirect to `workItemStore` actions
  mirroring the migration mappers exactly (fidelity by construction).
  Cut over: `MaintenanceScheduleCard` (CRUD → `addItem`/`deleteItem`/
  `setStatus`), `NurseryLedgerDashboard` (reader; `nursery-batch`
  projection; `StockTransfer` stays on `nurseryStore` — not migrated),
  `RotationScheduleCard` (`scheduled-livestock-move` plans → spine via
  `planToWorkItem`/`workItemToPlan`; the actual-move event log stays on
  `livestockMoveLogStore`; auto-fulfilment sets WorkItem `done` + stamps
  the event `workItemId`), `PhasingScaleMatrixCard` (per-phase task
  pivot off WorkItems where `phaseId!=null`; `BuildPhase` stays the
  container). `PhasingDashboard` needed **no change** — it rolls up off
  built-environment `structures`, never `phase.tasks` (verified, not
  assumed). One deferred seam: the structure-plan **Edit** button in
  `RotationScheduleCard` still calls `startScheduledLivestockMove`
  (`ActStructurePopover.actions`) which writes the legacy store — that
  action is its own out-of-scope cut-over. Legacy stores remain
  retained/write-dead. See [[2026-05-18-atlas-d0-1-coupled-cutovers]].

  **D1 — dependency / critical-path engine (2026-05-18):** a new pure
  engine `packages/shared/src/lib/workItemGraph.ts` (no React/store,
  exported from `@ogden/shared`) computes the effective dependency DAG,
  CPM critical path, and derived blocked-state over spine `WorkItem`s:
  `effectiveDependencies` (union `dependsOn ∪ dependsOnAuto`),
  `detectCycle` (self-edge = cycle; the editor's pre-write guard),
  `itemDuration` ladder (scheduled span → `laborHrs/8` → 0 milestone),
  `analyzeWorkItemGraph` (Kahn topo + forward/backward CPM; `slack===0`
  ⇒ critical; cyclic ⇒ `cyclic:true` + CPM zeros, no loop; blocked
  computed independently so it survives cycles; dangling ids ignored).
  Schema gains additive `dependsOnAuto` (`.default([])` —
  no DB migration): `dependsOn`=manual/steward, `dependsOnAuto`=
  Goal-Compass-seeded, effective DAG=union (provenance Approach B).
  `workItemStore.replaceGoalCompassDependencies` mirrors
  `replaceGoalCompassRows` preservation 1:1 (only `goal-compass &&
  !overridden`; idempotent). `v3/plan/engine/goalCompass/
  goalCompassSpineSync.ts` gains pure `seedGoalCompassDependencies`
  (maps `Intervention.prerequisites[]` → prereq WorkItem ids via
  `generatedFromInterventionId`), called after `replaceGoalCompassRows`
  (acyclic by construction). `PlanExecutionTrackerCard.tsx` extended in
  place: Critical/Blocked/Slack read-only row badges (both group
  modes), a per-row dependency editor (manual removable, auto
  read-only, cycle/self-edge refused inline), and a third `timeline`
  view toggle (CSS/SVG Gantt — bars earliest→finish, milestone
  diamonds, critical highlight, dependency lines, cyclic banner).
  Blocked/critical are derived at render only — **never** written to
  `WorkItem.status` (D0.1 single-writer discipline). Strictly
  project-operational (no D2–D5; no covenant-excluded framing;
  `BudgetActualsCard` untouched). See
  [[2026-05-18-atlas-d1-dependency-critical-path]].

  **D2 — operational resourcing (2026-05-18):** crew/equipment/materials
  surfaced on the spine. Net-new `@ogden/shared`
  `crewMember.schema.ts` (skill enum + soft `weeklyHoursCap`; optional
  non-coupled `networkContactId`) + projectId-tagged `crewMemberStore`
  (`ogden-crew-members`, no DB migration, `syncManifest`-registered) —
  distinct from `ProjectMemberRecord`/`NetworkContact`, fully
  steward-authored (no Goal-Compass contract). Spine schema gains
  additive `materialsAuto`/`equipmentRequiredAuto` `.default([])`
  (no migration; `MaterialLine`/`MaterialLineSchema` exported) —
  Approach B exactly like D1's `dependsOnAuto`.
  `workItemStore.replaceGoalCompassResources` mirrors
  `replaceGoalCompassDependencies` 1:1 (only `goal-compass &&
  !overridden`; manual/overridden/other-project untouched; idempotent
  same-reference). Pure `seedGoalCompassResources` (in
  `goalCompassSpineSync`, after `replaceGoalCompassDependencies`) merges
  intervention `materials` + `maintenanceSchedule.materialsPerOccurrence`
  (label+unit deduped) + declared equipment → effective `*Auto`. New
  pure engine `packages/shared/src/lib/resourcingConflicts.ts` (no
  React/store): `effectiveEquipment`, `rollUpBom`,
  `equipmentConflicts` (per-equipment pairwise span overlap, strict
  `<`, missing-date skip), `assigneeWeeklyLoad` (ISO-week buckets vs
  soft cap), `analyzeResourcing`→`{equipment,workload,byItemId}` —
  hours only, derived only, never mutates `WorkItem.status`. New
  `features/act/ResourcingCard.tsx` + manifest entry `act-resourcing`
  under the `tracker` module (`v3/act/types.ts` + lazy import +
  `renderActCard` in `ActModuleSlideUp.tsx`): crew CRUD, assignee
  workload, equipment booking, BOM rollup, render-only conflict badges
  — **no cost column**, subtitle points budget to D3. Strictly
  operational (no D3 cost / `BudgetActualsCard` untouched; no D4/D5;
  no covenant-excluded framing; no spine-status mutation; no DB
  migration). See [[2026-05-18-atlas-d2-resourcing]].

## Performance (Sprint BJ — 2026-04-20)
- `lib/debounce.ts` — 15-line debounce helper (no lodash)
- `lib/perfProfiler.tsx` — dev-only `<SectionProfiler>` around React's `<Profiler>`; logs renders over 16 ms; tree-shaken in prod via `import.meta.env.DEV`
- `SiteIntelligencePanel` wrapped in `React.memo` + 4 pure sub-components (`AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle`) memoized
- Module-level `EMPTY_LAYERS` constant stabilizes the layers fallback identity
- `ProjectPage.tsx` boundary-change effect debounced at 400 ms; unmount aborts any in-flight fetch
- `siteDataStore` has a per-project `AbortController` registry + exported `abortFetchForProject(id)`; `fetchAllLayers` now accepts an `AbortSignal` via `FetchLayerOptions` and races its `Promise.allSettled` against it (in-flight HTTP continues silently; store discards via `aborted: true` sentinel)

## Sub-Component Extraction (Sprints BK + BL + BM + BN + BO + BP — 2026-04-20)
- `components/panels/sections/` — directory hosting extracted, memo-wrapped sections:
  - `_shared.tsx` — `AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle` (Sprint BJ memo'd leaves relocated here)
  - `_helpers.ts` — pure helpers (`severityColor`, `capConf`, `getScoreColor`, `getHydroColor`, `getSoilPhColor`, `getCompactionColor`, `formatComponentName`)
  - `ScoresAndFlagsSection.tsx` (BK) — blocking flags, overall suitability card, Tier 3 status, Live Data panel
  - `CropMatchingSection.tsx` (BK) — FAO EcoCrop match list with category filter pills + expandable breakdowns + companion pairs
  - `RegulatoryHeritageSection.tsx` (BK) — Sprint BC/BF/BH regulatory rollup (easements, heritage, ALR, EA triggers, setbacks, mineral/water rights, ag use-value, EcoGifts)
  - `HydrologyIntelligenceSection.tsx` (BK) — Sprint F hydrology card + Sprint J wind + Sprint K solar rows
  - `GroundwaterSection.tsx` (BL) — Sprint M depth-to-water card (USGS NWIS / Ontario PGMN)
  - `WaterQualitySection.tsx` (BL) — Sprint M water quality (pH, DO, nitrate, turbidity)
  - `SoilIntelligenceSection.tsx` (BL) — Sprint G soil rollup (pH, OM, CEC, texture, bulk density, ksat, CaCO3, coarse fragments, rooting depth, carbon stock, WRB)
  - `DesignIntelligenceSection.tsx` (BL) — 10-subsystem design rollup: passive solar, windbreak, water harvesting (swales + ponds), septic, shadow modeling, RWH sizing, pond volume, fire risk zoning, footprint optimization, compost siting
  - `InfrastructureAccessSection.tsx` (BM) — Sprint K/L/W access distances (hospital, masjid, market, grid, road, water, farmers-market, town, WDPA protected area)
  - `EnvironmentalRiskSection.tsx` (BM) — Sprint BG air/earthquake + Sprint BI Superfund / UST / LUST / brownfields / landfills / mine-hazard / FUDS rollup (8 hazard subsystems, 10 props, internal `hasAny` short-circuit)
  - `EcosystemServicesSection.tsx` (BM) — Sprint BE Cat 7 ecosystem valuation (de Groot 2012) + wetland function classification. Non-toggleable.
  - `ClimateProjectionsSection.tsx` (BM) — Sprint BE Cat 5 IPCC AR6 mid-century projections (SSP2-4.5 + SSP5-8.5). Non-toggleable.
  - `HydrologyExtensionsSection.tsx` (BN) — Sprint BD Cat 4 aquifer (USGS Principal Aquifer) + water stress (WRI Aqueduct 4.0) + seasonal flooding (USGS NWIS monthly stream stats). Non-toggleable.
  - `EnergyIntelligenceSection.tsx` (BN) — Sprint BD Cat 9 geothermal (GSHP) + solar-battery storage rollup. Non-toggleable.
  - `SiteSummaryNarrativeSection.tsx` (BN) — consolidated Site Summary paragraph + "What This Land Wants" card + Design Recommendations AI multi-card + AI loading spinner. Switches between AI narrative (with confidence badge) and deterministic fallback per sub-block.
  - `AssessmentScoresSection.tsx` (BN) — 7-axis assessment-score list with per-score expandable sub-component breakdown (sub-bars, source-layer chips, per-component confidence badges, computed timestamp). Expansion state owned by parent via `expandedScore` + `onToggleExpandedScore` useCallback.
  - `FuzzyFaoSection.tsx` (BO) — Sprint BF Cat 1a Zadeh 1965 / ALUES fuzzy membership — defuzzified class + aggregate bars across S1/S2/S3/N1/N2. Typed via `FuzzyFAOResult`.
  - `AhpWeightsSection.tsx` (BO) — Sprint BF Cat 1b Saaty 1980 AHP weights (8 priorities) + consistency-ratio row. Always renders. Typed via `AhpResult`.
  - `RegionalSpeciesSection.tsx` (BO) — Sprint BF Cat 6b+6c regional invasive + pollinator-friendly native species (ISSG / regional floras).
  - `CanopyStructureSection.tsx` (BO) — Sprint BF Cat 7 biome-modelled canopy-height estimate. Typed via `CanopyHeightResult`.
  - `LandUseHistorySection.tsx` (BO) — Sprint BF Cat 8 NLCD 2001-2021 multi-epoch rollup (epochs, top transitions, disturbance flags + buildability penalty chip).
  - `OpportunitiesSection.tsx` (BO) — Main Opportunities list with show-all toggle + per-flag AI narrative enrichment. Flag shape: `AssessmentFlag` from `@ogden/shared`. Parent adds `onToggleShowAllOpps` useCallback.
  - `ConstraintsSection.tsx` (BO) — Key Constraints list, symmetric with Opportunities. Critical-severity icon/badge branching kept inside. Parent adds `onToggleShowAllRisks` useCallback.
  - `DataLayersSection.tsx` (BO) — final per-layer label/value/confidence rollup at panel footer. Typed via `DataLayerRow[]`.
  - `SiteContextSection.tsx` (BP) — composite toggleable aggregating 5 optional sub-metrics (Sprints O/P/BB): Crop Validation (USDA NASS CDL), Biodiversity + IUCN Habitat (GBIF), SoilGrids (ISRIC 250m), Critical Habitat (USFWS ESA), Storm Events (FEMA). Structural composite prop shape (5 sub-metric interfaces inline) + `siteContextOpen` + `onToggleSiteContext`. Outer `hasAny` short-circuit lives inside the section.
  - `CommunitySection.tsx` (BP) — Sprint V US Census ACS demographics card (rural class, pop. density, median income, median age). Toggleable via `communityOpen` + `onToggleCommunity`. Structural `DemographicsMetrics` interface inline.
  - `GaezSection.tsx` (BP) — Sprint BI FAO GAEZ v4 5-arc-min agro-climatic suitability (best crop + management, primary suitability class, attainable yield, top-3 crops). Non-toggleable; covers both `enabled` and `!enabled` branches. Structural `GaezMetrics` + `GaezTop3Crop` interfaces inline.
- Pattern: each section is `memo(function X(props) { ... })` wrapped in `<SectionProfiler id="site-intel-{slug}">`, receives state via props (no store subscription inside), exports its own prop interfaces. Toggle handlers `useCallback`-wrapped in parent for stable prop identity. Type strategy: for anonymous `useMemo` parent metrics, declare structural `interface` inline in the section; for lib-level computations with exported result types, `import type`. Non-toggleable sections (Ecosystem, Climate, Hydrology Ext, Energy, Site Summary cluster, all 5 Sprint BO mid-cards, Data Layers, GAEZ) skip the open-state + useCallback overhead entirely.
- `SiteIntelligencePanel.tsx` reduced 4086 → ~1492 lines (−2594 net, **~63%**, across BK+BL+BM+BN+BO+BP). 25 sections now live under `sections/`. Remaining panel body is pure orchestration + `useMemo` layer-metric declarations (~500-1210). Further reduction would require relocating those `useMemo`s to a custom hook (`useSiteIntelligenceMetrics(layers)`) — **executed in Sprint BQ**.

## Hook Consolidation + CSS Migration (Sprint BQ — 2026-04-20)
- `hooks/useSiteIntelligenceMetrics.ts` — new custom hook (`useSiteIntelligenceMetrics(layers, project)`) consolidates 37 layer-reading metric `useMemo`s into a single memoized block. Each original metric is preserved verbatim inside an IIFE; the hook returns a keyed object (`hydroMetrics`, `infraMetrics`, `soilMetrics`, `groundwaterMetrics`, `waterQualityMetrics`, `superfundMetrics`, `criticalHabitatMetrics`, `biodiversityMetrics`, `soilGridsMetrics`, `ustLustMetrics`, `brownfieldMetrics`, `landfillMetrics`, `mineHazardMetrics`, `fudsMetrics`, `easementMetrics`, `heritageMetrics`, `alrMetrics`, `aquiferMetrics`, `waterStressMetrics`, `seasonalFloodingMetrics`, `stormMetrics`, `cropValidationMetrics`, `airQualityMetrics`, `earthquakeMetrics`, `demographicsMetrics`, `proximityMetrics`, `fuzzyFao`, `speciesIntelligence`, `canopyHeight`, `landUseHistoryMetrics`, `mineralRightsMetrics`, `waterRightsMetrics`, `agUseValueMetrics`, `ecoGiftsMetrics`, `windEnergy`, `solarPV`, `gaezMetrics`). Return type exported as `SiteIntelligenceMetrics = ReturnType<typeof useSiteIntelligenceMetrics>`. Dependency array keyed on `[layers, project.acreage, project.country, project.provinceState, project.parcelBoundaryGeojson]` — union of all original individual-memo deps.
- `SiteIntelligencePanel.tsx` consumes the hook via destructuring so every remaining reference (`hydroMetrics`, `heritageMetrics`, etc.) resolves to the same identifier as before (zero consumer edits required). Imports `computeHydrologyMetrics` / `computeWindEnergy` / `parseHydrologicGroup` / `HYDRO_DEFAULTS` / `HydroMetrics` / `WindEnergyResult` / `estimateCanopyHeight` / `computeFuzzyFAOMembership` / `classifyAgUseValue` / `fmtGal` / `findCompanions` relocated out of the panel into the hook.
- `SiteIntelligencePanel.tsx` cumulative: 4086 → **827 lines (−3259, ~80%)**. `useMemo` count 62 → 28. Non-metric `useMemo`s that stay (consume hook output + project geometry): `designIntelligence`, `energyIntelligence`, `climateProjections`, `ecosystemIntelligence`, `eiaTriggers`, `typicalSetbacks`, `cropMatches`, `companionCache`, `ahpResult`, plus the pre-BJ computed-scores reducers (`assessmentScores`, `overallScore`, `topOpportunities`, `topConstraints`, `siteSummary`, `landWants`, `dataLayerRows`, `liveData`, `layerCompleteness`, `tier3Status`, `blockingFlags`, `lastFetched`).
- `styles/panel.module.css` — added 10 utility classes for the inline-style migration: `.rightAlign`, `.flexBetween`, `.itemLabel`, `.detailText`, `.borderBottomNone`, `.fs11`, `.innerPad`, `.cursorDefault`, `.colStretchPad`, `.separatorThin`. The last 4 were added during a second pass after `Counter`-ranking the remaining inline-style patterns.
- Inline-style migration across 22 of 27 section files: **378 → 198 `style={{…}}` objects (−180, ~48% reduction)**. Biggest reducers: `DesignIntelligenceSection` 65→27, `RegulatoryHeritageSection` 46→22, `SoilIntelligenceSection` 18→7, `HydrologyIntelligenceSection` 18→9, `SiteContextSection` 15→7, `CommunitySection` 10→4, `GroundwaterSection` 9→5. Remaining inline styles are legitimately dynamic — score-badge `background`/`color` runtime interpolation from `confidence.high/medium/low`, `semantic.sidebarActive`/`sidebarIcon` JS-token colors (not CSS vars in this codebase), computed widths, runtime grid templates.
- Verification: `npx tsc --noEmit` clean after each phase, `npm run build` succeeds (22.02 s). Behavioral semantics preserved (hook `useMemo` trigger set = union of original 37 individual `useMemo`s' triggers). Deferred: `useSiteIntelligenceMetrics.test.ts` fixture snapshot (optional, metrics are verbatim copies); `semantic.*` → CSS-variable migration in `tokens.css` (would unlock ~30 more inline-style removals but requires token-system refactor, separate sprint).

## GAEZ Scenario Plumbing (Sprint CD — 2026-04-21)
- `features/map/GaezOverlay.tsx` — `rasterUrl()` now emits `/api/v1/gaez/raster/baseline_1981_2010/:crop/:waterSupply/:inputLevel/:variable` (path segment added to match the backend Sprint CD route shape). No other UI changes. The hardcoded scenario carries a `TODO(sprint-cd+2)` marker in source.
- **Deferred to Sprint CD+2 (after RCP rasters land in CD+1):** scenario picker in `<GaezMapControls>`, scenario line in the hover readout tooltip, and baseline-vs-future suitability/yield delta in `SiteIntelligencePanel`'s `GaezSection`.

## GAEZ Overlay Hardening (Sprint CC — 2026-04-21)
- Three polish/hardening items on top of the Sprint CB overlay foundation, all landing in the same files CB touched.
- **Hover readout (`GaezOverlay.tsx`):** on every successful decode, a `rasterStateRef` captures `{band, width, height, originX, originY, xRes, yRes, noData, variable, maxYield, selection}` atomically. A separate `mousemove`/`mouseleave` effect on the MapLibre map reads the pixel under the cursor — `px = floor((lng - originX) / xRes); py = floor((lat - originY) / yRes)` — and sets a small fixed-position tooltip (`rgba(26,22,17,0.95)` background, border tinted by the pixel's class color in suitability mode or ramp color in yield mode). rAF-gated so 60Hz mousemove can't saturate. Tooltip text: `crop water input · S2` (suitability mode) or `crop water input · 5,400 kg/ha` (yield mode). No extra network calls — reads the already-decoded band.
- **Yield-gradient mode (`gaezColor.ts` + `GaezOverlay.tsx` + `mapStore.ts`):** `GaezSelection` grows a `variable: 'suitability' | 'yield'` field (new `GaezVariable` type). `gaezColor.ts` gains `yieldToRgba(value, maxYield)` — a 5-stop viridis-ish ramp (deep purple → blue → teal → green → yellow) with linear interp, plus `YIELD_GRADIENT_CSS` for the legend strip. The decode effect branches on `selection.variable`: suitability path unchanged; yield path computes `maxYield` via a ~10k-sample 99th-percentile (sparse-tile fallback = max), then paints with `yieldToRgba`. `maxYield` is published to `useMapStore.gaezMaxYield` so the Legend can render "~N kg/ha". `rasterUrl()` now uses `selection.variable` (was hardcoded to `'suitability'` in CB).
- **Class/Yield toggle:** new `<ModeToggle>` segmented button in `<GaezMapControls>` flips `selection.variable`. Legend swaps from the 5 discrete `SUITABILITY_SWATCHES` rows to a continuous gradient strip with `0` / `~N kg/ha` labels.
- **JWT auth on `/raster/*` (client side):** `GaezOverlay` + `GaezMapControls` both read `useAuthStore((s) => s.token)` and pass it as `Authorization: Bearer ...` to the `fetch('/catalog')` call and to `geotiff.js fromUrl(url, { headers })`. `RemoteSourceOptions.headers` is confirmed to forward to geotiff's internal fetch (`node_modules/geotiff/dist-module/source/remote.d.ts`). Unauthenticated catalog fetches surface as the existing "Catalog failed: …" error string — no new auth-prompt UI.
- **Backend mirror (Sprint CC Phase A):** `apps/api/src/routes/gaez/index.ts` adds `preHandler: [fastify.authenticate]` to `/raster/*` only; `/catalog` + `/query` stay public. 3 new tests in `gaezRoutes.test.ts` (401 no header / 401 malformed / 200 valid JWT); all existing raster happy-path tests gained a helper `authHeader()`. Suite 368 → 371 green.
- **Deferred (Sprint CD+):** RCP future-scenario ingest (own plan), Web Worker decode offload, per-zoom tiers, side-by-side crop compare, touch-device hover, per-crop calibrated yield ceilings, rate-limiting on `/raster/*`. The FAO NC-license business decision itself stays on `wiki/LAUNCH-CHECKLIST.md` — auth gate is defense-in-depth, not a license fix.

## Map-Side GAEZ Suitability Overlay (Sprint CB — 2026-04-21)
- First map-side raster overlay in Atlas. Added `features/map/GaezOverlay.tsx` (both `<GaezOverlay>` + `<GaezMapControls>` co-located because they share `gaezSelection`) and `features/map/gaezColor.ts` (pure `suitabilityToRgba()` palette derived from `tokens.ts confidence.high/medium/low` + a WATER blue). Mounted in `features/map/MapView.tsx` inside the `MapCanvas` ErrorBoundary sibling.
- **Render path:** MapLibre `type: 'canvas'` source covering `[[-180,90],[180,90],[180,-90],[-180,-90]]`. On selection change, `geotiff.js fromUrl()` fetches the COG via `/api/v1/gaez/raster/:crop/:waterSupply/:inputLevel/suitability` (HTTP Range), decodes the whole-world 4320×2160 band, paints it into an offscreen canvas, and calls `src.play(); src.pause()` — the standard MapLibre trick to force the canvas source to re-read pixels. Fallback on older source shapes re-sets `coordinates`.
- **Z-order:** inserted with `beforeId = getFirstSymbolLayer(map)` so symbols (labels) render above the raster; parcel fills added later by `MapCanvas` sit above it naturally.
- **Picker:** floating top-right panel. Fetches `/api/v1/gaez/catalog` once on first enable, seeds canonical default `maize / rainfed / high` (falls back to `catalog[0]` if missing), keeps current water/input across crop changes when still valid. Inline color legend (S1 / S2 / S3 / N / Water) sourced from `SUITABILITY_SWATCHES` in `gaezColor.ts`.
- **Store:** `store/mapStore.ts` gains `gaezSelection: GaezSelection | null` + `setGaezSelection()` (null until first enable + catalog load).
- **LayerPanel:** no structural change — the existing `gaez_suitability` toggle from Sprint BU is what gates everything.
- **Deferred:** Web Worker offload of decode (main-thread ~50–80 ms is fine for MVP), per-zoom resolution tiers, yield-gradient colormap, side-by-side crop compare, hover readout on the overlay (panel already serves that).

## GAEZ Backend Live (Sprint BV — 2026-04-20)
- Sprint BV unblocked the `gaez_suitability` layer type. Frontend adapter shipped Sprint BH; backend (`/api/v1/gaez/query` + `GaezRasterService`) shipped BV. When the API has an ingested `gaez-manifest.json`, fetches return `fetch_status: 'complete'` with 48 crop-suitability samples + a summary block; when the manifest is absent (default dev state), fetches return `'unavailable'` and the panel section renders its empty-state messaging. The web bundle is unchanged — the backend flip is transparent to `layerFetcher.ts`.
- Commercial-launch caveat: FAO GAEZ v4 is CC BY-NC-SA 3.0 IGO. Tracked as the first entry in `wiki/LAUNCH-CHECKLIST.md`.

## Land Panel Split + BB–BJ Support Libs (Sprint BU — 2026-04-20)
- Restored `main` to a compilable state after Sprint BT's `computeScores.ts` landed with unresolved imports. BU lands the 11 in-progress scoring-support libs it depends on (`designIntelligence`, `regulatoryIntelligence`, `energyIntelligence`, `climateProjections`, `ecosystemValuation`, `fuzzyMCDM`, `waterRightsRegistry`, `companionPlanting`, `canopyHeight` + utility `debounce`, `perfProfiler`) alongside the full Sprint BS panel-split refactor and the BB–BJ state/route wiring.
- **Panel split now live on main:** `SiteIntelligencePanel.tsx` 1,645 → 465 orchestration lines, rendering 28 new section components under `components/panels/sections/` (site context, assessment scores, soil/hydrology/groundwater/water-quality intelligence, canopy structure, regulatory/heritage, fuzzy FAO, GAEZ, land-use history, climate projections, regional species, community, environmental risk, infrastructure access, design intelligence, energy intelligence, AHP weights, ecosystem services, crop matching, hydrology extensions, constraints, opportunities, data layers, scores-and-flags, site-summary narrative, plus `_helpers.ts` and `_shared.tsx`). Bundle: shell **15.82 kB**, `panel-sections` **100.99 kB**, `panel-compute` **152.93 kB**, `ecocrop-db` **946.90 kB** — matches the chunk architecture designed in Sprint BS exactly.
- **Scoring support module map:**
  - `lib/designIntelligence.ts` — site-plan intelligence (buildability, setbacks, access)
  - `lib/regulatoryIntelligence.ts` — WDPA, ALR, EcoGift, heritage overlay reasoning
  - `lib/energyIntelligence.ts` — solar/wind/grid scoring
  - `lib/climateProjections.ts` — CMIP6/downscaled projections
  - `lib/ecosystemValuation.ts` — monetized ecosystem services
  - `lib/fuzzyMCDM.ts` — fuzzy multi-criteria decision making for FAO suitability
  - `lib/waterRightsRegistry.ts` — US/CA water-rights lookups
  - `lib/companionPlanting.ts` — companion-planting graph for crop mixes
  - `lib/canopyHeight.ts` — global canopy height (Lang 2023) consumption
  - `lib/debounce.ts`, `lib/perfProfiler.tsx` — utility primitives
- **`packages/shared/src/constants/dataSources.ts`:** 17 new `LayerType` union members — `soilgrids_global`, `biodiversity`, `ust_lust`, `brownfields`, `landfills`, `mine_hazards`, `fuds`, `conservation_easement`, `heritage`, `alr_status`, `aquifer`, `water_stress`, `seasonal_flooding`, `invasive_species`, `native_species`, `land_use_history`, `mineral_rights`, `water_rights`, `gaez_suitability` — plus matching `Tier1LayerType` exclusions.
- **State + glue:** `store/siteDataStore.ts` +56 lines (Tier-3 layer-result caching), `lib/rules/ruleEngine.ts`, `lib/mockLayerData.ts`, `lib/syncService.ts`, `pages/ProjectPage.tsx`, `routes/index.tsx`, `features/map/LayerPanel.tsx` carry the glue that surfaces the new layer types in the map + panel pipelines.
- Verification: `npx tsc --noEmit` clean, `npx vitest run` 361/361 passing, `npm run build` clean 23.09 s. Committed in a single consolidated Sprint BU commit.
- **Queued for next sprint (Sprint BV — GAEZ self-hosting):** `apps/api/src/routes/gaez/`, `apps/api/src/services/gaez/`, `apps/api/scripts/convert-gaez-to-cog.ts`, `apps/api/scripts/ingest-gaez.md`, `apps/api/{.env.example, package.json, app.ts, lib/config.ts}` + GAEZ entries in `wiki/{decisions/2026-04-20-gaez-self-hosting.md, index.md, entities/api.md, entities/gap-analysis.md}` + `.gitignore` raster paths. Left unstaged in the worktree — see `git status`.

## Triage BB–BJ Regressions (Sprint BT — 2026-04-20)
- Landed ~3,000 lines of previously uncommitted coherent sprint work spanning **Sprints BB–BJ** (biodiversity, contamination, hydrology-extensions, prior land use, regulatory/heritage, FAO GAEZ, abort-signal plumbing). Triage concluded both diffs (`apps/web/src/lib/computeScores.ts` +151, `apps/web/src/lib/layerFetcher.ts` +2,686) were production-quality with coherent patterns, no stubs, no TODO rot.
- Bug fix: `raceWithSignal` (`apps/web/src/lib/layerFetcher.ts` line 158) — Promise executor previously captured only `resolve` and the `.then`-rejection handler did `throw err`, which silently dropped rejections and hung all dedup-chained callers. One-line fix: `(resolve, reject) => { … (err) => { …; reject(err); } }`.
- Test-shape catch-up: `apps/web/src/tests/computeScores.test.ts` — `computeAssessmentScores` returns 10 scores for US (8 weighted + FAO Land Suitability + USDA Land Capability) and 11 for CA (+Canada Soil Capability). Tests previously asserted length 7, predating `computeCommunitySuitability` and the formal classifiers. Updated 7 length assertions, extended the label set, scoped the rating enum to weighted scores (`scores.slice(0, 8)`), and passed `country='CA'` to activate the Canada Soil Capability branch.
- Test-timeout increase: 3 `fetchAllLayers` tests promoted from default 5,000 ms to 15,000–20,000 ms to accommodate the 30+ live-API fetchers iterating with network mocks. CA test already had an explicit override from a prior sprint.
- Verification: **361/361 tests passing** (up from 351/361); `npm run build` clean; `npx tsc --noEmit` clean.

## Panel Chunk Split + Hook Test (Sprint BS — 2026-04-20)
- `apps/web/vite.config.ts` — `manualChunks` migrated from object form to function form. New app-side splits: `ecocrop-db` (FAO EcoCrop JSON + subset wrapper, ~947 kB / 109 kB gzip), `panel-sections` (27 memoized section components, ~101 kB / 20 kB gzip), `panel-compute` (`designIntelligence` + `regulatoryIntelligence` + `energyIntelligence` + `climateProjections` + `ecosystemValuation` + `cropMatching` + `companionPlanting` + `fuzzyMCDM` + `hydrologyMetrics` + `canopyHeight` + `waterRightsRegistry` + `computeScores` + `useSiteIntelligenceMetrics` hook, ~153 kB / 49 kB gzip).
- `SiteIntelligencePanel` lazy-loaded chunk: **1,144 kB → 15.82 kB shell** (gzip 159 kB → 5.22 kB) — 72× reduction on the shell; full payload now 4 chunks loading in parallel (~1,217 kB / gzip ~183 kB total, ~15% uncompressed overhead for cache granularity). Ecocrop dataset is stable across deploys so subsequent visits hit the CDN cache.
- `apps/web/src/tests/useSiteIntelligenceMetrics.test.ts` — new Vitest suite around the BQ hook boundary. Covers 37-key shape check, empty-layers robustness, representative-hydration on `mockLayersUS()`, memoization identity for stable inputs, and recompute on dep-array changes. Uses happy-dom environment override via `@vitest-environment happy-dom` file directive (project default is node; avoids spreading DOM env across the whole test suite).

## Semantic Token CSS Bridge (Sprint BR — 2026-04-20)
- Recon discovered `apps/web/src/styles/tokens.css` already defines `--color-sidebar-active: #c4a265` and `--color-sidebar-icon: #9a8a74` — exact hex matches of the TS `semantic.sidebarActive` / `semantic.sidebarIcon` exports. The BQ-deferred "token-system refactor" therefore collapsed to a direct utility-class migration rather than a token-surface rework.
- `styles/panel.module.css` — added 12 new utility classes driven by the existing CSS vars: (solo patterns) `.tokenActive`, `.tokenIcon`, `.tokenIconFs11Mt2`, `.tokenIconFs10Italic`, `.tokenIconFs12Leading`, `.tokenIconFs11Leading`, `.tokenActiveFs10Bold`; (composite atoms) `.fs9`, `.fs10`, `.mt2`, `.mr2`, `.tokenIconGrid2`. All color references go through `var(--color-sidebar-*)` so tokens.css stays authoritative.
- Inline-style migration: **198 → 159 `style={{…}}` objects panel-wide (−39, additional ~20% on top of BQ)**. `semantic.sidebar*` inline-style occurrences: 71 → 26 (−45, ~63%). Regex-driven script handled three className-position cases (before/after/absent) and template-string merging to preserve existing class expressions. Phase 2 changed 20 section files, Phase 3 changed 5 more for composite straggler patterns.
- Unused-import cleanup: `HydrologyExtensionsSection.tsx`, `ClimateProjectionsSection.tsx`, `EnergyIntelligenceSection.tsx` had all `semantic.*` code references swapped — `semantic` dropped from their tokens.js imports.
- Verification: `npx tsc --noEmit` clean, `npm run build` succeeds (22.02 s, panel chunk 1,144.14 kB / gzip 158.66 kB — unchanged vs BQ; class-name concats net-zero in bundled output). Remaining 26 `semantic.*` inline refs are runtime-dynamic (badge colors from `confidence.*`, conditional-color spans) and intentionally kept inline.
- Cumulative: panel + 27 sections carry **159 inline styles** (down from pre-BQ ~378 on sections alone). `panel.module.css` grew by 28 classes across BQ+BR (16 + 12), each tagged by sprint.

## UI/UX Scholar P0 + P1 (2026-04-23 / 2026-04-24)

Design-system primitives + token architecture driven by `design-system/ogden-atlas/ui-ux-scholar-audit.md`.

**Token architecture.** OKLCH primitives live at the top of `apps/web/src/styles/tokens.css` (`--l-bg/surface/raised/popover`, `--c-warm-neutral`, `--h-warm-neutral`, plus L/C/H triples for primary/accent/success/warning/error/info). `apps/web/src/styles/dark-mode.css` wraps its surface + semantic overrides in `@supports (color: oklch(0 0 0))` so the hex declarations above the gate remain authoritative on unsupporting browsers. See ADR `2026-04-23-oklch-token-migration.md`.

**UI primitives.** Three additions to `apps/web/src/components/ui/`:

- `DelayedTooltip.tsx` — 800 ms preset over existing `<Tooltip>`. Replaces native `title=` across icon-only chrome (`IconSidebar`, map tool spine, overlay toggles). ADR `2026-04-23-delayed-tooltip-primitive.md`.
- `Sparkline.tsx` — zero-dep SVG micro-chart for inline trend display. Neutral stroke, semantic accent on endpoint dot only. First consumer: Climate row in `ScoresAndFlagsSection` renders monthly precipitation from `climate.summary._monthly_normals`. `LiveDataRow.sparkline?: number[]` is the transport — plumbed in `packages/shared/src/scoring/computeScores.ts::deriveLiveDataRows` and mirrored on the local `LiveDataRow` type in `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx`.
- `.signifier-shimmer` utility in `apps/web/src/styles/utilities.css` — `@property`-driven conic-gradient border, masked to outline only, with `prefers-reduced-motion` guard. Applied to active overlay toggles + active tool buttons.


## Feasibility Command Center (2026-04-29)

Replaced the legacy `DecisionSupportPanel` (single-column stack of ~17 cards) for the Dashboard `feasibility` route with a decision-pathway cockpit.

**Layout.** `FeasibilityCommandCenter.tsx` orchestrates: header → `FeasibilityVerdictHero` (full-width, mirrors `LandVerdictCard`) → `BlockingIssuesStrip` (anchor `#feasibility-blockers`) → 2-col body (Fit & Readiness | Execution Reality) + sticky `FeasibilityDecisionRail` → Design Rules section → `<details>` Methodology drawer (closed by default; holds `WhatMustBeSolvedFirstCard` + `MissingInformationChecklistCard` + legacy methodology). Outer grid `minmax(0, 1fr) 280px` collapses at 1100px; inner body grid collapses at 960px.

**Shared hooks.** `hooks/useTriageItems.ts`, `hooks/useTypeFitRanking.ts`, `hooks/useFeasibilityVerdict.ts` — extracted from the prior inline `useMemo` blocks in `WhatMustBeSolvedFirstCard` and `BestUseSummaryCard` so the strip + rail + hero share identical triage / ranking data. `useFeasibilityVerdict` composes ranking + triage + financial model into bands `supported | supported-with-fixes | workable | not-recommended`, headline/subhead, mini-metrics, readiness chips.

**Dual-context split.** `DecisionSupportPanel` is unchanged and still serves the 260px MapView right rail (narrow contexts cannot host a 2-col + sticky-rail layout). `DashboardRouter.tsx:224` is the only mount swap.

Verification: typecheck clean, lint exit 0, build clean (1m 9s, PWA precache regenerated). Browser-verified at 1440×900: hero score circle, verdict badge, mini metrics, CTAs; blockers strip; 2-col body; sticky rail with verdict + readiness chips; no JS console errors.

### Feasibility Brief exporter (2026-04-29)

`apps/web/src/features/decision/lib/exportFeasibilityBrief.ts` mirrors the v3 Land-Brief pattern. `renderFeasibilityBriefMarkdown({ project, verdict, ranking, triage })` is a pure renderer; `useFeasibilityBriefDownloader(project)` composes `useFeasibilityVerdict` + `useTypeFitRanking` + triage into a memoized download callback. `FeasibilityCommandCenter` falls back to this downloader when no `onGenerateBrief` prop is supplied — hero + rail "Generate Feasibility Brief" CTA is now wired end-to-end. Sections: Header, Verdict + interpretation, Snapshot table, Readiness, Blocking Issues (grouped by triage tier), Vision Fit Detail (per-requirement table), Best-Use Ranking (top 8 with ★ for current direction), Methodology footer.

### Planting Tool Command Center (2026-04-29)

Templated the §21 cockpit recipe onto the second-most-cluttered Dashboard page: `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (legacy single-column flow of 17+ sections → cockpit shell with verdict-first layout).

**Layout.** Page header → verdict hero (band derived from `orchardSafety.overallSite` + blocker counts) → Blocking Issues strip → 2-col body (**Fit & Suitability**: Suitable Species — **Execution Reality**: Design Metrics, Water Demand, Orchard Safety, Nursery & Compost Proximity, Access & Irrigation Tie-In) → full-width **Design Detail** section (Frost Windows, Spacing Logic, Placement Validation, Companion Planting, Yield Estimates) → closed-by-default **Methodology drawer** (§12+ long-form cards: SeasonalProductivity, TreeSpacingCalculator, CompanionRotationPlanner, AllelopathyWarning, OrchardGuildSuggestions, AgroforestryPatternAudit, CanopyMaturity, ClimateShiftScenario, ShadeSuccessionForecast + AI Siting + VIEW ON MAP) + sticky **Decision Rail** (verdict, top blocker, next 3 actions, readiness chips for site / supply / logistics / species, CTAs).

**No new analysis math.** `derivePlantingVerdict` + `derivePlantingBlockers` re-present the existing `orchardSafety`, `proximity`, `access`, `validations`, and `waterDemand` memos as a page-level "so what" + flat blocker list. Mini metrics: suitable-species ratio, orchard count, total trees, water demand gal/yr, blocker count. Blocker sources: orchard placement (risk + caution), missing nursery/compost/irrigation/path, proximity rows ≥ risk, access rows ≥ risk, placement-validation failures.

**Single-file refactor.** Helpers, types, and CSS classes live alongside the existing `buildOrchardSafety` / `buildProximityChecks` / `buildAccessChecks` / `buildWaterDemandRollup` functions. `.module.css` gained ~270 lines for cockpit shell (`.cockpit*`, `.verdictHero*`, `.blockersStrip*`, `.rail*`, `.methodology*`); outer grid `minmax(0, 1fr) 280px` collapses at 1100px, inner body grid collapses at 960px.

Verification: typecheck clean for new code (only pre-existing v3 errors remain); lint clean. Browser preview deferred to next session.
