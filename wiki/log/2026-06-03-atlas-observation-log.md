# 2026-06-03 -- Observation log: append-only flag-closure ledger (T1-T4) shipped

**Branch.** `feat/atlas-permaculture` (explicit-path commits `5bd16828`, `66b881f1`,
`ae4286d9`; **not pushed**).

**Feature.** Slice #2 of the chronic-detection line. The co-occurrence detector
(slice #1, [[decisions/2026-06-03-atlas-cooccurrence-detection]]) is a derived view
over OPEN flags and dissolves when they resolve -- so the past is lost. This slice
records it: a headless, persisted, append-only ledger of review-flag CLOSURE events
(resolve + dismiss), the historical substrate the future chronic/multi-cycle
detector (slice #3) will read by grouping rows across cycles. No UI.

**Settled design** (see ADR [[decisions/2026-06-03-atlas-observation-log]]):
per-flag-closure grain (NOT per-cluster / per-cycle snapshot -- the log never knows
what a cluster is); append-only twin of `proofEventStore`; emit at the lowest
chokepoint (inside `reviewFlagStore.resolveFlag`/`dismissFlag`, never the UI); log
resolve AND dismiss discriminated by `closeKind`; dormancy/re-open/acknowledge emit
nothing; reopen-reclose logs two records; unbounded retention; persisted => zod-
validated.

**Implemented (subagent-driven, two-stage review per task: spec then quality).**
- **T1 (`5bd16828`)** `packages/shared/src/schemas/protocol/observationLogRecord.schema.ts`:
  `ObservationCloseKind` (`resolved`|`dismissed`), zod `ObservationLogRecordSchema`,
  type, and pure store-free `buildObservationLogRecord(flag, closeKind, closedAt, id)`
  (copies the signature fields, computes `bucketKey` via `temporalBucketKey`,
  conditionally spreads season/cycleNumber). Barrel export added. Shared 4/4 green.
- **T2 (`66b881f1`)** `apps/web/src/store/observationLogStore.ts`: append-only store
  (`records[]`, `append`, `getProjectRecords`), `persist` v1 (`ogden-observation-log`,
  `partialize`, `rehydrateWithLogging`); Zustand-v5-safe `useObservationLog(projectId)`
  (stable `select(s => s.records)` + `useMemo` + module-level `EMPTY_RECORDS`).
  Registered in `syncManifest` as `projectId-tagged` (`tagged('records')`). Web 5/5
  green (incl. referential-stability + no-update/remove covenant).
- **T3 (`ae4286d9`)** `apps/web/src/store/reviewFlagStore.ts`: `resolveFlag`/
  `dismissFlag` look up the pre-close flag via `get().byProject`, append one record,
  then stamp -- each hoisting a single `const now` shared by the record `closedAt`
  and the flag `resolvedAt`/`dismissedAt` (honors the builder's same-ISO-instant
  contract; a code-quality review caught an earlier double-`Date.now()`).
  `acknowledgeFlag` untouched. No import cycle (store imports the TYPE only). Six
  emission tests green.

**Naming deviation (disclosed).** The design proposed `ObservationRecord`, but the
barrel already exports an unrelated `schemas/olos/observationRecord.schema.ts`
(`ObservationRecord` = Observe objective output) -- reuse caused a `TS2308`
duplicate-export collision. Namespaced to `ObservationLogRecord` /
`ObservationLogRecordSchema` / `buildObservationLogRecord` /
`observationLogRecord.schema.ts`. No semantic change; recorded in the ADR + design
doc as-built note.

**Verified.** Shared + web `tsc --noEmit` (8 GB heap) EXIT 0. Bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) sweep, no regression: `observationLogRecord` 4/4,
`observationLogStore` 5/5, `reviewFlagStore` 41/41 (6 emission). **Live preview gate,
`preview_eval` DOM port 5200** -- `preview_screenshot` unavailable on this Windows
setup ([[project-screenshot-hang]]), disclosed: dynamically imported the real store
modules, seeded one open MTC flag, called `resolveFlag` through the production path,
asserted exactly one record (`closeKind:'resolved'`, `bucketKey:'spring:1'`, fields
copied, `closedAt === flag.resolvedAt`), then restored `byProject`, `records`, and
both localStorage keys.

**Recorded foreign exception.** The `syncManifest` coverage guard is red on four
pre-existing UNregistered stores (`ogden-act-evidence`, `ogden-plan-tension-banner`,
`ogden-protocols`, `ogden-review-flags`) -- confirmed already failing at `706f44b1`,
before this slice. `ogden-observation-log` IS correctly classified; not my
regression, not my store to register (explicit-paths-only, don't fix foreign WIP).

Explicit-path commits, foreign WIP untouched ([[feedback-no-deletion]]); fetched +
0-behind before each commit, committed immediately on green
([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]);
not pushed; CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only. ADR
[[decisions/2026-06-03-atlas-observation-log]]; design doc
`stages/design-observation-log-review.md` (approved). Builds on
[[decisions/2026-06-03-atlas-cooccurrence-detection]]. Next: slice #3 -- the chronic/
multi-cycle detector unioning live open clusters with this ledger.
Entities [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
