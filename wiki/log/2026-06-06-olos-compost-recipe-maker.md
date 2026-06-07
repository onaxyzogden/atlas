# 2026-06-06 -- Compost vertical: local-only Recipe Maker in the Plan stage

**Branch:** `feat/structured-capture-forms`
**Commit:** `c0ca14b5` -- `feat(compost): port local-only Recipe Maker into Plan
stage` (3 files, +639/-49; **commit-only, then pushed -- see below**). Additive
follow-on to the Phase 3 compost frontend; touches NO server/sync/store wiring.
See ADR [[decisions/2026-06-03-olos-thermophilic-compost-vertical]] and Phase-3
log [[log/2026-06-03-olos-compost-phase3-frontend]].

## Context

The operator supplied an updated single-file prototype
(`C:\Users\MY OWN AXIS\Downloads\compost_olos.jsx`, 1589 lines) and asked to
"update to match this file." A full diff of the reference against the four live
compost components + `model.ts` showed everything already matched -- Act,
Observe, the degrees-C display, `TempCurve`, `PhaseComparison`, the 3-pane
shell, and the Phase-3 server-persistence wiring -- **except one feature:** the
Plan stage's "recipe" section. The live recipe tab was a static read-only layer
list + a fixed browns/greens bar; the reference replaces it with an interactive
3-step **Recipe Maker**.

**Decision (operator-confirmed, AskUserQuestion): keep it local-only /
ephemeral -- an exact match to the reference.** `selectedPlant`,
`materialInputs`, `confirmedRecipe` are component state; the C:N math is pure
functions. It **never calls `useCompostStore` or the API**, so the change is
additive and non-destructive to the Phase-3 server-persistence wiring
(`useCompostStore`, `compostSync`, `apiClient.compost`) -- none of which is
touched. Persisting a confirmed recipe to the org-shared pile is an explicitly
deferred idea, not in scope.

Amanah gate: hifz al-bi'a (Environment maqsad); no riba/gharar; no
CSRA/advance-purchase framing ([[fiqh-csra-erased-2026-05-04]]). Clean.

## What shipped (3 files, all under `apps/web/src/compost/`)

**Modify**
- `model.ts` -- appended a typed Recipe Maker section after `fToCStr` (the
  existing `C`, `F`, `fToC`, `PLAN_RECIPE`, `READINGS`, etc. exports are
  unchanged). New **types** `RecipeTemplateKey = 'bacteria' | 'fungi'`,
  `RecipeTemplate`, `PlantType`, `FeedstockCategory = 'highN' | 'green' |
  'brown'`, `Feedstock`, `RatioBreakdown`, `MaterialInputs =
  Record<string, number>`; **constants** `TARGET_BUCKETS = 35`, `BUCKET_L = 18.9`,
  `TEMPLATES` (bacteria highN/green/brown 0.2/0.45/0.35, fungi 0.15/0.35/0.5,
  each with target-C:N band + colour), `PLANT_TYPES` (10, emoji icons retained),
  `FEEDSTOCK_LIBRARY` (6 high-N / 6 green / 8 brown), `ALL_MATERIALS`,
  `ZERO_INPUTS`; **pure helpers** `buildTemplateInputs(key)`,
  `calcBlendedCN(inputs)`, `calcRatios(inputs)`.
- `PlanStage.tsx` -- replaced ONLY the `activeSection === "recipe"` centre + right
  panes with the reference's 3-step Recipe Maker; **`objectives` and `checklist`
  sections, the `pile = useCompostStore(s => s.pile) ?? PLAN_RECIPE` read, Pile
  Vitals, and Plan progress are untouched** ([[feedback-no-deletion]]). Local
  state `recipeStep` (`'plant'|'inputs'|'result'`), `selectedPlant`,
  `selectedTemplate`, `materialInputs`, `confirmedRecipe`; derived
  `blendedCN`/`ratios` via `useMemo`; handlers `applyTemplate`, `nudgeCategory`,
  `rebalanceToTemplate`, `handleSelectPlant`, `handleConfirmRecipe`, inner
  `MaterialSlider`. Pile Vitals gained a live C:N read-out (`blendedCN` when a
  recipe is in progress, else `pile.cnRatio`) + a "Total buckets" row + a
  selected-plant target block. Production's fixed-width panes (left 228px,
  centre 310px, right flex) and `F.serif` title styling are preserved -- the
  reference's inline `flex: 2/3/5` was NOT adopted.
