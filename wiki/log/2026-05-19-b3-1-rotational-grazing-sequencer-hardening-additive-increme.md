# 2026-05-19 — B3.1: rotational-grazing sequencer hardening (additive increment)


**Branch.** `feat/atlas-permaculture`. After the planning session confirmed
B3 already fully built / verified / holistic-code-review-APPROVED /
committed out-of-band ([[decisions/2026-05-18-atlas-b3-rotational-grazing-sequencer]],
`b790f85e..b36d5bf3` + ADR `cdf79c30`), the user chose **"Harden B3 gaps"**
and (on the dead-`targetRestDays` fork) **"Honor `targetRestDays` (accept
number change)"**. Implemented B3.1 — three additive, non-covenant,
B1/B2/B2.1-template-mirrored parts filling functional holes a direct audit
of the shipped B3 source uncovered:

1. **Honor `targetRestDays` in the projection math.** New private helper
   `honoredRestDays(cell, siblingGrazeSum) = max(siblingGrazeSum,
   cell.targetRestDays)` threaded through `computeMoveCalendar`
   (per-paddock `lastMoveOut` tracking; explicit idle gap inserted in the
   group cursor when `cursor − lastMoveOut < honored`) and
   `computeRestCompliance` (`plannedRestDays = honored`).
   `computeRestCompliancePct` unchanged. **Regression-safe by
   construction:** the 10 pre-B3.1 `rotationSequenceMath` tests all build
   cells via the `cell()` factory whose default is `targetRestDays: 0`;
   `max(Σ-sibling-graze, 0) = Σ-sibling-graze`, so all 10 stay green
   unchanged. The behaviour change manifests only when `targetRestDays
   > 0` — covered by new tests + an explicit `targetRestDays:0 ⇒
   identical to pre-B3.1` regression lock.
2. **Rotation-aware carrying-capacity.** New pure
   `rotationCapacityMath.computeRotationCarryingCapacity(paddocks, plan):
   GroupCapacityRow[]` — per cell-group AU demand-days vs supply-days,
   `utilizationPct`, `cycleDays = max(Σ-graze, max_cell(grazeDays +
   targetRestDays))`, OK/Tight/Over status bands (<85 / 85–110 / >110).
   AU-load **reuses** (does not fork) the canonical
   `computePaddockRecommendedStocking` and `AU_FACTORS`. Surfaced in
   `RotationSequenceCard` as a display-only per-group line + a
   non-blocking advisory pill beside the pre-existing static overstock
   advisory (which stays). Coarse heuristic, explicitly **not** a
   forage-budget model.
3. **Optional plan start-date + horizon-cycles.** Two optional fields on
   `RotationPlan` (`startDateISO?`, `horizonCycles?`);
   `projectRotationSequence` gains an optional `cycles` arg.
   `rotationPlanStore` persist `version:1` unchanged, **no `migrate`** —
   `undefined` on old rows, projection falls back to today / 1. New
   `setPlanOptions(projectId, ...)` + `withOptions` carry-forward across
   `setPlan`/`upsertCell`/`removeCell`. `RotationPlanCard` toolbar gains
   `<input type="date">` + 1/2/3-cycle `<select>` (auto-persist, reuses
   existing `.field` class — no CSS change); `RotationSequenceCard`
   reads `plan.startDateISO ?? today` and `plan.horizonCycles ?? 1`.

**Covenant & scope boundary.** Strictly additive, non-covenant.
"Capacity" is animal-unit grazing load, never financial return — no
riba/gharar/CSRA/salam/investor/financing/cost-of-capital/yield-as-return
framing (covenant `not.toMatch` lock in `rotationCapacityMath.test.ts`).
A-series additive covenant held: no DB migration, API endpoint, schema,
goal-tree criterion, `Record<PlanModule,_>`, `PlanModule` member,
`syncManifest` entry, or spine mutation. Persist `version:1` unchanged on
`rotationPlanStore`; cards already mounted under the `livestock` Plan
slide-up — no registration edit. Cards keep the livestock-module house
style (`features/livestock/`, `{ projectId }` prop, colocated
`.module.css`) — B3's own convention, not the v3/plan `stageCard` path.

**Verification.** web `tsc --noEmit`: no B3.1 error over the six touched
files (only pre-existing out-of-band D0 errors remain). `packages/shared`
tsc exit 0. Vitest targeted: `rotationSequenceMath` 15 (10 unchanged + 5
new), `rotationCapacityMath` 11 (new), `rotationPlanStore` 10 (6 + 4) —
36/36. Full web suite 1282/1282 (121 files). Regression lock: explicit
`targetRestDays:0 ⇒ identical to pre-B3.1` case passes. `vite build`
exit 0. Covenant grep PASS (only hits: the doc-comment negative
declaration + the lock test itself). Additive-isolation audit PASS — per
commit `git diff-tree` shows each B3.1 commit touches only its planned
files; persist `version:1`/no-`migrate` intact. Live-preview screenshot
disclosed-blocked by the known MapLibre/WebGL hang behind the
`livestock` Plan slide-up — pure-math + tsc + the regression lock are
the authoritative proof (B3 precedent).

**Out-of-band interleave.** Between Parts 1 and 2, teammate commit
`254ab499 feat(livestock): B3 plan-vs-actual rotation adherence`
landed — touches different files (new `rotationAdherence.ts`), outside
B3.1 scope. Verified via per-commit `git diff-tree` that all three B3.1
commits touch only their planned files.

**Commits** (per-task explicit paths, no `-A`/`.`, on
`feat/atlas-permaculture`, **not pushed** — branch rebased out-of-band):
`36fadfa6 feat(plan): B3.1 honor targetRestDays in rotation projection
+ tests` → `656a68e5 feat(plan): B3.1 rotation-aware carrying-capacity
module + tests` → `5ad62730 feat(plan): B3.1 optional plan
start/horizon options + card controls` → this `docs(wiki): B3.1
rotational-grazing hardening ADR + index + log`.

**Deferred.** Happy-dom card-level test for the two cards (B3 itself
shipped card-test-free — B3.1 follows that posture; pure math + store
test are the authoritative gate). "Clear start date once set" is
deferred YAGNI (`setPlanOptions(..., { startDateISO: undefined })` does
not clear an existing date because the spread guards against
`undefined`; the steward can pick a new date). B-series remaining after
B3.1: **B4** (guild ↔ livestock ↔ silvopasture integration — now
unblocked, B1 + B3 both done) → B5.
