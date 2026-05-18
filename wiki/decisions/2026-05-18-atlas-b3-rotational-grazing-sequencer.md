# 2026-05-18 — B3: Rotational-grazing sequencer (third Sub-project B slice)

**Status:** Implemented — verified and committed (apps/web tsc has zero
error from any B3 file; packages/shared tsc exit 0; 16/16 vitest green).
Committed to `feat/atlas-permaculture` as `b790f85e..b36d5bf3` plus this
ADR standalone; final holistic code review APPROVED. NOT yet pushed —
see "Commit posture".

**Context source:** The B1–B5 decomposition ADR
[[2026-05-18-atlas-bd-subproject-decomposition]], B1
[[2026-05-18-atlas-b1-plant-system-design-integrity]], and B2
[[2026-05-18-atlas-b2-soil-food-web]]. B3 is the third B slice; its
decomposition scope is "Paddock-move calendar vs. forage recovery /
rest-period math; animal-integration carrying-capacity", module home
`livestock`. B3 is independent of B2.

## Decision

B3 was built as the ADR scoped it — a forward-dated paddock move
calendar + rest-period compliance projection over a steward-set
rotation plan — additive front-end, non-covenant (no riba/gharar),
inside the already-registered `livestock` plan module. Build-time
decisions, user-confirmed this session:

1. **Two separate cards** (mirrors B1/B2) — a read-only rotation-sequence
   audit and an editable rotation-plan designer are different
   interaction models (one-card-per-concern).
2. **ADD a livestock goal-tree criterion** (departs from the B1/B2
   "no criterion" precedent) — `livestock-rotation-rest-compliance-pct`,
   because rest-compliance is a measurable design intent worth scoring
   in the goal compass, unlike B1/B2's pure design validators.
3. **Reuse `livestockAnalysis.ts`, do not fork** — the recovery /
   rotation / capacity math already exists and is pure. The only
   net-new pure logic is the forward-dated calendar + rest-compliance %.
4. **Convention: livestock-module house style, not the v3/plan B1/B2
   one** — cards live in `features/livestock/`, take `{ projectId }`,
   import a colocated per-card `.module.css`. B3 follows the livestock
   convention (the `RotationScheduleCard` visual template), not the
   `stageCard.module.css` B1/B2 path.

## What was built

