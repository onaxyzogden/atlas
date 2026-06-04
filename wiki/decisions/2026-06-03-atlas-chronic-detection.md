# ADR: Chronic co-occurrence is a per-pair, season-scoped verdict unioning live open clusters with the historical ledger; retention amends the slice-#2 covenant

**Date:** 2026-06-03
**Status:** accepted (T3.1-T3.7 complete; verified live via preview_eval)
**Branch:** `feat/atlas-permaculture` (commits `9aae593f`, `fa51aaf5`, `47e603a7`, `d344bf23`, `c9a33381`, `df6405d9`; **not pushed**)

## Context

Slice #3 of a three-slice line, and the first real consumer of the slice #2 ledger.
Slice #1 ([[decisions/2026-06-03-atlas-cooccurrence-detection]]) is a derived VIEW over
currently-OPEN review flags -- a structural verdict that dissolves when its flags
resolve. Slice #2 ([[decisions/2026-06-03-atlas-observation-log]]) preserves the past as
an append-only ledger of flag CLOSURES. Neither alone can say whether a structural
failure is CHRONIC: the same protocol pair co-deviating in the SAME season across
MULTIPLE cycles. A chronic verdict is categorically stronger and more capital-relevant
than any single-season cluster -- it argues for re-earthworking / re-siting water at the
structural layer (redesign), not nudging a threshold (retune). Computing it requires
unioning the live present (slice #1) with the historical past (slice #2). This ADR
records building that union, surfacing it on both read surfaces, and amending the slice
#2 retention covenant to bound ledger growth safely.

## Decision

**1. The verdict atom is a co-deviating template PAIR, not a connected-component
merge.** A chronic verdict is one template pair recurring across >= 2 distinct cycles.
Merging overlapping pairs by connected component would falsely over-claim `{A,B}@c1,2` +
`{B,C}@c3,4` as a single `{A,B,C}` spanning cycles 1-4. Per-pair is honest, and when
pairs overlap it naturally surfaces the common deviant. (Regression-tested:
no-transitive-over-merge.)

**2. Season-scoped.** Spring water-stress is not autumn water-stress -- different
regimes, different verdicts. Detection never crosses seasons; the signature key is
`${season}:${[a,b].sort().join('+')}`.

**3. "Consecutive" is a strength modifier, not a hard gate.** Strict consecutive-cycle
gating is too brittle for noisy agronomic observation -- one quiet cycle would mask a
genuinely chronic failure. The emit test is `cycles.size >= 2`; `consecutive` and
`spanCycles` feed only the deterministic sort.

**4. Union by `(season, cycleNumber)`, one occurrence per cycle.** Live clusters
(`hasOpen:true`) and historical buckets merge per cycle so a bucket never
double-counts; a verdict's `containsOpen` is true if any contributing cycle is live.
Undated records / clusters (`cycleNumber === undefined`) are excluded from detection
(cannot be ordered -- same conservative rule slice #1 uses).

**5. Per-template attribution inside a bucket.** Each occurrence holds a per-template
`Map` carrying that template's own objectiveId / depth / existential. Enumerating pair
(A,B) in a 3+-template bucket pulls only `entry(A) U entry(B)` -- a third template C's
attributes never leak into the pair. (A flat per-occurrence aggregate was the C1/I1
code-quality catch in T3.1; fixed before merge, regression-tested.)

**6. Derived view, never persisted.** `ChronicVerdict` is a plain TS interface (NOT
zod), mirroring `CoOccurrenceCluster`. Detection runs fresh on read; the ledger stays
the only persisted, zod-validated substrate.

**7. Deterministic tuple sort, ihsan first.** Descending
`(containsExistential, containsOpen, occurrenceCount, DEPTH_RANK[dominantDepth],
consecutive, spanCycles)`, then `signatureKey` ascending as the total-order tiebreak.
Existential-bearing verdicts (a wrong carrying-capacity assumption cost the animals)
carry the ihsan/rifq prefix and sort first. `weight` is a diagnostic field, not the
sort key.

**8. Both surfaces are NEW siblings; shipped slice-#1 components are untouched.** A
stable cross-store hook `useChronicVerdicts` (two stable Zustand roots + one `useMemo` +
`EMPTY_VERDICTS`, never an inline-filter selector) feeds an actionable Plan banner
(`ChronicVerdictBanner`, mounted above the co-occurrence banner, deep-links via the
existing `navigateToObjective`) and a read-only Observe card (`ChronicSynthesisCard`,
passive "Redesign in Plan" text, no buttons). `CoOccurrenceVerdictBanner` /
`CoOccurrenceSynthesisCard` and their pinned tests were not edited.

**9. Retention amends the slice-#2 unbounded-retention covenant -- deliberately.** The
covenant's intent was *no silent erasure of audit history*, not *infinite storage*.
Preserved by a steward-INITIATED, observable, chronic-aware sweep:
`observationLogStore.pruneProjectRecords(projectId, keepWithinCycles?)` derives
protection from `detectChronicVerdicts([], projectRecords)`, keeps every undated row and
every record inside its season's most-recent `keepWithinCycles` distinct cycles (default
`OBSERVATION_LOG_RETENTION_CYCLES = 12`) and every chronic-protected leg, and RETURNS the
pruned rows. NO auto-trigger (never in rehydrate / append); `append` and persist config
untouched.

## Consequences

- The chronic detector is the first cross-slice consumer: it imports slice #1's
  `detectCoOccurrenceClusters` (live) and reads slice #2's ledger (history) in one hook.
- Per-pair detection can generate `n-choose-2` rows for a wide co-deviation. Honest by
  design; the sort surfaces the heaviest first. Display grouping / capping is deferred.
- **Known boundary (documented, bounded):** prune-protection is ledger-only. A verdict
  detectable *solely* via a still-OPEN live cluster (other leg not yet closed into the
  ledger) is not prune-protected until that flag closes. Low-risk: the default 12-cycle
  window keeps recent ledger legs regardless, so reaching such a record needs a tight
  manual window AND a >12-cycle-span open pair; once the live flag closes the pair
  becomes ledger-chronic and is protected thereafter. Surfaced empirically in the
  preview gate, disclosed here, not silently omitted.
- The Zustand v5 fresh-array re-render hazard is avoided: the cross-store hook selects
  two stable roots and derives in one memo.
- ProtocolConfirmationFlow + `v3/plan/spine/` were import-only; not edited.

## Verification

- **Shared tsc + web tsc:** all slice-3 files type-clean. **Foreign tsc errors
  recorded as exceptions:** a foreign commit `29662ef3` ("per-stratum x per-type
  standing-protocol catalogue") and import-only `v3/plan/spine/`
  (`mockProtocols.ts`, `ProtocolConfirmationFlow.tsx`) carry pre-existing tsc errors in
  files this slice never touched -- confirmed by their clean working-tree status and the
  green test sweep below.
- **Bounded `--pool=forks` sweep, no regression:** shared 51/51
  (`chronicDetection` 18, `observationLogRetention` 20, `coOccurrence` 9,
  `observationLogRecord` 4); web 78/78 across 11 suites (`ChronicVerdictBanner` 8,
  `ChronicSynthesisCard` 4, `chronicVerdicts` 4, `observationLogStore.prune` 6, plus all
  slice-1/2 reviewFlag / observationLog / co-occurrence suites).
- **Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` unavailable
  on this Windows setup -- DISCLOSED; verified the production DATA path, not pixels --
  render correctness rests on the component/hook specs): imported the real store +
  detector modules; seeded 2 OPEN flags (distinct templates, cycle 2) + 2 ledger records
  reconstructing `{A,B}@spring:1`; asserted exactly one union verdict with
  `templatePair ['tpl-A','tpl-B']`, `cycleNumbers [1,2]`, `containsOpen:true`,
  `consecutive:true`, both objectives, `signatureKey 'spring:tpl-A+tpl-B'`. Negative
  control (remove the historical leg) -> 0 verdicts. Exercised live `pruneProjectRecords`
  on a ledger-chronic pair `{A,B}@{1,2}` outside a tight window -> all four legs survived,
  recent padding survived, an old unprotected record was pruned and returned. All store +
  localStorage state restored afterward.

Explicit-path commits; foreign working-tree WIP untouched
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
fetched + 0-behind before each commit; not pushed ([[project-branch-rebase]]);
CSRA untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Design doc: `stages/design-chronic-cooccurrence-detection-review.md` (approved).
Plan: `velvet-doodling-sun.md` (approved). Builds on
[[decisions/2026-06-03-atlas-cooccurrence-detection]] (slice #1) and
[[decisions/2026-06-03-atlas-observation-log]] (slice #2).
Log: [[log/2026-06-03-atlas-chronic-detection]].
Entities: [[entities/protocols-dashboard]], [[entities/observe-dashboard]].

**Superseded-in-part by slice #4** [[decisions/2026-06-04-atlas-chronic-display-and-prune-ui]]
(2026-06-04): the two follow-ups this ADR deferred -- (1) display grouping/capping of the
per-pair verdict fan-out, and (2) a steward-facing UI for the headless `pruneProjectRecords` --
are delivered there. Both chronic surfaces now group by common deviant (Plan caps interactively
+ show-more; Observe renders full read-only), and a gated `PruneLedgerModal` in `PlanStratumShell`
dry-runs via the pure `previewProjectPrune` (which `pruneProjectRecords` reuses, so they cannot
drift) before confirming a chronic-safe compaction.
