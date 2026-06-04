# ADR: Observation log is an append-only per-flag-closure ledger -- the historical substrate for chronic co-occurrence detection

**Date:** 2026-06-03
**Status:** accepted (T1-T4 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (commits `5bd16828`, `66b881f1`, `ae4286d9`; **not pushed**)

## Context

Slice #2 of a three-slice line. Slice #1 (the cross-protocol co-occurrence
detector, [[decisions/2026-06-03-atlas-cooccurrence-detection]]) is a derived VIEW
over currently-OPEN review flags: by design a verdict dissolves the moment its
constituent flags resolve. That honesty about the present costs us the past -- once
a flag closes, the fact that its cluster ever existed is gone. A **chronic
structural verdict** (the same protocol signature co-deviating across consecutive
cycles) is categorically stronger and more capital-relevant than any single-season
cluster, and cannot be computed without a durable record of closed deviations. This
slice builds that record. Slice #3 (the chronic/multi-cycle detector that unions
live open clusters with this historical ledger) is the first consumer; it is out of
scope here.

## Decision

**1. Record grain: per-flag closure event -- NOT per-cluster, NOT per-cycle
snapshot.** One immutable `ObservationLogRecord` each time a flag CLOSES. Cluster
semantics are reconstructed later by the chronic detector grouping rows by
`bucketKey` across `cycleNumber`s; the log never knows what a "cluster" is. This
preserves the derived-read-model discipline that made slice #1 honest: record
observations (facts), derive verdicts (interpretation) fresh on read. Baking the
cluster definition into the log would duplicate a semantic the detector owns and
freeze it at write-time.

**2. Append-only ledger, structural twin of `proofEventStore`.** Flat `records[]`,
`append`-only, projectId-tagged, `persist` v1 + `partialize` + `rehydrateWithLogging`,
registered in `syncManifest` as `projectId-tagged` (`tagged('records')`). No update,
no remove -- retention is unbounded and orphans are by design (the history is the
asset; mirrors the proofEvent audit covenant). Persist key `ogden-observation-log`.

**3. Emit at the lowest chokepoint.** The `append` fires INSIDE
`reviewFlagStore.resolveFlag` and `dismissFlag` -- the only two points a steward
action stamps a closure -- not from the UI layer. An audit log a caller can forget
to write is not an audit log. `acknowledgeFlag` and the dormancy / re-open paths
emit NOTHING (those are evaluation pause / reactivation, not closures). A
reopened-then-reclosed flag logs a SECOND record -- correct: two genuine closures.

**4. Log resolve AND dismiss, discriminated by `closeKind`.** A dismissal is a real
observation; a deviation repeatedly dismissed yet recurring is itself a structural
signal the chronic detector must see.

**5. Persisted => validated (zod).** `ObservationLogRecordSchema` mirrors
`reviewFlag.schema.ts` (contrast `CoOccurrenceCluster`, a never-persisted derived
interface). The pure store-free builder `buildObservationLogRecord(flag, closeKind,
closedAt, id)` carries ONLY what the chronic detector needs to reconstruct a
signature (bucketKey, season/cycleNumber, sourceTemplateId, objectiveId, depth,
deviationSign, raisedAt) -- NO sibling-flag list, NO precomputed signature.

**6. Naming: `ObservationLogRecord`, not `ObservationRecord`.** The design doc
proposed `ObservationRecord`, but the barrel already exports an unrelated
`schemas/olos/observationRecord.schema.ts` (`ObservationRecord` = the Observe
objective's output) -- reusing the name produced a `TS2308` duplicate-export
collision. Namespaced to `ObservationLogRecord` / `ObservationLogRecordSchema` /
`buildObservationLogRecord` / file `schemas/protocol/observationLogRecord.schema.ts`
(kept `ObservationCloseKind`). No semantic change.

## Consequences

- The ledger starts EMPTY and accrues forward -- no backfill of flags closed before
  this shipped (disclosed, not fabricated).
- The Zustand v5 fresh-array re-render hazard is avoided: `useObservationLog` mirrors
  the established pattern (stable `select(s => s.records)` + `useMemo` + module-level
  `EMPTY_RECORDS`), never an inline-filter selector.
- No import cycle: `reviewFlagStore` imports `observationLogStore`;
  `observationLogStore` imports only the `ObservationLogRecord` TYPE from
  `@ogden/shared`.
- A single hoisted `const now` in each closure is shared by the ledger row's
  `closedAt` and the flag's `resolvedAt`/`dismissedAt`, honoring the builder's
  documented "same ISO instant" contract (a code-quality review caught an earlier
  double-`Date.now()`).
- Headless slice -- no UI surface; the chronic detector (slice #3) is the first
  consumer.

## Verification

- Shared + web `tsc --noEmit` clean (web at 8 GB heap, EXIT 0).
- Bounded `--pool=forks` sweep, no regression: `observationLogRecord` 4/4,
  `observationLogStore` 5/5, `reviewFlagStore` 41/41 (incl. 6 emission tests --
  resolve appends one `resolved`, dismiss appends one `dismissed`, unknown flagId
  appends none, reopen-reclose appends two, `acknowledgeFlag` appends none, and
  `closedAt === resolvedAt` same-instant).
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot`
  unavailable on this Windows setup -- DISCLOSED): dynamically imported the real
  store modules, seeded one open MTC flag (`spring`/`cycleNumber 1`), called
  `resolveFlag` through the production path, and asserted exactly one record with
  `closeKind:'resolved'`, `bucketKey:'spring:1'`, every flag field copied, and
  `closedAt === flag.resolvedAt`. Backed-up `byProject`, `records`, and both
  localStorage keys were restored afterward.
- **Recorded foreign exception:** the `syncManifest` coverage guard is red on four
  pre-existing UNregistered stores (`ogden-act-evidence`, `ogden-plan-tension-banner`,
  `ogden-protocols`, `ogden-review-flags`) -- confirmed already failing at `706f44b1`
  (before this slice). This slice's `ogden-observation-log` IS correctly classified;
  not a regression from this work.

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind before each commit; not pushed ([[project-branch-rebase]]);
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Design doc: `stages/design-observation-log-review.md` (approved).
Follows the co-occurrence line ([[decisions/2026-06-03-atlas-cooccurrence-detection]]).
Log: [[log/2026-06-03-atlas-observation-log]].
Entities: [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
