# Design: Chronic display grouping/capping + compact-ledger UI (Slice #4)

**Status:** review
**Date:** 2026-06-04
**Branch:** `feat/atlas-permaculture`
**Plan:** `velvet-doodling-sun.md` (approved)
**ADR:** `wiki/decisions/2026-06-04-atlas-chronic-display-and-prune-ui.md`
**Builds on:** slice #3 (`wiki/decisions/2026-06-03-atlas-chronic-detection.md`)

## Problem

Slice #3 shipped the chronic / multi-cycle co-occurrence detector, both read surfaces,
and a HEADLESS `pruneProjectRecords` action. Two follow-ups were deferred:

1. **Per-pair fan-out is ungrouped.** `detectChronicVerdicts` emits one verdict per
   co-deviating template PAIR, so K co-deviating templates -> K-choose-2 rows. Honest,
   but a wide co-deviation can swamp both surfaces, and the per-pair design was built to
   enable a "surface the common deviant" grouping that was never wired.
2. **Prune has no UI.** `pruneProjectRecords` is chronic-safe but only callable from
   code; a steward cannot compact a ledger from the app.

## Approach (sequenced two-slice line)

**Slice A first (display, lower risk), then Slice B (prune UI).**

### Slice A -- grouping + capping

A pure, store-free, React-free helper `groupChronicVerdicts(verdicts)` +
`capGroups(groups, cap)`:

- Group by `(season, common-deviant anchor)`. Anchor = the pair member appearing in more
  pairs that season (tie -> lexicographically smaller templateId). Greedy per-verdict, so
  a complete fan nests into descending groups surfacing the heaviest common deviant first.
- Never re-sorts: within a group, detector input order (existential/ihsan-first tuple) is
  preserved. Group order = fixed agronomic season rank (spring, summer, autumn, winter,
  unknown last), then first-verdict input index.
- `capGroups` walks groups in order, includes whole groups to budget, truncates the
  straddling group, sums dropped rows into `hiddenCount`. `cap <= 0` or `cap >= total` ->
  no cap. Because input is existential-first, the cap never hides a higher-ranked verdict.

**Covenant split (the key design decision):** the INTERACTIVE cap + show-more lives ONLY
on the Plan `ChronicVerdictBanner` (`DEFAULT_CHRONIC_CAP = 6`, `chronic-show-more`
button). The Observe `ChronicSynthesisCard` gets the SAME group headers but renders in
FULL with NO interactive control -- its standing read-only covenant ("Observe synthesizes,
does not act") is pinned by a `no role=button` test. Both surfaces keep every existing
row testid/attr byte-identical; grouping is additive wrappers only. Shipped slice-#1
CoOccurrence components are NOT touched.

### Slice B -- compact-ledger UI

- A read-only `previewProjectPrune(projectId, keepWithinCycles?) => { kept, pruned }` that
  composes the SAME `detectChronicVerdicts([], records)` -> `chronicProtectedRecordIds` ->
  `partitionExpiredRecords` trio as the action but never calls `set`.
  `pruneProjectRecords` is refactored to reuse it so preview and confirm cannot drift.
- A gated `PruneLedgerModal` (mirrors `PrimaryChangeModal`): dry-runs on open, shows
  "removes M of N" + an always-kept transparency block (undated audit rows; chronic-verdict
  contributors; most recent 12 cycles per season), gates confirm behind an "I understand"
  tick AND `removable > 0`, confirms via `pruneProjectRecords`, reports removed count, then
  Done. "Nothing to compact" when within retention.
- Prune is a MUTATION -> the trigger mounts in `PlanStratumShell` (where `PrimaryChangeModal`
  already lives), NOT in read-only Observe. The `compact-ledger-trigger` pill is ungated by
  project type because the ledger is a function of the project, not its type, and the modal
  degrades gracefully on an empty/within-retention ledger.

## Files

| File | Action |
|---|---|
| `apps/web/src/v3/chronic/groupChronicVerdicts.ts` | create (A1) |
| `apps/web/src/v3/plan/strata/ChronicVerdictBanner.tsx` (+css/tests) | modify (A2) |
| `apps/web/src/v3/observe/dashboard/ChronicSynthesisCard.tsx` (+css/tests) | modify (A3) |
| `apps/web/src/store/observationLogStore.ts` (+prune tests) | modify (B1) |
| `apps/web/src/v3/plan/strata/PruneLedgerModal.tsx` (+css/tests) | create (B2) |
| `apps/web/src/v3/plan/strata/PlanStratumShell.tsx` | modify (B3) |

## Verification

shared + web tsc EXIT 0 (foreign errors excepted); bounded `--pool=forks` sweep green
(shared 38/38, web 72/72); live `preview_eval` gate port 5200 for both slices
(`preview_screenshot` UNAVAILABLE -- disclosed; verified data + module path, not pixels).
See ADR Verification section for the seeded fixtures and assertions.

## Constraints honored

ASCII-only; TS strict + `noUncheckedIndexedAccess`; no deletions; spine +
`ProtocolConfirmationFlow` import-only; slice-#1 components untouched; CSRA untouched
(fiqh erasure 2026-05-04); explicit-path commits, fetch + 0-behind first, no foreign WIP,
no `--amend`, not pushed. Amanah: benign steward-initiated, observable, chronic-safe prune;
no riba/gharar/advance-purchase.

## Deferred (explicit)

Configurable retention window in the modal; automatic/scheduled pruning; collapsible
Observe group sections; cross-season common-deviant grouping.
