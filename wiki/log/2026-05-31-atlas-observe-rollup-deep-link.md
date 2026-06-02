# 2026-05-31 -- Observe: rollup -> Domain Detail deep-link (pre-filtered "From Act") + observationDisplay de-dup resolved

**Branch.** `feat/atlas-permaculture` (Slice B commit `7ecf69f3`; rebased
out-of-band, fetch + divergence-checked [ahead 35, not behind], **not pushed**).
Plan: `~/.claude/plans/elements-of-this-concept-toasty-ember.md` (final iteration:
"Commit the dangling observationDisplay de-dup (hunk-only) + rollup->Domain Detail
deep-link"). ADR:
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]] (this work adds a
new resolved follow-up). Predecessor:
[[log/2026-05-31-atlas-observe-from-act-filter-objective-rollup]].

Two slices were planned. Slice A turned out already-satisfied by the out-of-band
rebase; Slice B is the deliverable.

## Slice A -- observationDisplay de-dup (RESOLVED via rebase, no new commit)

The plan assumed a dangling, uncommitted `observationDisplay` import de-dup in
`ActTierExecutionPanel.tsx` tangled with foreign `useEffectiveChecklistProgress`
WIP, to be staged hunk-only against HEAD. On inspection the working tree had
**converged**: HEAD already contained BOTH my de-dup import AND the foreign
refactor, landed together via the out-of-band rebase commit `0e028508`
(*fix(v3): single source of truth for Stratum-1 effective progress*). The file
was clean (working == HEAD). Correct action was therefore to make **no commit**
(an empty hunk-only commit would have been spurious) and record that the de-dup
landed via the rebase. The foreign refactor was left untouched throughout
([[feedback-no-deletion]], [[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]] -- the "uncommitted work gets
wiped/landed by external rebases" note held exactly).

## Slice B -- rollup card deep-link into pre-filtered Domain Detail (`7ecf69f3`, 8 files)

Each `ObjectiveRollupCard` (Surface 4) gains a dedicated "View in Domain Detail"
link that navigates to the objective's primary-domain Domain Detail (Surface 2)
with the source filter pre-set to "From Act", closing the rollup -> detail loop.
Router: TanStack Router v1.79 (`navigate({ to, params, search })`, typed
`validateSearch`).

- [routes/index.tsx](apps/web/src/routes/index.tsx) -- `validateSearch` on
  `v3ObserveDashboardDomainRoute` narrows `?source=` to the `SourceFilter` union
  (`'act' | 'baseline' | 'all'`, else `undefined`); idiom mirrored from
  `v3PortfolioObserveCompareRoute`. A wrong `search` key now fails `tsc`.
- [ObserveLayout.tsx](apps/web/src/v3/observe/ObserveLayout.tsx) -- the existing
  `useSearch({ strict: false })` cast gains `source?: SourceFilter`; passes
  `initialSource={search.source ?? null}` to `<ObserveDashboardLayout>`.
- [ObserveDashboardLayout.tsx](apps/web/src/v3/observe/dashboard/ObserveDashboardLayout.tsx)
  -- `initialSource?: SourceFilter | null` prop, forwarded to
  `<DomainDetailLayout initialSourceFilter={initialSource ?? undefined}>` in the
  domain branch only.
- [DomainDetailLayout.tsx](apps/web/src/v3/observe/dashboard/domain/DomainDetailLayout.tsx)
  -- `initialSourceFilter?: SourceFilter` prop; passed to the list AND folded into
  its key `${domainId}:${initialSourceFilter ?? 'all'}` so a fresh deep-link
  re-seeds the same domain.
- [DomainObservationList.tsx](apps/web/src/v3/observe/dashboard/domain/DomainObservationList.tsx)
  -- `initialSourceFilter?: SourceFilter` prop; state seed
  `useState<SourceFilter>(initialSourceFilter ?? 'all')`. Manual chip changes
  after mount still win.
- [rollup/ObjectiveRollupSurface.tsx](apps/web/src/v3/observe/dashboard/rollup/ObjectiveRollupSurface.tsx)
  -- adds the already-computed `domain` to each row object; passes
  `projectId` + `domainId={row.domain}` to the card.
- [rollup/ObjectiveRollupCard.tsx](apps/web/src/v3/observe/dashboard/rollup/ObjectiveRollupCard.tsx)
  -- `projectId` + `domainId: UniversalDomain | null` props; `useNavigate`;
  `ArrowUpRight` icon; renders the `.detailLink` button only when
  `domainId !== null`, `onClick` -> `navigate({ to: '.../domain/$domainId',
  params: { projectId, domainId }, search: { source: 'act' } })`.
- [rollup/ObjectiveRollupCard.module.css](apps/web/src/v3/observe/dashboard/rollup/ObjectiveRollupCard.module.css)
  -- `.detailLink` (muted default, `--color-primary` hover, `:focus-visible`
  outline), subtle inline text/icon link, no feed-layout disruption.

## Verification

- **tsc:** `apps/web` -> EXIT 0 (captured `$LASTEXITCODE`; the typed
  `validateSearch` makes the `navigate` `search` type-safe).
- **vitest:** `src/v3/observe/dashboard/domain` -> 11/11 green
  (`observationSource` + `routeToDataPoint` suites; no test changes).
- **Live preview** (typed project "Baseline Test Homestead", DOM via
  `preview_eval` + a `preview_screenshot` of the rollup surface, no WebGL hang):
  - Rollup surface rendered 38 cards, each with a "View in Domain Detail" link.
  - Clicking a card link navigated to that domain's Domain Detail with
    `location.search === '?source=act'`.
  - On a domain with observations (`climate`), the deep-link seeded the
    **"From Act"** chip as `aria-pressed=true` (not "All"); manually clicking
    "All" switched and stuck (read after the React flush -- a same-tick read
    showed stale DOM).
  - Domains with zero observations early-return the whole-domain empty state (no
    chip group) -- expected; the seed only sets initial state.

## Process / covenant

Slice B = one cohesive 8-file explicit-path commit (staged by exact name, never
`git add -A`; `git diff --cached --name-only` confirmed the index was empty
before staging and held exactly the 8 files after; committed the moment it
verified). BOM-free UTF-8 message via `[System.IO.File]::WriteAllText` +
`git commit -F`; `Co-Authored-By: Claude Opus 4.8` trailer; ASCII-only copy.
Branch fetched + divergence-checked, **not pushed**. Foreign WIP confirmed intact
after commit (117 still-modified files + the untracked `apps/web/src/v3/strata/`
module present and untouched). Slice A made no commit (de-dup already in HEAD via
rebase `0e028508`). CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).

**All named deferrals from the objective-link ADR remain resolved; the
rollup -> detail loop is now closed. No new deferrals introduced.**
