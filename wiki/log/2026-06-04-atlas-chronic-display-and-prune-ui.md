# Session log: Slice #4 -- chronic display grouping/capping + compact-ledger UI

**Date:** 2026-06-04
**Branch:** `feat/atlas-permaculture` (not pushed)
**Method:** superpowers:subagent-driven-development (fresh implementer + spec reviewer + code-quality reviewer per task; coordinator handled ALL git/commits; subagents implemented + tested only).
**Plan:** `velvet-doodling-sun.md` (approved). **Design:** `stages/design-chronic-display-and-prune-ui-review.md`.
**ADR:** [[decisions/2026-06-04-atlas-chronic-display-and-prune-ui]]. **Builds on:** [[decisions/2026-06-03-atlas-chronic-detection]] (slice #3).

## What shipped

Sequenced two-slice line closing slice-#3's two deferred follow-ups.

**Slice A -- display grouping + capping (lower risk, first):**
- **A1** `3d628fef` -- pure `groupChronicVerdicts` + `capGroups` helper (`apps/web/src/v3/chronic/groupChronicVerdicts.ts`). Season + common-deviant greedy anchor; deterministic; no React.
- **A2** `ea8cf271` -- Plan `ChronicVerdictBanner`: group headers + `DEFAULT_CHRONIC_CAP = 6` + interactive `chronic-show-more`. Row testids/attrs preserved.
- **A3** `aefba036` -- Observe `ChronicSynthesisCard`: same group headers, FULL render, no cap. Read-only `no role=button` invariant re-asserted.

**Slice B -- compact-ledger UI (second):**
- **B1** `2847c141` -- read-only `previewProjectPrune(projectId, keepWithinCycles?)` in `observationLogStore.ts`; `pruneProjectRecords` refactored to reuse it (single composition, no drift, no behaviour change).
- **B2** `aa8e0cd4` -- `PruneLedgerModal` (`apps/web/src/v3/plan/strata/`): gated, observable confirm dialog; dry-run "removes M of N"; transparency block; `prune-understood` tick + `removable > 0` gate; confirm -> `pruneProjectRecords` -> removed count -> Done.
- **B3** `677188e5` -- mounted `compact-ledger-trigger` pill + `pruneOpen` state + modal render in `PlanStratumShell`. Exactly 1 file staged; no foreign WIP swept in.

## Verification (B4)

- shared tsc + web tsc EXIT 0 (slice-4 files type-clean; pre-existing foreign errors excepted).
- Bounded `--pool=forks` sweep, no regression: shared 38/38; web 72/72 across 10 suites (incl. slice-1 CoOccurrence regression green).
- Live preview gate `preview_eval` port 5200 (`preview_screenshot` UNAVAILABLE on this Windows setup -- DISCLOSED; verified data + module path against live bundle, not pixels):
  - Slice A: wide spring co-deviation -> 10 verdicts; heaviest group anchored `tpl-A` (4 pairs); existential leg survived `capGroups(_,6)` (visible 6 / hidden 4); uncapped 10 / hidden 0.
  - Slice B: 35-row over-window ledger; `previewProjectPrune` did NOT mutate, removable 5 of 35; ZERO protected (chronic + undated) or other-project ids leaked; real prune returned IDENTICAL set (no drift), store shrank 35->30; chronic/undated/other-project rows retained. State + localStorage restored from backup.

## Covenant / hygiene notes

- Plan caps interactively (buttons OK); Observe renders full read-only (covenant: "Observe synthesizes, does not act"). Prune trigger = mutation -> Plan, not Observe.
- Coordinator handled all git; subagents never ran git. Each commit: fetch + 0-behind first; explicit paths only; staged set verified via Compare-Object guard (index carries foreign WIP from external rebases); no `--amend`; not pushed.
- No deletions; ASCII-only; TS strict + `noUncheckedIndexedAccess`. Spine + `ProtocolConfirmationFlow` + shipped slice-#1 components untouched. CSRA untouched.

## Deferred (explicit)

Configurable retention window in modal; automatic/scheduled pruning; collapsible Observe group sections; cross-season common-deviant grouping.
