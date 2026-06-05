# 2026-06-02 -- Objective -> formula binding: live livestock calculators + auto-satisfy + draw-tool wiring

**Branch:** `feat/atlas-permaculture`
**Plan:** "Wire livestock objectives to legacy formulas + draw tools" (7 phases, approved
2026-06-01).
**Commits (in order):**
- `fcb41bcc` -- schema + catalogue: `ObjectiveFormulaId`/`formulaBinding` + `ckF`,
  silvopasture "Calculate..." items bound, `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries +
  `actToolCoverage` test (Phases 1-2)
- `12c66cc7` -- app-layer formula catalogue + result widgets + two pure math modules
  (Phase 3)
- `ed439719` -- render live formula results in `ObjectiveDetailPanel`
  (`FormulaResultSection`) (Phase 4)
- `b710b1f6` -- auto-satisfy checklist items from computed livestock formulas
  (effectiveProgress 6th-arg union + `useObjectiveFormulaProgress` + 3 consumers + tests)
  (Phases 5-6)

(Foreign commit `74e62b28`, CanopySuccessionCard "<1%" share, interleaved between
`12c66cc7` and `ed439719` via the out-of-band rebase -- not mine.)

## Context

The v3 silvopasture objective catalogue was authored independently of two heavily-invested
systems: the **livestock formula engine** (~3,000 LOC of pure, tested `compute*` functions
in `features/livestock/`, still alive in v2 dashboards + v3 cards) and the **map draw
tools** (`useMapboxDrawTool` writing to `livestockStore`). The objectives linked to
neither: checklist items read "Calculate carrying capacity..." as plain prose with no link
to the functions that compute exactly that; `legacyCardSectionId` was used 0 times; and the
objectives were absent from `OBJECTIVE_ACT_TOOLS_OVERRIDE`, so generic stratum defaults
omitted `paddocks`/`fencing`/`gates`. The goal: a steward on S4 "Paddock layout &
rotational grazing framework" sees the live calculator in the objective, the matching draw
tools armed in Act, and a "Calculate..." item self-completes once a usable result exists --
all by **reuse**, nothing rebuilt.

## What shipped

**Phase 1-2 -- Schema + catalogue + draw tools (`fcb41bcc`, packages/shared).** Optional,
additive `formulaBinding` on `PlanDecisionChecklistItemSchema`: new `ObjectiveFormulaId`
enum (6 ids -- `carrying-capacity-seasonal`, `paddock-system-capacity`,
`paddock-stocking-density`, `stock-water-demand`, `forage-carrying-capacity`,
`enterprise-break-even`) + `ObjectiveFormulaBindingSchema { formulaId,
satisfiesWhenComputed?, resultLabel? }`, exported from the barrel; new `ckF` authoring
helper mirroring `ckA`. Targeted silvopasture "Calculate..." items converted `ck` -> `ckF`
(carrying-capacity / stocking / water / forage as `satisfiesWhenComputed`, stocking-density
advisory). Verified `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries added (paddocks/fencing/gates on
S4-S5, water tools on S3, pasture/transect on S2/S6) using only `ACT_TOOL_CATALOG` ids;
non-spatial items `[]` + `gap:` comments. `actToolCoverage.test.ts` extended. Optional field
-> all existing catalogue/grounding/shared tests validate unchanged.

