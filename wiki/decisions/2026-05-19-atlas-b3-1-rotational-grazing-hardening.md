# 2026-05-19 — B3.1: Rotational-grazing sequencer hardening (additive)

**Status:** Implemented & verified. Per-task explicit-path commits on
`feat/atlas-permaculture`
(`36fadfa6` Part 1 → `656a68e5` Part 2 → `5ad62730` Part 3 → this
`docs(wiki)`); **not pushed** (branch rebased/force-pushed out-of-band
— push is a separate explicit instruction). A teammate's out-of-band
`254ab499 feat(livestock): B3 plan-vs-actual rotation adherence` landed
between Parts 1 and 2; it touches different files (`rotationAdherence.ts`,
new) and is outside B3.1 scope. Live-preview screenshot disclosed-blocked
by the known MapLibre/WebGL hang behind the `livestock` Plan slide-up;
the pure-math tests + tsc + the explicit `targetRestDays:0 ⇒
identical to pre-B3.1` regression lock are the authoritative proof
(B2 / B2.1 / B3 screenshot-honesty precedent).

**Context source:** User chose **"Harden B3 gaps"** after the planning
session found B3 already fully built/verified/APPROVED/committed
out-of-band ([[2026-05-18-atlas-b3-rotational-grazing-sequencer]],
`b790f85e..b36d5bf3` + ADR `cdf79c30`). The original B3 decomposition
("paddock-move calendar vs forage recovery / rest-period math;
animal-integration carrying-capacity") was met in full; B3.1 fills three
functional holes a direct audit of the shipped B3 source uncovered.
Mirrors the B2 → [[2026-05-19-atlas-b2-1-soil-compost-hardening]]
template exactly. The user further ratified **honoring `targetRestDays`
as an intentional correction** to B3's rendered numbers — unlike B2.1
this slice is *not* strictly behaviour-preserving for the dead-field
path, only for the `targetRestDays:0` default which all existing tests
use.

## Decision

Three additive parts, template-mirrored (pure module + colocated tests
+ auto-persist editable / read-only audit cards; **no new goal-tree
criterion** — the B3 `livestock-rotation-rest-compliance-pct` criterion
keeps reading `computeRestCompliancePct`, whose value simply becomes
correct):

1. **Honor `targetRestDays` in the projection math (the dead-field
   fix).** New private helper
   `honoredRestDays(cell, siblingGrazeSum) = max(siblingGrazeSum,
   cell.targetRestDays)` threaded through `computeMoveCalendar`
   (per-paddock last-`moveOut` tracking; before emitting a paddock's
   next-cycle entry, if `cursor − lastMoveOut < honoredRest` the cursor
   advances by the deficit — an explicit idle rest gap in the group
   cursor) and `computeRestCompliance` (`plannedRestDays =
   honoredRestDays(...)`). `restDaysUntilNextGraze` is now the honored
   value, not the raw sibling-graze sum. `computeRestCompliancePct`
   unchanged (derives from corrected rows). **Regression-safe by
   construction:** the 10 existing `rotationSequenceMath` tests all
   build cells via the `cell()` factory whose default is
   `targetRestDays: 0`; `max(Σ-sibling-graze, 0) = Σ-sibling-graze`, so
   every pre-B3.1 case stays green unchanged. The behaviour change
   manifests only when `targetRestDays > 0` (the real seeded/edited
   value) — covered by new tests (floor raises plannedRest and flips
   Short → Compliant; calendar inserts an idle gap when
   `targetRestDays > Σ-sibling-graze`; explicit `targetRestDays:0 ⇒
   identical to pre-B3.1` regression lock).
2. **Rotation-aware carrying-capacity.** New pure
   `rotationCapacityMath.computeRotationCarryingCapacity(paddocks,
   plan): GroupCapacityRow[]` — per cell-group AU demand-days vs
   supply-days, `utilizationPct`, `cycleDays = max(Σ-graze, max_cell
   (grazeDays + targetRestDays))`, `status` bands (<85 ok, 85–110
   tight, >110 over). AU-load **reuses** (does not fork) the canonical
   `computePaddockRecommendedStocking` and the `AU_FACTORS` catalog;
   demand uses each paddock's planned `stockingDensity`. Surfaced in
   `RotationSequenceCard` as a **display-only** per-group line + a
   non-blocking advisory pill beside the pre-existing static
   overstock advisory (which stays). Coarse heuristic, explicitly
   **not** a forage-budget model (rationale captured in the module
   doc-comment and the read-only card's assumption paragraph — B2.1
   "not lab-grade" precedent).
3. **Optional plan start-date + horizon-cycles.** Two **optional**
   fields appended to `RotationPlan` (`startDateISO?`,
   `horizonCycles?`); `projectRotationSequence` gains an optional
   `cycles` arg threaded to `computeMoveCalendar` (the param already
   existed). `rotationPlanStore` persist `version:1` unchanged, **no
   `migrate`** — optional fields are `undefined` on old persisted rows
   and the projection falls back to today / 1. New
   `setPlanOptions(projectId, { startDateISO?, horizonCycles? })`;
   `setPlan`/`upsertCell`/`removeCell` preserve previously-set options
   via a small `withOptions` helper. `RotationPlanCard` toolbar gains a
   `<input type="date">` + a 1/2/3-cycle `<select>` (auto-persist, no
   save gate, reusing existing `.field` class — no CSS change);
   `RotationSequenceCard` reads `plan.startDateISO ?? today` and
   `plan.horizonCycles ?? 1`.

## Covenant & scope boundary

Strictly additive, non-covenant. "Capacity" is **animal-unit grazing
load**, never financial return — no riba/gharar/CSRA/salam/investor/
financing/cost-of-capital/yield-as-return framing. A-series additive
covenant held: **no** DB migration, API endpoint, schema, goal-tree
criterion, `Record<PlanModule,_>` change, new `PlanModule` member,
`syncManifest` entry, or spine mutation. Enforced by:
`rotationCapacityMath` covenant `not.toMatch` test (B2.1 mirror) + the
per-commit file list audit (each commit touches only its planned
files); persist `version:1` unchanged on `rotationPlanStore`; cards
already mounted under the `livestock` Plan slide-up — no registration
edit. Cards keep the livestock-module house style (`features/livestock/`,
`{ projectId }` prop, colocated `.module.css`) — B3's own convention,
not the v3/plan `stageCard` path.

## Scope delivered

- **Edit** `apps/web/src/features/livestock/rotationSequenceMath.ts` —
  private `honoredRestDays` helper + `daysBetweenISO`, threaded into
  `computeMoveCalendar` (per-paddock idle-gap insertion; honored
  `restDaysUntilNextGraze`) and `computeRestCompliance`. `RotationPlan`
  gains optional `startDateISO?` / `horizonCycles?`. `projectRotation
  Sequence` gains an optional `cycles` arg (default 1).
- **Edit** `__tests__/rotationSequenceMath.test.ts` — keep 10
  pre-B3.1 cases green (asserted by construction via the
  `targetRestDays:0` factory default); add 5 (3 in "B3.1 — honored
  targetRestDays" + 2 in "projectRotationSequence cycles/startDate").
- **New** `apps/web/src/features/livestock/rotationCapacityMath.ts` +
  `__tests__/rotationCapacityMath.test.ts` (11 — empties, supply-0
  no-div-by-zero, demand/supply bands, monotone in planned density,
  cycleDays floor, covenant lock).
- **Edit** `apps/web/src/store/rotationPlanStore.ts` — `setPlanOptions`
  action + `withOptions` carry-forward; persist key/version unchanged.
- **Edit** `apps/web/src/store/__tests__/rotationPlanStore.test.ts` —
  add 4 B3.1 cases (round-trip; preservation across
  setPlan/upsertCell/removeCell; partial update; default plan shape).
- **Edit** `apps/web/src/features/livestock/RotationPlanCard.tsx` —
  toolbar date + horizon controls wired through `setPlanOptions`
  (auto-persist).
- **Edit** `apps/web/src/features/livestock/RotationSequenceCard.tsx`
  — reads `plan.startDateISO ?? today` and `plan.horizonCycles ?? 1`;
  renders the rotation-aware capacity per-group line beside the
  existing static overstock advisory; assumption paragraph updated to
  describe the honored-rest idle-gap behaviour + the heuristic nature
  of AU-utilization.

## Verification

- web `tsc --noEmit`: no B3.1 error (filtered grep over the six touched
  files empty; only pre-existing out-of-band D0 errors remain).
  `packages/shared` tsc exit 0 (untouched).
- Vitest targeted: `rotationSequenceMath` 15 (10 pre-B3.1 unchanged +
  5 new), `rotationCapacityMath` 11, `rotationPlanStore` 10 (6 prior +
  4 new) — 36/36 green. Full web suite green: 121 files, 1282 tests
  (up from prior baseline; consistent with B3.1 adds + the out-of-band
  `rotationAdherence` slice).
- Regression lock: explicit `targetRestDays:0 ⇒ identical to pre-B3.1`
  case proves the change is inert for the old default.
- `vite build` exit 0.
- Covenant grep PASS — only hits are the negative-declaration doc
  comment ("never a financial or yield-as-return notion") and the
  covenant lock test itself.
- Additive-isolation audit PASS — per-commit `git diff-tree` shows
  each B3.1 commit touches only its planned files; persist
  `version:1`/no-`migrate` intact; no spine/schema/goal-tree/manifest
  diff.
- Live-preview screenshot disclosed-blocked (MapLibre/WebGL hang behind
  the livestock Plan slide-up) — no screenshot claimed; static + unit
  proof is authoritative (B3 precedent).

## Notes & deferred

- Happy-dom card-level test for the two cards: B3 itself shipped the
  cards test-free; B3.1 follows that posture — the pure math + the
  store test are the authoritative gate.
- "Clear start date once set" is **deferred** — the
  `setPlanOptions(..., { startDateISO: undefined })` path doesn't clear
  an existing date (the spread guards against undefined). YAGNI for
  this slice; the steward can pick a new date.
- B-series remaining after B3.1: **B4** (guild ↔ livestock ↔
  silvopasture integration — now unblocked, B1 + B3 both done) → B5.

## References

- [[2026-05-18-atlas-b3-rotational-grazing-sequencer]] — the B3 slice
  B3.1 hardens.
- [[2026-05-19-atlas-b2-1-soil-compost-hardening]] — the immediate
  template (B2 → B2.1).
- [[2026-05-18-atlas-bd-subproject-decomposition]] — B1–B5 roadmap.
