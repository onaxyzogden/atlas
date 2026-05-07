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

1. **Scale-of-Permanence categorisation on tasks.** Modify the `PhaseTask` model to include an optional `designLayer` or `scaleOfPermanence` enum (Earthworks / Water / Vegetation / Structures, per Yeomans Keyline). Then update `PhasingMatrixCard` to group tasks by these categories rather than displaying them as a flat chronological list. This makes earlier phases naturally populate with earthworks + water (the "mainframe infrastructure"), with soil-building and planting following — the orthodox sequencing rule.

2. **Capacity validation against Client Survey baselines.** Link the `LaborBudgetSummaryCard` rollup to the project's initial Client Interview data (weekly labor availability, annual budget). Flag energy deficits: if a steward declares 10 hrs/week and $5K/year but Phase 1 demands 1,000 hrs and $21K, the module should warn that the design exceeds the steward's actual capacity.

3. **Cumulative investment rollups (Gantt-style 5-year horizon).** Add read-only summaries showing "Yearly Running Total $" and "Yearly Labor Hours," culminating in a "5-Year Total." Scholar notes that while permaculture conceptually stretches to 50 years for mature canopy, the practical budgeted phasing horizon is 5 years.

## Decision

No code change required for the verdict. The three enhancements above are filed as Module 7 follow-up tickets; the iteration ADR will list them. Atlas's Module 7 remains as-is — three cards, store-wired, matching OSU PDC Pro structure on temporal axis and resource axes.

## Sources cited by Scholar

OSU Permaculture Design Course Pro Phasing Plan template (5-year × 4-season matrix with `$` and `Hrs` columns); Yeomans Keyline Scales of Landscape Permanence (sequencing of earthworks → water → access → structures → vegetation); Mollison B. *Permaculture Designer's Manual* (energy as both money and human effort); OSU PDC Client Interview methodology (capacity baselines: time available for development, time available for maintenance, annual budget).
