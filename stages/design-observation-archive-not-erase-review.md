# Design: Observation-ledger compaction becomes archive-not-erase (+ rotation-unit copy fix)

**Status:** review
**Date:** 2026-06-05
**Branch:** `feat/atlas-permaculture`
**Supersedes-in-part:** slice #3 (`wiki/decisions/2026-06-03-atlas-chronic-detection.md`) prune covenant; follows slice #4 (`wiki/decisions/2026-06-04-atlas-chronic-display-and-prune-ui.md`)
**Origin:** re-scope of slice-4's first deferred item ("configurable retention window"). After an agronomic / SaaS-stewardship review, the configurable stepper was held and the slice re-aimed at data-safety.

## Problem

Slice #3 amended slice #2's "history is the asset" unbounded-retention covenant to allow a
steward-initiated `pruneProjectRecords` that **erases** old closure rows; slice #4 gave it a
modal. Two issues surfaced on review:

1. **Misleading copy.** The modal's "Always kept" list reads "the most recent 12 cycles in
   each season." A *cycle* is a **rotation/observation cycle** (`cycleNumber`), a separate
   axis from `season` (confirmed in `observationLogRecord.schema.ts` and
   `observationLogRetention.ts`). A steward could read "12 cycles" as *seasons* (3 years of
   safety) when the system means *rotations* (possibly < 1 year on intensive grazing) -- a
   silent data-loss trap.
2. **Erasure fights the covenant.** The observation ledger is the substrate for multi-year
   chronic-pattern detection; permanent deletion of old rotations structurally blinds the
   detector to any chronic whose period exceeds the recency window, and erasing the land's
   slowly-accumulated record sits against *produce no waste* (Holmgren P6), biodynamic farm
   memory, and the operator's amanah stewardship. A JSON "export before delete" was
   considered and rejected: with no import path it is a write-only "backup" that offloads the
   duty of care onto the steward and can *increase* deletion by giving false confidence.

## Decision

**Compaction demotes instead of deleting.** Pruned rows move to a recoverable `archivedRecords`
tier inside the same store; the active ledger stays lean, the archive is dormant (the detector
never reads it), and a steward can restore. This *strengthens* the original slice-2 covenant
(nothing leaves the organism) rather than weakening it. Web-only: the shared retention helper
and schema are unchanged -- only the **disposition** of pruned rows changes.

### 1. Store -- `apps/web/src/store/observationLogStore.ts`

- Add `archivedRecords: ObservationLogRecord[]` to state and to persist `partialize`.
- Persist **`version 1 -> 2`** with a pass-through `migrate` seeding `archivedRecords: []` on
  already-stored state.
- `pruneProjectRecords` stops dropping `pruned` and instead moves it into the archive:
  `set({ records: [...others, ...kept], archivedRecords: [...get().archivedRecords, ...pruned] })`.
  It still returns `pruned` (observable). `previewProjectPrune` is **unchanged** (still pure,
  still the single shared composition reused by the action -- preview and confirm cannot drift).
- New `restoreArchivedRecords(projectId: string) => ObservationLogRecord[]`: removes that
  project's rows from `archivedRecords`, appends them back to `records`, returns the restored
  rows.
- New Zustand-v5-safe `useArchivedLog(projectId: string | null): ReadonlyArray<ObservationLogRecord>`
  -- stable whole-array select + `useMemo` slice + shared `EMPTY_RECORDS` (mirrors
  `useObservationLog`; never an inline-filter selector).

**Why the detector stays correct for free:** `detectChronicVerdicts` reads `records` only, so
archived rows are dormant. Because `partitionExpiredRecords` already protects every
chronic-contributing leg (they are never pruned, so never archived), the archive only ever
holds *non-chronic, old* rotations -- restoring is always safe and never resurrects a hidden
active chronic. A future long-period chronic that would need an archived leg is now
*recoverable* (restore brings it back), versus permanently lost under erase.

### 2. Modal -- `apps/web/src/v3/plan/strata/PruneLedgerModal.tsx`

