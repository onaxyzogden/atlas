# Design: Observation Log (flag-closure ledger -- substrate for chronic co-occurrence detection)

**Status:** review
**Date:** 2026-06-03
**Branch:** `feat/atlas-permaculture` (not pushed)
**Parent / north star:** `stages/design-protocol-cooccurrence-detection-review.md` (T1-T6
complete) deferred "cross-window / multi-season trend (a cluster recurring across
consecutive cycles = a chronic structural verdict)". The live co-occurrence model
detects clusters from currently-OPEN flags only; when a flag resolves it leaves the
live model and the fact that its cluster ever existed is lost. This slice builds the
historical substrate the chronic detector will read. It is slice #2 of three:
(2) this log, (3) the chronic/multi-cycle detector that consumes it.

## Problem

The co-occurrence verdict is a derived VIEW over open review flags -- by design it
dissolves the moment its constituent flags resolve (`decisions/
2026-06-03-atlas-cooccurrence-detection`). That honesty about the present costs us
the past: there is no record that a cluster occurred in cycle K once its flags close.
A "chronic structural verdict" -- the same protocol-signature co-deviating across
consecutive cycles -- is a categorically stronger and more capital-relevant signal
than any single-season cluster (it argues for re-earthworking / re-siting water at
the structural layer, not nudging a threshold). It cannot be computed without a
durable record of closed deviations. This slice is that record.

## Amanah gate

Benign agronomic land-stewardship record-keeping -- a farm "medical record." Read-only
history; the steward still decides. No riba / gharar. No CSRA / advance-purchase
framing. No cost / financing / capital / investor / yield-as-return semantics (those
stay Scholar-gated). Append-only, no deletion -- aligned with the standing
no-deletion discipline and the `proofEventStore` "audit history stays intact"
covenant. Cleared.

## Steward-settled decisions (2026-06-03)

1. **Record grain: per-flag lifecycle event (NOT per-cluster, NOT per-cycle
   snapshot).** One immutable row each time a flag CLOSES. Cluster semantics are
   reconstructed later by the chronic detector grouping rows by bucket -- the log
   never knows what a "cluster" is. This preserves the derived-read-model discipline
   that made the live feature honest: record observations (facts), derive verdicts
   (interpretation) fresh on read. Baking the cluster definition into the log (the
   rejected per-cluster option) would both duplicate a semantic the detector owns and
   freeze it at write-time.
2. **Append-only ledger, twin of `proofEventStore`.** Flat `records[]`, `append`-only,
   projectId-tagged, `persist` v1 + `partialize` + `rehydrateWithLogging`. Idiomatic
   because it mirrors the existing field-proof ledger exactly.
3. **Emit at the lowest chokepoint.** The append fires INSIDE
   `reviewFlagStore.resolveFlag` and `dismissFlag` -- the only two places a steward
   action stamps a closure -- not from the UI layer. An audit log a caller can forget
   to write is not an audit log.
4. **Log resolve AND dismiss (discriminated by `closeKind`).** A dismissal is a real
   observation; a deviation repeatedly dismissed yet recurring is itself a structural
   signal the chronic detector must see. Do NOT log auto-dormancy or the T1.9
   dismissed-but-worsening re-open (those are evaluation pause / reactivation, not
   closures). A reopened-then-reclosed flag logs a SECOND record -- correct: two
   genuine closure events.
5. **Unbounded retention, no cascade.** Deleting a flag or project does NOT prune its
   records. The history is the asset. Pruning/retention windows deferred.
