# Shared Package
**Type:** package
**Status:** active
**Path:** `packages/shared/`

## Purpose
Zod schemas, type utilities, and constants shared between API and web app. Single source of truth for data validation at every boundary.

## Schemas
| File | Key Exports |
|------|-------------|
| `project.schema.ts` | Country, ProjectType, ProjectStatus, CreateProjectInput, ProjectSummary |
| `assessment.schema.ts` | AssessmentFlag, ScoreCard (extends WithConfidence), SiteAssessment, AIOutput |
| `layer.schema.ts` | FetchStatus, LayerResponse (geojson/raster/wms/summary union) |
| `designFeature.schema.ts` | DesignFeatureType, CreateDesignFeatureInput, DesignFeatureSummary |
| `confidence.schema.ts` | ConfidenceLevel (high/medium/low), WithConfidence mixin |
| `spiritual.schema.ts` | SpiritualZoneType (9 types), QiblaResult |
| `file.schema.ts` | FileType, ProcessingStatus, ProjectFile, FILE_SIZE_LIMITS |
| `export.schema.ts` | ExportType (7 types), CreateExportInput, FinancialPayload, ScenarioPayload, FieldNotesPayload |
| `api.schema.ts` | Common API response types |

## Utilities
- `lib/caseTransform.ts` — `toCamelCase()` for converting snake_case DB rows to camelCase
- `climate/climateContext.ts` — **Added 2026-05-31 (Portfolio Home P4).** `deriveClimateContext(lat, date) => { hemisphere, latitudeBand, season }`, **main-barrel** export. Reuses the `Season` vocabulary + `SEASON_DATES` from `astronomy/sunPath` (no redefined seasons); bands at the Tropic 23.5 / Polar Circle 66.5; UTC-stable season inverted for the southern hemisphere. **No Köppen `climateZone`** (lat+date can't derive one; a lat-proxy would duplicate latitudeBand — a disclosed amendment to the planned signature). Consumed by the web cross-project Observe comparison badge (P6). 31-case test (`tests/climateContext.test.ts`). See [[log/2026-05-31-portfolio-home-p4-climate-context]].

## Constants
- `constants/dataSources.ts` — ADAPTER_REGISTRY (7 layers x 2 countries = 14 adapters)
- `constants/flags.ts` — 8 feature flags (gated by env vars)

## Dependencies
Only `zod` — no runtime dependencies.

## Scoring subpath (`@ogden/shared/scoring`)
Subpath export; not re-exported from the main barrel to avoid a cycle with
`AssessmentFlag` from `schemas/assessment.schema.ts`.

| File | Purpose |
|------|---------|
| `computeScores.ts` | `computeAssessmentScores()` — consumed by web and API for identical scoring. `s()` / `num()` / `nested()` belt-and-braces helpers retained. |
| `layerSummary.ts` | **New 2026-04-21.** 41-variant discriminated-union `LayerSummary` keyed by `LayerType`; `LayerSummaryMap` record; `toNum` / `toStr` / `normalizeSummary` boundary coercers that drop `'Unknown'` / `'N/A'` / `''` sentinels to `null`. Closes audit §5.6. |
| `types.ts` | `MockLayerResult` — discriminated union `{ [K in LayerType]: BaseLayerFields & { layerType: K; summary: LayerSummaryMap[K] & Record<string, unknown> } }[LayerType]`. `LayerResultFor<K>` helper. |
| `hydrologyMetrics.ts` | Hydrology scoring submodule. |
| `petModel.ts` | FAO-56 Penman-Monteith + Blaney-Criddle PET dispatcher. |
| `rules/` | Rule engine (`ruleEngine.ts`, `assessmentRules.ts`). |

## Demand subpath (`@ogden/shared/demand`)
**Added 2026-04-27.** Separate entry point — not re-exported from the main
barrel. Source of truth for water + electricity demand coefficients used by
the hydrology engine and the energy/utility/planting dashboards. Decision:
[decisions/2026-04-27-demand-coefficient-tables.md](../decisions/2026-04-27-demand-coefficient-tables.md).

| File | Purpose |
|------|---------|
| `structureDemand.ts` | `STRUCTURE_WATER_GAL_PER_DAY` + `STRUCTURE_KWH_PER_DAY` by `StructureType`; `GREENHOUSE_*_PER_M2_DAY` per-m² rates; `RESIDENTIAL_STRUCTURE_TYPES` set (cabin/yurt/tent_glamping/earthship/bathhouse). `getStructureWaterGalPerDay()` / `getStructureKwhPerDay()` honour `demandWaterGalPerDay` / `demandKwhPerDay` overrides first, then apply greenhouse area, occupants (residential only), and `storiesCount`. |
| `utilityDemand.ts` | `UTILITY_KWH_PER_DAY` by `UtilityType` (loads only — generation/storage/passive = 0); `getUtilityKwhPerDay()` honors steward-entered `demandKwhPerDay > 0` override, else falls back to default. |
| `cropDemand.ts` | Per-area-type × class table (`CROP_AREA_GAL_PER_M2_YR`) — orchard medium 110 ≠ market_garden medium 200; `CROP_AREA_TYPICAL_GAL_PER_M2_YR` typical fallback; `getCropAreaDemandGalPerM2Yr(spec, climateMultiplier?)` / `getCropAreaWaterGalYr(area, climateMultiplier?)` helpers; `petClimateMultiplier(petMm, refPetMm = 1100)` clamps to `[0.7, 1.5]`. |
| `livestockDemand.ts` | **Added round 2.** `LIVESTOCK_WATER_GAL_PER_HEAD_DAY` (FAO + USDA NRCS) by 9-species enum; `getPaddockWaterGalPerDay({ species[], stockingDensity, areaM2, headCount? })` with multi-species head splitting. |
| `rollup.ts` | `sumSiteDemand({ structures, utilities, cropAreas, paddocks, climateMultiplier? })` → `{ structureWaterGalPerDay, cropWaterGalYr, livestockWaterGalYr, waterGalYr, electricityKwhPerDay, electricityKwhYr }`. Additive across all four entity sets; PET multiplier applied inside the crop reducer. |

`hydrologyMetrics.ts` accepts optional `structures`/`utilities`/`cropAreas`/`paddocks`
on `HydroInputs`; when any are present, irrigation demand uses the rollup. PET-driven
`climateMultiplier` is derived from `computePet()` and applied automatically when
solar/wind/RH data is present (else 1.0 — preserves the 22%-of-rainfall fallback
back-compat for callers without placed entities).

## Relationships subpath (`@ogden/shared/relationships`)
**Added 2026-04-28.** Separate entry point — not re-exported from the main
barrel. Phase 1 of the Needs & Yields rollout: data model + algorithms only,
no UI. Decision:
[decisions/2026-04-28-needs-yields-dependency-graph.md](../decisions/2026-04-28-needs-yields-dependency-graph.md).

| File | Purpose |
|------|---------|
| `types.ts` | 13-value `ResourceType` const tuple (manure, greywater, compost, biomass, seed, forage, mulch, heat, shade, pollination, pest_predation, nutrient_uptake, surface_water); `ResourceTypeSchema` Zod enum; `EdgeSchema` (`fromId`, `fromOutput`, `toId`, `toInput`, optional `ratio` ∈ [0,1]); `PlacedEntity<T>` interface; `RelationshipsState` value object (`{ entities, edges }`). |
| `catalog.ts` | `EntityType` union across the four demand-module enums (StructureType ∪ UtilityType ∪ CropAreaType ∪ LivestockSpecies); `OUTPUTS_BY_TYPE` and `INPUTS_BY_TYPE` `Record<EntityType, ResourceType[]>` seeds covering all 54 entity types. `Record<EntityType, …>` makes adding a new enum value a typecheck failure here, enforcing exhaustiveness. |
| `flow.ts` | Pure-function Edge CRUD over `RelationshipsState` — `addEdge`, `removeEdge`, `addEntity`, `removeEntity`, `emptyState()`. `addEdge` validates via `EdgeSchema.parse`. |
| `cycle.ts` | `orphanOutputs(entities, edges)` (catalog outputs no edge routes), `unmetInputs(entities, edges)` (catalog inputs no edge supplies), `closedLoops(entities, edges)` (Johnson-style DFS, returns canonical-rotation cycles deduplicated), `integrationScoreFromEdges(entities, edges)` ∈ [0,1] (vacuously 1 when no outputs declared). |
| `index.ts` | Barrel re-export of all four modules. |

Scoring engine slot: `WEIGHTS['Ecological Integration'] = 0` in
[computeScores.ts](../../packages/shared/src/scoring/computeScores.ts) — the
dimension is reserved at weight 0 in Phase 1 so existing project overall
scores don't shift; weight is moved up when Phase 2 (canvas edge editor)
ships and the dimension is computed for every project.

## Per-type objective model (main barrel; OLOS Project-Type + Secondary-Layer Spec v1.2)
**Added 2026-05-29.** Phase 2 of the OLOS UX plan -- replaces the fixed
~16-objective `constants/plan/tierObjectives.ts` skeleton (rendered identically
for every project) with a resolved **19 Universal + Primary-type +
Secondary-type** set, where secondaries are *additive* (whole new objectives)
or *modifying* (inject checklist items into existing objectives via patch
records). Unlike the Needs & Yields `relationships` subpath above, every symbol
here is re-exported from the **main barrel** (`@ogden/shared`), not a subpath.
Decision: [decisions/2026-05-29-atlas-per-type-objective-model.md](../decisions/2026-05-29-atlas-per-type-objective-model.md).

| File | Purpose |
|------|---------|
| `schemas/plan/projectTypeTaxonomy.schema.ts` | `ProjectTypeId` (14 ids; `livestock_operation` added 2026-06-03), `SecondaryClass`, `TensionAck`, `ProjectTypeRecord`, `ProjectTypeVersion` -- the record a wizard writes to `metadata.projectTypeRecord` (primary + secondaries + tension acks). |
| `schemas/plan/planTierObjective.schema.ts` | **Extended additively 2026-05-29** -- new optional/defaulted objective fields (`source`, `sourceTypeId`, `secondaryClass`, `ref`, `completionGate`, `actHandoff`, `scopeNotes`) + checklist-item fields (`isMethodology`, `expandedBySecondaryId`) + `PatchRecordSchema` (`secondaryTypeId`, `targetObjectiveId`, `injectedItems`, `completionGateAmendment`, `scopeNote`). All defaulted, so the static seed still validates. **Extended again additively 2026-06-02** -- optional `formulaBinding` on `PlanDecisionChecklistItemSchema`: new `ObjectiveFormulaId` enum (6 ids -- `carrying-capacity-seasonal`, `paddock-system-capacity`, `paddock-stocking-density`, `stock-water-demand`, `forage-carrying-capacity`, `enterprise-break-even`) + `ObjectiveFormulaBindingSchema { formulaId, satisfiesWhenComputed?, resultLabel? }`, plus a `ckF` authoring helper mirroring `ckA`. Shared holds **ids + config only** (no app deps); `apps/web` joins the id -> the real `compute*` function/widget. Optional -> every existing seed/catalogue validates unchanged. Decision: [[decisions/2026-06-02-atlas-objective-formula-binding]]. |
| `constants/plan/projectTypes.ts` | 14-entry `PROJECT_TYPES` table `{id,label,ordinal,canBePrimary,canBeSecondary,description}` (`livestock_operation` ordinal 13 added 2026-06-03); `PRIMARY_TYPES` (13) / `SECONDARY_TYPES` (8) views; `findProjectType(id)`. The wizard reads this table; the Zod `ProjectType` enum keeps a `moontrance` sentinel (validates but never offered). |
| `constants/plan/relationshipMatrix.ts` | `getPairRelation`, `isCompatibleSecondary`, `getActiveTensions`; `RelationCell` ('M'\|'A'\|'X'\|'NA'); `DesignTension`; the 12 named design tensions (2 added 2026-06-03: livestock_operation x wellness @ s4, livestock_operation x market_garden @ s5). The compile-strict `Record<PrimaryTypeId>` carries 13 primary cells per secondary row. `residential.regenerative_farm = 'M'` is the encoded modifying pair; `residential.homestead = 'NA'` (incompatible -- "Homestead+Residential" was a stale plan-doc label). |
| `constants/plan/catalogues/{universal,regenFarm,ecovillage,agritourism,wellness,silvopasture,orchard,nursery,homestead,education,conservation,marketGarden,offGrid,livestockOperation,residential}.ts` | The encoded catalogues: Universal-19, Regenerative-Farm primary (13), Ecovillage primary (31), Agritourism primary (29), Wellness primary (27) + Wellness secondary (5 additive, no patches), Silvopasture primary (26; 45 with universal), Orchard primary (25; 44 with universal), Nursery secondary (8 additive, no patches), Homestead primary (15), Education primary (22), Conservation primary (30), Market Garden primary (24), Off-Grid primary (27), **Livestock Operation primary (23; 42 with universal -- new primary-only type added 2026-06-03, binds all 6 livestock/grazing formula ids; ref prefix `LVS`)**, Residential secondary (6 additive + **5** patch records). With Livestock, **12 of the 13 selectable primaries now carry their own encoded layer**; only **Nursery** as a *primary* still resolves universal-only (its encoded catalogue is secondary-only). Adding a primary = a file + **five** edits to `catalogues/index.ts` (import + re-export + `getPrimaryCatalogue` arm + `ALL_CATALOGUE_OBJECTIVES` union + header-comment) plus, for a *new* type, its taxonomy id (`PROJECT_TYPE_IDS`, `ProjectType` superset, `PROJECT_TYPES` row) and a `relationshipMatrix` column cell in all 8 secondary rows. Agritourism is `canBeSecondary:true` in the taxonomy but its doc carries only a primary layer, so it is registered `getPrimaryCatalogue`-only; `getSecondaryCatalogue` serves Residential + Wellness. Silvopasture + Orchard ship primary-only (2026-05-30): each doc carries `->` universal-augmentation blocks and a secondary layer that are **deferred** pending operator source files -- no primary-to-universal patch seam exists yet (`resolveProjectObjectives` collects patches from secondaries only). See [[log/2026-05-30-atlas-silvo-orchard-catalogue]], [[log/2026-06-02-olos-food-forest-adoption]]. **Coverage gap:** the 5 newer primaries (Homestead/Education/Conservation/Market Garden/Off-Grid) are NOT in `catalogues.test.ts`/`shortTitle.test.ts` `ALL_AUTHORED`, so they are typecheck-guarded only; closing this needs the `OBJECTIVE_REF` regex to add `HMS|EDU|CON|MGD|OFG`. |
| `constants/plan/catalogues/authoring.ts` | Catalogue Authoring Standards v1.4 rubric constants (id-namespacing, item-count bounds, Ref format) consumed by `__tests__/catalogues.test.ts`. **Extended additively 2026-06-11** — `ck()` gained an optional `feeds?: string[]` opt (emits `feedsInto: opts.feeds ?? []`); `ckA`/`ckF` untouched, every prior `ck()` call byte-identical in output. See feedsInto wiring note below. |
| `constants/plan/catalogues/index.ts` | Barrel: catalogue union + lookup helpers. |
| `relationships/resolveProjectObjectives.ts` | Pure `resolveProjectObjectives({primaryTypeId, secondaryTypeIds})` -> 19 Universal (deep-copied) + primary + secondary-additive (dedup by id) + modifying patches applied **last**, each injected item stamped `expandedBySecondaryId`; a missing patch target is skipped + recorded (`SkippedPatch`), never thrown; gate amendments concatenate onto `completionGate`. Also `findPlanTierObjectiveIn(resolved, id)`; types `ResolveProjectObjectivesInput`/`Deps`, `ResolvedProjectObjectives`, `ResolveProvenance`, `SecondaryResolutionFlag`. **Physically in `relationships/` but main-barrel exported** (not the `@ogden/shared/relationships` subpath). |
| `relationships/actStratumExecution.ts` | **Added 2026-05-30.** Pure Act-stage execution rollup, main-barrel exported. `computeActStratumExecution(actions)` -> per-`stratumId` `{total, verified, inFlight, notStarted}` in one pass (reads only `{stratumId?, status}`; actions with no `stratumId` skipped); `actStratumStateFromCounts(counts)` -> `PlanStratumState`; `computeAllActStratumStates(stratumIds, actions)`. **Deliberately NOT `computeStratumState`** (the Plan-side `stratumState.ts` returns `locked` for empty / prereq-gated strata): Act execution reaches every stratum, so this **never returns `locked`** -- empty/undefined -> `available`; any `in_progress\|submitted\|diverged\|blocked` (IN_FLIGHT) -> `active`; `total>0 && all verified` -> `complete`; else `available`. Backs the web Act tier shell ([[web-app]] "Act Tier Shell"). ADR [[2026-05-30-atlas-act-tier-shell-promotion]]. |

Resolution is **on the fly** per project (web `useProjectObjectives(projectId)`,
4-tier fallback to the static skeleton) -- no persisted resolved-set store.
Verified pair regen_farm + residential = **38 objectives** across 7 strata
(5/6/5/6/6/4/6). The `planTierStore.toProgressMap` global-id-uniqueness
invariant holds: injected patch item ids are namespaced and `catalogues.test.ts`
asserts global uniqueness incl. patch items.

**Spec intake 2026-05-30 (planned, NOT encoded).** Three OLOS specs were
ingested into the wiki as authoritative forward design with no code change:
`decision_groups[]` (an editorial Plan-layer grouping of an objective's
Act-layer checklist items -- see [[concepts/decision-groups]]) and the
project-type **graduation** model (grow-into-types via append-only
`type_history[]` -- see [[concepts/project-type-graduation]]). Neither is in
the `planStratumObjective` schema or the catalogues yet. Four doc-vs-code
deltas are recorded, code remaining canonical: (1) the Secondary Layer Spec
v1.2 says "Sixteen objectives are universal" but the encoded model carries
**19** (`universal.ts`); (2) the Decision Groups Reference uses type-prefix
refs (`RF.S1.1`, `RS.S2.1`) vs the encoded `SILV-/ORCH-/U-` scheme; (3) docs
reference 13 design tensions vs the **10** encoded in `relationshipMatrix.ts`;
(4) `decision_groups[]` is a new unencoded schema field. ADR:
[[decisions/2026-05-30-olos-spec-intake-decision-groups-graduation]]. The
Silvopasture/Orchard **secondary** catalogues remain blocked on operator
source files -- these three specs do not supply them (both types appear only
as primaries in the Decision Groups Reference).

**Decision groups ENCODED 2026-05-31 (delta #4 above now closed).**
`DecisionGroupSchema` ({ id, label, itemIds[>=1], observeFeeds[] verbatim
strings, sourceSecondaryId nullable }) added to
`planStratumObjective.schema.ts`; `decisionGroups[]` on the objective and
`injectedGroups[]` on `PatchRecordSchema`, both defaulted. `resolveProjectObjectives`
deep-clones groups and stamps `sourceSecondaryId = p.secondaryTypeId` on
patch-injected groups (mirroring the `injectedItems`/`expandedBySecondaryId`
path). A `dg(...)` helper joins `ck`/`obj`/`patch` in `catalogues/authoring.ts`.
Every encoded catalogue now carries full mutually-exclusive group partitions:
universal/regenFarm/residential (Phase 3a, residential patches inject groups,
rubric `-dgres<n>`), then agritourism, wellness, silvopasture (`-dgsilv1`),
orchard (`-dgorch1`), nursery (no patches), ecovillage (primary-only, no
patches). Group ids `<objId>-dg<n>`, globally unique. The catalogues test
asserts the 1-6/full-partition/unique-id invariants; resolver test asserts
the sourceSecondaryId stamping and shared-constant immutability. Per the
2026-05-31 rulings: R1 (authored item membership), R2 (verbatim feed strings),
extended override + "author meaningful labels" for rows the doc doesn't
enumerate. ADR: [[decisions/2026-05-31-atlas-decision-groups-encode]].

**feedsInto forward wiring + upstream-cite backfill 2026-06-11 (stratum
traceability audit remediation).** The [2026-06-11 stratum traceability audit](../../STRATUM_TRACEABILITY_AUDIT_2026-06-11.md)
verdict was structural PASS / content MIXED: the spine gate
(`STRATUM_PREREQS`) chains every S4–S7 objective transitively to S1–S3, but
many S4+ items carried no *content-level* cite back to a survey, and all 31
S2/S3 `universal.ts` survey items declared `feedsInto: []`. Three backlog
items closed: **#3** authored explicit upstream cites into the transitive-only
types (agritourism, ecovillage, education — 13 education `ck()` items under its
"Tier N" convention); **#1** wired the 31 universal S2/S3 survey items to their
5 transitive-only S4/S5 consumers (`s4-zones` x13, `s5-water-infrastructure`
x10, `s4-water-strategy` x7, `s5-soil-improvement` x6, `s5-access` x6;
`s4-direction` deliberately excluded as the synthesis objective); **#2** added
`__tests__/spineTraceability.conformance.test.ts` (14 assertions) guarding
forward-only acyclic feeds, target referential integrity, and a ≥1-feed floor
per named consumer. `feedsInto` is display-only ("Feeds" chips at
[DecisionChecklist.tsx:631]; Act Tier-0 label derivation) — a dangling target
degrades to a raw-id label, never a gate. Backlog #4 (reverse "Informed by" chips) closed 2026-06-11: `findUpstreamSourceObjectives(objectiveId)` in `apps/web/src/v3/plan/objectiveCatalog.ts` inverts the graph; `ObjectiveDetailPanel` renders teal chips above `DecisionChecklist` ([[log/2026-06-11-atlas-informed-by-chips]]). Logs:
[[log/2026-06-11-atlas-stratum-traceability-audit]],
[[log/2026-06-11-atlas-upstream-cites-agritourism-ecovillage]],
[[log/2026-06-11-atlas-education-cites-feedsinto-wiring]],
[[log/2026-06-11-atlas-spine-traceability-conformance-test]].

## Placement rules subpath (`@ogden/shared/placementRules`)
**Added 2026-06-11.** Separate entry point. Draw-time placement-rule
*definitions* as pure data — zod-only package, **no turf**; geometry
evaluation lives with the consumers (client `apps/web/src/v3/plan/validation/`
via turf; server `apps/api/src/lib/placementGuard.ts` via PostGIS; RulesPanel
via `placementRuleToCatalogEntry` in `SitingRules.ts`). Decision:
[decisions/2026-06-11-atlas-placement-rules-architecture.md](../decisions/2026-06-11-atlas-placement-rules-architecture.md).

| File | Purpose |
|------|---------|
| `types.ts` | `PlacementRule` (`id`, `severity: 'block'\|'warn'`, `subject {kinds?, categories?, exceptKinds?}`, `constraint`, `message`, `whyItMatters?`, `amanahNote?`, `serverEnforceable`, `legacyRuleId?`); 7-type constraint union (`within-boundary \| zone-containment \| zone-exclusion \| min-distance-from \| max-distance-from \| no-overlap-same-kind \| permaculture-ring-range`); `PlacementAcknowledgment` zod schema. |
| `catalog.ts` | `PLACEMENT_RULES` — 14 entries / 13 named rules (well-septic separation encoded as two directional entries): 6 block (all `serverEnforceable`), 8 warn. `PLACEMENT_DISTANCES_M` is the **single distance source** (`SETBACK_RULES` in web `SitingRules.ts` re-bases onto it). 4 rules carry `amanahNote` (huquq al-jar, tahara, water-source protection, khushuʿ). Annotations never gated; overlay kinds (`zone`, `catchment`) gated only by boundary containment. `findPlacementRule(id)`. |
| `selectors.ts` | `rulesForCandidate`, `serverEnforceableRules`, `subjectMatches`. |

`ZoneCategory` moved to `constants/zoneCategories.ts` (web `zoneStore.ts`
re-exports the alias); re-exported from this subpath.

## Completion-path classifier (`relationships/objectiveCompletionPaths.ts`)
**Added 2026-06-11** to the `@ogden/shared/relationships` subpath. Per-item
classification of how a checklist item can be completed in-app:
`auto-answer | auto-formula | form-capture | workbench-capture |
objective-map | objective-log | objective-flow | no-path` (only the first
four are per-item evidence-backed). Takes an injected `ActToolArmIndex`
(shared can't import the app-layer tool catalog) and, since 2026-06-12, an
injected `workbenchObjectiveIds: ReadonlySet<string>` (`ClassifyOptions`) —
every item of a member objective classifies `workbench-capture` unless an
`auto-*` or matching form arm beats it; callers inject the app-layer
`TIER_ZERO_OBJECTIVE_IDS`. Consumed by the web ratchet test
(`completionPathAudit.ratchet.test.ts` + pinned `completionPathGaps.baseline.json`)
and `scripts/audit-checklist-completion-paths.ts` (`--write-baseline`).
Pinned 2026-06-11: 2029 items / 355 objectives, 610 `no-path`.
Pinned 2026-06-12 (universal close): `no-path` 546, universal prefix 0,
`workbench-capture` 136, evidence-backed 368. Pinned 2026-06-12 (ev- close,
commit `ae3a72be`): `no-path` 484, `ev-` prefix 0, `workbench-capture` 198,
evidence-backed 430 -- 10 ecovillage decision objectives joined the app-layer
`TIER_ZERO_OBJECTIVE_IDS` (29 -> 39), closing the entire `ev-` no-path tier via
workbench membership alone (all 10 non-spatial, plain `ck()`, already grouped).
Decisions:
[decisions/2026-06-11-atlas-completion-path-audit-ratchet.md](../decisions/2026-06-11-atlas-completion-path-audit-ratchet.md),
[decisions/2026-06-12-atlas-workbench-capture-gap-closure.md](../decisions/2026-06-12-atlas-workbench-capture-gap-closure.md).

## Act telemetry schema (`schemas/actTelemetry.schema.ts`)
Main-barrel schema backing the Act-stage affinity pipeline (migration
024 + the `apps/api` telemetry route + `apps/web/src/lib/actInteractionLog.ts`).
Two enums are **hand-synced sources of truth living in different
layers**:
- `ACT_INTERACTION_EVENT_TYPES` ↔ the migration-024 SQL CHECK on
  `event_type` (kept in lock-step by hand).
- `ActModuleId` ↔ the UI `ActModule` union
  (`apps/web/src/v3/act/types.ts`). The `module` DB column is
  **unconstrained text** (no CHECK), so extending `ActModuleId` is
  migration-safe — but adding a new Act module requires editing
  **both** `ActModule` and `ActModuleId`, or tsc fails at the telemetry
  `record()` call sites (and the `AffinityTelemetryDashboard`
  `Record<ActModuleId,…>` maps). `'tracker'` added 2026-05-16; see
  [[2026-05-16-atlas-act-plan-execution-tracker]].

## Notes
- All schemas use strict Zod validation
- `WithConfidence` mixin applied to all analysis outputs
- Export from barrel `src/index.ts` — always add new schemas here
- The scoring subpath is a separate entry point (`./scoring`); consumers
  import from `@ogden/shared/scoring`, not the root.
- Same convention for `./demand`, `./manifest`, and `./relationships`.