- **Copy fix:** "Always kept" line -> "The most recent {OBSERVATION_LOG_RETENTION_CYCLES}
  rotation cycles within each season" (value sourced from the imported constant, never a string
  literal, so copy and behaviour stay locked). Add a one-line semantics sentence under the
  summary: "Compaction keeps every undated and chronic-linked record, plus the
  {OBSERVATION_LOG_RETENTION_CYCLES} most recent rotation cycles in each season; older
  rotations are moved to the archive."
- **Reframe permanent -> reversible:** remove the `prune-understood` checkbox and its gate
  entirely. `prune-confirm` ("Compact ledger") is enabled whenever `removable > 0 && result === null`
  (single click; archiving is reversible, so no friction tick). Summary copy drops "permanently";
  result line -> "Archived {result} records."
- **Restore affordance:** when `useArchivedLog(projectId).length > 0`, render
  "Restore archived ({n})" (`data-testid="prune-restore"`); clicking calls
  `restoreArchivedRecords(projectId)`, which re-runs the reactive dry-run (the archived count
  and `removable`/`total` recompute). Available regardless of `result` (the safety net is
  always reachable).
- `removable === 0` path keeps the existing "nothing to compact" copy.

## Files

| File | Action |
|---|---|
| `apps/web/src/store/observationLogStore.ts` | modify (archivedRecords, prune-to-archive, restore, useArchivedLog, persist v2) |
| `apps/web/src/store/__tests__/observationLogStore.prune.test.ts` | modify (archive disposition, restore round-trip, persist migrate, detector ignores archive) |
| `apps/web/src/v3/plan/strata/PruneLedgerModal.tsx` | modify (copy fix, drop checkbox, archive reframe, restore affordance) |
| `apps/web/src/v3/plan/strata/__tests__/PruneLedgerModal.test.tsx` | modify (no checkbox gate, archive copy, restore button) |

## Testing

- **Store:** `pruneProjectRecords` moves pruned rows into `archivedRecords` (active set shrinks,
  archive grows by the same count, returned set unchanged); `restoreArchivedRecords` round-trips
  (archive empties, active set returns to pre-prune count, only the target project's rows move);
  `detectChronicVerdicts` over the active set is unaffected by archived rows; persist migrate v1->2
  seeds `archivedRecords: []` and preserves `records`; `previewProjectPrune` still pure (no
  mutation). Existing prune-partition tests stay green.
- **Modal:** "Always kept" copy names "rotation cycles" and the count comes from the constant;
  there is **no** `prune-understood` checkbox and `prune-confirm` is enabled as soon as
  `removable > 0`; confirming archives and shows "Archived N records."; `prune-restore` appears
  only when archived rows exist and restores them (dry-run recomputes); `removable === 0` shows
  "nothing to compact". The shipped B2 checkbox-gate assertion is deliberately replaced.

## Constraints honored

ASCII-only; TS strict + `noUncheckedIndexedAccess`; no deletions of components; spine +
`ProtocolConfirmationFlow` import-only; slice-#1 CoOccurrence components untouched; bounded
`--pool=forks` vitest only; CSRA untouched (fiqh erasure 2026-05-04). Coordinator handles all
git; subagents implement + test only. Explicit-path commits, fetch + 0-behind first, no foreign
WIP, no `--amend`, not pushed unless asked. Amanah: this *strengthens* data stewardship
(memory demoted, never destroyed); steward-initiated, observable, reversible; no riba/gharar/
advance-purchase.

## Covenant amendment

This is a deliberate **second amendment** to the observation-log retention covenant
(slice #2 unbounded -> slice #3 steward-erase -> this: steward-*archive*, recoverable). It gets
its own ADR `wiki/decisions/2026-06-05-atlas-observation-archive-not-erase.md` with forward-links
from the slice-3 and slice-4 ADRs.

## Out of scope (held until requested)

Configurable retention-window stepper; selective per-record restore; an archive-management UI
beyond the count + restore-all; JSON export (superseded -- the in-system archive is the safety
net); consolidating `ProjectBundleBar`'s private `triggerDownload`.
