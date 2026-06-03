# 2026-06-03 -- Closed-loop Plan->Act workflow: Slice A1 (Loop Design Score helper + panel)

**Branch:** `feat/atlas-permaculture`
**Commit:** `55eeb943` -- loopDesignScore helper + LoopDesignScorePanel + dashboard
dedupe (6 files +443/-7; **not pushed**).
Second slice of the multi-session Plan->Act closed-loop / waste-vector workflow.
See ADR [[decisions/2026-06-03-olos-plan-act-closed-loop-workflow]] and entity
[[entities/closed-loop-workflow]].

## Context

Slice A0 fixed the shared data-model contract (the 4 optional MaterialFlow
design-intent fields + `flowStatusModel.ts` resolvers). Slice A1 builds the first
read-only Plan-side surface on top of it: a whole-surface "Loop Design Score" for
PLAN Module 5 (Waste-to-resource vectors), plus the extraction of the existing
loop-efficiency math into a single shared, tested helper.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (6 files)

**Create**
- `apps/web/src/features/plan/closedLoop/loopDesignScore.ts` -- pure, render-free.
  `computeLoopDesignScore(flows, orphanCount)` returns `flowCount`, `closedLoopPct`,
  `orphanCount`, `withCadencePct`, `atRiskCount`, `overallScore` (0-100) and a banded
  `tier` (`none`/`nascent`/`developing`/`good`/`excellent`). Weighted base
  `0.6*closedLoopPct + 0.4*withCadencePct`, docked by capped penalties
  (orphan: `min(n,5)*5`, cap 25; at-risk: `min(n,5)*4`, cap 20), clamped 0-100.
  Empty input -> all-zeros / tier `none`; negative `orphanCount` normalized to 0.
  Exports `efficiency(fs)` (the share of flows with BOTH endpoints pinned) +
  `LOOP_DESIGN_TIER_CONFIG` (label/tone per tier). At-risk uses
  `resolveOperationalStatus` from A0's `flowStatusModel`.
- `apps/web/src/features/plan/closedLoop/LoopDesignScorePanel.tsx` -- presentational
  strip. Reads project-scoped `materialFlows` + `useClosedLoopValidation` orphan
  counts (`orphanFertility.length + isolatedFeatures.length`), hands them to the pure
  helper, renders the score ("--" when flowCount 0), `/ 100`, a tier badge
  (`data-tone`), and a metric `<dl>` (closed-loop %, cadence %, at-risk, orphans, the
  latter two amber via `data-warn` when > 0). `data-testid="loop-design-score"`.
- `apps/web/src/features/plan/closedLoop/LoopDesignScorePanel.module.css` -- ASCII-only;
  tokens mirror the sibling WasteVectorDashboardView palette (`--color-hairline`,
  `--color-text`, `--color-text-dim`, `--color-gold-rgb`).
- `apps/web/src/features/plan/closedLoop/__tests__/loopDesignScore.test.ts` -- 10 tests
  (`@vitest-environment happy-dom`, since the helper transitively imports
  `closedLoopStore` via `flowStatusModel` -- A0's test-env lesson):
  efficiency empty/partial(67)/full(100); compute empty->zeros/none;
  all-closed-with-cadence->100/excellent; at-risk counting; penalty clamp at 0/nascent;
  negative orphan normalized; partial loop (all closed, no cadence) -> 60/good; tier
  config labels non-empty.

**Modify**
- `apps/web/src/features/plan/WasteVectorDashboardView.tsx` -- delete the local
  `efficiency()` and import it from `loopDesignScore.ts` (dedupe; the dashboard badge
  and the new score strip can never disagree).
- `apps/web/src/features/plan/WasteVectorTool.tsx` -- mount `<LoopDesignScorePanel>`
  above the List/Dashboard switcher (visible in both views).

## Verification

- **Typecheck:** web `tsc --noEmit` EXIT 0; shared `tsc --noEmit` EXIT 0 (run
  SEPARATELY; web tsc needs `node --max-old-space-size=8192` or it OOMs, exit 134).
- **Vitest (bounded, `--pool=forks --testTimeout=20000`, from `apps/web`):** 10/10 green.
- **Live-verify limitation (honesty gate).** The WasteVectorTool host surface is the
  legacy `PlanModuleSlideUp` "soil" module (card `plan-waste-vectors`), gated by
  `slideUpOpen` in `PlanLayout`. The current v3 Plan route renders the strata-spine IA
  (S1-S7 objectives), and navigation through stratum/objective/Design toggles did not
  surface the legacy slide-up; `data-testid="loop-design-score"` never mounted under
  automation. Per [[project-screenshot-hang]] honesty discipline, the live score strip
  was NOT exercised on a live MTC surface this slice. Evidence basis: the passing 10/10
  unit suite + clean web/shared typecheck + a clean project-scoped store read. Two
  dev-injected MTC test flows (`wv-test-1`, `wv-test-2`) were seeded into
  `ogden-closed-loop` during the navigation attempt and then REMOVED;
  `state.materialFlows` confirmed `[]` at version 3 afterward.
  Follow-up: when a slice re-exposes WasteVectorTool through the strata IA (or A4's
  "Loop / Handoff" tab lands), do the deferred live render-verify of the strip.

## Commit shape

Explicit-path commit (`git add --` the 6 files only), guarded with `Compare-Object`
(intended == staged) run atomically with `git commit -F` in one shell invocation.
Heavy foreign WIP in the working tree left untouched -- never `git add -A`. Commit-only
(not pushed). ASCII-only; JS/JSON apostrophes double-quoted; message via system temp +
`git commit -F` ([[feedback-commit-immediately-on-rebased-branches]],
[[project-branch-rebase]]).

## State after

Plan Module 5 now has a shared loop scorer + read-only strip. Next: Slice A2 --
`loopIntegrity.ts` (+test), `FlowDetailPanel.tsx` (per-flow editor: status/cadence
selects, via-node multi-select, activeMonths), selectable WasteVectorListView rows,
and extracting `parsePositive` into `flowFormUtils.ts`. CSRA untouched
([[fiqh-csra-erased-2026-05-04]]).
