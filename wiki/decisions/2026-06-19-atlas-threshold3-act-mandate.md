# ADR: Threshold 3 -- The Act Mandate (Plan->Act ceremony + planReadOnly lock + Raise-a-Concern governance)

- **Date:** 2026-06-19
- **Status:** Accepted
- **Branch:** `main` (Stage 1 `1f5810bb`, Stages 2-8 `7ef7edcd`..`8fa77051`; Stage 9 verification-only; local-only, **not pushed**)
- **Entity:** [[entities/plan-tier-shell]] (all chrome mounts here) -- [[entities/act-tier-shell]] confirmed byte-identical
- **Relates to:** [[decisions/2026-06-07-atlas-plan-act-lock-gate]] (the prerequisite lock engine; T3's `planReadOnly` is a *different, orthogonal* lock -- not the prereq gate), [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]] (the route `beforeLoad` seam T3's planReadOnly context rides additively). Sequel to the unrecorded Threshold-1 (Reality Check) and Threshold-2 (Coherence Check) Plan-stage thresholds and the Tier-6 Launch Preparation restructure (all shipped on `main`, no ADR filed -- wiki maintenance lagged; see the [Contradiction / gap](#contradiction--gap) note).
- **Log:** [[log/2026-06-19-atlas-threshold3-act-mandate]]

## Context

The Plan stage closes with a row of **thresholds** -- synthetic hinge surfaces between strata. Every prior threshold is a *soft* checkpoint by standing covenant ([[concepts/decision-groups]] ethos, the always-clickable-dividers precedent): it shows readiness and navigates, but it never blocks. Threshold 1 (Reality Check) produces a Planning Direction Statement; Threshold 2 (Coherence Check) produces a sealed Coherence Record. Both are advisory.

**Threshold 3 is different by explicit operator mandate.** It is the final Plan surface, sitting after `s7-phasing-resourcing` (the terminal stratum since the Tier-6 Launch Preparation restructure). It is the one place where the steward crosses from *designing* (Plan) into *doing* (Act), and that crossing should mean something. The resolved design -- every objective across all seven strata, plus the two prior threshold records -- is assembled into a handoff inventory, presented as a **ceremony** (not an audit), and sealed by a single deliberate act: **Begin Act**. Crossing that line arms `planReadOnly`, so the plan a steward committed to is no longer silently editable while they execute against it.

The covenant safety valve is **Raise a Concern**: if reality diverges from the plan during Act, a concern is raised against the held objective, reviewed by the team governance the steward declared in Objective 0.2, and -- if approved -- the objective's lock is lifted just long enough to record an amendment *alongside* the original (additions only, the original is never overwritten), then re-locked.

This is the deliberate, operator-authorized exception to the standing "soft gate, never block" posture, scoped strictly to the Plan->Act transition. Locked via three `AskUserQuestion` decisions on 2026-06-19: (1) scope = FULL BUILD (ceremony + lock + governance escape valve); (2) the Begin-Act gate is ALWAYS ENABLED -- readiness is shown as advice, Begin Act is itself the only hard gate; (3) the third key document is the FULL resolved integrated design (Docs 1 and 2 being the T1 Planning Direction Statement and the T2 Coherence Record).

### Architectural reconciliation discovered during exploration

The original brief read "Plan objectives accessed FROM Act render display-only... route guards enforce this." Exploration proved **Act never renders Plan objectives** -- they are fully separate surfaces (`ActTierShell` executes against its own evidence stores; it does not mount `ObjectiveDetailPanel`). So the faithful reconciliation is: `planReadOnly` is a **project-global flag** armed at Begin Act, enforced where Plan objectives actually render and route. The store dependency is one-way (`actMandateStore` imports neither `planStratumStore` nor `actEvidenceStore`) -> no cycle.

## Decision

Build the full Threshold-3 surface as Plan-only chrome under `apps/web/src/v3/plan/threshold/`, imported ONLY by `PlanTierShell`; additive, no deletion ([[feedback-no-deletion]]). Nine stages.

### 1. Two new stores (`@ogden/web`, registered in `syncManifest`)

- **`actMandateStore`** (key `ogden-act-mandate`, v1; `idbPersistStorage` + `rehydrateWithLogging`, byProject). State `ProjectActMandate { mandatedAt?: number; planReadOnly: boolean; objectiveOverrides: Record<string, number> }`. Actions `beginAct(projectId, at?)` (**idempotent** -- stamps `mandatedAt` + `planReadOnly:true` only if unset), `liftLock(projectId, objectiveId, at?)`, `relock(projectId, objectiveId)`, `reset`. Selectors `selectPlanReadOnly(record)`, `isObjectiveLocked(record, objectiveId) = planReadOnly && !(objectiveId in objectiveOverrides)`. Hook `useObjectivePlanLock(projectId, objectiveId)`; imperative `isObjectivePlanLocked` for the route layer. `EMPTY_ACT_MANDATE` frozen. No Amanah touchpoint (timestamps/booleans only).
- **`planConcernsStore`** (key `ogden-plan-concerns`, v1; byProject **ARRAY**, append-only). `ConcernStatus = 'raised'|'under-review'|'approved'|'declined'`; `PlanConcern { id, objectiveRef, observation, proposedChange, raisedBy, timestamp, status, reviewedBy?, reviewedAt?, amendmentText? }`. Actions `raiseConcern` (trims; **Amanah-rejects** `observation`/`proposedChange` via `detectCsaLikeText`; no-op if empty after trim), `markUnderReview` (raised->under-review only), `resolveConcern(projectId, concernId, 'approved'|'declined', reviewedBy, { amendmentText?, at? })` (approve REQUIRES a non-empty, trimmed, Amanah-clean `amendmentText` else no-op; terminal states never re-resolved; resolved record frozen). Selectors `selectConcerns`, `approvedAmendmentsForObjective`. Imports `detectCsaLikeText` from the Threshold-2 `coherenceCheckModel`.

Both register as `blob(...)` in `syncManifest.ts`, so the build-time coverage guard passes.

### 2. `planReadOnly` is a SURFACE policy -- the store backstop was dropped (the load-bearing decision)

The original plan proposed a **three-layer** lock: render (`readOnly` prop), **store backstop** (mutators no-op under lock), and route context. Stages 5-6 proved the store backstop is **wrong** and dropped it. The Act execution loop writes the *same* shared stores (`planStratumStore` / `actEvidenceStore`) with the *same* `projectId + objectiveId + itemId` keys as Plan does -- a store-layer no-op keyed on `isObjectiveLocked` would freeze Act's own evidence capture the instant the mandate armed. The resolution (Option A, Stage-6):

- **Render layer** -- `ObjectiveDetailPanel` accepts an optional `readOnly?: boolean` (default `false`), deriving `locked = readOnly ?? useObjectivePlanLock(projectId, objectiveId)`, threaded into the shared `ActTierZeroWorkbench` / `DecisionWorkingPanel`. The workbench **never reads the lock store itself** -- the Plan host decides; defaulting `false` keeps Act byte-identical.
- **Route layer** -- the Plan-objective `beforeLoad` injects `planReadOnly` into route context (additive; **no redirect** -- a locked Plan objective MUST stay viewable so a concern can be raised against it). `isObjectivePlanLocked` reads `actMandateStore` imperatively.
- **Stores stay surface-agnostic.** `*.mandateNeutrality.test.ts` guards pin this: the shared mutators behave identically whether or not a mandate is armed.

This is the single operator-authorized exception to "soft gate / never block," and it is consulted by **only** these two seams. No prerequisite / threshold / monitoring / progressTracking logic reads `planReadOnly`.

### 3. DECOUPLE reach from clickability

`REACHABLE_THRESHOLD_IDS = ['threshold-1','threshold-2']` (spine/switcher clickability) was SPLIT from a new `ROUTABLE_THRESHOLD_IDS = ['threshold-1','threshold-2','threshold-3']`. T3 is reachable by deep-link + a Plan-only "Enter the Act Mandate" CTA (`ActMandateEntryCue`) on the `s7` objective detail; its divider stays decorative (not clickable). This keeps the ceremony a deliberate entry, not an idle tab-click.

> **UPDATE 2026-06-19 (commit `8f82dc0a`) -- partially superseded by operator decision.** Looking at the live rail-header switcher the operator asked that T3 "be a button that functions like the other two thresholds." `threshold-3` was therefore **added** to `REACHABLE_THRESHOLD_IDS`, so the T3 switcher row is now a clickable button. Clicking it only **navigates** to the Act Mandate surface (`plan/threshold/threshold-3`) -- it does **not** arm `planReadOnly`; the one-way Begin-Act crossing is still entered solely via the surface's own "Begin Act" CTA, so **clickability != arming** and the ceremony's deliberateness is preserved at the actual crossing. `ROUTABLE_THRESHOLD_IDS` / `isThresholdReachable` are unchanged (now coextensive with `REACHABLE`, kept distinct: route reach vs nav affordance). The `ActMandateEntryCue` and deep-links remain valid alternate entry paths. The rejected alternative below is thus now the adopted approach -- with the clarification that the clickable row navigates rather than arms.

### 4. The ceremony surface (`ActMandateSurface` + `ActMandateReferenceRail` + `ActMandate.module.css`)

Cloned from the Threshold-2 quartet, green register (`--am-*`, `#4F9D69` / `#3C7E52`). A pure, React-free `actMandateModel.ts` assembles three layers from `resolveProjectObjectives` + the two prior threshold stores: (1) **three key documents** -- Planning Direction (from `realityCheckStore`, present only when `approvedAt` set), Coherence Record (from `coherenceCheckStore`, present only when `sealedAt` set), and the full resolved integrated design; (2) the **grouped handoff inventory** (objectives with an `actHandoff`, grouped by stratum -- the ~38 tally is a TEST pin only, never hardcoded in product); (3) the **Begin Act** gate -- always enabled, readiness shown as advice; on click `beginAct(projectId)` THEN `navigate` to the Act tier shell. Terminal -- no downstream gate banner. All `ACT_MANDATE_COPY` strings are recursively banned-term-scanned in the model test, so any new copy key is auto-covered.

### 5. Raise a Concern + append-only governance (`RaiseConcernAffordance`, `ConcernAmendments`, `ConcernGovernancePanel`)

Plan-only, mounted in `ObjectiveDetailPanel`, all self-gating. `RaiseConcernAffordance` renders only when the objective is locked. `ConcernAmendments` renders approved amendments ALONGSIDE the original (null when none). `ConcernGovernancePanel` is the review queue: it reads the Objective-0.2 `StewardTeam.governance` as review context (never re-asks) and auto-selects the reviewer from the live `useStewardRoster`. **Approve orchestration:** `liftLock(projectId, objectiveRef)` -> `resolveConcern(approved, reviewer, { amendmentText })` -> `relock(projectId, objectiveRef)` -- net lock state UNCHANGED, only an appended record. **Decline:** `resolveConcern(declined, reviewer)`. `markUnderReview` gates the amendment field (a `raised` concern shows only "Begin review"; `under-review` shows the amendment textarea + approve/decline). The catalogue objective is never mutated.

## Rationale

- **Surface-policy lock (not store backstop):** the shared stores are the Act execution substrate; freezing them on lock would break the very stage the mandate hands off to. Enforcing at render + route is sufficient (there is no Act path that renders Plan objectives) and leaves Act untouched. The `mandateNeutrality` guards make the surface-agnostic contract a test invariant.
- **Always-enabled Begin Act:** consistent with the soft-gate ethos and the always-clickable-dividers precedent -- the steward crosses when ready; readiness is advice. Begin Act is the *only* hard gate, and it is an explicit action call (button handler), never a route side-effect, so it cannot double-fire (idempotent `beginAct`).
- **Append-only amendments:** the resolved design is a covenant the steward committed to; divergence is recorded *beside* it, never *over* it. The lift window is amendment-overlay-only and immediately re-locked.

## Alternatives Considered

- **Store-layer mutator backstop (original 3-layer plan):** rejected -- it keys on `isObjectiveLocked`, but Act writes the same store keys, so it would freeze Act's evidence capture. Dropped in favour of render+route only; the surface-agnostic store contract is now guarded.
- **Hard-block Begin Act until readiness complete:** rejected per operator decision -- readiness is advisory; gating it would contradict the soft-gate covenant.
- **Overwrite the objective in place on approve / mutate the catalogue:** rejected -- violates the append-only / never-overwrite covenant; amendments append to `planConcernsStore` and render alongside.
- **Make the T3 spine divider clickable (single `REACHABLE_THRESHOLD_IDS` edit):** initially rejected -- the ceremony is a deliberate entry, so reach (`ROUTABLE_*`) was decoupled from clickability (`REACHABLE_*`). **ADOPTED later the same day (commit `8f82dc0a`)** by operator decision -- see the UPDATE under section 3. The deliberateness concern is satisfied differently: the clickable row only navigates, while the one-way arming stays gated behind the surface's Begin-Act CTA.
- **Route `beforeLoad` redirect for locked Plan objectives:** rejected -- locked objectives must stay viewable to raise a concern; the context flag is additive, no redirect.

## Consequences

- The Plan stage now ends with a real ceremony: three key documents, the full grouped handoff inventory, and an always-enabled Begin Act that arms `planReadOnly` and navigates to Act.
- A locked Plan objective renders display-only (no edit affordances, no checklist toggles) yet stays viewable; the Act execution loop is entirely unaffected (shared stores never freeze).
- Reality divergence during Act has a covenant-clean path: raise -> governance review per Objective 0.2 -> approve lifts/records-alongside/re-locks, or decline closes cleanly. Observe raises no concerns (it is a read-only Eagle-Eye dashboard -- no `RaiseConcern` mount).
- **Act is byte-identical** -- no Plan-only threshold component is imported anywhere under `v3/act` (grep-proven every stage; the only broad match in `ActTierZeroWorkbench.tsx` is a doc comment + the `readOnly?` prop defaulting `false`).
- No schema, migration, prerequisite, or display-only-field change -- `prerequisiteObjectiveIds` / `STRATUM_PREREQS` and the monitoring/progressTracking fields remain untouched and never gate.

## Amanah

Two boundaries on EVERY free-text concern field (`observation`, `proposedChange`, `amendmentText`): `detectCsaLikeText` (re-exported from `coherenceCheckModel`, regex `/(subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[ -]share)/i`) acts as BOTH a UI advisory (surfaces `CSA_ADVISORY_COPY`, disables submit/approve) AND a hard persist-boundary reject (store no-op). All `ACT_MANDATE_COPY` strings are covenant-clean and banned-term-scanned by the model test. The append-only / never-overwrite covenant is structural -- approved amendments append, the catalogue objective is never mutated. No CSA / CSRA / salam / advance-sale / subscription / yield-share / presale is ever authored or stored; the deferred "Commercial CSA" references in source mockups were NOT transcribed ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- `@ogden/shared`: `tsc --noEmit` 0 errors; 1557/1557 tests.
- `@ogden/web`: `tsc --noEmit` (`--max-old-space-size=8192`) at the standing **6-error foreign baseline, 0 new** (`syncServiceWorkItemsFallback` x1, `WorkConflictSection` x3, `useDimensionDrawTool.commit` x2 -- none ours); 6311 passed / 7 failed.
- The 7 failures across 4 files (`projectStore.secondaryReopen`, `BoundaryCaptureLegacy`, `completionPathAudit.ratchet`, `VisionLayoutCanvas.surveyLayers`) are the EXACT documented-foreign set from the pre-T3 Mode-4 session, **causally isolated** -- grep-proven that none reference any T3 symbol (`actMandate` / `planConcerns` / `planReadOnly` / `useObjectivePlanLock` / `ConcernGovernance` / `RaiseConcern` / `ActMandate`). Red since before T3 began ([[feedback-vitest-bounded-runs]]).
- Threshold suites 189/189 (incl. 27 Stage-8 governance tests). The Stage-8 covenant test pins: approve lifts->records-alongside->re-locks with the original untouched and net lock state unchanged; decline closes without amendment; empty/CSA-like `amendmentText` leaves approve disabled and a force-click is a store no-op.
- **No visual-pass claimed.** Live v3 preview is not driveable offline (backend API at :3000 down -- `ECONNREFUSED` confirmed in test logs; the surface needs a seeded project + MapLibre). DOM/unit tests are the verification signal per the plan ([[project-screenshot-hang]]).

## Contradiction / gap

> [!warning] Wiki maintenance lagged the code
> Threshold-1 (Reality Check), Threshold-2 (Coherence Check), the Mode-4 Design restructure, and Tier-6 Launch Preparation all shipped on `main` (not pushed) WITHOUT ADRs or entity updates. This ADR is the first Plan-threshold decision record. The unrecorded predecessors are captured in this session's project-memory file (`project_threshold3_act_mandate.md` and its siblings) but not yet in the wiki -- a backfill is owed.

## Owed (operator-authorized push only -- do NOT push)

All T3 commits (`1f5810bb`, `7ef7edcd`..`8fa77051`) plus the prior unpushed backlog (Tier-6 S3-6, Threshold-1, Mode-4, Threshold-2) remain local-only. Push only on explicit operator instruction.

## Connections

- [[entities/plan-tier-shell]] -- hosts every Threshold-3 surface; the dispatch arms live in `PlanTierShell`.
- [[entities/act-tier-shell]] -- confirmed byte-identical; the lock is a Plan-host policy the workbench never reads.
- [[decisions/2026-06-07-atlas-plan-act-lock-gate]] -- the prerequisite lock engine (orthogonal to T3's `planReadOnly`).
- [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]] -- the route `beforeLoad` seam T3's planReadOnly context rides additively.
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the Amanah constraint the two-boundary scan enforces.
- [[feedback-no-deletion]] -- additive, no deletion.
