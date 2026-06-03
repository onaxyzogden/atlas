# ADR: Protocol-deviation Review flags target the universal-taxonomy s6/s7 objectives, not the legacy static skeleton

**Date:** 2026-06-03
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (explicit-path commit `748a7eb9`, 2 files +15/-7; **not pushed**)

## Context

Tier 1 of the **protocol-downstream-objective Review-flag** feature
(spec `stages/plan-protocol-downstream-objective-flags-draft.md`) raises a
non-destructive amber **"Review"** flag on a downstream Plan objective when a
confirmed field protocol activation **deviates** from the steward-authored
`expectedRate` (`{count, per:'season'|'cycle'}`). The emission helper
`apps/web/src/v3/act/protocols/evaluateAndRaiseFlags.ts` (T1.6) is store-free:
the caller (`ActTierExecutionPanel`) injects `raiseFlag` + the activations array,
the helper windows the confirmed firings, runs the pure `evaluateDeviation`
policy, and raises a **primary** flag plus a one-hop **cascade** flag.

The helper originally targeted two objective ids pinned in the spec:
`PRIMARY_OBJECTIVE_ID = 's6-yield-flows'`, `CASCADE_OBJECTIVE_ID = 's7-phasing'`.
At the T1.10 verification gate this was found to be a dead target. OLOS carries
**two parallel objective taxonomies** that share no back-reference:

- **Legacy static skeleton** (`packages/shared/src/constants/plan/stratumObjectives.ts`,
  `PLAN_STRATUM_OBJECTIVES`): ids `s6-yield-flows` (stratum `s6-integration-design`)
  and `s7-phasing` (stratum `s7-phasing-resourcing`). This set renders ONLY as the
  Level-3 fallback in the objective-resolution ladder
  ([[decisions/2026-05-29-atlas-per-type-objective-model]],
  `useProjectObjectives`) -- i.e. for **null-type / pre-slice** projects with no
  `projectTypeRecord` and no resolvable bare `projectType`.
- **Universal + per-type catalogues** (`packages/shared/src/constants/plan/catalogues/universal.ts`
  + per-type files): the 19 universal objectives present in **every typed
  (wizard-created) project's** resolved set. Its s6/s7 slots are
  **`s6-monitoring`** (ref `U-S6.1`, stratum `s6-integration-design`) and
  **`s7-phase1`** (ref `U-S7.1`, stratum `s7-phasing-resourcing`).

Every real product project is typed: the wizard writes a `projectTypeRecord`, the
legacy-bare backfill closes the gap for seeded projects
([[decisions/2026-06-02-atlas-legacy-bare-projecttype-record-backfill]]), and the
7-stage lifecycle that produced null-type projects is retiring. The MTC sample
(`primaryTypeId:'regenerative_farm'` + two secondaries) resolves 42 objectives via
Level 1 -- **none** of them `s6-yield-flows` / `s7-phasing`. So a flag raised on
those ids could never surface its `objective-review-flag-<id>` chip on any real
project: the card that would render the chip is never mounted. The same
two-taxonomy gotcha was already noted as load-bearing for the as-built deviation
loop ([[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]]), which sidesteps
it by forcing the divergence onto a Plan objective **by domain overlap** rather
than a hardcoded id.

## Decision

Re-target the deviation-flag emission to the **universal** s6/s7 objective ids.
Steward decision at the T1.10 gate (AskUserQuestion: *"Fix now: map to universal"*):

```
const PRIMARY_OBJECTIVE_ID = 's6-monitoring';  // U-S6.1, stratum s6-integration-design
const CASCADE_OBJECTIVE_ID = 's7-phase1';      // U-S7.1, stratum s7-phasing-resourcing
```

The universal slots sit in the **same strata** as the legacy targets
(`s6-integration-design` / `s7-phasing-resourcing`), so the feature's intent --
"a deviation lights the integration-design monitoring objective and cascades one
hop to the phasing objective" -- is preserved; only the concrete id changes to the
slot that actually renders. The header comment documents the two-taxonomy
rationale so the next reader does not "restore" the spec's literal ids.

## Consequences

- The Review chip now surfaces on **every typed project** (the universal s6/s7
  objectives are always in the resolved set), closing the integration gap.
- **Accepted caveat:** null-type / legacy-skeleton projects (which render
  `s6-yield-flows`, not `s6-monitoring`) will NOT surface the chip after this
  change. This is acceptable because the product path is always-typed; the
  null-type skeleton is a retiring fallback. Recorded, not hidden.
- **Tier 2 carries the same hazard.** The pending `FEEDS_TO_OBJECTIVE` table
  (T2.1) maps non-s6 protocols to objective ids and the spec draft uses the
  legacy ids there too (e.g. `pre-rotation-paddock-assessment -> ['s6-yield-flows']`,
  `seasonal-stocking-rate-review -> ['s6-yield-flows','s7-phasing']`). Those
  entries will need the same universal re-target when Tier 2 is implemented --
  flagged to the steward, not yet changed.
- A durable fix for the underlying split (a `baseId`/`universalId` cross-reference
  between the two taxonomies, so emission could resolve either) is **out of scope**
  here and left as a future consideration.

## Verification

- `evaluateAndRaiseFlags` unit suite **12/12** green: Test 1 asserts the two
  raised flags carry `objectiveId` `s6-monitoring` then `s7-phase1` and the
  cascade `reason` is prefixed `downstream of s6-monitoring:`. Tests 2-12
  (count / sign / direction / establishment-prefix) are id-agnostic and unchanged.
- Full Tier-1 review-flag suite **58/58** across 7 files (evaluateAndRaiseFlags,
  ObjectiveColumn 3/3, ObjectiveCard 4/4, ObjectiveDetailPanel.review 5/5 +
  verify 3/3, reviewFlagStore 18/18, reviewFlagStore.dormancy 13/13), all under
  bounded `pool:'forks'` ([[feedback-vitest-bounded-runs]]).
- `@ogden/web` `tsc --noEmit` (8 GB heap) EXIT 0.
- **Not browser-verified at the T1.10 commit** -- the preview server was down
  (dead API, no `ANTHROPIC_API_KEY`; `preview_screenshot` hangs). The
  chip -> detail -> resolve loop was verified via the authoritative
  `ObjectiveColumn.test.tsx` component test rather than a live screenshot;
  disclosed, not claimed ([[project-screenshot-hang]]).
- **Follow-up (2026-06-03, Tier-2 session) -- now browser-verified live on MTC.**
  With servers restored, injecting the exact s6-bound emission through the
  persisted `ogden-review-flags` store and reloading surfaced the amber **Review**
  chip on **both** retarget targets on the typed MTC project: `s6-monitoring`
  (primary, S6 Integration Design card) and `s7-phase1` (cascade, S7 Phasing
  card), each `objective-review-flag-<id>` testid present with title
  "1 downstream review flag". Injected flags removed afterward; store restored.
  `preview_screenshot` still hangs on this setup, so the proof is the DOM/testid
  assertion, not a pixel capture -- disclosed. This closes the deferred visual
  check. (The Tier-2 event path was likewise verified on `s5-water-infrastructure`
  -- see [[decisions/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]].)

Explicit-path commit; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind/59-ahead before commit; not pushed ([[project-branch-rebase]]);
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy. Builds on
[[decisions/2026-05-29-atlas-per-type-objective-model]] and the two-taxonomy
finding in [[decisions/2026-06-01-atlas-act-asbuilt-deviation-loop]].
Log: [[log/2026-06-03-atlas-deviation-flag-universal-objective-retarget]].
Entity: [[entities/act-tier-shell]].
