# 2026-06-11 — Decision workbench moved Act → Plan (Act execution-only)

**Objective:** Transfer the interactive decision "workbench" from the Act stage to the Plan stage, re-aligning the IA with *Plan decides / Act executes + collects evidence* (reverses the earlier "Phase B" Act-decision framing).
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `2d564e1d`** (10 files incl. wiki, +336/-136), not pushed; parallel guild/plan-data WIP left unstaged.
**ADR:** [[decisions/2026-06-11-atlas-workbench-act-to-plan]].

## What shipped (5 files, 3 steps)

Operator locked three forks up front: **(1)** Plan placement = center-canvas swap mirroring Act; **(2)** Act becomes execution-only; **(3)** hard precondition — no edits to `plan/tier-shell/` until its baseline was committed (resolved: already committed `56b8170b`, so Plan edits proceeded).

- **Step 1 — shared predicate (NEW `apps/web/src/v3/act/tier-shell/tierZeroObjectives.ts`):** lifts `TIER_ZERO_OBJECTIVE_IDS` (25 ids, verbatim) + `isTierZeroObjective` + `isTierZeroObjectiveId` out of `ActTierShell`'s private scope into one shared module so Act and Plan can't drift. `ActTierShell` repointed to import it; local copies deleted.
- **Step 2 — `PlanTierShell.tsx` mounts the workbench:** added frozen `EMPTY_RATIONALES`/`EMPTY_DEFERRED`, `decisionRationales`/`deferredDecisions` selectors (module-scope frozen fallbacks for Zustand-v5 referential stability), `handleSaveRationale`/`handleToggleDefer` (→ `actEvidenceStore.saveDecisionRationale`/`setDecisionDeferred`), and `showTierZeroWorkbench = isTierZeroObjectiveId(objectiveId) || isTierZeroObjective(selectedObjective)`. Center swaps to `<ActTierZeroWorkbench>` (imported from `act/tier-shell`, unchanged on disk; props: `projectId`, `objectives`, `activeObjectiveId`, `primaryTypeId`/`secondaryTypeIds`, `progressByObjective`, `formValues`, `rationales`, `deferredItems`, `onRecord`/`onSaveRationale`/`onToggleDefer`) when the flag is set, else the editable `VisionLayoutCanvas` + `PlanPhaseTabs`. Cold-hydration guard renders `styles.tierZeroLoading` when `showTierZeroWorkbench && !selectedObjective` (no WebGL flash on cold deep-link); bottom tools tray suppressed and `VisionFormsTabsModal` guarded out when the workbench shows.
- **Step 3 — `ActTierShell.tsx` execution-only:** the `<ActTierZeroWorkbench>` canvas branch replaced with `<ActTierExecutionPanel>` in a new `.tierZeroExec` wrapper (`ActTierShell.module.css`, `height:100%; min-height:0; overflow-y:auto`). Dropped the dead `import ActTierZeroWorkbench`, the `handleSaveRationale`/`handleToggleDefer` callbacks, and the `decisionRationales`/`deferredDecisions` selectors + frozen consts. **Kept** `handleFormDataSave`/`handleFormSave` (still serve the tools-rail `VisionFormsTabsModal` path on non-Tier-0). Flag name `showTierZeroWorkbench` kept (comments updated only) to minimize footprint in a file with unrelated WIP.

**No deletion** ([[feedback-no-deletion]]): `ActTierZeroWorkbench`/`DecisionList`/`DecisionWorkingPanel` + ~32 captures stay on disk, now imported by Plan.

## Why it's correct (lock asymmetry)

Plan strata genuinely lock (`computeAllStratumStates` + route `beforeLoad` guards, [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]]); Act never locks. Moving the workbench into Plan places Tier-0 decision recording **behind prerequisite gates**, and removing it from Act closes the one place a Tier-0 decision could be edited outside the gate. Net: stricter and more aligned with *Plan decides / Act executes*.

## Verification

- `tsc --noEmit` (apps/web) **EXIT 0**.
- Bounded vitest ([[feedback-vitest-bounded-runs]], `--pool=forks --poolOptions.forks.singleFork=true`): `ActTierZeroWorkbench` + `workbenchAffordances` → **67/67**.
- Live DOM probes (dev :5200, project `642169aa…`; screenshot skipped per [[project-screenshot-hang]], DOM fallback):
  - Plan Tier-0 (`s1-vision`): workbench present (`decision-item`/`mode-badge-*`, "Record this decision", "needs more observation"), **no map canvas**, tools tray (`[aria-label="Objective tools"]`) **absent**, right rail `plan-objective-detail-panel` intact.
  - Plan non-Tier-0 (`s3-systems-baseline`): **map canvas present**, no workbench, tools tray **present** — clean revert.
  - Act Tier-0 (`s1-vision`): `_tierZeroExec_` + `_execPanel_` (`ActTierExecutionPanel`) with progress bar + 4 evidence cards + checklist; **no workbench / Record / map**.

