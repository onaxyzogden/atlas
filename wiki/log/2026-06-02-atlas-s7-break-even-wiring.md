# 2026-06-02 -- S7 cost-recovery break-even wiring (replaces math-only placeholder)

**Branch:** `feat/atlas-permaculture`
**Plan:** "Design + execute the S7 break-even financial wiring" (Part 2 of the
fold-in/break-even plan; executed under a fresh approval).
**Commits (in order):**
- `549e563d` -- pure cost-recovery break-even core + hook-free assembly + 6 tests
  (Phase 1)
- `a4bd61cb` -- live BreakEvenWidget + real catalogue `summarize` + covenant guard
  test (Phases 2-3)

(The out-of-band rebase interleaved unrelated commits -- `b5f1c9ab`, `7164834d`,
`d1c4ece0`, `3b3f000a` -- between the two; both slices stayed intact + correctly
ordered because each was committed immediately by explicit path
[[feedback-commit-immediately-on-rebased-branches]].)

## Context

The S7 `enterprise-break-even` objective shipped 2026-06-02 as a deliberate,
covenant-safe **placeholder** ([[log/2026-06-02-atlas-objective-formula-binding]]):
`BreakEvenPlaceholderWidget` (no inputs / numbers / financial framing) + a
`summarize` that always returned `{ hasResult:false }`, so it never auto-satisfied.
The deferred work was to replace it with **real cost-recovery break-even** by
reusing the already-complete financial engine -- math only, no advance-sale /
CSRA / salam / ROI / yield framing ([[fiqh-csra-erased-2026-05-04]]).

**Load-bearing engine finding:** `useFinancialModel(projectId)` already computes
break-even with no extra input -- `computeAllCosts -> applyOverrides ->
detectEnterprises -> computeRevenueStreams -> applyRevenueOverrides ->
computeCashflow -> computeBreakEven`. Livestock revenue comes from the regional
benchmark DB; `financialStore.revenueOverrides` (keyed by stream id, e.g.
`revenue-livestock`) is the existing steward-editable refinement path. So no new
pricing field was needed.

## What shipped

**Phase 1 -- pure core (`549e563d`).** Two files so the pure core loads + tests
without Zustand rehydration:
- `features/financial/engine/computeProjectBreakEven.ts` -- pure
  `computeProjectBreakEven(inputs) -> { hasModel, breakEvenYear,
  peakNegativeCashflow }`. Runs the existing engine pipeline and returns ONLY the
  cost-recovery slice. **`tenYearROI` is intentionally dropped and never read.**
  `hasModel = enterprises.length > 0 && totalInvestment.mid > 0`.
- `features/financial/engine/assembleFinancialInputs.ts` -- the hook-free
  `getState()` store-read layer (mirrors `useFinancialModel`'s useMemo body across
  the same nine stores; private `extractSiteContext` copy).

**Phases 2-3 -- live surface (`a4bd61cb`).**
- `formulaCatalog.ts`: `enterprise-break-even` now resolves to `BreakEvenWidget`
  with a real hook-free `summarize` =
  `computeProjectBreakEven(assembleFinancialInputs(projectId))`. `hasResult`
  tracks `hasModel` -- **true even when `breakEvenYear` is null** ("computed even
  if never"), so the S7 c4 item auto-satisfies once a model exists, routed through
  the already-shipped `effectiveProgress` 6th-arg union (no change to
  `effectiveProgress.ts` or its three consumers).
- `formula-widgets/BreakEvenWidget.tsx`: reads ONLY
  `breakEven.breakEvenYear` + `peakNegativeCashflow` from `useFinancialModel`;
  renders cost-recovery year + peak capital outlay. No new input field; revenue is
  refined on the existing Economics `revenueOverrides` path.
- `BreakEvenPlaceholderWidget.tsx` left in place, unmounted
  ([[feedback-no-deletion]]).

## Covenant (Amanah Gate)

Cost-recovery **TIMING math only** -- the year cumulative cashflow first turns
non-negative, plus the peak capital outlay before recovery. The surface NEVER
reads or exposes `tenYearROI` and carries no advance-sale / salam / CSRA /
investor / yield / offer framing ([[fiqh-csra-erased-2026-05-04]]). A covenant
guard test (`breakEvenCovenant.test.tsx`, 6 cases) pins both the rendered widget
text AND the `summarize` display against a forbidden-token list across model /
beyond-horizon / no-model states, and asserts the widget never reads `tenYearROI`
even when present on the model. `packages/shared` untouched (the
`enterprise-break-even` id + `satisfiesWhenComputed:true` already existed).

## Verification

`@ogden/web` typecheck EXIT 0 (8GB `tsc --noEmit`). `tsc && vite build` **green**
(`built in 1m`, all chunks incl. `BreakEvenWidget-*.js`, PWA generated; the
`postbuild prerender:showcase` step fails only on bare-`pnpm`-not-on-PATH env
quirk, not a code defect). **Bounded vitest green** (`--pool=forks
--test-timeout=20000` [[feedback-vitest-bounded-runs]]): the 6 pure-core tests +
6 covenant tests + the full financial suite (~150) + the auto-satisfy /
effective-progress / FormulaResultSection suites (the "never break-even"
auto-satisfy case still holds -- empty stores -> `hasModel:false`).

**Live in-app module smoke** (real Vite dev server on :5200, `preview_eval`
dynamic import with `?bust=`): break-even resolves; a stocked 1ha electric-fenced
cattle paddock -> `{ hasModel:true, year:1, peakMid:-1470 }`; empty features ->
`hasModel:false`; both revenue streams (`revenue-livestock` + `revenue-grants`)
zeroed -> `hasModel:true` but `breakEvenYear.mid:null`; live catalogue `summarize`
on a project with no data -> `{ hasResult:false, display:"Awaiting cost &
enterprise data" }`; return shape has exactly `{hasModel, breakEvenYear,
peakNegativeCashflow}` (no `tenYearROI`).

**Disclosed limit ([[project-screenshot-hang]]):** verification was a live
module-level smoke (the proven map-free path), NOT an in-app screenshot of the S7
panel rendering the widget. Per the CLAUDE.md rule, the wired logic is proven live
but the pixels were not captured.

## Commit shape

Each verified slice committed immediately by **explicit path** (never
`git add -A`) to survive the out-of-band rebase; the heavy foreign WIP + scratch
files in the working tree left untouched ([[feedback-no-deletion]],
[[project-branch-rebase]]). **Not pushed** -- awaiting operator request. ASCII-only
copy.

## Deferred (not closed here)

- Entity-page fold-in (`entities/shared-package.md`, `entities/web-app.md`) +
  `index.md` Decisions entry -- those files still carry unrelated foreign WIP, so
  the break-even note is recorded here (collision-free) and recommended for the
  same clean follow-up as the formula-binding fold-in.
- Pushing both commits (operator request only).
- Housekeeping: `git stash drop stash@{0}` (foreign-wiki-wip backup) + delete the
  temp patch, once the operator confirms.

## State after

S7 break-even is **live + committed** (`549e563d` -> `a4bd61cb`): the silvopasture
S7 objective surfaces a project-scoped cost-recovery readout (recovery year + peak
capital outlay) and self-completes its checklist item once a financial model
exists, through the one effective-progress source of truth. Pure core stays
engine-only (no store import); `packages/shared` app-dep-free. The covenant holds
by construction (only cost-recovery fields exposed) and by test.
