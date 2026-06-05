# 2026-05-19 — B3: Rotation Adherence (plan-vs-actual)

**Status:** Implemented & verified. Per-task explicit-path commits on
`feat/atlas-permaculture` (`254ab499` Task 1 engine + tests → `290035bd`
Task 2 render-only card → `0a0d64e0` Task 3 append-only Plan
registration → this `docs(wiki)`); **not pushed** (branch is
rebased/force-pushed out-of-band — push is a separate explicit
instruction, fast-forward only).

**Context source:** User asked about pending livestock-rotation work
after the D-series (D0–D5) closed. Research established that the
B3 rotational-grazing sequencer already shipped 2026-05-18
([[2026-05-18-atlas-b3-rotational-grazing-sequencer]]) — it projects
the steward's *intended* forward move calendar and rest-compliance %,
but nothing closed the loop against what actually happened in the
field. Separately, `livestockMoveLogStore` (v4) already records
*actual* paddock moves with linked-pair semantics. The steward's
rotation **plan** and the **logged reality** were never composed, so
over-grazing, under-rested re-entry, and plan drift were invisible.
User chose "Plan-vs-actual adherence" from a multi-option roadmap
fork.

## Decision

Net-new pure composition engine + render-only card under B3 locality,
following the D5/B3 slice pattern exactly. Strictly **additive**:
no DB migration, no API endpoint, no schema change, no spine
(`WorkItem.status`) mutation, no store write.

### Engine

`apps/web/src/features/livestock/rotationAdherence.ts` — pure
function `computeRotationAdherence({ paddocks, plan, moves, now? })`
that diffs the intended rotation against actual logged moves into a
single `Light` + ranked deterministic render-only
`AdherenceRecommendation[]` + `RotationAdherenceCounts`.

Reuses (never re-derives):
- `requiredRestDays(paddock)` from `rotationSequenceMath.ts` —
  ecological rest floor (max species recovery, default 30).
- `destPaddockId(event)` from `livestockMoveLogStore.ts` — actual
  occupancy interval derivation from `move_in`/`move_out` linked-pair
  semantics.

Rule branches (each fires ≤ once per affected paddock):

| Kind | Severity | Trigger |
|---|---|---|
| `overgrazed` | high | actual graze days > `cell.targetGrazeDays` (open or closed interval) |
| `under-rested-reentry` | high | gap between consecutive occupancies < `requiredRestDays(paddock)` |
| `short-rest` | med | `requiredRestDays ≤ gap < cell.targetRestDays` |
| `early-move` | med | linked-`move_out`-closed interval, actual graze < `targetGrazeDays` |
| `unplanned-paddock` | low | logged moves to a paddock with no `RotationCell` |

Light: `alert` if any high; `warn` if any med/low; else `ok`.

Sort comparator copied verbatim from D5
(`packages/shared/src/lib/operatingHealth.ts`): `SEVERITY_RANK`
(high 0 / med 1 / low 2) → count desc → id asc. Recommendation `id`
is stable `${kind}:${paddockId}`. House date guard: malformed/absent
`now` → `Date.now()`.

### Card

`apps/web/src/features/livestock/RotationAdherenceCard.tsx`
(+ `.module.css`) — render-only audit surface, single
`{ projectId: string }` prop. Three `useMemo`'d store selectors
(`useLivestockStore` paddocks filtered by `projectId`,
`useRotationPlanStore` plan, `useLivestockMoveLogStore` events).
Three states:
- no paddocks → empty
- on-track → "On track — logged moves match the rotation plan"
- drift → light + counts + ranked recommendations

`Read-only` mode badge, mirrors `RotationSequenceCard` palette and
conventions. Zero store writes, zero navigation, zero mutating
buttons. Agronomic / ecological vocabulary only — never frames
adherence as financial.

### Plan registration (append-only)

`apps/web/src/v3/plan/types.ts` — single entry appended to the
`livestock` module after `'plan-livestock-rotation-plan'`, before the
Product Chain group:
`{ label: 'Rotation adherence', sectionId: 'plan-livestock-rotation-adherence' }`.

`apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — lazy import after
`RotationPlanCard` and one render `case` for the new sectionId. No
palette / view-scope / artifact-presence / guidance edits — the
`livestock` module is already generically covered (same path the
existing B3 RotationPlan/RotationSequence cards used).

## Covenant

Strictly agronomic / ecological operating analytics. No riba /
gharar / CSRA / salam / financing / capital / investor / yield
framing. Engine and card source covenant-regex-clean
(`/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`
matches only the negative-assertion docstrings). No
`WorkItem.status` read or mutation. Composition discipline preserved
— recovery / rest math stays B3-owned, surfaced verbatim.

## Verification

- `pnpm --filter @ogden/web typecheck` exit 0.
- `pnpm --filter @ogden/web test` — 122/122 files, 1286/1286 tests
  green (two new suites: 11 engine tests, 4 card happy-dom tests,
  incl. deterministic ranking, no-input-mutation under deep-freeze,
  open-interval-overgrazed, covenant-lexicon assertions).
- `pnpm --filter @ogden/web build` ✓ (vite, 40.6s).
- `@ogden/shared` untouched (engine imports only `Light`/`Severity`
  types).

Subagent-driven-development workflow: Task 1 implementer DONE →
SPEC_COMPLIANT → APPROVED_WITH_MINOR; Task 2 implementer DONE →
SPEC_COMPLIANT → APPROVED_WITH_MINOR (minors deferred per "ship
as-is" recommendation); Task 3 mechanical append committed without
formal stage-2 review.

## Out of scope

Edit affordances on the adherence surface (mutating buttons,
inline rotation-plan repair, work-item generation from
recommendations) — this card is strictly audit. Any later editable
companion would be a separate slice with its own brainstorm → spec
→ plan cycle and would NOT introduce spine-status mutation from
inside the adherence engine.
