# 2026-06-10 -- LivestockIntentCapture (Phase 3c-ii) wired + merged to main

**Objective:** Land Phase 3c-ii: wire the pre-built, advisory `LivestockIntentCapture` (`silv-sec-s1-livestock-intent`, SILV-S1.20) into the Tier-0 Act workbench and merge to the canonical `main` line, following the same byte-identical-component-then-wire pattern as ForageCapture / GrazingSystemCapture ([[log/2026-06-09-atlas-forage-capture-merge]], [[log/2026-06-09-atlas-grazing-capture-merge]]).

## What landed

**LivestockIntentCapture (`silv-sec-s1-livestock-intent`, SILV-S1.20, 5 modes)** -- an S1-foundation advisory capture answering "should this site carry livestock, and how does the enterprise integrate?". Modes c1..c5: `rationale` (why livestock here) / `species` (candidate species multi-select) / `relationship` (enterprise relationship) / `capacity` (operator capacity) / `compat` (compatibility review gate).

- **Component cherry-picked byte-identical.** `LivestockIntentCapture.tsx` (806 lines) + `LivestockIntentCapture.module.css` (170) + `LivestockIntentCapture.test.tsx` (445), brought onto an `origin/main`-based worktree as add-only commit `3ab1289d` (+1421, no edits). Advisory contract mirrors `GrazingSystemCapture`, not `ForageCapture`: **no `projectId`, no store adapter**; the capture passes `siblingValues` for cross-mode summary only. `isLivestockIntentValid` gates on c5 (`compat` confirmed === true) alone; c1..c4 are always-valid advisory inputs.
- **6-site workbench wiring:** `ActTierShell` `TIER_ZERO_OBJECTIVE_IDS`; `ActTierZeroWorkbench` `isLivestockIntent` derivation + return field; `DecisionWorkingPanel` import + interface flag + mode decode + validity arm + summary arm + body arm (passes `siblingValues`, **no `projectId`**); `workbenchAffordances` MAP entry (advisory: no strips, `showGroups:true`); `DecisionList` MODE_LABELS (5 entries); `ComponentsDebugPage` c1..c5 gallery.

## MODE_LABELS collision fix (the one non-byte-identical decision)

The component's generic mode keys `species` and `capacity` **collide** with the global `DecisionList` MODE_LABELS already owned by forage (`species` -> "Species survey") and carrying-capacity (`capacity` -> "Capacity calc"). Rather than rename the component's modes (which would break byte-identity), the affordance layer **namespaces** every livestock mode `li-`: `workbenchAffordances.modeFor` returns `li-${livestockIntentModeFor(itemId)}`, and `DecisionList` carries five matching `li-rationale` / `li-species` / `li-relationship` / `li-capacity` / `li-compat` labels. Forage and carrying-capacity entries are untouched; the component stays byte-identical to the cherry-pick.

## Verification

- web `tsc` EXIT 0 (8 GB heap); `@ogden/shared` `tsc` EXIT 0 -- both via `pnpm --filter` from the worktree root.
- Bounded vitest (`--pool=forks --no-file-parallelism --testTimeout=20000`, [[feedback-vitest-bounded-runs]]): **5 suites / 154 tests green** -- `LivestockIntentCapture` (23, the cherry-picked component suite), `workbenchAffordances` (13, +1 livestock `li-` namespacing + prefix-guard describe), `ActTierZeroWorkbench` (38, +1 `isLivestockIntent` detection describe), `DecisionList` (23), `DecisionWorkingPanel` (the body-router render + c5 compat-gate additions).
- An earlier vitest run was discarded as invalid: it executed in the **main working tree** (`apps/web`), not the worktree, so it neither saw the cherry-picked component nor my wiring, and surfaced a `summariseLabour` "21 vs 20" failure that is **foreign mid-edit WIP in the main tree** (`LabourInventoryCapture` is byte-identical to `origin/main` on the worktree; the failure does not reproduce here). Re-run in the correct worktree path: clean.

## Amanah

- **CLEAN (authored/wired surface):** `RATIONALE_OPTIONS` (land-management / production / integrated) and `RELATIONSHIP_OPTIONS` (complementary / supplementary / competing) frame livestock integration in ecological + husbandry terms; the c5 gate is husbandry/site-fit, not financial. No sale-channel, advance-purchase, riba/gharar, or CSRA/salam surface ([[fiqh-csra-erased-2026-05-04]]).
- **FLAG -> RESOLVED (operator ruling, 2026-06-10):** the c2 candidate-species multi-select imports `LIVESTOCK_SPECIES` from `apps/web/src/features/livestock/speciesData.ts`, whose `SPECIES_GROUP` includes `pigs` (`khinzir`). This is pre-existing base feature data NOT authored in this slice; the wiring surfaces it. Surfaced not silently omitted ([[feedback-csa-in-catalogues]]). On review the operator **ruled `pigs` PERMITTED on-farm for functional/working roles** (e.g. land clearing, tilling, waste/forage cycling) **provided they are NOT consumed by humans for meat** -- a working-animal role, not a meat enterprise. No filter applied; `pigs` correctly remains in the c2 candidate set. The condition (no human meat consumption) is a husbandry/disposition constraint to honour in any future enterprise-output surface ([[fiqh-pigs-working-role-not-meat]]).

## State

Worktree `land/livestock-intent` based on `origin/main`: HEAD = `origin/main` + cherry-pick `3ab1289d` + the wiring commit; zero divergence (fast-forward-safe), pushed to `origin/main` via `git push origin land/livestock-intent:main`. The concurrent main-tree WIP (the Tier-1+ `ModeBadge` workstream -- `ModeBadge.tsx`, `ecovillage.ts`, `DecisionChecklist.tsx`, schema/authoring edits -- plus the `LabourInventoryCapture` mid-edit) was never staged or touched ([[feedback-no-deletion]], [[project-structured-capture-on-main]]).

While the entity page was open, the stale `**Branch:** feat/atlas-permaculture` header on [[entities/act-tier-shell]] line 4 was corrected to `main`.

## Next session

Phase 3c-iii HusbandryCapture (**Amanah copy-review gate first** -- husbandry framing must clear Scholar-style review before wiring), then 3d soil/food, 3e water/energy/settlement, 3f finance (Amanah-screened at kickoff). Carry forward the `pigs`-in-`speciesData` flag above for an operator decision. Entity [[entities/act-tier-shell]].