6. **Headless slice.** Schema + emission wiring + read selector + tests only. No UI
   surface. The chronic detector (slice #3) is the first consumer.

## Architecture

### Record type + pure builder (`packages/shared/src/...`)

`ObservationRecord` is a **zod schema** (it is PERSISTED -> validated, mirroring
`reviewFlag.schema.ts`; contrast `CoOccurrenceCluster`, which is a never-persisted
derived interface). Proposed location:
`packages/shared/src/schemas/protocol/observationRecord.schema.ts`, barrel-exported
from `packages/shared/src/index.ts` (confirm exact barrel pattern in source).

```
ObservationRecord {
  id: string;            // unique per CLOSURE event (not per flag)
  projectId: string;
  flagId: string;
  sourceTemplateId: string;
  objectiveId: string;
  bucketKey: string;     // temporalBucketKey(season, cycleNumber)
  season?: SeasonName;
  cycleNumber?: number;
  depth: FlagDepth;
  deviationSign: 'over' | 'under' | 'existential';
  raisedAt: string;      // copied from the flag (ISO)
  closedAt: string;      // ISO
  closeKind: 'resolved' | 'dismissed';
}
```

Pure helper `buildObservationRecord(flag, closeKind, closedAt, id): ObservationRecord`
(in shared, store-free, testable; reuses the existing `temporalBucketKey`). It carries
ONLY what the chronic detector needs to reconstruct a signature (bucket, cycleNumber,
templateId, objectiveId, depth, deviationSign) -- NO sibling-flag list, NO precomputed
signature (that would reintroduce the rejected per-cluster grain).

### Store (`apps/web/src/store/observationLogStore.ts`)

Structural twin of `proofEventStore.ts`:

```
interface ObservationLogState {
  records: ObservationRecord[];
  append: (r: ObservationRecord) => void;
  getProjectRecords: (projectId: string) => ObservationRecord[];
}
persist(... , { name: 'ogden-observation-log', version: 1,
                partialize: (s) => ({ records: s.records }) })
rehydrateWithLogging(useObservationLogStore);
```

`append` is add-only (`records: [...s.records, r]`). No update, no remove (retention
covenant). Confirm whether new persisted stores must register in `syncManifest` as
`projectId-tagged` (proofEventStore's header says so) -- plan must verify in source.

### Emission wiring (`apps/web/src/store/reviewFlagStore.ts`)

Inside `resolveFlag` and `dismissFlag`, after computing the closed flag, call
`useObservationLogStore.getState().append(buildObservationRecord(flag, kind, now, id))`.
The `id` comes from the SAME id helper review flags use (plan must confirm the helper
in source -- do NOT hand-roll). `now` = the same `new Date().toISOString()` already
stamped on the flag. Capture the target `flag` object inside the existing `.map` so
the record is built from the pre-close snapshot. No change to dormancy, re-open, or
acknowledge paths.

### Read seam (`apps/web/src/store/observationLogStore.ts`)

`useObservationLog(projectId: string | null): ObservationRecord[]` -- Zustand-v5-safe:
stable `select(s => s.records)` + `useMemo` keyed `[records, projectId]` + a
module-level `EMPTY_RECORDS` constant; filter by projectId. NEVER an inline-filter
selector (the documented fresh-array re-render hazard). The chronic detector (slice #3)
will UNION live open clusters (from the existing co-occurrence detector) with
historical closed records (from this hook): present from the live model, past from the
ledger.

## Data flow

steward resolves/dismisses a flag
  -> reviewFlagStore action stamps resolvedAt|dismissedAt (unchanged)
  -> same action appends one ObservationRecord to observationLogStore
  -> record persisted under 'ogden-observation-log'
  -> [slice #3] chronic detector reads useObservationLog + live clusters,
     groups by bucketKey across cycleNumbers, surfaces chronic verdicts.

## Testing

- **Shared (bounded forks):** `buildObservationRecord` maps every field correctly
  (bucketKey via temporalBucketKey; season/cycleNumber optional passthrough; copies
  raisedAt; sets closeKind); zod schema accepts a valid record and rejects a missing
  required field.
- **Web store (bounded forks):** `append` adds one row; records survive across
  `getProjectRecords` filtering by projectId; no update/remove API exists.
- **Emission (bounded forks):** resolving a flag appends exactly one `resolved`
  record with the flag's fields; dismissing appends exactly one `dismissed` record;
  auto-dormancy appends NONE; a reopen-then-reclose appends TWO records.
- **Preview gate (`preview_eval` DOM, port 5200; `preview_screenshot` unavailable on
  this Windows setup -- DISCLOSE):** back up `localStorage['ogden-observation-log']`
  and `['ogden-review-flags']`; seed an MTC flag; resolve it via the UI; assert one
  record landed in `ogden-observation-log` with the right `closeKind`/`bucketKey`;
  restore both keys.

## Out of scope (explicit, later slices)

- The chronic / multi-cycle detector itself (slice #3) and any UI surface for it.
- Retention / pruning / cap on `records[]`.
- Backfill of records for flags resolved BEFORE this ships -- the log starts EMPTY and
  accrues forward. The gap is disclosed, not fabricated.
- Any cost / capital / yield semantics (Scholar-gated, permanently out).

## Integration points the plan must verify in source (not assume)

1. The id helper review flags use (mirror it for `ObservationRecord.id`).
2. Whether `syncManifest` requires registering the new persisted store as
   `projectId-tagged`.
3. The exact `@ogden/shared` barrel export pattern + the canonical folder for a new
   protocol schema (alongside `reviewFlag.schema.ts`).

## Definition of done

A zod `ObservationRecord` + pure `buildObservationRecord` ship in `@ogden/shared`; an
append-only `observationLogStore` (twin of `proofEventStore`) persists records under
`ogden-observation-log`; `reviewFlagStore.resolveFlag`/`dismissFlag` each append
exactly one record (resolve+dismiss only; dormancy/re-open excluded); a Zustand-v5-safe
`useObservationLog(projectId)` exposes per-project records; shared + web tsc clean
(foreign errors excepted); all new specs green (bounded forks); verified via
`preview_eval` (disclosed); ProtocolConfirmationFlow + spine untouched; no deletions;
ASCII-only; not pushed unless asked.
