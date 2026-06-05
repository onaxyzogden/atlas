# 2026-05-20 — B3.x: Rotation-sequence promotion-criteria wiring

**Branch.** `feat/atlas-permaculture`.
**ADR.** [[decisions/2026-05-20-atlas-b3-x-rotation-promotion-criteria]].

## Summary

Closes the B3 ADR's first listed open-work item: rotation-sequence rows now
participate in `livestock-enterprise` readiness gating. Two new sibling
`SuccessCriterion` rows + two pure read-only evaluators over the spine; no
new card, no schema bump, no store actions, no covenant surface. Strictly-
additive on top of the B3 spine-push family (`source: 'rotation-sequence'`).

- `livestock-rotation-spine-presence-pct` — % of projected rotation moves
  currently present on the spine by composite provenance. **100** when the
  expected set is empty (no plan / no cells — nothing to be missing).
- `livestock-rotation-moves-completed-pct` — % of past-due
  rotation-sequence rows on the spine marked `status: 'done'`. **100** when no
  rows are past-due (nothing yet due, nothing to be late on).

Both target **90** by **`deadlineYear` 2** — steward-ratified during scope
brainstorm; year 2 gives sites a full plan → execute → measure cycle before
the gate bites.

## Commits

Per-task explicit-path commits on `feat/atlas-permaculture` (no `-A` / `.`):

1. `feat(livestock): rotation-sequence readiness evaluators (spine-presence-pct + moves-completed-pct) + tests` — new `rotationSequenceReadiness.ts` (~110 LOC) + `rotationSequenceReadiness.test.ts` (~430 LOC, 17 tests).
2. `feat(goal-tree): livestock-enterprise gains two rotation-spine criteria @ target 90 / Y2` — two `SuccessCriterion` rows appended after `livestock-rotation-rest-compliance-pct` in `goalTreeTemplates.ts`.
3. `feat(goal-compass): CriteriaForecastTab dispatches the two new rotation-spine criteria` — `currentValues` `useMemo` gains `usePhaseStore` + `useWorkItemStore` selectors, `declaredPhases` + `todayISO` derivations, two dispatch keys, dep-array extension.
4. `docs(wiki): B3.x rotation promotion-criteria — ADR + log entry + index pointer` — this entry + ADR + index update.

## Verification

- Targeted vitest **17/17 green** (`rotationSequenceReadiness.test.ts`).
- Full apps/web vitest **1592/1592 green** (was 1575; +17).
- `tsc --noEmit` on `apps/web` — only the pre-existing `precedesAuto` errors
  from B5.2.x.c + the `PlanSelectionFloater` `'guild-member'` error from B4
  follow-ups + the `StepBoundary.tsx` `ReactNode` error remain. **No new
  errors reference the B3.x surface.**
- Covenant grep
  (`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital|yield|payback|investment|roi|return\s+on)\b/i`)
  on the four touched source files — only the negative-assertion docstring
  guard in the evaluator header matches.
- MapLibre canvas-click not exercised under harness (WebGL hang disclosure
  rule); vitest + tsc authoritative.
- Branch divergence checked before push.

## Posture

- **Strictly-additive.** Two new evaluators (one new file) + two criterion
  rows (one edited template file) + two dispatch keys (one edited tab file).
  No removals, no enum changes, no schema bump, no store actions, no
  migration, no `MODULE_CARDS` row, no new card.
- **Single-writer preserved.** Evaluators are pure reads over
  `useWorkItemStore.getState().items`. Only B3's `replaceRotationSequence
  {Rows,Dependencies}` write rotation-sequence rows. D4 invariant holds —
  status writes still route through `fulfilWorkItem`.
- **Covenant lock holds.** Copy: "rotation moves", "scheduled", "completed",
  "past-due", "spine". No riba / gharar / CSRA / salam / investor /
  financing / cost-of-capital / payback / ROI / yield-as-return vocabulary.

## Deferred (open work)

- Per-move salt / mineral / water-haul `materialsAuto` kit (carried forward
  from the parent B3 ADR).
- `TrackerCard` render polish for cellGroup-grouped move sequences (currently
  lands as flat list).
- Goal-tree archetype-wiring for `retreat` / `farmstead` `livestock-enterprise`
  subgoals — separate slice.
- Inherited typecheck debt: pre-existing `precedesAuto` errors from B5.2.x.c
  + B4 follow-up `'guild-member'` `Record<PlanSelectionKind,_>` error +
  `StepBoundary.tsx` `ReactNode` error — unchanged by this slice.
