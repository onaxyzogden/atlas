# 2026-06-19 -- Threshold 3: The Act Mandate (full build, 9 stages)

**Objective:** Build the final Plan-stage surface after `s7-phasing-resourcing` -- an assembly + ceremony that hands the resolved design off to Act, sealed by a single deliberate **Begin Act** that arms `planReadOnly`, with a **Raise-a-Concern** governance escape valve recording append-only amendments.

**ADR:** [[decisions/2026-06-19-atlas-threshold3-act-mandate]]
**Entity:** [[entities/plan-tier-shell]] (hosts the chrome) -- [[entities/act-tier-shell]] byte-identical.

## Completed

- **Stage 1 (`1f5810bb`)** -- `actMandateStore` (idempotent `beginAct`, `liftLock`/`relock`, `isObjectiveLocked`, `useObjectivePlanLock`) + `planConcernsStore` (byProject array, append-only, Amanah-rejecting `raiseConcern`/`resolveConcern`); both registered `blob(...)` in `syncManifest`.
- **Stage 2 (`7ef7edcd`)** -- pure, React-free `actMandateModel.ts`: grouped handoffs by stratum, three KeyDocuments, advisory readiness; `ACT_MANDATE_COPY` banned-term scan via `collectStrings` recursion (auto-covers every future copy key).
- **Stage 3 (`56546951`)** -- `ActMandateSurface` + `ActMandateReferenceRail` + `ActMandate.module.css` (green `--am-*` register).
- **Stage 4 (`e7ccdb68`, RISKIEST -- foreign-WIP zone)** -- DECOUPLE: `REACHABLE_THRESHOLD_IDS` (spine clickability) split from new `ROUTABLE_THRESHOLD_IDS` (route reach); two additive `PlanTierShell` dispatch arms + `ActMandateEntryCue` CTA on `s7`. T3 divider stays decorative.
- **Stage 5 (`9d9e64c9`)** -- render-layer lock: `readOnly?` prop threaded `ObjectiveDetailPanel` -> shared `ActTierZeroWorkbench` / `DecisionWorkingPanel`, defaulting `false` so Act stays byte-identical; the workbench never reads the lock store.
- **Stage 6 (`0e444755`)** -- route-layer `planReadOnly` context (additive, NO redirect). **The store backstop was DROPPED** -- the shared stores stay surface-agnostic so the Act execution loop (same store keys) is never frozen; `*.mandateNeutrality.test.ts` guards pin it.
- **Stage 7 (`a79ba129`)** -- `RaiseConcernAffordance` (lock-gated) + `ConcernAmendments` (append-only overlay), Plan-only, self-gating.
- **Stage 8 (`8fa77051`)** -- `ConcernGovernancePanel`: reads Objective-0.2 `StewardTeam.governance` as review context, auto-selects reviewer from `useStewardRoster`; approve orchestration `liftLock -> resolveConcern(approved, {amendmentText}) -> relock` (net lock state unchanged, append-only); decline closes clean.
- **Stage 9** -- integration + verification (no new commit).

## Verification

- `@ogden/shared`: tsc 0 err, 1557/1557.
- `@ogden/web`: tsc 6-err foreign baseline, **0 new**; 6311 passed / 7 failed. The 7 fails (4 files: `secondaryReopen`, `BoundaryCaptureLegacy`, `completionPathAudit.ratchet`, `VisionLayoutCanvas.surveyLayers`) are the documented Mode-4-era foreign set, grep-proven to reference no T3 symbol -- red since before T3.
- Threshold suites 189/189 (27 Stage-8 governance). Act-byte-identical grep clean.
- No visual-pass claimed -- backend :3000 down (ECONNREFUSED), v3 surface not driveable offline; DOM/unit is the signal ([[project-screenshot-hang]]).

## Decisions of note

- **`planReadOnly` = surface policy, not store backstop** -- the load-bearing reversal of the original 3-layer plan (Act writes the same shared stores, so a store-keyed no-op would freeze Act). See ADR.
- **Begin Act always enabled** -- readiness advisory; Begin Act is the only hard gate (the one authorized exception to soft-gate).
- **DECOUPLE reach from clickability** -- ceremony is a deliberate entry, not an idle divider click.

## Amanah

Two-boundary `detectCsaLikeText` on every free-text concern field (UI advisory + hard persist reject); `ACT_MANDATE_COPY` banned-term-scanned; append-only never-overwrite is structural. No CSA/CSRA/salam/advance-sale ever authored or stored; mockup "Commercial CSA" references not transcribed ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **All T3 commits NOT pushed** (operator-authorized push only), atop the prior unpushed backlog (Tier-6 S3-6, Threshold-1, Mode-4, Threshold-2).
- **Wiki backfill owed:** Threshold-1, Threshold-2, Mode-4, and Tier-6 shipped without ADRs/entity updates -- this is the first Plan-threshold ADR.
- Foreign WIP (rail-header stratum switcher `dd2dbd8c`/`cb513c9c` interleaved between S1 and S2; `routes/index.tsx` armTool/PlanSearch hunks; assorted untracked test files) left untouched.
