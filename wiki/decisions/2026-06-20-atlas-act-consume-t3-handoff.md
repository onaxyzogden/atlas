# ADR: Act consumes the Threshold-3 handoff (Mandate Briefing + live Monitoring/Milestones + Approved Amendments)

- **Date:** 2026-06-20
- **Status:** Accepted
- **Branch:** `main` (four feature commits `fb05612e` / `77a8b946` / `b475db09` / `5308376c`; local-only, **not pushed**)
- **Entity:** [[entities/act-tier-shell]] (all three new surfaces mount here -- this is the first time the Act shell is DELIBERATELY no longer byte-identical to Plan)
- **Relates to:** [[decisions/2026-06-19-atlas-threshold3-act-mandate]] (T3 built the handoff substrate this session consumes), [[decisions/2026-06-18-atlas-tier6-launch-preparation]] (authored the display-only `progressTracking` milestones now made live), [[decisions/2026-06-17-atlas-mode4-design-tiers34]] (authored the display-only `monitoringProtocol` now made live), [[decisions/2026-06-18-atlas-threshold2-coherence-check]] (the `coherenceCheckModel` re-export of `detectCsaLikeText` reused as this session's covenant boundary)
- **Log:** [[log/2026-06-20-atlas-act-consume-t3-handoff]]

## Context

Threshold 3 ([[decisions/2026-06-19-atlas-threshold3-act-mandate]]) shipped the full Plan->Act ceremony: **Begin Act** seals the design, arms project-global `planReadOnly`, and `assembleActMandate` produces a handoff inventory (Planning Direction from T1 + Coherence Record from T2 + grouped per-stratum handoffs). The **lock** was enforced and the mandate was **assembled** -- but **Act consumed none of it.** An executing steward never saw the briefing, never saw the `monitoringProtocol` streams or `progressTracking` milestones that Plan authored as display-only, and never saw the governance-approved concern amendments the T3 escape valve produced. The handoff was written and then ignored at the only place it was meant to be read.

This is the inverse of every prior threshold session. Those were **Plan-only chrome** under a hard "Act byte-identical to Plan" invariant. **These three surfaces ARE the intended Act-side work** -- so that invariant explicitly does NOT apply here; this is the first deliberate divergence of the Act shell from Plan. The covenant rule that still binds is the *opposite* one: nothing here may **gate or freeze** the Act execution loop (display-only / append-only / record-only / never-overwrite), and every new free-text Act surface is covenant-guarded on both boundaries.

Operator decisions (AskUserQuestion, 2026-06-19): (1) **scope = all three features**; (2) **live-monitoring depth = "Records + milestone tracking"** -- the largest option: surface monitoring live, show the latest Observe reading per indicator, add a covenant-guarded "record reading" control writing an `ObserveDataPoint`, AND add a NEW persistence store so each Launch-Preparation milestone can be marked reached during Act.

### Architecture split (verified by exploration)

- **Feature 1 (Briefing) is project-global** -> mounts in `ActTierShell.tsx` (the Dashboard view), self-gating to `null` when the project has no `mandatedAt`.
- **Features 2 + 3 (Monitoring/Milestones, Amendments) are per-objective** -> mount in `ActTierExecutionPanel.tsx`, self-gating to `null` on their optional fields.
- Every new Act component lives under `apps/web/src/v3/act/tier-shell/` with its OWN `.module.css`. The Plan threshold/strata renderers (`ActMandateSurface`, `ConcernAmendments`, `MonitoringStreamPanel`, `LaunchProgressPanel`) were used as visual TEMPLATES only -- **no `v3/plan/**` component is imported under `v3/act/**`** (grep-proven). The only cross-package imports are the PURE, React-free models `actMandateModel.js` and `coherenceCheckModel.js` (type-only `@ogden/shared`), which are Act-safe.

## Decision

Build three Act-side read surfaces over the existing T3 substrate; additive, no deletion ([[feedback-no-deletion]]). One commit per feature on `main`.

### Stage 1 -- Approved Amendments in Act (`fb05612e`)

`ActObjectiveAmendments.tsx` (+ CSS + test) reads `approvedAmendmentsForObjective(concerns, objective.id)` off `planConcernsStore` (the T3 store), mirroring the Plan `ConcernAmendments` shape (CheckCircle2, `amendmentText`, "In response to:" observation, "Recorded {day} by {reviewedBy} -- permanent" meta). Self-gates `if (amendments.length === 0) return null`. Reuses `ACT_MANDATE_COPY.onObjective`. **No store writes -> no new covenant surface.** The catalogue objective is NEVER mutated -- the amendment renders ALONGSIDE it (append-only / never-overwrite, structural). `data-testid="act-execution-objective-amendments"`.

### Stage 2 -- Mandate Briefing in Act (`77a8b946`)

`ActMandateBriefingCard.tsx` (+ CSS + test) reuses the PURE `assembleActMandate(input)` to render the T3 handoff READ-ONLY in the Act Dashboard: Planning Direction (T1) + Coherence Record (T2) + grouped per-stratum handoffs + key documents + advisory readiness. Source data: `useProjectObjectives` + `planObjectiveStatuses` (already in shell scope), `useRealityCheckStore` (`EMPTY_REALITY_CHECK` fallback), `useCoherenceCheckStore` (`EMPTY_COHERENCE_CHECK` fallback), `useActMandateStore` byProject as the **render gate** (only when `mandatedAt` set), and `findPlanStratum(stratumId)?.title` for `stratumTitleFor`. Prepended in BOTH `ActOpsDashboard` branches. Green `ACT_MANDATE_PALETTE` reused. Read-only -- no writes. `data-testid="act-mandate-briefing"`.

### Stage 3 -- Live monitoring stream + covenant-guarded record (`b475db09`)

`ActObjectiveMonitoringPanel.tsx` (+ CSS + test) reads `objective.monitoringProtocol?.{indicators,triggers,feeds}` (mirrors Plan `MonitoringStreamPanel`, `UNIVERSAL_DOMAIN_LABELS[feeds]`), and shows the **latest live reading per indicator** by matching each indicator to the newest `ObserveDataPoint` from `getByObjective(projectId, objective.id)` on `measurementValue.label === indicator.metric`. A **"record reading" control** writes an `ObserveDataPoint` exactly as `ActTierExecutionPanel.handleRecord` already builds it (`domainId: monitoringProtocol.feeds` -- a `UniversalDomain`, directly assignable, no cast; `sourceObjectiveId: objective.id`; `sourceType: 'manual_observation'`; `statusOutput: 'clear'`; `capturedBy: 'act-tier'`). The reading `note` is the **one new free-text Act surface** this session adds. Self-gates when no `monitoringProtocol`. `data-testid="act-execution-monitoring"`.

### Stage 4 -- Live launch-milestone tracking (`5308376c`)

New `store/launchMilestoneStore.ts` (key `ogden-launch-milestone-progress`, v1, `idbPersistStorage`, `partialize -> { byProject }`): `byProject[projectId][objectiveId][milestoneKey] -> { reachedAt, reachedBy }` where `milestoneKey` IS the authored `metric` string (no slug). Actions `markReached` (**idempotent** -- `if (milestoneKey in current) return s`; defaults `by='act-tier'`, `at=new Date().toISOString()`), `clearReached` (**remove-only** via destructure), `reset`; pure `milestonesFor` selector + `useObjectiveMilestones` hook + frozen `EMPTY_OBJECTIVE_MILESTONES`. Registered as `blob('ogden-launch-milestone-progress', useLaunchMilestoneStore, 'byProject', 1, byKey('byProject', null, {}))` in `syncManifest` so the build-time coverage guard (which auto-scans `src/store/*.ts` for `persist(...name:'ogden-...')`) passes. `ActObjectiveLaunchProgress.tsx` (+ CSS + test) reads `objective.progressTracking?.milestones[]` (`{metric,cadence}`, min 2; mirrors Plan `LaunchProgressPanel`) and renders a per-milestone reached toggle (CheckCircle2/Circle, `aria-pressed`) writing through the store, with the metric struck off + a "Reached {day} . {who}" meta line. Self-gates when no `progressTracking`. **The toggle writes ONLY a reached record (timestamp + who) -> no free text -> no covenant surface.** `data-testid="act-execution-progress"`.

## Rationale

- **Read-only / record-only / append-only, never a gate.** The mandate is the design the steward committed to; Act SHOWS it, captures evidence beside it, and marks progress against it -- it never edits the plan and never blocks execution. Monitoring records flow into the existing Observe substrate (the proven Act->Observe write path); milestones write an opaque reached-record blob; amendments render alongside the untouched catalogue objective. Nothing this session adds can freeze the Act loop -- the standing covenant that the T3 store backstop was dropped to protect.
- **Reuse the pure models, never the Plan components.** `assembleActMandate` / `ACT_MANDATE_COPY` / `approvedAmendmentsForObjective` / `detectCsaLikeText` are all pure (type-only `@ogden/shared`), so consuming them in Act introduces no Plan-component dependency and no cycle. The Plan renderers are visual references only.
- **One new free-text surface, dual-boundary guarded.** The monitoring `note` reuses the established `detectCsaLikeText` + `CSA_ADVISORY_COPY` re-export (no new regex authored) as BOTH a UI advisory (disable submit + show advisory copy) AND a hard write-time reject before `recordDataPoint` (no-op on match) -- the same two-boundary pattern T3's concern fields use.

## Alternatives Considered

- **Keep Act byte-identical (mount nothing).** Rejected -- that is the bug. The handoff exists to be read in Act; leaving it unconsumed defeats the entire T3 ceremony.
- **Make monitoring/milestones gate execution (block until a milestone is reached / a reading is recorded).** Rejected -- violates the never-freeze-the-Act-loop covenant. Both are display/record-only; `prerequisiteObjectiveIds` / `STRATUM_PREREQS` are untouched and nothing reads these fields as a gate.
- **Mutate the catalogue objective in place when an amendment is approved.** Rejected -- append-only / never-overwrite; the amendment renders alongside the unchanged objective.
- **Persist milestone reached-state with a slugged key.** Rejected -- the authored `metric` string IS the stable key (distinct per objective); a slug adds a lossy transform with no benefit.
- **Add a roster-pick `reachedBy` free-text field.** Rejected for v1 -- `reachedBy` defaults to `'act-tier'`; no free text keeps the milestone toggle covenant-surface-free.

## Consequences

- An executing steward now sees, in Act: the full mandate briefing on the Dashboard (project-global, self-gating on `mandatedAt`); and per executing objective -- live monitoring streams with the latest reading + a guarded record control, live launch-milestone toggles, and any T3-approved amendments alongside the objective.
- A monitoring reading writes a real `ObserveDataPoint` into Observe; a milestone toggle persists round-trip through the new sync-registered store; an approved amendment shows beside the unchanged objective.
- **The Act shell is now deliberately NOT byte-identical to Plan** -- the first such divergence. The "byte-identical under T*" entity notes still hold for the Plan-only threshold chrome; this section records the intended exception.
- No schema, migration, prerequisite, or display-only-field change to the Plan side. The new store is the only persistence addition; it is sync-registered.

## Amanah

The single new free-text Act surface (the monitoring reading `note`) is guarded on BOTH boundaries by the reused `detectCsaLikeText` + `CSA_ADVISORY_COPY` re-export (UI advisory disabling submit + hard write-time reject) -- no new regex authored. The milestone toggle and the briefing/amendments surfaces add NO free-text input. Append-only / never-overwrite / record-only / never-gate are all structural. No CSA / CSRA / salam / advance-sale / pre-sale / subscription / yield-share is ever authored or stored; the one banned-term occurrence across all new/edited files is a single sanctioned ADVERSARIAL test fixture (`ActObjectiveMonitoringPanel.test.tsx`, asserting the note input rejects "Sold via CSA subscription presale this season" at both UI and write). Production banned-term grep returns nothing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- `@ogden/web`: `tsc --noEmit` (`--max-old-space-size=8192`) at the standing **foreign baseline, 0 new** -- the 4 remaining errors (`syncServiceWorkItemsFallback` x1, `WorkConflictSection` x3) are all foreign, none ours.
- Bounded vitest (`--pool=forks`, [[feedback-vitest-bounded-runs]]) **44/44 green** across the four feature suites + the store suite (`ActObjectiveAmendments`, `ActMandateBriefingCard`, `ActObjectiveMonitoringPanel`, `ActObjectiveLaunchProgress`, `launchMilestoneStore`); the `syncManifest` coverage guard passes WITH the new store registered.
- The monitoring suite pins both covenant boundaries: a CSA-like `note` disables submit AND is a no-op at the `recordDataPoint` write boundary.
- Banned-term grep over all new/edited files = exactly ONE sanctioned adversarial fixture; no-cross-import grep clean (only pure `actMandateModel.js` / `coherenceCheckModel.js`).
- **No visual pass claimed.** Live v3 preview not driveable offline (backend `:3000` + Vite `:5173` down); DOM/unit + tsc is the signal ([[project-screenshot-hang]]).

## Reconciliation note (Stage 4 demo->main cherry-pick)

> [!note] The Stage-4 commit landed on the wrong branch and was relocated to `main`
> The working tree had been foreign-switched to `demo` before this session resumed (the session-start snapshot said `main` but was stale). The Stage-4 commit therefore landed as `47f4bacf` on `demo`, not `main`. A plain `git checkout main` would have refused (overlapping foreign WIP). Per operator choice (AskUserQuestion -> "Cherry-pick onto main"), a throwaway `main` worktree cherry-picked `47f4bacf` -> **`5308376c`** (clean), then was removed + pruned; the `demo` working tree was left untouched. main now carries all four feature commits; `demo` keeps the un-pushed duplicate. This wiki update was authored the same way -- in a throwaway `main` worktree -- because HEAD is still on `demo`.

## Owed (operator-authorized push only -- do NOT push)

All four feature commits (`fb05612e`, `77a8b946`, `b475db09`, `5308376c`) and this wiki commit remain local-only on `main`, atop the prior unpushed backlog (T3 + T3 wiki, the switcher + its wiki, the four-predecessor backfill). Push only on explicit operator instruction.

## Connections

- [[entities/act-tier-shell]] -- hosts all three new surfaces; the first deliberate Act/Plan divergence.
- [[decisions/2026-06-19-atlas-threshold3-act-mandate]] -- built the handoff substrate (`assembleActMandate`, `planConcernsStore`, `actMandateStore`) this session reads.
- [[decisions/2026-06-18-atlas-tier6-launch-preparation]] -- authored the display-only `progressTracking` milestones now made live.
- [[decisions/2026-06-17-atlas-mode4-design-tiers34]] -- authored the display-only `monitoringProtocol` now made live.
- [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]] -- the Amanah constraint the dual-boundary note scan enforces.
- [[feedback-no-deletion]] -- additive, no deletion.