- `CompostWorkspace.module.css` -- added three `input[type='range']` reset rules
  scoped under `.workspace` (strip native appearance + hide the native thumb) so
  the Recipe Maker's custom-drawn slider thumb renders singly, not doubled.

## The C:N math (Cornell dry-mass weighted harmonic mean)

`calcBlendedCN` mirrors the reference verbatim: each material's dry mass
`D_i = buckets x BUCKET_L (18.9 L) x bd (bulk density) x (1 - mf (moisture
fraction))`; the blended ratio is the dry-mass-weighted harmonic mean
`R_mix = sum(D_i) / sum(D_i / cn_i)`. Materials with `cn === 999` (wood ash --
carbon but effectively no nitrogen) are **excluded** from both sums so they do
not distort the ratio. Source: Cornell Waste Management Institute / NRAES-54,
cited in the reference comments. `calcRatios` returns the per-category and
per-material dry-mass shares that drive the live ratio bar and the Step-3
contribution bars.

## Verification

- **Typecheck:** `apps/web` `lint` script == `tsc --noEmit`
  (`node --max-old-space-size=8192 .../tsc --noEmit`) -- **EXIT 0**, zero errors.
  Handled NodeNext strictness: `Object.entries(TEMPLATES)` cast to
  `[RecipeTemplateKey, ...][]`, the category array annotated with its literal
  `FeedstockCategory` keys, Step-2 guarded by `selectedPlant &&` for narrowing,
  `handleConfirmRecipe` using `.flatMap` with an `if (!mat) return []` guard.
- **Live gate (DOM-verified on `/compost`, web dev server port 5200):**
  `preview_screenshot` hung on the known dead-API transient (sync layer retries
  `localhost:3001` ECONNREFUSED) -- NOT a tool defect ([[project-screenshot-hang]]);
  `/compost` is map-free, so the documented `preview_eval` DOM-inspection
  substitute was used end to end. **Step 1:** 10 plant cards; "Fruit Trees" ->
  pre-selects "Fungi-Dominant", target 20-28:1, Continue enabled, plant summary
  + agronomic note render. **Step 2:** 20 sliders (6/6/8) preload to the
  template (33 buckets), live ratio bar + blended-C:N needle + "WHY HIGH-N
  MATTERS FOR THERMOPHILIC HEAT" panel; category nudges update live; "Rebalance"
  snapped 33 -> 36.5 buckets back to template ratios. **Step 3:** Confirmed
  banner + Material Contributions bars + Agronomic Note; "Start over" resets to
  Step 1. **No regression:** Objectives/Checklist still render from `pile`; Act
  (Day 35, 61.1 C, Thermophilic) and Observe (Temperature Curve + Phase Analysis,
  3 SVGs) unchanged. Only the expected API-unreachable console error.
  (A CSS `text-transform: uppercase` header caused one false-negative DOM search
  -- Chrome `innerText` returns the rendered uppercase text; re-searched with the
  uppercase string and confirmed.)

## Commit + push shape

Explicit-path commit (`git add --` only the 3 compost files), verified
staged == intended via `Compare-Object` before `git commit`; the ~17 unrelated
dirty files (wiki WIP, scratch) were left untouched -- never `git add -A`
([[feedback-commit-immediately-on-rebased-branches]]). Per the operator's
explicit "commit, push" instruction this session, the commit was then pushed
after a `git fetch` + divergence check on `feat/structured-capture-forms`
([[project-branch-rebase]]) -- the first push of this branch's compost work.

## State after

The compost Plan stage now offers an interactive, local-only recipe designer
(pick plant -> tune feedstock -> confirm blend) alongside the existing
`pile`-driven objectives/checklist/vitals, with no change to the Phase-3
server-persistence path. The confirmed recipe is ephemeral by design; promoting
it to the org-shared pile (a store/API write) remains the one deferred idea.
Phase 4 (remote sensor ingestion) is still the only outstanding compost phase.
