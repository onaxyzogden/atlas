# 2026-06-20 -- Act consumes the Threshold-3 handoff (three Act-side surfaces, 4 stages)

**Objective:** Close the verified T3 gap -- the Act stage assembled and locked the mandate but consumed none of it. Build the three Act-side read surfaces (Mandate Briefing, live Monitoring + Launch-milestone tracking, Approved Amendments) so an executing steward finally sees the handoff that Begin Act produced.

**ADR:** [[decisions/2026-06-20-atlas-act-consume-t3-handoff]]
**Entity:** [[entities/act-tier-shell]] (all three mount here -- first deliberate Act/Plan divergence).

## Completed

- **Stage 1 -- Approved Amendments (`fb05612e`)** -- `ActObjectiveAmendments.tsx` reads `approvedAmendmentsForObjective` off the T3 `planConcernsStore`; mirrors Plan `ConcernAmendments`; renders ALONGSIDE the unchanged objective (append-only); self-gates on empty; no store writes -> no covenant surface.
- **Stage 2 -- Mandate Briefing (`77a8b946`)** -- `ActMandateBriefingCard.tsx` reuses the PURE `assembleActMandate` to render Planning Direction (T1) + Coherence Record (T2) + grouped handoffs + key documents + advisory readiness READ-ONLY in the Act Dashboard; gated on `useActMandateStore` `mandatedAt`; prepended in BOTH `ActOpsDashboard` branches; green `ACT_MANDATE_PALETTE`.
- **Stage 3 -- Live monitoring stream (`b475db09`)** -- `ActObjectiveMonitoringPanel.tsx` reads `objective.monitoringProtocol`, shows the latest `ObserveDataPoint` per indicator (`getByObjective`, matched on `measurementValue.label`), and adds a covenant-guarded "record reading" control writing an `ObserveDataPoint` (`domainId: feeds`, `sourceObjectiveId: objective.id`, `capturedBy:'act-tier'`). The reading `note` is the ONE new free-text surface -> dual-boundary `detectCsaLikeText`.
- **Stage 4 -- Live launch-milestone tracking (`5308376c`)** -- NEW `launchMilestoneStore` (key `ogden-launch-milestone-progress`, v1, idb, byProject; `markReached` idempotent, `clearReached` remove-only, `milestonesFor`/`useObjectiveMilestones`; `milestoneKey` = the authored `metric`); registered `blob(...)` in `syncManifest` (coverage guard auto-discovers it). `ActObjectiveLaunchProgress.tsx` reads `objective.progressTracking.milestones[]` and renders a per-milestone reached toggle (struck-off metric + "Reached {day} . {who}"). Record-only -> no covenant surface.

## Verification

- `@ogden/web`: tsc foreign baseline, **0 new** (4 errors -- `syncServiceWorkItemsFallback` x1, `WorkConflictSection` x3 -- all foreign).
- Bounded `--pool=forks` ([[feedback-vitest-bounded-runs]]) **44/44** across the four feature suites + `launchMilestoneStore`; `syncManifest` coverage guard green WITH the new store registered.
- Monitoring suite pins BOTH covenant boundaries (CSA-like note disables submit AND no-ops at `recordDataPoint`).
- Banned-term grep over all new/edited files = exactly ONE sanctioned adversarial fixture (`ActObjectiveMonitoringPanel.test.tsx`); no-cross-import grep clean (only pure `actMandateModel.js`/`coherenceCheckModel.js` imported under `v3/act`).
- No visual-pass claimed -- backend `:3000` + Vite `:5173` down; DOM/unit is the signal ([[project-screenshot-hang]]).

## Decisions of note

- **First deliberate Act/Plan divergence** -- the "Act byte-identical" invariant does NOT govern these surfaces; they ARE the intended Act work. The inverse covenant binds: nothing may gate or freeze the Act loop (display/record/append-only).
- **Reuse the PURE models, never the Plan components** -- `assembleActMandate`/`approvedAmendmentsForObjective`/`detectCsaLikeText` are type-only -> Act-safe, no cycle; Plan renderers are visual templates only.
- **Milestone key = the authored `metric` string** -- no slug; stable + distinct per objective. `reachedBy` defaults to `'act-tier'` (no free text -> no covenant surface).

## Amanah

The one new free-text surface (monitoring `note`) is dual-boundary guarded by the reused `detectCsaLikeText` + `CSA_ADVISORY_COPY` re-export (UI advisory + hard write reject) -- no new regex. Milestone toggle + briefing + amendments add no free text. No CSA/CSRA/salam/advance-sale ever authored or stored; the single banned-term hit across all files is a sanctioned adversarial test fixture; production grep clean ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred / owed

- **All four feature commits + this wiki commit NOT pushed** (operator-authorized push only), atop the prior unpushed backlog (T3 + T3 wiki, switcher + wiki, four-predecessor backfill).
- **Stage-4 demo->main reconciliation:** the working tree was foreign-switched to `demo` before resume, so Stage 4 first landed as `47f4bacf` on `demo`; per operator choice it was cherry-picked to `main` as `5308376c` via a throwaway worktree, demo working tree untouched. This wiki update was authored the same way (throwaway `main` worktree -- HEAD still on `demo`).
- Foreign WIP (`.claude/launch.json`, `render.yaml`, `scripts/audit-out/`, `scripts/generate-stratum1-objectives.ts`, the `demo` deploy commit `a973fbbb`, the F0-F17 audit/fix commits) left untouched.
