# 2026-05-20 — Phase C: Agent workforce + rotation→revenue bridge

**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase C
**ADR:** [[2026-05-20-atlas-phase-c-agent-workforce-rotation-engine]]

## Commits

- `8418062a` — `feat(ai): C.6 — agent registry + /ai/agent-chat route + tests`
- `6a61d6cf` — `feat(livestock): C.7 — rotationEngine + livestockRevenue + RotationScheduleCard engine block + tests`

## Summary

C.6 widens `ClaudeClient.callAnthropic` to accept a multi-block system
array, exports `SYSTEM_PROMPT`, adds `chatWithRole`, and ships an
`agentRegistry` with three roles (`agro-designer`, `hydro-engineer`,
`general`), a pure `routeIntent` keyword-tally router, and a `runAgent`
that parses a trailing `HANDOFF:` line. New `POST /api/v1/ai/agent-chat`
route is project-membership-gated. Atlas keeps its single voice via the
cached base prompt while role addendums vary — base prompt is the cache
key across all three roles.

C.7 adds `computeRotationCalendar` (wraps canonical
`computeRotationCarryingCapacity` via a synthetic single-mob plan; no
AU math fork) and `buildLivestockRevenueStream` (default 5-year build-up
ramp `[0.2, 0.4, 0.65, 0.85, 1.0]`, plateau 1.0 through year 10; default
`enterprise: 'livestock'`). The stream slots into `computeCashflow`
with zero engine change. `RotationScheduleCard` gains an additive
"Cycle engine" summary block (cycles/yr, AU-days/yr, parasite-break
badge, utilization%) using an implied-mob 1 AU/ha heuristic until
herd-size capture lands — clearly labelled. Plan-driven
`RotationSequenceCard` is left untouched per [[feedback-no-deletion]].

## Gate

- API tsc clean.
- API test suite: **653 passed / 3 skipped (656)** across 60 files.
- Web tsc: only pre-existing `StepBoundary.tsx(365,7)` error remains
  (verified by stash-baseline comparison — not C.6/C.7).
- Web test suite: **1620 passed (1620)** across 157 files, including 24
  new C.6 cases (`aiAgents.test.ts`) and 16 new C.7 cases
  (`rotationEngine.test.ts`, `livestockRevenue.test.ts`).
- Manual 200-acre fixture smoke deferred (Assumption A2 — fixture not
  yet seeded).

## Covenant + IA

- No CSRA / *bayʿ mā laysa ʿindak* / salam framing reintroduced.
- "Capital partners & allies" language preserved; livestock revenue is
  steward-facing operating estimate, not investor yield.
- 3-item Observe/Plan/Act IA unchanged.
- Mobile Overview stack flat — engine block lands on the card surface,
  not the mobile shell.

## Next

- Push `feat/atlas-permaculture` to `origin` at the C → D boundary.
- Phase D.1 — `transitionBudget` engine + scenarioStore fields + tests.
