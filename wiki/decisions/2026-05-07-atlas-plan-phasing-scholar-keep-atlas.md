# Atlas Plan Module 7 (Phasing & Budgeting) — KEEP_ATLAS per Scholar verdict

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 7 — Phasing & Budgeting
**Verdict:** KEEP_ATLAS (no code change; three enhancements logged as follow-ups)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`), 2026-05-07

## Options compared

- **A · Atlas current** — three store-wired cards under `apps/web/src/features/plan/`:
  - `PhasingMatrixCard.tsx` — N-phase × 4-season editable matrix (winter/spring/summer/fall) with task counts and labor hours per cell.
  - `SeasonalTaskCard.tsx` — per-phase task editor (phase dropdown, season dropdown, title, laborHrs, costUSD).
  - `LaborBudgetSummaryCard.tsx` — read-only rollup: totals (hours, $, tasks), per-phase breakdown, per-season breakdown.
  - Data model: `BuildPhase { id, projectId, order, name, timeframe, tasks: PhaseTask[] }`, `PhaseTask { id, season, title, laborHrs, costUSD }` via `usePhaseStore`.

- **B · OGDEN prototype** — **NO CANDIDATE.** OGDEN ships no phasing module.

## Scholar verdict

> "`KEEP_ATLAS` because the underlying data model (`BuildPhase` with temporal data, and `PhaseTask` with `season`, `laborHrs`, and `costUSD`) perfectly mirrors the columns required by a professional permaculture phasing spreadsheet. `PORT_OGDEN` is impossible, and `BUILD_FRESH` is unnecessary when your core bones are correct."

Specifically:

- **Phase × Season axis is correct.** The OSU PDC Pro reporting template explicitly uses a 5-year phasing plan broken down by seasons (Winter, Spring, Summer, Fall). Atlas's matrix mirrors this exactly.
- **Labor-hours + cost-USD is the correct resource pair.** The official OSU PDC Pro Phasing Plan template uses exact columns for `$` and `Hrs` for every task, rolling them up into yearly and 5-year totals. Permaculture treats both money and human effort as forms of energy.
- **Atlas already gets right:** matrix-based phasing, per-task season + labor + cost, per-phase and per-season rollups via `LaborBudgetSummaryCard`.

## Enhancements identified (deferred to follow-ups)

Scholar identified three orthodox elements Atlas does not yet surface, all logged as follow-ups rather than blocking the verdict:

1. ✅ **Scale-of-Permanence categorisation on tasks** — landed 2026-05-07. `PhaseTask` gained an optional `designLayer?: 'earthworks' | 'water' | 'vegetation' | 'structures'` field in `phaseStore.ts`; `SeasonalTaskCard.tsx` got a `<select>` so stewards can tag each task with its Yeomans tier on entry. New tab `plan-phasing-scale-matrix` under Module 7 — `apps/web/src/v3/plan/cards/phasing-budgeting/PhasingScaleMatrixCard.tsx` — pivots tasks across Phase × Yeomans-tier (earthworks / water / structures / vegetation + uncategorised catchall), surfaces sequencing-violation warnings (e.g. vegetation arriving before its supporting water layer), and renders coverage stats so the steward can see at a glance which permanence tier each phase is investing in (commit `000840e`). A complementary totals rollup landed in `LaborBudgetSummaryCard.tsx` ("By Scale of Permanence (Yeomans Keyline)" section): aggregates `{ count, hrs, usd }` per Yeomans tier across all phases — answers the "are dollars + hours flowing into the right permanence tier?" question at the budget-rollup level. Hides the uncategorised row when zero so legacy-task migration doesn't clutter the view. Caption cites OSU PDC + Yeomans and warns explicitly about upside-down sequencing (vegetation dwarfing earthworks/water early in the program).

2. **Capacity validation against Client Survey baselines.** Link the `LaborBudgetSummaryCard` rollup to the project's initial Client Interview data (weekly labor availability, annual budget). Flag energy deficits: if a steward declares 10 hrs/week and $5K/year but Phase 1 demands 1,000 hrs and $21K, the module should warn that the design exceeds the steward's actual capacity.

3. ✅ **Cumulative investment rollups (Gantt-style 5-year horizon)** — landed 2026-05-07. `LaborBudgetSummaryCard` adds a "5-year horizon (running totals)" section beneath the per-season rollup. Each phase is bucketed by the year-end parsed from its `timeframe` string (`Year X-Y` → `Y`, `Year X+` → `X`, `Year X` → `X`, fallback to `phase.order`). Per-row line shows the phase delta + running cumulative; phases ending beyond year 5 dim to 0.6 opacity. A bordered "5-year total" footer sums hours and dollars across phases with `yearEnd ≤ 5`; a footnote counts any phases that extend beyond year 5. Caption cites the OSU PDC Pro template + the Scholar's note that 5 years is the practical budgeted horizon (vs. 50-yr canopy maturity, which is a different question).
   - ✅ **Per-phase Yeomans-tier composition strip on `CumulativeInvestmentCard`** (added 2026-05-07). `CumulativeInvestmentCard.tsx` now buckets each phase's tasks by `designLayer` (earthworks / water / structures / vegetation / uncategorised) and renders a third stacked bar per phase row — beneath the existing gold cost-share and green labor-share bars — showing the warm-cool tier composition of THIS phase's dollars. Same colour ramp as `PhasingScaleMatrixCard` and `PermanenceLadderCard` so the steward reads the same Yeomans tier the same way across every phasing surface. Hover tooltip lists per-tier `$` and hours; segments only render for tiers with non-zero spend. Surfaces upside-down sequencing at the cumulative-rollup level (e.g. Phase 1 with 80 % vegetation, 0 % earthworks).

## Decision

No code change required for the verdict. The three enhancements above are filed as Module 7 follow-up tickets; the iteration ADR will list them. Atlas's Module 7 remains as-is — three cards, store-wired, matching OSU PDC Pro structure on temporal axis and resource axes.

## Sources cited by Scholar

OSU Permaculture Design Course Pro Phasing Plan template (5-year × 4-season matrix with `$` and `Hrs` columns); Yeomans Keyline Scales of Landscape Permanence (sequencing of earthworks → water → access → structures → vegetation); Mollison B. *Permaculture Designer's Manual* (energy as both money and human effort); OSU PDC Client Interview methodology (capacity baselines: time available for development, time available for maintenance, annual budget).
