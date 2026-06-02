# ADR: Objective -> formula binding (live livestock calculators + auto-satisfy + draw-tool wiring)

**Date:** 2026-06-02
**Status:** accepted

**Context:**
The v3 objective-driven Plan flow (the 7-stratum silvopasture catalogue) was authored
*independently* of two systems the team had already invested heavily in, leaving them
unconnected:
1. **The livestock formula engine** -- ~3,000 LOC of pure, tested `compute*` functions in
   `apps/web/src/features/livestock/` (seasonal carrying capacity, recommended stocking,
   rotation carrying capacity, water/welfare). Still imported by v2 dashboards and a few
   v3 cards -- alive, not dead.
2. **The map drawing tools** -- `@mapbox/mapbox-gl-draw` paddock/pasture/fence tools,
   reused in v3 via `useMapboxDrawTool.ts`, writing to `livestockStore`.

The silvopasture objectives referenced neither: their checklist items literally read
"Calculate carrying capacity..." / "Calculate total carrying capacity of defined paddock
system" as **plain text** with no link to the functions that do exactly that;
`legacyCardSectionId` (the one schema bridge to legacy cards) was used 0 times; and the
objectives were absent from `OBJECTIVE_ACT_TOOLS_OVERRIDE`, so they fell to generic
stratum defaults that omit `paddocks`/`fencing`/`gates` at the relevant strata. A steward
working "Paddock layout & rotational grazing framework" (S4) saw neither the live
calculator nor the matching draw tools, and no "Calculate..." item could self-complete.

**Decision:**
Wire the objectives to BOTH systems by **reuse**, mirroring the two proven string-id
patterns already in the codebase (`answerSpec` for auto-satisfy; `objectiveActTools` for
tool ids) so `packages/shared` stays free of app-layer deps -- **shared holds ids+config,
`apps/web` joins ids -> real functions/components**.

1. **Schema (shared, additive/optional).** New `ObjectiveFormulaId` enum (6 ids:
   `carrying-capacity-seasonal`, `paddock-system-capacity`, `paddock-stocking-density`,
   `stock-water-demand`, `forage-carrying-capacity`, `enterprise-break-even`) +
   `ObjectiveFormulaBindingSchema { formulaId, satisfiesWhenComputed?, resultLabel? }`,
   added as optional `formulaBinding` on `PlanDecisionChecklistItemSchema`. New `ckF`
   authoring helper mirrors `ckA`. Optional -> every existing seed/catalogue object
   validates unchanged.
2. **App-layer formula catalogue.** `apps/web/src/v3/plan/strata/formulaCatalog.ts` is an
   exhaustive `Record<ObjectiveFormulaId, FormulaSpec>` (`{ id, label, Widget, summarize }`).
   Each `Widget` is `lazy()` and each `summarize(projectId)` is **hook-free** (reads stores
   via `*.getState()`, filtered to `p.projectId === projectId`) returning
   `{ hasResult, display }`. Two new pure math modules back the widgets
   (`stockWaterDemandMath.ts`, `forageCarryingCapacityMath.ts`); both ecological-only.
3. **Render.** `FormulaResultSection` in `ObjectiveDetailPanel` collects the objective's
   `formulaBinding` items, returns `null` when none (non-livestock panels untouched), and
   renders each widget inside `Suspense` + a `CardErrorBoundary`.
4. **Completion feeding -- keep the pure resolver pure.** `computeEffectiveProgress` gains
   an OPTIONAL 6th arg `formulaSatisfiedItemIds?: ReadonlySet<string>` unioned into the
   flat map exactly like the `answerSpec` (5th-arg `metadata`) path -- the module imports
   no store and stays unit-testable. A new `useObjectiveFormulaProgress.ts` does all the
   store reads: `collectFormulaSatisfiedItemIds(projectId, objectives)` (React-free) +
   `useObjectiveFormulaProgress` (subscribes to livestock/rotation/site-data slices). All
   three effective-progress consumers (the Plan hook `useEffectiveChecklistProgress`, plus
   the batch readers `usePortfolioPlanProgress` and `useProjectUrgency`) pass the per-project
   Set, so a computed formula advances the completion gate the same way everywhere.
5. **Draw tools.** Verified silvopasture entries added to `OBJECTIVE_ACT_TOOLS_OVERRIDE`
   (paddocks/fencing/gates on S4-S5, water tools on S3, pasture/transect on S2/S6), using
   only tool ids present in `ACT_TOOL_CATALOG`; non-spatial / pure-decision items get `[]`
   with `gap:` comments, as the existing entries do.

**Amanah (covenant):** halal -- wiring existing calculators and reusing prior work, all
additive (no-deletion respected). The S7 `enterprise-break-even` binding is **math only**:
its widget is a deliberate placeholder (`BreakEvenPlaceholderWidget`, no inputs/numbers/
financial framing) and its `summarize` ALWAYS returns `{ hasResult:false }`, so break-even
**never auto-satisfies** -- it does NOT reintroduce advance-sale / CSRA / salam framing
([[fiqh-csra-erased-2026-05-04]]). Financial wiring is deferred to a later slice under
Scholar Council review (operator chose "Defer break-even").

**Consequences:**
- A steward on a livestock objective now sees the live, project-scoped calculator inside
  the objective; the matching draw tools are armed in Act; and a `satisfiesWhenComputed`
  item self-completes once a usable result exists, advancing the progress bar / portfolio
  card / urgency score through the one effective-progress source of truth.
- `packages/shared` stays app-dep-free; `effectiveProgress.ts` stays pure (verified by its
  existing unit tests + a new pure-union test). The Plan route stays lean for non-livestock
  projects (widgets are `lazy()`; the section returns `null` with no binding).
- **Deferred:** break-even financial wiring (math-only placeholder ships now); optional
  `legacyCardSectionId` add-on on silv-s4/silv-s5; project-namespacing `useLivestockStore`
  (filter-by-projectId is sufficient now).
- **Verification limit:** the end-to-end draw-paddock -> auto-satisfy flow was proven at
  runtime (typecheck + clean production build + 19 green tests incl. a Testing-Library
  render smoke + a live in-app module smoke exercising store -> summarize -> collect ->
  union), but a literal in-app **screenshot** was NOT captured -- `preview_screenshot` hangs
  on an unrelated pre-existing `DebugCanopyCard` crash on the `/v3/components` route
  ([[project-screenshot-hang]]). Not claimed as visually confirmed.

See [[log/2026-06-02-atlas-objective-formula-binding]], [[entities/shared-package]],
[[entities/web-app]].
