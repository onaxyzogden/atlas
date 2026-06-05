# 2026-06-03 -- Event-driven protocols route Review flags to deep Plan objectives (Tier 2 close)

**Branch.** `feat/atlas-permaculture` (explicit-path commits `3b9b1b4a` + `cd3d7870`
[T2.1], `fc6c6013` + `a981ef74` [T2.2]; **not pushed**).

**Feature.** Tier 2 of the protocol-downstream-objective Review-flag feature
(spec `stages/plan-protocol-downstream-objective-flags-draft.md`). Tier 1 flagged
only the 5 **S6-bound** templates (hard `s6-monitoring` + `s7-phase1` cascade,
[[log/2026-06-03-atlas-deviation-flag-universal-objective-retarget]]). Tier 2
extends flagging to the other 5 of the 10 `STANDARD_PROTOCOL_TEMPLATES` -- the
**event-driven** (cyclical/judgment, trigger-on-event) protocols -- routing each
to the **deep** universal Plan objective its deviation contradicts.

**T2.1 (shared) -- `3b9b1b4a` + `cd3d7870`.** New
`packages/shared/src/constants/protocol/feedsToObjective.ts` exports
`FEEDS_TO_OBJECTIVE`: post-rotation-impact-assessment->`[s3-soil]`,
pre-rotation-paddock-assessment->`[s6-monitoring]`,
water-trough-inspection->`[s5-water-infrastructure]`,
seasonal-stocking-rate-review->`[s6-monitoring,s7-phase1]`,
silvopasture-pest-diversion->`[s4-zones]` (legacy spec-draft ids re-pointed to
universal ids, carrying the Tier-1 gate decision forward). `TEMPLATE_DEPTH` grew
5->10 (soil/water/zones for deep-stratum events, threshold for the two
yield-monitoring events). Barrel re-export added in `index.ts`. 7 TDD specs
including a `findUniversalObjective` reality check on every target. Follow-up
`cd3d7870` added 2 **drift-guard** tests (FEEDS_TO_OBJECTIVE keys == event-driven
ids; TEMPLATE_DEPTH keys == all 10 template ids) after code-quality review, and
fixed the sibling `deviationPolicy.test.ts` length assertion 5->10.

**T2.2 (web) -- `fc6c6013` + `a981ef74`.** `evaluateAndRaiseFlags.ts` now branches
on `S6_BOUND_TEMPLATE_IDS.has(templateId)`: s6-bound keeps the primary+cascade
emission; event-driven looks up `FEEDS_TO_OBJECTIVE[templateId]` and raises **one
plain flag per mapped target** (no cascade, no `downstream of` prefix); an
unmapped/custom template raises **nothing** (early return). `depth` is now generic
`TEMPLATE_DEPTH[templateId] ?? 'threshold'`. The caller
(`ActTierExecutionPanel.resolveTrigger`, line ~363) was already generic over
`templateId`, so event-driven templates reach the helper with **no caller change**
-- confirmed by reading the call site. Test 6 repurposed to unmapped-custom (0
flags); tests 13-15 added for water-trough / seasonal-stocking / post-rotation.
Follow-up `a981ef74` corrected stale docblock + step-6 comment and added a
symmetric no-cascade assertion.

**T2.3 (verification + preview gate).** `@ogden/shared` + `@ogden/web`
`tsc --noEmit` EXIT 0. Shared protocol specs **39/39**; full web review-flag suite
**61/61** across 7 files (evaluateAndRaiseFlags **15**), bounded `pool:'forks'`
([[feedback-vitest-bounded-runs]]). **Browser-verified live** on the typed MTC
project (closes the Tier-1 ADR's deferred visual check): confirmed
`s5-water-infrastructure` ("Water harvesting & storage system", `universal.ts:615`)
mounts as a Plan S5 card; injected a realistically-shaped water-trough-inspection
over-deviation flag via the persisted `ogden-review-flags` store; on reload the
amber **Review** chip rendered on that exact card
(`objective-review-flag-s5-water-infrastructure`); opened the detail panel ->
**Resolve** -> `resolvedAt` stamped and chip cleared. Injected flag removed
afterward (store restored to its prior 2 flags). `preview_screenshot` hung
([[project-screenshot-hang]]) so proof is the DOM/testid assertion, not a pixel
capture -- disclosed. T2.3 produced **no code changes** (verification-only); nothing
to commit.

**Git hazard recovered.** A `git commit --amend` intended to fold T2.1 quality
fixes instead amended a foreign parallel-session commit (`10d45335`, HEAD had
advanced out-of-band). Diagnosed via reflog, restored the foreign commit with
`reset --soft`, and re-committed the fixes as a plain follow-up. Lesson reinforced:
on this branch **never `--amend`** ([[feedback-commit-immediately-on-rebased-branches]]);
use plain follow-up commits and verify HEAD == expected SHA before any history op.

Files: `packages/shared/src/constants/protocol/feedsToObjective.ts` (new),
`packages/shared/src/constants/protocol/deviationPolicy.ts`,
`packages/shared/src/index.ts`,
`packages/shared/src/constants/protocol/__tests__/feedsToObjective.test.ts` (new),
`packages/shared/src/constants/protocol/__tests__/deviationPolicy.test.ts`,
`apps/web/src/v3/act/protocols/evaluateAndRaiseFlags.ts`,
`apps/web/src/v3/act/protocols/__tests__/evaluateAndRaiseFlags.test.ts`.

**Feature complete (Tier 1 + Tier 2).** All 10 standard protocols now light a
downstream Plan objective on deviation. Explicit-path commits, foreign WIP
untouched ([[feedback-no-deletion]]); fetch+divergence-checked (0 behind;
[[feedback-commit-immediately-on-rebased-branches]]); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only. ADR
[[decisions/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]]; builds on
[[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]] +
[[decisions/2026-06-02-olos-protocol-tier-slice]]. Entity [[entities/act-tier-shell]].
