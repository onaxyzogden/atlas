# ADR: Observation-ledger compaction demotes pruned rows to a recoverable archive tier (archive-not-erase); the modal names rotation cycles and drops the permanence gate

**Date:** 2026-06-05
**Status:** accepted (T1-T3 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (commits `e464457c`, `a0c41dd2`, + this docs commit; **not pushed**)

## Context

A re-scope of slice #4's first deferred item ("configurable retention window"
[[decisions/2026-06-04-atlas-chronic-display-and-prune-ui]]). After an agronomic /
SaaS-stewardship review the configurable stepper was held and the slice re-aimed at
data-safety. Two issues surfaced reviewing the shipped compact-ledger modal:

1. **Misleading retention copy.** The modal's "Always kept" line read "the most recent
   12 cycles in each season." A *cycle* is a **rotation / observation cycle**
   (`cycleNumber`) -- a SEPARATE axis from `season`. A steward could read "12 cycles" as
   *seasons* (3 years of safety) when the system means *rotations* (possibly < 1 year on
   intensive grazing) -- a silent data-loss trap.
2. **Erasure fights the covenant.** Slice #3
   ([[decisions/2026-06-03-atlas-chronic-detection]]) amended slice #2's "history is the
   asset" unbounded-retention covenant to allow a steward-initiated `pruneProjectRecords`
   that **erased** old closure rows. But the observation ledger is the substrate for
   multi-year chronic-pattern detection: permanently deleting old rotations structurally
   blinds the detector to any chronic whose period exceeds the recency window, and erasing
   the land's slowly-accumulated record sits against *produce no waste* (Holmgren P6),
   biodynamic farm memory, and the operator's amanah stewardship. A JSON "export before
   delete" was considered and rejected: with no import path it is a write-only "backup"
   that offloads the duty of care onto the steward and can *increase* deletion by giving
   false confidence.

## Decision

**Compaction demotes instead of deleting.** Pruned rows move to a recoverable
`archivedRecords` tier inside the same store; the active ledger stays lean, the archive is
dormant (the detector never reads it), and a steward can restore. This is a deliberate
**second amendment** to the observation-log retention covenant (slice #2 unbounded ->
slice #3 steward-erase -> this: steward-*archive*, recoverable) and it *strengthens* the
original slice-2 covenant (nothing leaves the organism) rather than weakening it. Web-only:
the shared retention helper and schema are unchanged -- only the **disposition** of pruned
rows changes.

**1. Store -- `apps/web/src/store/observationLogStore.ts` (T1, `e464457c`).**
- New `archivedRecords: ObservationLogRecord[]` state, added to persist `partialize`.
- Persist bumped **v1 -> v2** with a version-gated `migrate` (matches the `closedLoopStore`
  idiom): `version < 2` seeds `archivedRecords: []` on already-stored state and preserves
  `records`; the v2 branch passes both through. No row is lost or moved on migrate.
- `pruneProjectRecords` stops dropping `pruned` and instead moves it into the archive,
  applied via the functional `set((s) => ...)` form (matches `append`, so the
  records/archivedRecords reads cannot observe stale state). It still returns `pruned`
  (observable). `previewProjectPrune` is **unchanged** -- still pure (no `set`), still the
  single shared composition the action reuses, so preview and confirm cannot drift.
- New `restoreArchivedRecords(projectId) => ObservationLogRecord[]`: removes that project's
  rows from `archivedRecords`, appends them back to `records`, returns the restored rows
  (also functional `set`). Returns `[]` when nothing is archived for that project.
- New Zustand-v5-safe `useArchivedLog(projectId)` -- stable whole-array select on
  `archivedRecords` + `useMemo` slice + shared `EMPTY_RECORDS`, mirroring `useObservationLog`
  (never an inline-filter selector -> avoids the fresh-array re-render hazard).

**Why the detector stays correct for free.** `detectChronicVerdicts` reads `records` only,
so archived rows are dormant. Because `partitionExpiredRecords` already protects every
chronic-contributing leg (never pruned -> never archived), the archive only ever holds
*non-chronic, old* rotations -- restoring is always safe and never resurrects a hidden
active chronic. A future long-period chronic that would need an archived leg is now
*recoverable* (restore brings it back), versus permanently lost under erase.

**2. Modal -- `apps/web/src/v3/plan/strata/PruneLedgerModal.tsx` (T2, `a0c41dd2`).**
- **Copy fix:** "Always kept" line -> "The most recent
  {OBSERVATION_LOG_RETENTION_CYCLES} rotation cycles within each season" (value sourced
  from the imported constant, never a string literal, so copy and behaviour stay locked),
  plus a semantics sentence naming rotation cycles as the unit.
