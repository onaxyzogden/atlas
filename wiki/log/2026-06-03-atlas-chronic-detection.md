# 2026-06-03 -- Chronic / multi-cycle co-occurrence detector (slice #3, T3.1-T3.7) shipped

**Branch.** `feat/atlas-permaculture` (explicit-path commits `9aae593f`, `fa51aaf5`,
`47e603a7`, `d344bf23`, `c9a33381`, `df6405d9`; **not pushed**).

**Feature.** Slice #3 of the chronic-detection line and the first real consumer of the
slice #2 ledger. UNIONS slice #1's live OPEN co-occurrence clusters (present) with slice
#2's CLOSED flag ledger (past) to surface **chronic structural verdicts** -- the same
protocol template PAIR co-deviating in the SAME season across >= 2 distinct cycles =
a structural design failure (redesign, not retune). Surfaces on BOTH read surfaces (an
actionable Plan banner + a read-only Observe card) and adds steward-initiated,
chronic-safe retention/pruning (a conscious amendment of the slice #2 unbounded-retention
covenant).

**Settled design** (see ADR [[decisions/2026-06-03-atlas-chronic-detection]]): per-PAIR
verdict atom (NOT connected-component merge -- that would over-claim {A,B}@c1,2 +
{B,C}@c3,4 as one {A,B,C} spanning 1-4); season-scoped; "consecutive" is a sort modifier,
not a hard gate; union by (season, cycleNumber), one occurrence per cycle; undated
records excluded from detection; per-template attribution inside a bucket; derived view
(no zod); deterministic tuple sort with existential/ihsan first; both surfaces are NEW
siblings (shipped slice-#1 components untouched); retention is steward-initiated,
observable, chronic-aware, no auto-trigger.

**Implemented (subagent-driven, two-stage review per task: spec then quality).**
- **T3.1 (`9aae593f`)** `packages/shared/.../chronicDetection.ts`: `ChronicVerdict`
  interface, `CHRONIC_RECURRENCE_THRESHOLD = 2`, `detectChronicVerdicts`,
  `buildChronicSummary`. 18 specs. A code-quality catch (C1/I1): a flat per-occurrence
  objective/depth/existential aggregate leaked a third template's attributes into an
  enumerated pair; fixed via a per-template `Map<string, TemplateEntry>` + 2 regression
  tests (no-transitive-over-merge, 3-template/3-objective pair-grain); re-review APPROVED.
- **T3.2 (`fa51aaf5`)** `apps/web/src/store/chronicVerdicts.ts`: `useChronicVerdicts`
  cross-store hook -- two stable Zustand roots (`byProject`, `records`) + one `useMemo` +
  module-level `EMPTY_VERDICTS`; open + dormancy filter copied from
  `useCoOccurrenceClusters`. Never an inline-filter selector (v5 fresh-array hazard).
- **T3.3 (`47e603a7`)** `v3/plan/strata/ChronicVerdictBanner.tsx` (+ css) + mount in
  `PlanStratumShell.tsx` above the co-occurrence banner; presentational, deep-links via
  the existing `handleCoOccurrenceSelectObjective` -> `navigateToObjective`. 8 specs.
- **T3.4 (`d344bf23`)** `v3/observe/dashboard/ChronicSynthesisCard.tsx` (+ css) + mount
  in `UnifiedLandStateSurface.tsx` above the co-occurrence card; READ-ONLY (passive
  "Redesign in Plan", no buttons). 4 specs incl. the no-role=button invariant.
- **T3.5 (`c9a33381`)** `packages/shared/.../observationLogRetention.ts`:
  `OBSERVATION_LOG_RETENTION_CYCLES = 12`, pure `partitionExpiredRecords` (keep if
  undated OR within season's most-recent N distinct cycles OR id protected). 13 specs.
- **T3.6 (`df6405d9`)** added pure `chronicProtectedRecordIds(history, verdicts)` to the
  retention module + `observationLogStore.pruneProjectRecords(projectId,
  keepWithinCycles?)`: derives ledger-only verdicts, protects their legs, partitions,
  returns pruned. NO auto-trigger; `append` / persist untouched. 7 mapper + 6 store specs.

**Verified.** Shared + web tsc: all slice-3 files type-clean. **Foreign tsc errors
recorded:** a foreign commit `29662ef3` ("per-stratum x per-type standing-protocol
catalogue", now HEAD above this slice via the out-of-band rebase) and import-only
`v3/plan/spine/` (`mockProtocols.ts`, `ProtocolConfirmationFlow.tsx`) carry pre-existing
tsc errors in files this slice never touched. Bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) sweep, no regression: **shared 51/51**
(chronicDetection 18, observationLogRetention 20, coOccurrence 9, observationLogRecord 4),
**web 78/78** across 11 suites (ChronicVerdictBanner 8, ChronicSynthesisCard 4,
chronicVerdicts 4, observationLogStore.prune 6, plus all slice-1/2 suites).

**Live preview gate, `preview_eval` DOM port 5200** (`preview_screenshot` unavailable on
this Windows setup -- [[project-screenshot-hang]], disclosed; verified the production
DATA path, not pixels -- render correctness rests on the component/hook specs): imported
the real store + detector modules, seeded 2 OPEN flags (cycle 2) + 2 ledger records
reconstructing `{A,B}@spring:1`, asserted exactly one union verdict
(`templatePair ['tpl-A','tpl-B']`, `cycleNumbers [1,2]`, `containsOpen:true`,
`consecutive:true`, `signatureKey 'spring:tpl-A+tpl-B'`); negative control (drop the
historical leg) -> 0 verdicts; exercised live `pruneProjectRecords` on a ledger-chronic
pair outside a tight window -> all four legs survived, recent padding survived, an old
unprotected record was pruned and returned; restored all store + localStorage state.

**Discovered + disclosed boundary.** The preview prune exercise surfaced that
prune-protection is **ledger-only** by design: a verdict detectable *solely* via a
still-OPEN live cluster is not prune-protected until that flag closes into the ledger.
Bounded and low-risk (default 12-cycle window keeps recent legs regardless; once the
flag closes the pair is ledger-chronic and protected). Documented in the ADR + design
doc rather than silently fixed beyond the approved plan.

**Out-of-band rebase note.** After committing T3.6 (`df6405d9`) a foreign commit
`29662ef3` landed on top of this branch's HEAD (the documented external rebase activity,
[[project-branch-rebase]]). All six slice-3 commits are intact in history.

Explicit-path commits, foreign WIP untouched ([[feedback-no-deletion]]); fetched +
0-behind before each commit, committed immediately on green
([[feedback-commit-immediately-on-rebased-branches]]); not pushed; CSRA untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only. ADR
[[decisions/2026-06-03-atlas-chronic-detection]]; design doc
`stages/design-chronic-cooccurrence-detection-review.md` (approved); plan
`velvet-doodling-sun.md` (approved). Completes the line begun in
[[log/2026-06-03-atlas-cooccurrence-detection-T1-T4]] /
[[log/2026-06-03-atlas-cooccurrence-detection-T5-T6]] and
[[log/2026-06-03-atlas-observation-log]].
Entities [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
