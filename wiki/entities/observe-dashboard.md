# Observe Dashboard

**Type:** module (v3 Observe surface) · **Status:** active · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/observe/dashboard/` · **Branch:** `feat/atlas-permaculture`

The read-only synthesis layer of the three-stage reframe (**Plan** decides /
**Act** executes+collects / **Observe** synthesizes). Shipped as Phase 4 of the
OLOS UX spec ([[decisions/2026-05-28-atlas-observe-dashboard-phase4]]). Mounted
in the canvas slot by `ObserveDashboardLayout`, which branches between surfaces
on a `surface` discriminator set by `ObserveLayout` from the matched route.

## Surfaces

`ObserveDashboardSurface = 'unified' | 'domain' | 'temporal' | 'rollup'`
(`ObserveDashboardLayout.tsx`). An unresolved `domainId` falls back to Surface 1
so the steward never lands on a blank surface; the rollup surface is
objective-keyed and carries no `domainId` requirement.

- **Surface 1 -- `UnifiedLandStateSurface`** (`surface='unified'`, default).
  `LandStateSummary` freshness chips + BentoBox grid of 16 `DomainStatusCard`s
  backed by `useDomainSnapshots`. Header toolbar carries the **"Present"** entry
  (read-only `PresentationModeOverlay`) and the **"By objective"** entry to
  Surface 4 (2026-05-31).
- **Surface 2 -- `DomainDetailLayout` / `DomainObservationList`** (`surface='domain'`
  + valid `domainId`). Per-domain observation stream (seed/baseline, direct Act
  recordings, field-log projections), supersession control, evidence library,
  observation needs, cycle stamps. Each Act-emitted row shows the gold
  objective-title **provenance chip** ([[decisions/2026-05-31-atlas-observe-datapoint-objective-link]]).
  Now also carries an **`All / From Act / Baseline` source filter** (2026-05-31,
  below).
- **Surface 3 -- `TemporalLayerSurface`** (`surface='temporal'` + valid
  `domainId`). Inline-SVG `TemporalChart` (numeric + status), `CycleAnnotations`,
  `LocationFilter` clustering.
- **Surface 4 -- `ObjectiveRollupSurface`** (`surface='rollup'`, NEW 2026-05-31).
  Objective-centric Land State rollup; see below.

## Domain Detail "From Act" source filter (2026-05-31, `cb1e9159`)

`apps/web/src/v3/observe/dashboard/domain/`:

- `observationSource.ts` (NEW) -- pure classifier. `isVirtual(point)` (id
  `feed:`-prefixed field-log projection); `classifyObservationSource(point)`
  returns `'act'` when `isVirtual || sourceObjectiveId != null`, else
  `'baseline'`; `matchesSourceFilter(point, filter)`. One shared definition for
  the list + its test.
- `DomainObservationList.tsx` -- `useState<SourceFilter>('all')`; `useMemo` live
  counts (`all` / `act` / `baseline = all - act`); an `All / From Act / Baseline`
  segmented chip control above the `<ol>` (zero-count chip disabled); rows
  filtered by the active chip while `reverseSupersededBy` stays built from
  `view.all` so supersession partners resolve even when filtered out.
- `__tests__/observationSource.test.ts` (NEW) -- partition + counts invariants.

Rationale for the 3-way taxonomy: `From Act` deliberately groups direct
recordings AND field-log projections (each already carries its own per-row tag,
so a finer 4-way split would be redundant); `Baseline` is the null-objective seed
complement. Lowest-cognitive-load option that still tells the Plan->Act->Observe
loop story. ADR resolves the second named-deferred item of
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]].

## Surface 4 -- Objective rollup (2026-05-31, `ba1d5b8c`)

`apps/web/src/v3/observe/dashboard/rollup/`:

- `ObjectiveRollupSurface.tsx` -- props `{ projectId }`. Enumerates objectives
  via `useProjectObjectives(projectId)` (universal + typed); subscribes
  `useObserveDataPointStore((s) => s.byProject)` and `useMemo`-groups points with
  non-null `sourceObjectiveId` into a `Map` (newest-first by
  `Date.parse(capturedAt)`; never builds a new array in the selector);
  `useDomainSnapshots(projectId)` keyed by `UniversalDomain` for freshness; a
  `recordedOnly` toggle (default OFF) doubles the surface as a coverage overview;
  header reads "{recordedCount} of {n} objectives observed".
- `ObjectiveRollupCard.tsx` -- title from `objective.title`; primary domain via
  `getPrimaryDomainForObjective(objective)` -> snapshot freshness pill
  (`data-freshness` colour rules); first 3 observations
  (`formatActyTimestamp` + `readNote`) with "+K more"; empty state "No
  observations recorded yet."
- `ObjectiveRollupSurface.module.css` / `ObjectiveRollupCard.module.css` --
  BentoBox tokens, `auto-fill minmax(280px, 1fr)` grid, freshness `border-left`
  accent.

Chosen as a NEW surface (over cramming an objective column into the domain grid,
which has a different primary key, or a transient modal) because the per-objective
feed is browse-worthy standing content. Resolves the third named-deferred item of
the objective-link ADR -- surfacing the per-objective feed beyond the single Act
exec panel.

## Shared display helpers

`apps/web/src/v3/observe/dashboard/observationDisplay.ts` (2026-05-31) --
`readNote(mv: unknown): string | null` and `formatActyTimestamp(iso): string`,
extracted from `ActTierExecutionPanel.tsx` (behavior byte-identical) so the Act
exec panel feed and the rollup card share one definition. Pure, no React/store
deps. (Act importing across into Observe is the established allowed direction.)

## Routes

- `observe/dashboard` -- Surface 1 (Unified)
- `observe/dashboard/$domainId` -- Surface 2 (Domain Detail)
- `observe/dashboard/temporal/$domainId` -- Surface 3 (Temporal)
- `observe/dashboard/rollup` -- Surface 4 (Objective rollup, 2026-05-31)

All registered static-prefix-first in `routes/index.tsx`, component
`ObserveLayout`, which derives the `surface` discriminator from the path.

## Dependencies

- `useObserveDataPointStore` (`store/observeDataPointStore.ts`) -- `byProject`,
  `getByObjective` / `getByDomain` selectors
- `useDomainSnapshots` (`dashboard/useDomainSnapshot.ts`) -- per-domain freshness
- `useProjectObjectives` (`plan/strata/useProjectObjectives.ts`) -- per-project
  objective catalogue
- `@ogden/shared` -- `getPrimaryDomainForObjective`,
  `findObjectiveAcrossCatalogues`, `ObserveDataPoint`, `UniversalDomain`

## Notes

- `ObserveDataPoint` carries `sourceObjectiveId` (nullable FK, persist v2) -- the
  link every Act-emitted point uses for the provenance chip, the source filter,
  and the rollup grouping ([[decisions/2026-05-31-atlas-observe-datapoint-objective-link]]).
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