- **Reframe permanent -> reversible:** the `prune-understood` checkbox and its gate are
  removed entirely. Archiving is reversible, so a single click suffices: `prune-confirm`
  ("Compact ledger") is enabled whenever `removable > 0 && result === null`. Summary drops
  "permanently"; result line -> "Archived {result} records."
- **Restore affordance:** when `useArchivedLog(projectId).length > 0`, a "Restore archived
  ({n})" button (`data-testid="prune-restore"`) calls `restoreArchivedRecords(projectId)`
  then `setResult(null)`. The dry-run `removable` count is memoized on `[projectId, records]`
  (the reactive active-records slice) so it recomputes after BOTH archive and restore --
  load-bearing for the restore round-trip.
- `removable === 0` keeps the existing "nothing to compact" copy.

## Consequences

- The covenant is *strengthened*: ledger growth is bounded WITHOUT erasing an undated audit
  row or any record still contributing to a detectable chronic verdict -- memory is demoted,
  never destroyed, and the demotion is reversible in-session.
- The persisted shape grows by one array (`archivedRecords`); persist v2 migrate is
  idempotent and version-gated so a future v3 adds its own branch above without re-running
  v1->v2.
- The `getState()` snapshot inside the modal's `removable` memo is consistent with its
  `records` dependency because the observation store is never mutated inside a
  `startTransition` boundary (every archive/restore is a synchronous click handler) -- this
  assumption is documented at the memo (the code-quality reviewer's one Important item;
  no behavioural risk under the app's rendering profile).
- The shipped slice-#1 CoOccurrence components, the spine, and `ProtocolConfirmationFlow`
  were untouched. The removed-checkbox CSS classes (`.gates` / `.gateRow`) are left in place
  per the no-deletion rule ([[feedback-no-deletion]]).

## Verification

- **Shared tsc + web tsc:** EXIT 0 both packages; all archive-not-erase files type-clean.
- **Bounded `--pool=forks` sweep, no regression:** web 64/64 across 7 suites --
  `groupChronicVerdicts` 11, `ChronicSynthesisCard` 8, `ChronicVerdictBanner` 14,
  `observationLogStore` 5, `observationLogStore.prune` 14 (10 pre-existing + 4 new:
  prune-moves-to-archive, restore round-trip, restore-only-named-project + `[]`-when-none,
  dormant-archive with a genuinely-chronic control), `chronicVerdicts` 4,
  `PruneLedgerModal` 8 (renders "3 of 15", rotation-cycle copy, confirm-enabled-no-checkbox,
  archive-on-confirm 12/3 + "Archived 3 records.", swap-to-Done -> onClose, restore
  round-trip 15/0, nothing-to-compact, close -> onClose).
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` UNAVAILABLE on
  this Windows setup -- DISCLOSED; verified the production DATA + module path against the
  live Vite bundle, not pixels -- render correctness rests on the component specs).
  Imported the real `observationLogStore` + `@ogden/shared` detector from the running graph;
  backed up + restored `localStorage['ogden-observation-log']`.
  - *Round-trip:* seeded a 15-record over-window spring ledger -> `previewProjectPrune` was
    a pure dry-run (removable 3, store unchanged 15/0); `pruneProjectRecords` archived
    (records 15->12, archive 0->3, returned 3), and **localStorage reflected the archive
    tier** (persisted records 12 / archivedRecords 3); `restoreArchivedRecords` round-tripped
    (records 12->15, archive 3->0, returned 3). All four assertions green.
  - *Dormant-archive:* a chronic-producing pair in ACTIVE records yielded 1 verdict
    (detector sees it); the SAME pair sitting in `archivedRecords` with only a solo row
    active yielded 0 (archive is dormant); counting the archive back in yielded 1 again
    (the archive genuinely holds the chronic). localStorage restored to its original state.

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind before each commit; staged set verified via Compare-Object before each
commit (the index carries foreign WIP from external rebases); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only.
Amanah: this *strengthens* data stewardship (memory demoted, never destroyed);
steward-initiated, observable, reversible; no riba / gharar / advance-purchase.
Design doc: `stages/design-observation-archive-not-erase-review.md` (approved).
Plan: `.claude/plans/2026-06-05-atlas-observation-archive-not-erase.md` (approved). Builds on
[[decisions/2026-06-04-atlas-chronic-display-and-prune-ui]] (slice #4); second amendment of
the retention covenant first amended in [[decisions/2026-06-03-atlas-chronic-detection]]
(slice #3).
Log: [[log/2026-06-05-atlas-observation-archive-not-erase]].
Entities: [[entities/protocols-dashboard]], [[entities/observe-dashboard]].

## Out of scope (held until requested)

Configurable retention-window stepper; selective per-record restore; an
archive-management UI beyond the count + restore-all; JSON export (superseded -- the
in-system archive is the safety net); consolidating `ProjectBundleBar`'s private
`triggerDownload`; a stepper for `keepWithinCycles`.
