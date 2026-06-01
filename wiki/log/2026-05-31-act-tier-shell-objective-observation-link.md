# 2026-05-31 -- Act tier-shell: objective<->observation link + per-objective feed + Observe provenance

**Branch.** `feat/atlas-permaculture` (three explicit-path slice commits
`389bff36` Slice A -> `67926c85` Slice B -> `66aee783` Slice C; rebased
out-of-band, divergence-checked, **not pushed**). Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`. ADR:
[[decisions/2026-05-31-atlas-observe-datapoint-objective-link]] (supersedes
decision #2 of [[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]]
in part).

Closes the two follow-ups the Record-observation ADR deferred *because*
`ObserveDataPoint` carried no link back to the objective that produced it. The
operator explicitly requested the schema change that the prior ADR had listed as
rejected ("add an objective FK -- out of scope"). Two operator decisions this
round: field name **`sourceObjectiveId`** (parity with `sourceActionId` /
`sourceFeedEntryId`); **repeat recordings allowed** (the feed is the persistent
history, so the Record button stays re-armable, no post-record lock).

## Slice A -- Schema + store: the `sourceObjectiveId` link (`389bff36`)

- [dataPoint.schema.ts](packages/shared/src/schemas/observe/dataPoint.schema.ts)
  -- added `sourceObjectiveId: z.string().nullable().default(null)` after
  `sourceFeedEntryId`; header comment extended to note objective provenance.
  `.default(null)` makes the inferred OUTPUT type require the field, so `tsc`
  enumerated every literal needing it (the fan-out below).
- [observeDataPointStore.ts](apps/web/src/store/observeDataPointStore.ts) -- new
  `getByObjective` / `getActiveByObjective` selectors (filter
  `p.sourceObjectiveId === objectiveId`), mirroring `getByDomain`/`getActiveByDomain`;
  persist `version` 1 -> 2 with a `migrate` backfilling
  `sourceObjectiveId: p.sourceObjectiveId ?? null` across `byProject`.
- Literals set to `null`: [builtinObserveDataPoints.ts](apps/web/src/data/builtinObserveDataPoints.ts)
  (seed factory); [routeToDataPoint.ts](apps/web/src/v3/observe/dashboard/domain/routeToDataPoint.ts)
  (feed projection -- enriching from the entry's objective is a named deferred
  item); test fixtures `supersession.test.ts`, `observeFreshness.test.ts`
  (packages/shared), `temporalSeries.test.ts` (apps/web).
- NEW conformance test
  [observeDataPointObjectiveLink.test.ts](apps/web/src/v3/act/tier-shell/__tests__/observeDataPointObjectiveLink.test.ts)
  (3 tests): parse-without-field -> `sourceObjectiveId === null` (backward-compat);
  field round-trips; every `UNIVERSAL_PLAN_OBJECTIVES` id resolves a title via
  `findObjectiveAcrossCatalogues` (guards the Observe chip always resolves).

## Slice B -- Act panel: write the link + render the feed (`67926c85`)

- [ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx):
  - `handleRecord` point literal gains `sourceObjectiveId: objective.id`.
  - Feed derivation: subscribe `useObserveDataPointStore((s) => s.byProject)`;
    `objectiveObservations = useMemo` filter `p.sourceObjectiveId === objective.id`,
    `.slice().sort` by `Date.parse(b.capturedAt) - Date.parse(a.capturedAt)`
    (newest-first; mirrors `useDomainPoints` to dodge the selector-array pitfall).
  - "This need's activity": empty -> `.execEmpty` "No observations recorded.";
    non-empty -> `<ol className={styles.actyList}>` of `.actyRow` (`.actyMeta` =
    `formatActyTimestamp(capturedAt)` + capturedBy; `.actyNote` = `readNote(measurementValue)`).
    Local pure helpers `readNote(mv: unknown)` and `formatActyTimestamp(iso)` added
    (measurementValue is `unknown`; no date util imported here). "Raise follow-up
    need" link kept.
  - **Repeat recordings:** removed the `recorded` `useState` + its `useEffect`
    reset + `|| recorded` in `disabled`; button stays `disabled={!ready}` labelled
    "Record observation". Import trimmed to `useMemo` (dropped useEffect/useState).
    Dropped the now-stale "links by domain, not objective" comment.
- [ActTierExecutionPanel.module.css](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.module.css):
  added `.actyList` / `.actyRow` / `.actyMeta` / `.actyNote` in the existing
  `.evCard` token vocabulary (`var(--color-bg)`, `var(--color-border)`,
  `var(--radius-md)`, muted text).

## Slice C -- Observe dashboard: objective provenance chip (`66aee783`)

- [DomainObservationList.tsx](apps/web/src/v3/observe/dashboard/domain/DomainObservationList.tsx):
  import `findObjectiveAcrossCatalogues` from `@ogden/shared`; in each row's
  `.rowHead` (after `virtualTag`), when `point.sourceObjectiveId` resolves a title
  render `<span className={css.objectiveTag} title="Recorded against a Plan
  objective">{title}</span>`; render nothing if unset/unresolved (no raw id leak).
- [DomainObservationList.module.css](apps/web/src/v3/observe/dashboard/domain/DomainObservationList.module.css):
  `.objectiveTag` -- gold accent pill (`background: rgba(196,162,101,0.16);
  color: #7a5a1f; border: 1px solid rgba(196,162,101,0.6)`), distinct from the
  dashed `.virtualTag` "from field log" hint.

## Verification

- **tsc:** `apps/web` AND `packages/shared` both clean for my files. Slice A/B's
  web tsc runs surfaced a fluctuating set of foreign errors from the in-progress
  TanStack `routeTree.gen.ts` regeneration (compass/true-north route churn in
  ActTools/ActCommandCentrePage/ObserveCommandCentrePage/V3LifecycleSidebar/etc.) --
  confirmed via `git status --porcelain` that every erroring file is foreign-modified
  (` M`), none mine; re-ran isolating tsc once the route tree settled -> WEB_EXIT=0,
  0 errors, none in my files.
- **Live preview** (typed project "Baseline Test Homestead",
  `/v3/project/8a815400-80c3-4413-93a4-0a0030f372d3/act`), DOM via `preview_eval`
  + `preview_screenshot` (no WebGL hang this session):
  - Slice B: selected `s2-terrain`; recorded 2 observations -> feed showed 2 rows
    newest-first; button stayed armed between records (repeat allowed);
    `localStorage['ogden-observe-data-points']` both points carried
    `sourceObjectiveId: "s2-terrain"`.
  - Slice C: Observe -> Climate Domain Detail showed 2 gold "Survey terrain &
    topography" provenance chips on those rows and NONE on the legacy
    null-objective row.
  - Cleaned up the 2 test points afterward.

## Process / covenant

Three explicit-path slice commits (own files by name, never `git add -A`;
`git diff --cached --name-only` before each; committed the moment each verified
per [[feedback-commit-immediately-on-rebased-branches]]). Commit messages written
BOM-free UTF-8 via `[System.IO.File]::WriteAllText` + `git commit -F`. Branch
fetched + divergence-checked. Foreign WIP untouched ([[feedback-no-deletion]],
[[project-branch-rebase]]); CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy.

**Deferred (named):** enrich `routeToDataPoint` field-log projections with
`sourceObjectiveId` (so field-log rows also get a chip); an "from Act"
filter/section on Observe Domain Detail; surface the per-objective feed beyond the
Act panel + Observe list (e.g. a Unified Land State rollup).
