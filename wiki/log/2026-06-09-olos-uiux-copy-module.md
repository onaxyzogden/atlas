# 2026-06-09 -- OLOS UI/UX trust copy: central copy module + 10 mentor-register rewords

**Branch.** `main` (canonical; Phase 1+2 structured-capture delta merged
out-of-band `763415ee`). **Nothing pushed**
([[project-structured-capture-on-main]], [[project-branch-rebase]]).

Implemented all 10 trust-building UI/UX suggestions from
`OLOS_UIUX_Suggestions.md` (theme "This Thinks The Way I Think") across the v3
Plan -> Act -> Observe surfaces, extracting every reworded user-facing string
into a new central copy module. Operator-locked scope: all 10 / "copy + light
wiring" (defer genuinely new data work) / extract to a copy module.

## The copy module

NEW `apps/web/src/v3/copy/` -- barrel `index.ts` + per-surface `plan.ts` /
`act.ts` / `observe.ts` / `shared.ts` + `__tests__/`. Lives in **`apps/web`,
NOT `packages/shared`** (React-surface chrome; shared stays UI-string-free).
Static strings -> frozen `const` objects; parameterized copy -> pure, store-free,
unit-testable functions: `revisionHeadline(priority, cycleTitle?)`,
`revisionSupporting({eventCount, domains, cycleTitle?})`,
`domainUnansweredQuestion(domain)`, `feedsFallback(names)`,
`observeSignalConfirmation(domainLabel|null)`, `decisionCount(done,total)`.
`DOMAIN_QUESTION` is a `Record<UniversalDomain,string>` exhaustive over all 16
domains -- compiler-enforced AND test-enforced.

## Per-suggestion landing

1. **Language audit** -- static strings moved to the module, reworded to land
   vocabulary (`ACT_COPY`, `OBSERVE_COPY`).
2. **First-Plan-entry sequence line** -- `PLAN_COPY` sub-caption (no new store
   state).
3. **Concrete "feeds into"** -- `feedsFallback(names)` chrome template in
   `ActTierZeroWorkbench` (`item.feedNote` still preferred; authored per-item
   content stays in seed).
4. **Visible Observe signal on first Act task** -- `observeSignalConfirmation()`
   reading the existing `feedKey`; FieldAction has no `domainId` so the Act site
   passes `null`. NO new feed plumbing (`appendObserveFeedFor` already emits).
5. **Mentor-register locked popover** -- `PLAN_COPY.lockedPopover.*`.
6. **Site-survey unlock line** -- copy variants authored; `'default'` selected
   (no site signal one hop away). Terrain auto-detection deferred.
7. **Philosophical post-divergence confirmation** -- in-sheet `confirmation` +
   `confirmCta` after `markDiverged` (no app-level toast infra).
8. **Per-domain Observe empty-state question** -- `domainUnansweredQuestion()`
   on `DomainStatusCard`'s empty state (`observationCount === 0`), the one
   card-shaped surface with room (new `.emptyQuestion` CSS). The 5 COMPACT
   "Not yet observed" label cells (`liveBundle.ts` x2, `mockData.ts`,
   `components.tsx` x2) got the short land reword `OBSERVE_COPY.notYetRead`
   ("Not yet read") -- multi-sentence questions do not fit a status/stat/legend
   cell.
9. **Ecological revision banner** -- `revisionHeadline` /`revisionSupporting`
   reframe events -> "readings" ("The land is asking you to look again" /
   "Field evidence is pulling against your plan" / "New observations since your
   last review"); `PlanRevisionBanner` consumes them, list-joiner gone.
10. **Cycle-name echo** -- functions accept a cycle title; called with `null` at
    `PlanRevisionBanner` (summary lacks it) and `DomainStatusCard` (props lack
    it). Future-cycle metric callbacks deferred.

## Scope held

**Seed-data boundary NOT crossed** -- `feedsInto` / `feedHint` / `feedNote` stay
in `packages/shared/src/constants/plan/`; only the `"Feeds {names}"` chrome
template moved. Double-quoted TS literals, ASCII-only, arrows/icons in JSX only.

## Amanah

Pure land-stewardship copy reword -- no capital/sales-channel/advance-purchase/
financing framing; no riba / gharar / `bay' ma laysa 'indak`; no CSRA / salam
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Cleared
without Scholar-Council routing.

## Verified

Web `tsc` EXIT 0 (8GB heap via the `typecheck` script -- raw `tsc --noEmit`
OOMs ~3.5GB). Bounded `--pool=forks` suites ([[feedback-vitest-bounded-runs]]):
copy-module pure functions incl. the 16-domain exhaustiveness guard +
null-cycle graceful omission; `DecisionWorkingPanel` (55) +
`fieldActionStore.observeWiring` (6); Phase-3 Observe/copy (264); full suite
**4354 pass / 1 pre-existing fail**; lint (== typecheck) green; audit grep for
remaining hardcoded strings clean. DecisionWorkingPanel preview **screenshot**
confirmed the Act copy live. The Observe dashboard could NOT be live-previewed
(dead dev API :3000, no project in localStorage, `/v3` 404) -- verified via
typecheck + tests, reported honestly per CLAUDE.md.

## Flagged (not mine, not fixed)

`workbenchAffordances.test.ts` expects `ev-s1-legal-governance` `showGroups`
false but HEAD source has it `true` -- confirmed via `git show HEAD` outside
this session's change surface (a concurrent S2 land-reading session owns those
files). Pre-existing out-of-band mismatch; touching it needs an operator ask.

## Next

- Push decision (on `main`, requires explicit operator approval).
- Live Observe-dashboard screenshot once the dev API + a seeded project are
  available (the one verification path this pass could not exercise).
- Suggestion 6 terrain auto-detection + suggestion 10 future-cycle metrics when
  their data tails are in scope.

ADR [[decisions/2026-06-09-olos-uiux-copy-module]]; entities
[[entities/act-tier-shell]], [[entities/observe-dashboard]]. Concurrent session:
[[log/2026-06-09-atlas-act-tier0-phase3a-land-reading]].
