# 2026-06-09 -- GrazingSystemCapture (Phase 3c-i) landed on main

**Branch.** `main` (canonical, [[project-structured-capture-on-main]]). Merged via an isolated worktree branch `land/grazing-merge` cut from `main`, then pushed `966fe5a6..66813dbf` to `origin/main` (fast-forward; the "test" status check was bypassed as on prior merges).

## What landed

The held `GrazingSystemCapture` (`silv-sec-s4-grazing-design`) -- built unwired in the previous session -- is now wired into the Tier-0 Act workbench and on canonical `main`. Merge commit `66813dbf` (parents `7f6b3ffe` prior main + `8597d975` feature tip), `--no-ff` of three commits from `claude/silvopasture-act`:

- `479789b6` -- add the 6-mode `GrazingSystemCapture` (`silv-sec-s4-grazing-design`) capture component + CSS module + tests.
- `2adc4431` -- fold the closing-review minors.
- `8597d975` -- wire the capture into the workbench third column.

**11 files, +2351/-0** (clean additive, no deletions):
- NEW `apps/web/src/v3/act/tier-shell/GrazingSystemCapture.tsx` (1099 lines) + `GrazingSystemCapture.module.css` (432) -- exports `GrazingSystemCapture`, `grazingModeFor`, `isGrazingValid`, `summariseGrazing`, `type GrazingMode`.
- `DecisionWorkingPanel.tsx` (+30) -- one `isGrazing` flag + mode decode (`grazingModeFor`) + validity arm (`isGrazingValid`) + summary arm (`summariseGrazing`) + body-router arm rendering `<GrazingSystemCapture>` keyed on `itemId`. **No `projectId` passed** (advisory; see below).
- `ActTierZeroWorkbench.tsx` (+10) -- `isGrazing = item.id.startsWith('silv-sec-s4-grazing-design-')` detection + returned target flag.
- `ActTierShell.tsx` (+1) -- `'silv-sec-s4-grazing-design'` added to `TIER_ZERO_OBJECTIVE_IDS`.
- `DecisionList.tsx` (+7) -- 6 `MODE_LABELS` (grazingMethod / paddockLayout / grazeRest / treeProtection / contingency / stockingDensity).
- `workbenchAffordances.ts` (+15) -- `import { grazingModeFor }` + MAP entry `{ mapStrips: [], registerStrip: null, showGroups: true, modeFor }` (the Phase-2 data-driven affordance descriptor, [[decisions/2026-06-08-atlas-workbench-affordance-descriptor]]).
- `ComponentsDebugPage.tsx` (+144) -- gallery entry.
- Tests (+: GrazingSystemCapture 567, ActTierZeroWorkbench +24, workbenchAffordances +22).

## Advisory by design

`silv-sec-s4-grazing-design` is an **advisory** objective: the capture writes **no store** and takes **no `projectId`**. The `paddock-stocking-density` formula reads forage-written paddocks independently (the forage capture is the producer; grazing only annotates the design intent), so c6 carries `satisfiesWhenComputed: false` -- it never auto-completes. This is why the `DecisionWorkingPanel` grazing arm deliberately omits the `projectId` prop that store-writing captures (e.g. stakeholders) thread.

## Provenance (clean, no content lost)

Two branches carried grazing work. `GrazingSystemCapture.tsx` is **byte-identical** between `claude/forage-capture` (where it was first built unwired, `0eb12c3f`+`44ad52fe`) and `claude/silvopasture-act` (which adds the wiring). The forage-capture grazing is the **unwired predecessor and is fully superseded** by the silvopasture-act version landed here -- no unique content exists only on forage-capture, so nothing was lost by landing the silvopasture-act line. (Note: an Explore subagent mis-reported grazing as "already on main `8597d975`"; verified false against actual HEAD before merging -- `8597d975` was the feature tip, not an ancestor of main.)

## Verification (merged tree, before push)

Conflict-free confirmed via `git merge-tree --write-tree` before merging; the merge + verification ran in the isolated `land/grazing-merge` worktree to protect the main working dir's concurrent foreign WIP. On the merged tree:
- `@ogden/shared` `tsc --noEmit` -- EXIT 0.
- web `tsc --noEmit` (8GB heap) -- EXIT 0.
- bounded `--pool=forks --no-file-parallelism --testTimeout=20000` ([[feedback-vitest-bounded-runs]]) -- **152/152** green: GrazingSystemCapture 27, workbenchAffordances 11, ActTierZeroWorkbench 36, DecisionList 23, DecisionWorkingPanel 55.

A clean text merge can still break types, so the full tsc + bounded suite ran on the merged tree (not just the branch tip) before the push. Concurrent main working-tree files (`.claude/launch.json`, untracked `wiki/log/2026-06-05-mapsheet-export-server-id-aware.md`, foreign edits to `universal.ts`/`DecisionWorkingPanel.tsx`/the LabourInventory + DecisionChecklist surfaces) were never staged or touched.

## Amanah

Ecological/agronomic capture only (grazing method, paddock layout, graze/rest timing, tree protection, contingency, stocking density) -- no sale, advance-purchase, financing, or CSRA/salam surface. Clean ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

Entity [[entities/act-tier-shell]]. Predecessor session [[log/2026-06-09-atlas-forage-capture-merge]]; sibling [[log/2026-06-09-atlas-tier1plus-mode-badges]]. Phase-2 mechanism [[decisions/2026-06-08-atlas-workbench-affordance-descriptor]].
