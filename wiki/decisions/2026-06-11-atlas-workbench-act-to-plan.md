# 2026-06-11 — Decision workbench moves from Act to Plan (Act becomes execution-only)

**Status:** Accepted · Implemented · **Committed `2d564e1d`** (10 files incl. wiki, +336/-136) on `main`, not pushed; parallel guild/plan-data WIP left unstaged.
**Branch:** `main` ([[project-structured-capture-on-main]]).
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\the-early-tiers-stratum-objectives-mossy-turtle.md` (approved).

## Context

The interactive **decision workbench** — the ACTIVE DECISION / WORKING-ON two-pane surface with *"Record this decision"* / *"Not ready — needs more observation"* — lived in the **Act** tier shell ([[entities/act-tier-shell]]). It is `ActTierZeroWorkbench` (left `DecisionList` + right `DecisionWorkingPanel`, ~32 bespoke capture components) and it replaced the map canvas in `ActTierShell` for the 25 non-spatial **Tier-0** objectives (vision, stakeholders, terrain, climate, ecology, provision-balance, conflict-framework, etc.).

That placement was a **"Phase B"** framing — *decisions worked through in Act*, with Plan read-only. The operator reversed it, verbatim: *"transfer the decision making workspace often referred to as the 'workbench' from the Act stage to the Plan stage."* This re-aligns the IA with the canonical stage semantics ([[decisions/2026-05-30-atlas-act-tier-shell-promotion]] lineage): **Plan decides / Act executes + collects evidence.** Interactive decision recording belongs where decisions are made (Plan); Act keeps only execution + evidence.

Enabling discovery: `PlanTierShell` (shipped 2026-06-11, [[decisions/2026-06-11-atlas-plan-tier-shell-adoption]]) already imported the capture components and already had `handleFormDataSave` + the `visionForms`/`visionFormData` selectors — the stores were already the shared source of truth. Act already had `ActTierExecutionPanel`, the ready-made execution-only surface. So this was a wiring + swap job, not new construction.

## Decision

Three forks were locked by the operator before execution:

1. **Plan placement = center-canvas swap (mirror Act).** When the selected objective is Tier-0, `PlanTierShell`'s center renders `ActTierZeroWorkbench` instead of the editable `VisionLayoutCanvas` — the exact `isTierZeroObjective` pattern Act used.
2. **Act becomes execution-only.** Act no longer shows the interactive workbench for Tier-0; its center renders a full-width `ActTierExecutionPanel` (progress + read-only `AnswerRecap` of the Plan-recorded decision + evidence capture). No Record/Defer/rationale in Act.
3. **Precondition (hard):** no edits to the `apps/web/src/v3/plan/tier-shell/` folder until the operator committed its baseline. *Resolved at execution:* the folder was already committed (`56b8170b`), so the gate was satisfied and Plan-side edits proceeded.

### Implementation (3 steps)

- **Step 1 — shared predicate (new file).** `apps/web/src/v3/act/tier-shell/tierZeroObjectives.ts` exports `TIER_ZERO_OBJECTIVE_IDS` (the 25 ids, verbatim) + `isTierZeroObjective(objective)` + `isTierZeroObjectiveId(objectiveId)`. `ActTierShell` repointed to import from it; its private copies deleted. One source of truth so the two shells never drift.
- **Step 2 — Plan mounts the workbench.** `PlanTierShell.tsx`: added frozen `EMPTY_RATIONALES`/`EMPTY_DEFERRED`, the `decisionRationales`/`deferredDecisions` selectors (module-scope frozen fallbacks for Zustand v5 referential stability), `handleSaveRationale`/`handleToggleDefer` (wired to `actEvidenceStore.saveDecisionRationale`/`setDecisionDeferred`), and `showTierZeroWorkbench = isTierZeroObjectiveId(objectiveId) || isTierZeroObjective(selectedObjective)`. Center swaps to `<ActTierZeroWorkbench>` (imported from `act/tier-shell`, unchanged on disk) when the flag is set, else the editable `VisionLayoutCanvas` + `PlanPhaseTabs`. Cold-hydration guard renders `styles.tierZeroLoading` when `showTierZeroWorkbench && !selectedObjective` (no WebGL flash on cold deep-link). Bottom tools tray suppressed and `VisionFormsTabsModal` guarded out when the workbench shows.
- **Step 3 — Act execution-only.** `ActTierShell.tsx`: the `<ActTierZeroWorkbench>` canvas branch replaced with `<ActTierExecutionPanel>` in a new `.tierZeroExec` wrapper (`ActTierShell.module.css`). Dropped the now-dead `import ActTierZeroWorkbench`, the `handleSaveRationale`/`handleToggleDefer` callbacks, and the `decisionRationales`/`deferredDecisions` selectors + their frozen consts. **Kept** `handleFormDataSave`/`handleFormSave` (still serve the tools-rail `VisionFormsTabsModal` path on non-Tier-0 objectives).

**No deletion** ([[feedback-no-deletion]]): `ActTierZeroWorkbench` / `DecisionList` / `DecisionWorkingPanel` and the ~32 capture components stay on disk — now imported by Plan.

## Consequences

- **Lock asymmetry is now correct and stricter.** Plan strata genuinely lock (`computeAllStratumStates` + route `beforeLoad` guards, [[decisions/2026-06-07-atlas-act-tier-shell-beforeload-guards]]); Act never locks. Putting the workbench in Plan places Tier-0 decision recording behind prerequisite gates — a Tier-0 decision in a gated stratum can't be recorded until prerequisites complete. Removing it from Act closes the one place a Tier-0 decision could be edited outside the gate.
- **Right rail unchanged.** Plan's `ObjectiveDetailPanel` (already read-only, `hideMap`) and its embedded read-only `DecisionChecklist` coexist with the interactive center — no prop change needed.
- **Stale copy LANDED (was residual #2, done 2026-06-11):** `DecisionChecklist` is now tier-aware (shares `isTierZeroObjective` via `tierZeroObjectives.ts`). Tier-0 cards drop the Act CTA entirely (banner: *"Read-only summary — decisions are recorded in the workbench"*); spatial cards keep the deep-link, relabeled *"Open in Act →"* → *"Capture proof in Act →"* (banner: *"Read-only preview — decided in Plan, captured in Act"*). `open-in-act-trigger` testid + navigation unchanged on the spatial branch. See follow-on note in [[log/2026-06-11-atlas-workbench-act-to-plan]].
- **Locked-objective deep-link parity (residual #3):** the lock gate is on the rail click, not the route, so a URL can still mount the workbench for a locked objective (Act had the identical property). Left for parity; add a locked placeholder only if requested.

## Verification

- `tsc --noEmit` (apps/web) **EXIT 0** — catches removed dead-code refs in Act + new imports in Plan.
- Bounded vitest ([[feedback-vitest-bounded-runs]], `--pool=forks --poolOptions.forks.singleFork=true`): `ActTierZeroWorkbench.test.tsx` + `workbenchAffordances.test.ts` → **67/67 pass** (component is fully prop-driven, unchanged on disk).
- Live DOM probes (dev server :5200, project `642169aa…`; screenshot skipped — deterministic WebGL preview hang [[project-screenshot-hang]], DOM-probe fallback):
  - **Plan Tier-0** (`s1-vision`): center = 2-pane workbench (`decision-group`/`decision-item`/`mode-badge-*`, "Record this decision", "ACTIVE DECISION", "needs more observation"); **no map canvas**; tools tray (`[aria-label="Objective tools"]`) **absent**; right rail `plan-objective-detail-panel` intact.
  - **Plan non-Tier-0** (`s3-systems-baseline`): center = **map canvas present**; no workbench; tools tray **present** — clean revert.
  - **Act Tier-0** (`s1-vision`): center = `_tierZeroExec_` wrapper + `_execPanel_` (`ActTierExecutionPanel`) with progress bar + 4 evidence cards + checklist; **no workbench, no "Record this decision", no map**.

Amanah: pure IA/placement move — no capital, sale, advance-purchase, or financing surface; verbatim Amanah `scopeNotes` in the moved captures byte-untouched; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

Reverses the "Phase B" Act-decision framing. Entities [[entities/act-tier-shell]], [[entities/plan-tier-shell]]. Log: [[log/2026-06-11-atlas-workbench-act-to-plan]].