- `features/livestock/rotationSequenceMath.ts` (+ colocated tests, 10) —
  pure, deterministic, owns `RotationCell`/`RotationPlan`. `requiredRestDays`
  is rule-identical to `livestockAnalysis.computeRecoveryStatus`
  (`max` species `recoveryDays`, 30 default) so the two never diverge.
  Net-new: `computeMoveCalendar` (per-cell-group UTC date cursor,
  optional `cycles`), `computeRestCompliance` (planned rest = Σ other
  same-group cells' `targetGrazeDays`), `computeRestCompliancePct`
  (100 when zero rows — vacuously compliant), `projectRotationSequence`.
- `store/rotationPlanStore.ts` (+ tests, 6) — isolated additive persist
  slice; `byProject` of `RotationPlan`; `setPlan`/`upsertCell`
  (idempotent by paddockId, re-sorted)/`removeCell`/`clearPlan`;
  `planFor` default helper. persist config exactly
  `{ name: 'ogden-rotation-plan', version: 1 }` — no `temporal`, no
  `migrate`. Types imported type-only from the math module (no cycle).
- `features/livestock/RotationSequenceCard.tsx` + `.module.css` —
  read-only audit (headline rest-compliance %, forward move calendar
  grouped by cell group, per-paddock compliance rows, non-blocking
  overstocking advisories via `computeOvergrazingRisk`). No store
  writes, no save gate.
- `features/livestock/RotationPlanCard.tsx` + `.module.css` — editable
  designer; "Seed from paddocks" (one `setPlan`; `cellGroup =
  grazingCellGroup ?? 'ungrouped'`, within-group `sequenceOrder`,
  graze 3, rest `requiredRestDays(p)`); auto-persist rows (no save
  gate, B1/B2 precedent); per-row non-blocking under-rest warning;
  blank note omits the key.
- Goal-tree wiring (3 files): `goalTreeTemplates.ts` appends
  `livestock-rotation-rest-compliance-pct` (unit `pct`, target 90,
  deadlineYear 3) to `livestock-enterprise`; `CriteriaForecastTab.tsx`
  adds the live baseline (`useRotationPlanStore` +
  `computeRestCompliancePct`, dep array updated);
  `interventionCatalog/regenerativeFarm.ts` adds one
  `criterionContributions` line (`contributionFixed: 70`,
  `appliesAtYearOffset: 2`) to the "Integrated crop–livestock grazing
  of residues" intervention.
- Registration: 2 append-only edits only (`types.ts`
  MODULE_CARDS['livestock'] + `PlanModuleSlideUp.tsx` lazy
  imports/switch cases, section ids `plan-livestock-rotation-sequence`
  / `plan-livestock-rotation-plan`). `livestock` was already a
  registered module → no `PlanModule` union member added.

## Verification

- vitest — `rotationSequenceMath` 10/10 (empties, cursor walk, cycles,
  sibling-sum rest, 29-vs-30 compliance boundary, multi-group cursor
  isolation, `ungrouped` bucket, `requiredRestDays` species rule),
  `rotationPlanStore` 6/6 (sort, upsert idempotency, remove,
  per-project isolation, clearPlan, `planFor` default). 16/16.
- `tsc -p packages/shared` — exit 0 (shared untouched).
- `tsc -p apps/web` — zero error from any B3 file. Remaining project
  tsc errors (`workItemStore.migration` Zod `dependsOnAuto` drift,
  `useFlowEndpointOptions` Paddock fixture, and the *existing*
  `RotationScheduleCard.tsx` / `MaintenanceScheduleCard.tsx`
  consuming the drifted WorkItem schema) are pre-existing out-of-band
  D0 work — B3 touches none of those files. Green = no NEW error vs
  pre-B3 baseline.
- Per-task two-stage review (spec then quality) APPROVED each of math,
  store, read-only card, editable card. Final holistic review
  (superpowers:code-reviewer) over the full 6-commit B3 diff:
  **APPROVE** — additive-covenant integrity, type-ownership/no-cycle,
  DRY-vs-`livestockAnalysis`, goal-tree blast radius all confirmed
  contained; only two non-blocking Minor observations.
- Cards are plain React deep behind livestock module nav; per the
  screenshot-honesty rule no browser screenshot is claimed — the
  unrelated D0 `workItemStore` schema drift currently blocks a clean
  app shell anyway. DOM/test + tsc are the authoritative gate.

## Commit posture

The working tree carries heavy uncommitted out-of-band D0 work
(`workItemStore*`, `workItemStore.migration*`, several `*LogStore`
edits, `syncManifest.ts`, `packages/shared/src/index.ts`,
`wiki/index.md`, `wiki/log.md`, `wiki/entities/web-app.md`, etc.).
Per CLAUDE.md (do not clobber others' uncommitted work), every B3
commit used explicit-path staging only; `git add -A`/`.` was never
used. This ADR is a clean new file committed standalone. `wiki/index.md`
and `wiki/log.md` are themselves dirty with D0 edits, so they are
**not** appended here — entangling them would capture D0's uncommitted
work in a B3 commit. The index/log reconciliation is left to the D0
owner; flagged in the session debrief. Push deferred to the operator
(`feat/atlas-permaculture` is rebased out-of-band — fetch + check
divergence before any push; never force-push).

## Consequences

- B3 exists and is verified; the rotation-sequence audit + rotation-plan
  designer are live in `livestock`, and rest-compliance is now a scored
  goal-compass criterion.
- No DB migration, no API endpoint, no schema change — A-series
  additive covenant held. `rotate_through` plan-stage executor was
  deliberately NOT introduced (respects ADR 2026-05-11 — B3 is design
  intent + projection, not an executor).
- New persist key `ogden-rotation-plan` isolated from `ogden-livestock`
  (no migrate) — zero risk to existing slices.
- The goal-tree criterion is non-breaking: criterion-id space is open
  `string`, `CriterionUnit` already includes `'pct'`, no exhaustive
  `Record<CriterionId,_>` / `never`-switch exists.
- The out-of-band D0 work is independent and untouched.

## References

- [[2026-05-18-atlas-bd-subproject-decomposition]] — B1–B5 decomposition.
- [[2026-05-18-atlas-b1-plant-system-design-integrity]] — B-series
  template origin.
- [[2026-05-18-atlas-b2-soil-food-web]] — the immediately prior B slice
  B3's structure mirrors (pure module + colocated tests + isolated
  additive persist slice + read-only audit card + auto-persist editable
  card + append-only registration).
- `RotationScheduleCard` / `livestockAnalysis.ts` — the reused pure
  recovery/rotation/capacity math + the livestock-module card visual
  convention B3 follows.
