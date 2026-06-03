# 2026-06-03 -- Protocol-deviation Review flags re-targeted to the universal s6/s7 objectives (Tier 1 close)

**Branch.** `feat/atlas-permaculture` (explicit-path commit `748a7eb9`, 2 files
+15/-7; **not pushed**).

**Feature.** Tier 1 of the protocol-downstream-objective Review-flag feature
(spec `stages/plan-protocol-downstream-objective-flags-draft.md`): a confirmed
field protocol activation that **deviates** from the steward-authored
`expectedRate` (`{count, per:'season'|'cycle'}`) raises a non-destructive amber
**"Review"** flag on a downstream Plan objective. Store-free emission helper
`evaluateAndRaiseFlags.ts` (T1.6) windows the confirmed firings, runs the pure
`evaluateDeviation` policy, and raises a primary flag + a one-hop cascade flag;
`ObjectiveColumn`/`ObjectiveCard` render an `objective-review-flag-<id>` chip from
`useReviewFlagCountsByObjective`; the detail panel resolves/dismisses it.
T1.1-T1.9 landed in prior sessions; this session closed the **T1.10 gate**.

**Gate-1E blocker (found at T1.10).** The helper targeted the spec's pinned ids
`s6-yield-flows` / `s7-phasing`, which belong to the **legacy static skeleton**
(`PLAN_STRATUM_OBJECTIVES`) that renders ONLY for null-type projects (Level-3
fallback in `useProjectObjectives`). Every typed (wizard-created) project resolves
its objectives from the **universal + per-type catalogues** instead, whose s6/s7
slots are `s6-monitoring` (U-S6.1) and `s7-phase1` (U-S7.1) -- in the SAME strata
(`s6-integration-design` / `s7-phasing-resourcing`). MTC (regenerative_farm + 2
secondaries) resolves 42 objectives, none of them `s6-yield-flows`/`s7-phasing`,
so the chip could never surface on a real project. The two taxonomies share no
back-reference. Same gotcha the as-built loop sidesteps by forcing by domain
([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]).

**Fix (steward decision "map to universal").** Re-pointed the two constants in
`evaluateAndRaiseFlags.ts` to `s6-monitoring` / `s7-phase1` and documented the
two-taxonomy rationale in the header comment so the spec's literal ids are not
"restored" by a later reader. Updated Test 1 in
`evaluateAndRaiseFlags.test.ts` to assert the new ids + the
`downstream of s6-monitoring:` cascade prefix; Tests 2-12 are id-agnostic.

**Accepted caveat.** Null-type / legacy-skeleton projects no longer surface the
chip (they render `s6-yield-flows`, not `s6-monitoring`). Acceptable -- the product
path is always-typed; the null-type skeleton is retiring.

**Tier-2 hazard flagged.** The pending `FEEDS_TO_OBJECTIVE` table (T2.1) also uses
the legacy ids in the spec draft (e.g. `seasonal-stocking-rate-review ->
['s6-yield-flows','s7-phasing']`); these will need the same universal re-target
when Tier 2 is built. Raised to the steward, not yet changed.

**Verified.** `evaluateAndRaiseFlags` 12/12; full Tier-1 review-flag suite
**58/58** across 7 files (evaluateAndRaiseFlags, ObjectiveColumn 3/3, ObjectiveCard
4/4, ObjectiveDetailPanel.review 5/5 + verify 3/3, reviewFlagStore 18/18,
reviewFlagStore.dormancy 13/13), bounded `pool:'forks'`
([[feedback-vitest-bounded-runs]]); `@ogden/web` `tsc --noEmit` EXIT 0. **Not
browser-verified at the commit** -- preview server was down (dead API;
`preview_screenshot` hangs); chip->detail->resolve loop verified via the
authoritative `ObjectiveColumn.test.tsx` instead of a live screenshot, disclosed
not claimed ([[project-screenshot-hang]]). **Follow-up (later 2026-06-03, Tier-2
session):** browser-verified live on MTC -- injecting the exact s6-bound emission
surfaced the amber Review chip on **both** `s6-monitoring` (S6) and `s7-phase1`
(S7) cards; injected flags removed after. Closes the deferred visual check.

Files: `apps/web/src/v3/act/protocols/evaluateAndRaiseFlags.ts`,
`apps/web/src/v3/act/protocols/__tests__/evaluateAndRaiseFlags.test.ts`.

**Stopped here for steward review before Tier 2** (T2.1 FEEDS_TO_OBJECTIVE table ->
T2.2 emission-consults-table -> T2.3 Tier-2 verification remain pending).

Explicit-path commit, foreign WIP untouched ([[feedback-no-deletion]]); own
fetch+divergence-checked slice (0 behind / 59 ahead;
[[feedback-commit-immediately-on-rebased-branches]]); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only. ADR
[[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]]; builds
on [[decisions/2026-05-29-atlas-per-type-objective-model]] +
[[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]. Entity
[[entities/act-tier-shell]].
