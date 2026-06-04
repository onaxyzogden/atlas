# Session log: Observation-ledger archive-not-erase + rotation-unit copy fix

**Date:** 2026-06-05
**Branch:** `feat/atlas-permaculture` (not pushed)
**Method:** superpowers:subagent-driven-development (fresh implementer + spec reviewer + code-quality reviewer per task; coordinator handled ALL git/commits; subagents implemented + tested only, never ran git).
**Plan:** `.claude/plans/2026-06-05-atlas-observation-archive-not-erase.md` (approved). **Design:** `stages/design-observation-archive-not-erase-review.md`.
**ADR:** [[decisions/2026-06-05-atlas-observation-archive-not-erase]]. **Builds on:** [[decisions/2026-06-04-atlas-chronic-display-and-prune-ui]] (slice #4); second amendment of the covenant first amended in [[decisions/2026-06-03-atlas-chronic-detection]] (slice #3).

## What shipped

Re-scope of slice-4's deferred "configurable retention window" into a data-safety slice:
compaction now DEMOTES pruned rows to a recoverable archive tier instead of erasing them,
and the modal's misleading retention copy is corrected.

**T1 -- store archive tier + restore + persist v2 (`e464457c`):**
- `apps/web/src/store/observationLogStore.ts`: new `archivedRecords` state + persist
  `partialize`; persist **v1 -> v2** with a version-gated `migrate` (seeds `archivedRecords: []`,
  preserves `records`); `pruneProjectRecords` moves pruned rows into the archive (functional
  `set`, still returns `pruned`); new `restoreArchivedRecords(projectId)` (functional `set`,
  returns restored, `[]` when none); new Zustand-v5-safe `useArchivedLog` hook mirroring
  `useObservationLog`. `previewProjectPrune` unchanged (still pure).
- `observationLogStore.prune.test.ts`: +4 specs (prune-moves-to-archive; restore round-trip;
  restore-only-named-project + `[]` when none; dormant-archive strengthened with a
  genuinely-chronic control + an active non-chronic record). Suite 14/14.

**T2 -- modal archive reframe + rotation copy + restore (`a0c41dd2`):**
- `apps/web/src/v3/plan/strata/PruneLedgerModal.tsx`: copy names "rotation cycles"
  (sourced from `OBSERVATION_LOG_RETENTION_CYCLES`); dropped the `prune-understood` checkbox
  + gate (archiving is reversible -> single-click Compact, `removable > 0 && result === null`);
  result reads "Archived N records."; new `prune-restore` affordance calls
  `restoreArchivedRecords` then `setResult(null)`, gated on `archived.length > 0`; `removable`
  memo reactive on `[projectId, records]` so it recomputes after archive AND restore.
- `PruneLedgerModal.test.tsx`: 8 specs (renders "3 of 15"; rotation-cycle copy;
  confirm-enabled-no-checkbox; archive-on-confirm 12/3 + "Archived 3 records."; swap-to-Done
  -> onClose; restore round-trip 15/0; nothing-to-compact; close -> onClose). 8/8.

## Verification (T3)

- shared tsc + web tsc EXIT 0 (archive-not-erase files type-clean).
- Bounded `--pool=forks` sweep, no regression: web 64/64 across 7 suites (groupChronicVerdicts
  11, ChronicSynthesisCard 8, ChronicVerdictBanner 14, observationLogStore 5,
  observationLogStore.prune 14, chronicVerdicts 4, PruneLedgerModal 8).
- Live preview gate `preview_eval` port 5200 (`preview_screenshot` UNAVAILABLE -- DISCLOSED;
  data + module path verified against the live bundle, not pixels; localStorage backed up +
  restored):
  - Round-trip: 15-record over-window ledger; `previewProjectPrune` pure dry-run (removable 3,
    store unchanged); `pruneProjectRecords` archived (15->12 / 0->3, returned 3) AND
    localStorage reflected records 12 / archivedRecords 3; `restoreArchivedRecords` round-tripped
    (12->15 / 3->0, returned 3). 4/4 assertions green.
  - Dormant-archive: chronic pair in ACTIVE -> 1 verdict; same pair ARCHIVED with only a solo
    active row -> 0 (dormant); counting the archive back in -> 1 (archive genuinely holds the
    chronic). localStorage restored.

## Review notes (two-stage per task)

- **T1:** spec review passed; code-quality review "needs changes" (I1 stale-`get()` in
  non-functional `set` -> converted both prune/restore to functional `set`; I2 migrate ignored
  `version` -> version-gated; M1 interface field ordering; M3 weak dormant test -> strengthened
  with a chronic control). Coordinator applied the four small mechanical fixes, re-verified
  14/14 + tsc EXIT 0, committed.
- **T2:** spec review passed all 8 points; code-quality review "approve with reservations"
  (I-1 document the `getState()`-in-memo concurrent-mode assumption -> added the comment; I-3
  loose OR-guard test assertion -> tightened to outright `queryByTestId(...)` null). Coordinator
  applied the two fixes, re-verified 8/8 + tsc EXIT 0, committed.

## Covenant / hygiene notes

- Second amendment of the retention covenant (unbounded -> steward-erase -> steward-archive,
  recoverable); STRENGTHENS the slice-2 "history is the asset" covenant -- memory demoted,
  never erased; steward-initiated, observable, reversible.
- Coordinator handled all git; subagents never ran git. Each commit: fetch + 0-behind first;
  explicit paths only; staged set verified via Compare-Object guard; no `--amend`; not pushed.
  (T2 was soft-reset + recommitted once to strip a PowerShell `Set-Content -Encoding utf8` BOM
  from the subject -- not an `--amend`; the commit was mine alone at HEAD, unpushed.)
- No deletions (removed-checkbox CSS classes retained); ASCII-only; TS strict +
  `noUncheckedIndexedAccess`. Spine + `ProtocolConfirmationFlow` + shipped slice-#1 components
  untouched. CSRA untouched ([[fiqh-csra-erased-2026-05-04]]).

## Deferred (explicit)

Configurable retention-window stepper; selective per-record restore; archive-management UI
beyond count + restore-all; JSON export (superseded by the in-system archive);
`triggerDownload` consolidation.
