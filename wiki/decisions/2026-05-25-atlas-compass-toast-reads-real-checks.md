# ADR: In-map "Objective complete" toast reads real How-checks, not seed evidence

**Date:** 2026-05-25
**Status:** accepted
**Context:**
Each stage (Observe/Plan/Act) has two parallel objective-progress systems:

1. The **objective workspace** — the visible right-rail `GuidanceCard` panel,
   whose progress comes from `progressFromChecks(checkedList, how.length)` over
   the per-stage How-checks store (`observe`/`plan`/`actHowChecksStore`). This
   reflects the steward's real checkbox ticks.
2. The **compass evidence** model — `objectiveProgress` / `isVerified` in
   `compassGating.ts` over the seed-backed compass store
   (`observe`/`plan`/`actCompassStore`). These stores carry **mock SEED**
   evidence (`{0:'verified',1:'verified',2:'evidence-in'}` etc.) so the compass
   *wheel* reads as a project mid-flight in the prototype.

The in-map "Objective complete" prompt (`*ObjectiveCompletePrompt.tsx`,
mounted in each stage layout) computed completion via the single-objective
hooks `useObjectiveProgress` / `usePlanObjectiveProgress` /
`useActObjectiveProgress`, which read the **seed-backed** compass store.
`isVerified(raw, checked, i)` is true when `raw[i]==='verified'` **OR**
`checked.includes(i)`, so a single real check on the one node the seed had not
pre-verified flipped the objective to 100% and fired the toast — while the
visible panel still correctly showed partial progress (e.g. "33% · 1/3 steps").
Steward report: "Just because the last task on the list is marked complete it
renders the whole objective as complete." Confirmed across all three stages.

**Decision:**
Repoint the three single-objective progress hooks to the **same** How-checks
source the visible panel uses: `progressFromChecks(checks ?? EMPTY_CHECKS,
obj.nodes.length)`. The hooks no longer read the seed-backed compass evidence
store or its `seedFor`/`planSeedFor`/`actSeedFor` fallback. Compass `nodes` are
built directly from each guidance map's `how` array, so
`nodes.length === how.length` and the toast now agrees with the panel's status
pill exactly. The toast components themselves were not changed — their
`complete = total > 0 && pct === 100` gate is correct once fed the right numbers.

**Consequences:**
- The toast fires precisely when the panel pill turns "Complete" (all How steps
  ticked), and never on partial progress. Verified in-browser for all three
  stages, including the Act `tracker` seed-gap analog (only node 2 checked → no
  toast; 3/3 → toast).
- The mock SEED stays in place; it still feeds the compass **wheel** prototype
  display (`use*CompassData`, the plural hooks). Only the single-objective toast
  hooks stopped trusting it.
- `seedFor` / `useObserveCompassStore` (and Plan/Act equivalents) remain
  imported in each `use*CompassData.ts` file because the plural wheel hook still
  uses them.
- See [[2026-05-25-compass-progress-fill-outside-in]] for the related compass
  wheel work in the same area this session.
