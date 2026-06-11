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

1. `s2-ecology`/`s2-terrain` survey body arms render read-only summary in Plan (no Plan map takeover) — accepted default.
2. **Stale copy:** `DecisionChecklist`'s "decisions worked through in Act" banner + "Open in Act →" CTA (`open-in-act-trigger` testid) — follow-on copy slice.
3. Locked-objective deep-link can still mount the workbench (gate is on rail click, not route; Act had the same) — left for parity.
4. Item-level Defer in Plan kept alongside Plan's objective-level deferral — coexists today.

Amanah: pure IA/placement move — no capital/sale/advance-purchase/financing surface; verbatim `scopeNotes` byte-untouched; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Entities [[entities/act-tier-shell]], [[entities/plan-tier-shell]].