**Phase 3 -- App formula catalogue + widgets (`12c66cc7`, apps/web).**
`v3/plan/strata/formulaCatalog.ts` = exhaustive `Record<ObjectiveFormulaId, FormulaSpec>`
(`{ id, label, Widget: lazy(), summarize }`); `resolveFormula(id)`. Each `summarize` is
**hook-free** (reads stores via `*.getState()`, filtered `p.projectId === projectId`) ->
`{ hasResult, display }`. Two NEW pure, ecological-only math modules back the widgets:
`features/livestock/stockWaterDemandMath.ts` (`DEMAND_PER_HEAD_LPD = 60`;
`head = stockingDensity x areaHa`, `demand = head x 60`) and
`forageCarryingCapacityMath.ts` (`precipToCapacityFactor` + `computeForageCarryingCapacity`
reusing `LIVESTOCK_SPECIES.typicalStocking` + `AU_FACTORS`). The S7 break-even widget is a
deliberate **placeholder** (`BreakEvenPlaceholderWidget` -- heading + "financial wiring lands
in a later slice", NO inputs/numbers/financial framing).

**Phase 4 -- Render (`ed439719`, apps/web).** `FormulaResultSection.tsx` +
`.module.css` collects `objective.checklist.filter(i => i.formulaBinding)`, returns `null`
when none (non-livestock panels untouched, no chunk cost), renders each via
`resolveFormula(binding.formulaId).Widget` inside `Suspense` + a copied `CardErrorBoundary`
(`data-testid="plan-objective-formulas"`, eyebrow "Live calculations"). Mounted in
`ObjectiveDetailPanel` between `DecisionChecklist` and `ParameterGroup`.

**Phase 5-6 -- Auto-satisfy + tests (`b710b1f6`, apps/web).** `computeEffectiveProgress`
gains an OPTIONAL 6th arg `formulaSatisfiedItemIds?: ReadonlySet<string>` unioned into the
flat map exactly like the answerSpec (5th-arg) path -- **the module imports no store and
stays pure**. New `useObjectiveFormulaProgress.ts` does all store reads:
`collectFormulaSatisfiedItemIds(projectId, objectives)` (React-free; iterates
`satisfiesWhenComputed` items, adds id when `resolveFormula(id).summarize(projectId).hasResult`)
+ `useObjectiveFormulaProgress` (subscribes to `useLivestockStore.paddocks`,
`useRotationPlanStore.byProject[projectId]`, `useSiteDataStore.dataByProject[projectId]`).
All three effective-progress consumers pass the per-project Set: the Plan hook
`useEffectiveChecklistProgress`, plus the batch readers `usePortfolioPlanProgress` and
`useProjectUrgency` (each newly subscribed to the 3 slices). Tests: a pure-union case in
`computeEffectiveProgress.test.ts`; 4-case `useObjectiveFormulaProgress.test.ts` (collects a
satisfiesWhenComputed item once its formula has a result; never an advisory binding; never
break-even; per-project isolation); 2-case `FormulaResultSection.test.tsx` render smoke.

## Covenant (Amanah Gate)

The S7 `enterprise-break-even` binding is **math only**: the widget is a placeholder with no
financial framing and its `summarize` ALWAYS returns `{ hasResult:false }`, so break-even
**never auto-satisfies**. It does NOT reintroduce advance-sale / CSRA / salam framing
([[fiqh-csra-erased-2026-05-04]]); financial wiring is deferred to a later slice under
Scholar Council review (operator chose "Defer break-even"). All other formulas are
strictly ecological. No riba/gharar surface. No-deletion respected -- the legacy engine +
draw tools are reused untouched, all changes additive.

## Verification

`@ogden/web` typecheck EXIT 0 (8GB `tsc --noEmit`; bare `tsc` OOMs on this machine at
~3.9GB). Web **production build green** (`tsc && vite build` with
`NODE_OPTIONS=--max-old-space-size=8192`, `built in 43.79s`, all chunks + PWA). The
`postbuild` `prerender:showcase` fails only on bare-`pnpm`-not-on-PATH (env quirk, we invoke
via `corepack pnpm`) -- not a code defect; the compile+bundle that matters passed. **19
vitest tests green** (bounded `--pool=forks --test-timeout=20000` per
[[feedback-vitest-bounded-runs]]) incl. the pure-union, formula-progress, and
`FormulaResultSection` render smoke. **Live in-app module smoke** (real Vite dev server on
:5200, via `preview_eval` dynamic import): all 6 formula ids resolve; a seeded paddock
(1ha x 5 head/ha sheep) -> `summarize('pZ')` = `{ hasResult:true, display:"300 L/day total" }`;
`collectFormulaSatisfiedItemIds('pZ', ...)` = `Set(['water-auto'])`; per-project isolation
holds (`'other'` -> empty); break-even excluded; `computeEffectiveProgress(..., set)` unions
the id (verified after a `?bust=` cache-bust forced a fresh transform -- the long-running
dev server held a stale pre-Phase-5 5-param module, NOT a bug, mirroring
[[log/2026-05-31-act-tier-shell-objective-observation-link]]'s Vite HMR-staleness finding).

**Disclosed limit ([[project-screenshot-hang]]):** a literal in-app **screenshot** of the
S4 panel rendering the live widget + armed draw tools was NOT captured. `preview_screenshot`
hangs on an unrelated, pre-existing `DebugCanopyCard` crash on `/v3/components` (error-boundary
recreate loop). Per the CLAUDE.md rule ("if the screenshot tool is unresponsive, say so
rather than assuming success") this is reported, not claimed -- the logic it would show is
proven by the runtime smoke above, but the pixels are not.

## Commit shape

Each verified slice committed immediately by **explicit path** (never `git add -A`) to
survive out-of-band rebases ([[feedback-commit-immediately-on-rebased-branches]],
[[project-branch-rebase]]); the heavy foreign WIP in the working tree (financial, economics,
maps, CSS, graphify-out, scratch `_*.txt`/`.py`) left untouched ([[feedback-no-deletion]]).
Not pushed at feature-commit time; this session's documentation commit pushed on operator
request after a fetch + divergence re-check (ahead 17/behind 0 -- fast-forward). CSRA
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

## Deferred (not closed here)

- Break-even **financial wiring** (math-only placeholder ships now; needs Scholar Council).
- Optional `legacyCardSectionId` add-on on silv-s4/silv-s5 (own later slice).
- Entity-page fold-in (`entities/shared-package.md`, `entities/web-app.md`) + `index.md` --
  both mid-edit by parallel sessions in the working tree, so NOT folded in this commit to
  avoid entangling foreign WIP; recommended for a clean follow-up.

## State after

Objective -> formula binding **complete + committed** (`fcb41bcc` -> `12c66cc7` ->
`ed439719` -> `b710b1f6`): the silvopasture objectives surface live, project-scoped
livestock calculators, arm the matching draw tools in Act, and self-complete their
"Calculate..." items through the one effective-progress source of truth. `packages/shared`
app-dep-free; `effectiveProgress.ts` pure. ADR
[[decisions/2026-06-02-atlas-objective-formula-binding]]; entities [[entities/shared-package]]
+ [[entities/web-app]].