## Deferred

1. ~~`s2-ecology`/`s2-terrain` survey body arms render read-only summary in Plan (no Plan map takeover) — accepted default.~~ **LANDED 2026-06-11** (`8c6144d3`, full map takeover) — see second follow-on note below. Supersedes the "read-only summary" default.
2. ~~**Stale copy:** `DecisionChecklist`'s "decisions worked through in Act" banner + "Open in Act →" CTA.~~ **LANDED 2026-06-11** (`248e520c`) — see first follow-on note below.
3. ~~Locked-objective deep-link can still mount the workbench (gate is on rail click, not route; Act had the same) — left for parity.~~ **LANDED 2026-06-11** (`0e7d2b16`, Plan route `beforeLoad` guards) — see second follow-on note below.
4. ~~Item-level Defer in Plan kept alongside Plan's objective-level deferral — coexists today.~~ **LANDED 2026-06-11** (`6efaba7b`, relabel item-defer to "On hold") — see second follow-on note below.

All four migration residuals are now closed.

## Follow-on (2026-06-11) — Deferred #2 stale copy landed

The right-rail `DecisionChecklist` (Plan, read-only) carried the migration's last stale strings: a *"decisions are worked through in Act"* banner and an *"Open in Act →"* CTA. Both are now **tier-aware**, branching on the same shared `isTierZeroObjective` predicate the two shells already import (`apps/web/src/v3/act/tier-shell/tierZeroObjectives.ts` — no new logic, no drift).

- **Tier-0 objectives** (workbench now in the Plan center, same screen): the Act CTA is **removed** entirely (the deep-link routed to the Act *map* field-action surface, which Tier-0 has no use for). Banner → *"⌒ Read-only summary — decisions are recorded in the workbench"*.
- **Spatial (non-Tier-0) objectives:** CTA **kept** and still navigates to the Act field-action route (proof is captured on the land in Act), relabeled *"Open in Act →"* → *"Capture proof in Act →"*. `data-testid="open-in-act-trigger"` unchanged (navigation test stays green). Banner → *"⌒ Read-only preview — decided in Plan, captured in Act"*.

Single source file touched: `apps/web/src/v3/plan/strata/DecisionChecklist.tsx` (`isTierZero` prop threaded into `ReadOnlyDecisionGroupCard`; banner + footer branch on it; header + inline comments rewritten). Out of scope by design ([[feedback-no-deletion]]): the legacy `stratum-spine` copies (`plan/spine/DecisionGroupCard.tsx`, `DesignDetailPanel.tsx`) carry the same strings but are reachable only via the per-project toggle — left verbatim.

**Verification:** `tsc --noEmit` (apps/web) EXIT 0; bounded vitest ([[feedback-vitest-bounded-runs]]) `DecisionChecklist.test.tsx` — existing spatial deep-link test + new Tier-0 CTA-removal test green. Live DOM probes (project `642169aa…`, screenshot skipped per [[project-screenshot-hang]]): Plan Tier-0 `s1-vision` card = no `open-in-act-trigger`, banner *"recorded in the workbench"*; Plan spatial `s3-hydrology` card = CTA present labeled *"Capture proof in Act →"*, banner *"decided in Plan, captured in Act"*.

## Follow-on (2026-06-11) — Deferred #1, #3, #4 landed (three independent commits)

The remaining three migration residuals were closed in one session, as three independent commits on `main` (no push), touching files non-overlapping with the parallel guild/plan-data WIP ([[project-structured-capture-on-main]], left untouched):

