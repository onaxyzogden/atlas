# Atlas Plan Module 7 — Scale-of-Permanence enhancement (designLayer + matrix card)

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 7 — Phasing & Budgeting
**Type:** Additive enhancement following the 2026-05-07 KEEP_ATLAS verdict
**Parent ADR:** [[2026-05-07-atlas-plan-phasing-scholar-keep-atlas]]

## Why

The Permaculture Scholar verdict on Module 7 (filed earlier today as `2026-05-07-atlas-plan-phasing-scholar-keep-atlas.md`) confirmed Atlas's three-card phasing module already mirrors the OSU PDC Pro 5-year × 4-season template, but flagged three deferred enhancements. The first — *Scale-of-Permanence categorisation on tasks* — is the highest-leverage of the three because it addresses the orthodox sequencing rule (Yeomans Keyline: earthworks + water before structures, vegetation last) that without categorisation the existing matrix cannot enforce.

This enhancement is the smallest viable implementation of that follow-up: an optional field on the data model + a new pivot view. The other two follow-ups (capacity validation against Client Survey baselines; cumulative 5-year investment rollups) remain deferred — they involve cross-store integration that's out of scope for a single sub-tab addition.

## What

### 1. `PhaseTask.designLayer` (optional)

`apps/web/src/store/phaseStore.ts` gains a new exported type:

```ts
export type DesignLayer = 'earthworks' | 'water' | 'vegetation' | 'structures';

export interface PhaseTask {
  …existing fields…
  designLayer?: DesignLayer;  // optional Yeomans Keyline category
}
```

The field is **optional** and **non-migrating**: legacy tasks load with `designLayer` undefined and are surfaced in an "Uncategorised" row in the new matrix until the steward classifies them. No persistence-version bump.

### 2. `SeasonalTaskCard` — designLayer dropdown

`apps/web/src/features/plan/SeasonalTaskCard.tsx` now exposes a "Scale of permanence (Yeomans, optional)" `<select>` in the add-task form (default: uncategorised). The four orthodox values are presented in their orthodox sequencing order: Earthworks → Water → Structures → Vegetation. The chosen layer is stored on the task and surfaced inline on the rendered task list (`Spring · 8 h · $0 · Earthworks (landform)`).

### 3. New sub-tab `plan-phasing-scale-matrix`

`apps/web/src/v3/plan/types.ts` `MODULE_CARDS['phasing-budgeting']` adds a fourth tab `Scale-of-permanence` (sectionId `plan-phasing-scale-matrix`).

### 4. New card `PhasingScaleMatrixCard`

`apps/web/src/v3/plan/cards/phasing-budgeting/PhasingScaleMatrixCard.tsx` reads the same `BuildPhase.tasks[]` data as the existing matrix and rollup cards, but pivots the view: rows are the 4 Yeomans Keyline categories (+ an "Uncategorised" catchall), columns are the project's phases. Each cell shows task count, hours, and cost.

Three derived signals are surfaced:

- **Coverage stats:** total tasks / hours / cost across all phases, and a `layers in use: N / 4` count.
- **Per-cell visualisation:** empty cells are dimmed (opacity 0.45); populated cells show count + hrs + dollars.
- **Sequencing-violation warnings:** if a "later" layer (Structures or Vegetation) has tasks in a phase whose prerequisite "earlier" layers (Earthworks + Water) are empty *in the same phase*, the violation is flagged with a recommendation to sequence the prerequisite work first. This is the Keyline rule operationalised.

### 5. Wiring

`apps/web/src/v3/plan/PlanModuleSlideUp.tsx` lazy-imports the new card and adds the `case 'plan-phasing-scale-matrix'` branch to `renderCard`.

## Verification

- `npm run typecheck` (with `NODE_OPTIONS=--max-old-space-size=8192`) passes for all touched files. The pre-existing `elementCatalog.ts` error is from unrelated WIP Vision-Layout work and is documented in prior commits.
- Optional field + no persistence-version bump means existing localStorage data loads cleanly.
- Sub-tab order is orthodox-sequencing-aware: Phasing matrix · Seasonal tasks · Labor & budget · Scale-of-permanence (steward enters tasks first, then pivots).

## Follow-ups still deferred

From the parent ADR:

- **Capacity validation against Client Survey baselines** (weekly hours, annual budget) — needs a Client Survey store first.
- **Cumulative investment rollups** (Yearly Running Total + 5-Year Total Gantt-style) — cosmetic addition to `LaborBudgetSummaryCard`; lower priority than this categorisation pass.

Both remain on the iteration ADR's deferred-follow-up list.

## Sources cited by Scholar

OSU PDC Pro Phasing Plan template (5-year × 4-season + `$`/`Hrs` columns); Yeomans Keyline Scales of Landscape Permanence (sequencing of earthworks → water → access → structures → vegetation); Mollison B. *Permaculture Designer's Manual* (energy as both money and human effort).
