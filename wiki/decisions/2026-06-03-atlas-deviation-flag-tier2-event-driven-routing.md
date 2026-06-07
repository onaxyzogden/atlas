# ADR: Event-driven protocols route Review flags to their deep Plan objectives via a FEEDS_TO_OBJECTIVE table

**Date:** 2026-06-03
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (explicit-path commits `3b9b1b4a` + `cd3d7870` [T2.1], `fc6c6013` + `a981ef74` [T2.2]; **not pushed**)

## Context

Tier 1 of the **protocol-downstream-objective Review-flag** feature
(spec `stages/plan-protocol-downstream-objective-flags-draft.md`) raised an amber
**"Review"** flag only for the **5 S6-bound** protocol templates, all hard-routed
to a primary `s6-monitoring` flag plus a one-hop `s7-phase1` cascade
([[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]]).
The other **5 of the 10** `STANDARD_PROTOCOL_TEMPLATES` are **event-driven**
(cyclical / judgment, trigger-on-event) and raised nothing. The Tier-1 ADR
explicitly flagged that Tier 2 would carry the **same two-taxonomy hazard**: the
spec draft mapped these templates to the dead legacy-skeleton ids
(`s6-yield-flows` / `s7-phasing`) that never mount on a typed project.

## Decision

**1. A hand-maintained `FEEDS_TO_OBJECTIVE` table** (new file
`packages/shared/src/constants/protocol/feedsToObjective.ts`) maps each
event-driven template to the **deep universal Plan objective(s)** its deviation
contradicts. The legacy ids from the spec draft were re-pointed to universal
catalogue ids at authoring time (carrying the Tier-1 gate decision forward):

| event-driven template | FEEDS_TO_OBJECTIVE target(s) | depth |
|---|---|---|
| `post-rotation-impact-assessment` | `['s3-soil']` | `soil` |
| `pre-rotation-paddock-assessment` | `['s6-monitoring']` | `threshold` |
| `water-trough-inspection` | `['s5-water-infrastructure']` | `water` |
| `seasonal-stocking-rate-review` | `['s6-monitoring','s7-phase1']` | `threshold` |
| `silvopasture-pest-diversion` | `['s4-zones']` | `zones` |

Every target is asserted to be a **real universal objective** via
`findUniversalObjective` in the test suite — the structural guarantee that the
`objective-review-flag-<id>` chip can actually mount.

**2. `TEMPLATE_DEPTH` grew from 5 to 10 entries** (deviationPolicy.ts) — the 5
event-driven templates take `soil`/`water`/`zones` where the event implicates a
deep stratum, and `threshold` for the two operational yield-monitoring events.

**3. The emission helper branches on routing class**
(`evaluateAndRaiseFlags.ts`, T2.2). `S6_BOUND_TEMPLATE_IDS.has(templateId)`:
- **s6-bound** -> unchanged hard cascade (primary `s6-monitoring` + cascade
  `s7-phase1`, cascade reason prefixed `downstream of s6-monitoring:`).
- **event-driven, mapped** -> **one plain flag per mapped target** (no cascade,
  no `downstream of` prefix); 1 or 2 flags depending on the table row.
- **unmapped / custom** (neither s6-bound nor a table key) -> **no flag**
  (early return).

The caller (`ActTierExecutionPanel.resolveTrigger`) was already **generic over
`templateId`** — it calls `evaluateAndRaiseFlags` for every confirmed activation —
so event-driven templates reach the helper with no caller change.

## Consequences

- All 10 standard protocols now light a downstream Plan objective on deviation;
  the 5 event-driven ones light their **deep** stratum (soil/water/zones), not a
  generic monitoring slot, giving the steward a more precise review locus.
- **Two hand-maintained tables** (`FEEDS_TO_OBJECTIVE` keys + `TEMPLATE_DEPTH`
  keys) can drift. Mitigated by two **drift-guard tests** asserting the key sets
  are exactly the event-driven ids and exactly all 10 standard template ids
  respectively — a typo/stale/extra key fails CI.
- The underlying taxonomy split (no `baseId`/`universalId` cross-reference) is
  still papered over by a hand table, not solved. Durable fix remains out of
  scope, as in the Tier-1 ADR.

## Verification

- `@ogden/shared` `tsc --noEmit` EXIT 0; `@ogden/web` `tsc --noEmit` (8 GB heap)
  EXIT 0.
- Shared protocol specs **39/39** (deviationPolicy 19, reviewFlag 13,
  feedsToObjective 7) and the full web review-flag suite **61/61** across 7 files
  (evaluateAndRaiseFlags **15**, ObjectiveCard 4, ObjectiveColumn 3,
  ObjectiveDetailPanel.review 5 + verify 3, reviewFlagStore 18 +
  dormancy 13), all under bounded `pool:'forks'` ([[feedback-vitest-bounded-runs]]).
  New emission tests: water-trough-inspection -> 1 flag `s5-water-infrastructure`
  depth `water` (no cascade); seasonal-stocking-rate-review -> 2 flags
  `{s6-monitoring,s7-phase1}` plain reason; post-rotation-impact-assessment ->
  1 flag `s3-soil` depth `soil`; unmapped-custom -> 0 flags.
- **Browser-verified live this session** (closes the Tier-1 ADR's deferred visual
  check). On the typed MTC project (`projectId 'mtc'`, `regenerative_farm`):
  confirmed `s5-water-infrastructure` ("Water harvesting & storage system",
  `universal.ts:615`) **mounts** as a Plan S5 objective card; injected a
  realistically-shaped `water-trough-inspection` over-deviation flag through the
  persisted `ogden-review-flags` store; on reload the amber **Review** chip
  rendered on that card (`objective-review-flag-s5-water-infrastructure`, title
  "1 downstream review flag"); opened the detail panel, clicked **Resolve** ->
  `resolvedAt` stamped and the chip cleared. Injected test flag removed
  afterward; store restored to its prior 2 flags. `preview_screenshot` hung
  (the known transient on this setup, [[project-screenshot-hang]]) so the proof is
  the DOM/testid assertion, not a pixel capture — disclosed, not claimed.

Explicit-path commits; foreign parallel-session WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]) —
note the `git commit --amend` hazard on this branch (HEAD moves out-of-band
between commits): a prior amend landed on a foreign commit and was recovered via
`reset --soft`; Tier-2 fixes thereafter used **plain follow-up commits** only.
Fetched + 0-behind before each commit; not pushed ([[project-branch-rebase]]);
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy. Builds on
[[decisions/2026-06-03-atlas-deviation-flag-universal-objective-retarget]] and
[[decisions/2026-06-02-olos-protocol-tier-slice]].
Log: [[log/2026-06-03-atlas-deviation-flag-tier2-event-driven-routing]].
Entity: [[entities/act-tier-shell]].