- **#3 — Plan route lock guards (`0e7d2b16`, `apps/web/src/routes/index.tsx`, +37).** Plan strata genuinely lock, but Plan's two routes had no `beforeLoad` guards (Act gained its equivalents 2026-06-07, [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]]), so a typed/bookmarked deep-link to a locked Tier-0 objective mounted the workbench on a gated objective. Added `beforeLoad` to `v3PlanStratumRoute` (`computeAllStratumStates` over `PLAN_STRATA`) and `v3PlanStratumObjectiveRoute` (`ctx.statuses[objectiveId] === 'locked'`), both redirecting to the bare `/plan` landing via the shared `buildActLockContext` helper (DEV-unlock bypass built in; the "Act" in the name is a misnomer — it reads Plan-prerequisite lock state). Redirect target differs from Act (`/plan` vs `/act/tier-shell`), noted in code comments. Closes parity gap.
- **#4 — relabel item-level defer (`6efaba7b`, `apps/web/src/v3/copy/act.ts` + `DecisionWorkingPanel.test.tsx`, +9/-3).** The workbench's item-level deferred-state label was *"Deferred — needs observation"*, colliding with Plan's objective-level "Deferred" status (left-rail card + "Restore") now on the same screen. Relabeled `ACT_COPY.workingPanel.deferDeferred` → *"On hold — needs observation"* (ASCII `--`); `deferActive`/`addLater` unchanged (neither says "Deferred"). The strings live in `v3/copy/act.ts` but are consumed only by `DecisionWorkingPanel` + the dev `ComponentsDebugPage`, so the edit is effectively Plan-scoped. Added a test assertion locking the new string + asserting no button reads "Deferred".
- **#1 — full Plan map takeover for the survey arms (`8c6144d3`, `PlanTierShell.tsx` + `plan/canvas/VisionLayoutCanvas.tsx`, +102/-4).** Supersedes the original "read-only summary, no Plan map takeover" default. Arming the `s2-ecology` vegetation or `s2-terrain` slope survey in Plan now mirrors Act's takeover: `PlanTierShell` reads the shell-agnostic `vegetationSurveyStore`/`slopeSurveyStore` (`surveyActive = open && objectiveId === 's2-ecology'`, slope pair with `'s2-terrain'`, mirroring `ActTierShell:433-447`), appends `&& !surveyActive && !slopeActive` to `showTierZeroWorkbench` (so the center yields to the editable canvas and the bottom tools tray reappears), passes the flags + `sourceObjectiveId` into `VisionLayoutCanvas`, and swaps the right rail to `VegetationSurveyPanel`/`SlopeSurveyPanel`. `VisionLayoutCanvas` gained optional `surveyActive`/`slopeActive`/`sourceObjectiveId` props (defaulted off) and mounts the four Act survey hosts (`VegetationSurvey{Layer,DrawHost}`, `SlopeSurvey{Layer,DrawHost}`) inside its private `DiagnoseMap` render-prop after `PlanDrawHost` — that render-prop is the only place the MapLibre `map` instance is in scope. Stores + survey components reused unchanged (Act components, no fork, [[feedback-no-deletion]]); the two surveys are objective-gated to distinct objectives so they can never be active simultaneously.

**Verification:** `tsc --noEmit` (apps/web, `--max-old-space-size=8192`) EXIT 0. Bounded vitest ([[feedback-vitest-bounded-runs]], `--pool=forks --poolOptions.forks.singleFork=true`): `DecisionWorkingPanel` (incl. new #4 lock) + `workbenchAffordances` green; `ActTierZeroWorkbench` **46/46** — note the combined run showed 11 failures that reproduce **only with the foreign `actToolCatalog.ts`/`objectiveActTools.ts` WIP applied** (stashing the 4 foreign files → 46/46 green), so they are NOT from this work. Live DOM probes (dev :5200, project `642169aa…`; screenshot skipped per [[project-screenshot-hang]] — but the Plan map canvas mounted without hanging here, unlike the Observe lens hang):
  - **#3:** dev-unlock OFF, cold deep-link to locked `s2-ecology` → redirected to `/plan`, workbench not mounted; unlocked `s1-vision` stays on-route + mounts. (dev-unlock restored to ON after.)
  - **#4:** Plan Tier-0 `s1-vision`, toggle item defer → button reads *"On hold -- needs observation"*; no button starts with "Deferred".
  - **#1:** Plan `s2-ecology` "Open map survey" → map canvas mounts (`canvasCount` 1), workbench hidden, `VegetationSurveyPanel` (7 community rows + draw instruction) in right rail; `s2-terrain` → `SlopeSurveyPanel` (slope-class rows); "Done" reverts to workbench (canvas gone); non-survey Tier-0 `s1-vision` still shows workbench, no map (clean gate).

Amanah: pure IA/placement move — no capital/sale/advance-purchase/financing surface; verbatim `scopeNotes` byte-untouched; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Entities [[entities/act-tier-shell]], [[entities/plan-tier-shell]].
