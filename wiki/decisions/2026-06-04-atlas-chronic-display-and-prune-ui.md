# ADR: Chronic verdicts group by common deviant (Plan caps interactively, Observe renders full read-only); a steward-facing PruneLedgerModal wires the headless prune behind a pure dry-run

**Date:** 2026-06-04
**Status:** accepted (A1-A3, B1-B4 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (commits `3d628fef`, `ea8cf271`, `aefba036`, `2847c141`, `aa8e0cd4`, `677188e5`; **not pushed**)

## Context

Slice #4 closes the two follow-ups [[decisions/2026-06-03-atlas-chronic-detection]] (slice #3)
deliberately deferred:

1. **Display grouping / capping.** The chronic detector emits one `ChronicVerdict`
   per co-deviating template PAIR, so K co-deviating templates in a bucket fan out
   to K-choose-2 rows (a complete graph). Honest by design, but a wide co-deviation
   can swamp both read surfaces. Slice #3 left both surfaces rendering the per-pair
   list flat.
2. **Compact-ledger UI.** Slice #3 shipped a headless, chronic-aware
   `pruneProjectRecords` action but no UI -- pruning could only be invoked from code.

Delivered as a sequenced two-slice line: **Slice A (display, lower risk) first, then
Slice B (prune UI).**

## Decision

**1. Grouping is by (season, common-deviant anchor).** A pure store-free helper
`groupChronicVerdicts(verdicts)` (`apps/web/src/v3/chronic/groupChronicVerdicts.ts`)
buckets the detector's pre-sorted verdict list. Each verdict is anchored to the
member of ITS OWN pair with the higher season-frequency (count of pairs that template
appears in, within that season); ties break to the lexicographically smaller
templateId. Verdicts sharing an anchor bucket together, so a fan `{A+B, B+C, B+D}`
collapses under one "B" header surfacing B as the common deviant. This is a GREEDY
per-verdict anchor, not a global partition: in a complete fan `{A,B,C,D,E}` the
verdicts nest into descending groups (A:4, B:3, C:2, D:1) -- A anchors all its pairs,
then B anchors its remaining pairs, and so on -- which is the intended "surface the
heaviest common deviant first" behaviour, confirmed live in the preview gate.

**2. The detector's order is authoritative; grouping never re-sorts.** Within a group,
verdicts keep detector input order (existential/ihsan first via the slice-#3 tuple).
Groups are ordered by fixed agronomic season rank (spring, summer, autumn, winter,
then `unknown` LAST), then by the input position of each group's first verdict -- so
the group holding the topmost (heaviest / existential) verdict renders first.

**3. Capping lives on Plan ONLY; Observe renders full read-only.** This is the
covenant split. `capGroups(groups, cap)` walks groups in order, includes whole groups
while they fit the row budget, truncates the straddling group, and sums dropped rows
into `hiddenCount` (`cap <= 0` or `cap >= total` => no cap, defensive). The Plan
`ChronicVerdictBanner` applies `DEFAULT_CHRONIC_CAP = 6` with an interactive
`chronic-show-more` button (Plan already has buttons -- covenant-fine). The Observe
`ChronicSynthesisCard` gets the SAME group headers but **no cap, no show-more**: a
synthesis surface is meant to show everything, and its standing read-only covenant
("Observe synthesizes, does not act") is pinned by a test asserting **no
`role="button"`**. Because the input is existential/open-first, the cap can never hide
a verdict that outranks a visible one (preview-confirmed: the existential leg survives
the cap).

**4. Both grouping changes are additive wrappers; every row testid/attr is preserved.**
The banner and card keep their existing `<li>` / `chronic-row` markup, `data-existential`
/ `data-open` attrs, and `chronic-objective-link-*` deep-link buttons byte-identical;
only group-header wrappers + (Plan) the cap control were added. Shipped slice-#1
`CoOccurrenceVerdictBanner` / `CoOccurrenceSynthesisCard` and their pinned tests were
NOT edited.

**5. The prune dry-run reuses the prune composition so they cannot drift.** A new
read-only store method
`previewProjectPrune(projectId, keepWithinCycles?) => { kept, pruned }`
(`apps/web/src/store/observationLogStore.ts`) composes the SAME
`detectChronicVerdicts([], projectRecords)` -> `chronicProtectedRecordIds` ->
`partitionExpiredRecords` trio as the action, but **never calls `set`**.
`pruneProjectRecords` was refactored to call `previewProjectPrune` and then commit its
`kept` -- identical observable behaviour to slice #3, single composition, so the
preview shown to the steward is exactly what the confirm applies. `previewProjectPrune`
is kept pure (no `set`) so the action's second `get()` re-read observes the same state.

**6. The prune trigger is a MUTATION and therefore lives in Plan, not Observe.** A
gated `PruneLedgerModal` (`apps/web/src/v3/plan/strata/PruneLedgerModal.tsx`, mirroring
`PrimaryChangeModal`) dry-runs on open, shows "removes M of N records" plus an
always-kept transparency block (undated audit rows; chronic-verdict contributors; the
most recent 12 cycles per season), gates confirm behind an explicit "I understand"
tick AND `removable > 0`, and on confirm calls `pruneProjectRecords` and reports the
removed count before swapping to Done. When nothing is prunable it shows a
"nothing to compact" line with no enabled confirm. It is mounted from
`PlanStratumShell` via a `compact-ledger-trigger` pill in the spine header -- the same
host that already owns project-scoped destructive UI (`PrimaryChangeModal`). It is
intentionally UNGATED by project type (unlike the adjacent secondary-add trigger): the
ledger is a function of the project, not its type, and the modal degrades gracefully on
an empty / within-retention ledger.

## Consequences

- The two chronic surfaces stay legible under wide co-deviations while preserving the
  honest per-pair atom underneath.
- The pending-action summary in the modal is gated on `result === null` so no stale
  "removes M of N" arithmetic lingers after the prune lands (`total` is reactive and
  recomputes post-prune while `removable` is a snapshot -- the code-quality catch in
  B2, fixed before commit + guard-tested).
- The Observe read-only covenant is structurally preserved: the cap/show-more control
  exists only on Plan; A3 re-asserts `queryByRole('button')` null.
- `PruneLedgerModal` self-handles the degenerate cases, so the always-visible trigger
  cannot produce a destructive no-op even on a route where `projectId === ''`.
- No new `PlanStratumShell` mount test: per the slice-#1/#3 precedent the full-shell
  router mount stalls, so B3 integration rests on web tsc + the B2 component suite + the
  live preview gate; no hanging test was committed.

## Verification

- **Shared tsc + web tsc:** EXIT 0 both packages; all slice-4 files type-clean.
- **Bounded `--pool=forks` sweep, no regression:** shared 38/38 (`chronicDetection` 18,
  `observationLogRetention` 20); web 72/72 across 10 suites -- `groupChronicVerdicts` 11,
  `ChronicVerdictBanner` 14, `ChronicSynthesisCard` 8, `observationLogStore` 5,
  `observationLogStore.prune` 10, `chronicVerdicts` 4, `PruneLedgerModal` 6, plus the
  slice-1 `CoOccurrenceVerdictBanner` 6 / `CoOccurrenceSynthesisCard` 4 /
  `reviewFlagStore.cooccurrence` 4.
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` unavailable
  on this Windows setup -- DISCLOSED; verified the production DATA + module path against
  the live dev bundle, not pixels -- render correctness rests on the component specs;
  the stalling `PlanStratumShell` router mount was not driven, per
  [[decisions/2026-06-03-atlas-chronic-detection]] precedent). Imported the real
  detector (`@ogden/shared`) + grouping helper + observation-log store from the running
  Vite graph.
  - *Slice A:* seeded a wide spring co-deviation (templates A-E co-deviating in cycles
    1 & 2, K5 = 10 recurring pairs) -> 10 real verdicts; `groupChronicVerdicts` anchored
    the heaviest group on the common deviant `tpl-A` (4 pairs); the existential leg
    `spring:tpl-A+tpl-B` sorted first and SURVIVED `capGroups(_, 6)` (visible 6,
    hidden 4, show-more would render); uncapped showed all 10, `hiddenCount 0`.
  - *Slice B:* seeded a 35-row over-window ledger (spring 15 cycles + summer chronic
    pair `tpl-X`+`tpl-Y` in OLD cycles 1-2 + summer singletons cycles 3-16 + one undated
    row + one other-project row). `previewProjectPrune` did NOT mutate the store and
    returned removable 5 of 35 (only the out-of-window singletons); it leaked ZERO
    protected ids (chronic legs + undated) and ZERO other-project rows; the real
    `pruneProjectRecords` returned the IDENTICAL pruned set (no drift), shrank the store
    by exactly 5, retained every chronic + undated + other-project row. The old chronic
    legs survived **because** chronic-protected, not because recent. All store +
    localStorage state restored from backup afterward.

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind before each commit; staged set verified via Compare-Object before
each commit (the index carries foreign WIP from external rebases); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy. Amanah: benign agronomic stewardship; prune is steward-initiated +
observable + chronic-safe; no riba/gharar; no advance-purchase framing.
Design doc: `stages/design-chronic-display-and-prune-ui-review.md` (approved).
Plan: `velvet-doodling-sun.md` (approved). Builds on
[[decisions/2026-06-03-atlas-chronic-detection]] (slice #3).
Log: [[log/2026-06-04-atlas-chronic-display-and-prune-ui]].
Entities: [[entities/protocols-dashboard]], [[entities/observe-dashboard]].

**Further amended by [[decisions/2026-06-05-atlas-observation-archive-not-erase]]**
(2026-06-05): this slice's first deferred item ("configurable retention window") was
re-scoped into a data-safety slice. Compaction now DEMOTES pruned rows to a recoverable
`archivedRecords` cold tier instead of erasing them (a second amendment of the retention
covenant that strengthens slice #2's "history is the asset"), and `PruneLedgerModal` is
reframed accordingly: the misleading "12 cycles" copy now names "rotation cycles" (a
`cycleNumber` axis separate from `season`), the `prune-understood` permanence checkbox is
dropped (archiving is reversible -> single-click Compact), and a `prune-restore` affordance
round-trips the cold tier.
