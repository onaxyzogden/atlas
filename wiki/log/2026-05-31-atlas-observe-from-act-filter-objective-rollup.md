# 2026-05-31 -- Observe: "From Act" source filter + objective-centric Land State rollup (Surface 4)

**Branch.** `feat/atlas-permaculture` (two explicit-path slice commits
`cb1e9159` Slice 1 -> `ba1d5b8c` Slice 2; rebased out-of-band,
divergence-checked, **not pushed**). Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`. ADR:
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]] (this work
resolves its final two named-deferred items).

Closes both follow-ups the objective-link ADR had named as still-deferred. The
operator chose to plan **both, sequenced** (Slice 1 first, then Slice 2) and
deferred both UX forks to "best UX option." With the `sourceObjectiveId` link
and the `793c4c99` field-log enrichment already in place, every Act-emitted
observation carries a resolvable objective provenance -- these two slices make
that provenance *legible* on the synthesis surface (filter) and *aggregable*
across the whole project (rollup).

## Slice 1 -- "From Act" source filter on Domain Detail (`cb1e9159`)

- NEW [observationSource.ts](apps/web/src/v3/observe/dashboard/domain/observationSource.ts)
  -- pure, testable source classifier. `isVirtual(point)` (id `feed:`-prefixed),
  `classifyObservationSource(point): 'act' | 'baseline'`
  (`isVirtual || sourceObjectiveId != null` -> `'act'`), and
  `matchesSourceFilter(point, filter)`. The `isVirtual` helper previously inlined
  in `DomainObservationList` moved here so list + test share one definition.
- [DomainObservationList.tsx](apps/web/src/v3/observe/dashboard/domain/DomainObservationList.tsx)
  -- `useState<SourceFilter>('all')`; `useMemo` counts over `view.all`
  (`all` / `act` / `baseline = all - act`) and filtered `rows`; an
  `All {n} / From Act {n} / Baseline {n}` segmented chip control above the `<ol>`
  (zero-count chip disabled); `<ol>` maps over `rows`, with
  `reverseSupersededBy` still built from `view.all` so supersession partners
  resolve even when filtered out; an inline "No {filter} observations" message
  when a non-`all` filter yields nothing.
- [DomainObservationList.module.css](apps/web/src/v3/observe/dashboard/domain/DomainObservationList.module.css)
  -- `.controls` / `.chip` / `.chipActive` / `.chip:disabled` + filtered-empty
  message, in the `DomainEvidenceLibrary` chip token vocabulary.
- NEW [__tests__/observationSource.test.ts](apps/web/src/v3/observe/dashboard/domain/__tests__/observationSource.test.ts)
  -- `feed:`-prefixed -> `'act'` regardless of objective id; real-id +
  non-null objective -> `'act'`; real-id + null -> `'baseline'`;
  `matchesSourceFilter` identity-true for `'all'`, exact partition for
  `act`/`baseline`; mixed-fixture counts sum to total.

## Slice 2 -- objective-centric Land State rollup, Observe Surface 4 (`ba1d5b8c`)

A new read-only Observe surface listing one card per Plan objective, mirroring
the existing surface-discriminator architecture (Surface 1 Unified / 2 Domain
Detail / 3 Temporal / **4 Rollup**). 9 files (5 new + 4 edits):

- NEW [observationDisplay.ts](apps/web/src/v3/observe/dashboard/observationDisplay.ts)
  -- the `readNote(mv: unknown): string | null` + `formatActyTimestamp(iso): string`
  helpers extracted from `ActTierExecutionPanel.tsx` (behavior byte-identical),
  shared by the Act panel and the rollup card. Pure, no React/store deps.
- NEW [rollup/ObjectiveRollupSurface.tsx](apps/web/src/v3/observe/dashboard/rollup/ObjectiveRollupSurface.tsx)
  -- props `{ projectId }`. `useProjectObjectives(projectId)` enumerates
  objectives (universal + typed); subscribes
  `useObserveDataPointStore((s) => s.byProject)` and `useMemo`-groups points with
  non-null `sourceObjectiveId` into a `Map`, newest-first by `Date.parse(capturedAt)`
  (never builds a new array in the selector -- dodges the fresh-reference pitfall);
  `useDomainSnapshots(projectId)` keyed by `UniversalDomain` for freshness; a
  `recordedOnly` toggle (default OFF) filters to observed objectives so the surface
  doubles as a coverage overview; header shows "{recordedCount} of {n} objectives
  observed".
- NEW [rollup/ObjectiveRollupCard.tsx](apps/web/src/v3/observe/dashboard/rollup/ObjectiveRollupCard.tsx)
  -- title from `objective.title`; primary domain via
  `getPrimaryDomainForObjective(objective)` -> snapshot freshness pill
  (`data-freshness` colour rules); first 3 observations
  (`formatActyTimestamp` + `readNote`) with a "+K more" overflow; empty state
  "No observations recorded yet."
- NEW `rollup/ObjectiveRollupSurface.module.css` + `rollup/ObjectiveRollupCard.module.css`
  -- BentoBox tokens, `auto-fill minmax(280px, 1fr)` grid; card `border-left`
  freshness accent.
- [ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx)
  -- now imports `readNote` / `formatActyTimestamp` from the extracted module
  (local copies removed). **NOTE (disclosed):** this de-dup edit is TANGLED with
  foreign WIP in the same file (a `useEffectiveChecklistProgress` refactor) and
  was therefore EXCLUDED from the `ba1d5b8c` commit to avoid sweeping foreign
  work. `observationDisplay.ts` is self-contained and consumed by the rollup card,
  so the codebase compiles; the panel's switch to the shared helpers remains
  uncommitted in the working tree pending the foreign WIP landing.
- [ObserveDashboardLayout.tsx](apps/web/src/v3/observe/dashboard/ObserveDashboardLayout.tsx)
  -- `ObserveDashboardSurface` union extended with `'rollup'`; `effectiveSurface`
  gains a `surface === 'rollup' -> 'rollup'` branch (objective-keyed, no
  `domainId` requirement); render branch mounts `<ObjectiveRollupSurface>`.
- [ObserveLayout.tsx](apps/web/src/v3/observe/ObserveLayout.tsx)
  -- `dashboardSurface` derivation detects `observe/dashboard/rollup` and passes
  `surface="rollup"`.
- [routes/index.tsx](apps/web/src/routes/index.tsx)
  -- `v3ObserveDashboardRollupRoute` (`path: 'observe/dashboard/rollup'`,
  component `ObserveLayout`), registered static-prefix-first among the other
  `observe/dashboard/*` routes.
- [UnifiedLandStateSurface.tsx](apps/web/src/v3/observe/dashboard/UnifiedLandStateSurface.tsx)
  -- a "By objective" header button (beside "Present") navigating to the rollup
  route via `useNavigate`.

## Verification

- **tsc:** `apps/web` isolated to my files -> EXIT 0 (captured `$LASTEXITCODE`
  explicitly after an ambiguous no-output first run). `packages/shared`
  unchanged.
- **vitest (Slice 1):** `observationSource.test.ts` green.
- **Live preview** (typed project, DOM via `preview_eval` + `preview_screenshot`,
  no WebGL hang this session):
  - Slice 1: the 3 chips showed correct counts; `From Act` isolated recorded +
    field-log rows, `Baseline` the null-objective seed rows, `All` everything;
    zero-count chip disabled.
  - Slice 2: "By objective" button navigated to `observe/dashboard/rollup`
    (found by `textContent` via `preview_eval` -- CSS can't select by text);
    38 objective cards with freshness pills; an injected test point produced a
    feed row; the "recorded only" toggle (clicked on the real checkbox so React's
    onChange fired naturally -- a native-setter dispatch had failed to update the
    controlled input) collapsed to 0 cards + "No objectives have recorded
    observations yet."; test point cleaned up. No rendering console errors.

## Process / covenant

Two explicit-path slice commits (own files by name, never `git add -A`;
`git diff --cached --name-only` verified before each -- Slice 2 staged exactly
the 9 intended files, foreign WIP confirmed untouched; committed the moment each
verified per [[feedback-commit-immediately-on-rebased-branches]]). Commit
messages BOM-free UTF-8 via `[System.IO.File]::WriteAllText` + `git commit -F`.
Branch fetched + divergence-checked. The `ActTierExecutionPanel.tsx` helper
de-dup left uncommitted (tangled with foreign WIP, disclosed above). Foreign WIP
untouched ([[feedback-no-deletion]], [[project-branch-rebase]]); CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

**All named deferrals from the objective-link ADR are now resolved.** No new
deferrals introduced.
