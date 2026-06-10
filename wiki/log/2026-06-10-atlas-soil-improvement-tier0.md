# 2026-06-10 -- SoilImprovementCapture (Phase 3d) wired into Tier-0 Act + merged to main

**Objective:** Land Phase 3d: build and wire an advisory Tier-0 `SoilImprovementCapture` for the universal `s5-soil-improvement` objective (U-S5.3), following the same advisory build-then-wire recipe as LivestockIntentCapture / GrazingSystemCapture ([[log/2026-06-10-atlas-livestock-intent-merge]], [[log/2026-06-09-atlas-grazing-capture-merge]]). Soil only this pass; food objectives deferred.

## What landed

**SoilImprovementCapture (`s5-soil-improvement`, universal U-S5.3, 5 modes)** -- an S5 system-design advisory capture answering "how will soil health be improved across all enterprise zones?". Modes c1..c5: `fertility` (per-zone program -- composting / mulching / cover cropping) / `schedule` (application rates + timing per zone) / `equipment` (machinery have/hire/buy) / `priority` (ranked first-cycle zones) / `baseline` (Year-0 monitoring indicators).

- **Universal objective => in-slice.** Unlike the silvopasture-secondary captures, `s5-soil-improvement` is `source: 'universal'`, so it resolves for the Homestead-primary vertical slice and is genuinely live-verifiable (not ecovillage-only).
- **New component, authored not cherry-picked.** `SoilImprovementCapture.tsx` (~620 lines) + `.module.css` + `.test.tsx` (13 tests). Pure/controlled: `decode(mode,value)` models each render, `onChange(encode(next))`, decode never throws/fabricates (text fields default to `""`). Advisory contract mirrors GrazingSystem/LivestockIntent: **no `projectId`, no store adapter**; passes `siblingValues` for cross-mode summary only.
- **No covenant gate.** Soil fertility carries no halal/financial gate (contrast HusbandryCapture c4). `isSoilImprovementValid` returns `true` for all 5 modes -- every mode is an always-recordable advisory input.
- **Verbatim mockup content.** All data constants (zone programmes Z1..Z5, 9-row application schedule, 5 equipment items, 4 ranked priority zones, 6 baseline indicators) transcribed byte-for-verbatim from `OLOS UI/olos_soil_fertility_programme.html` panels p1-p5. The p6-p9 orchard/silvopasture-secondary injections were OUT of base scope (universal objective). No fabricated data ([[project-slice-rescope]]).
- **6-site workbench wiring:** `ActTierShell` `TIER_ZERO_OBJECTIVE_IDS`; `ActTierZeroWorkbench` `isSoil` derivation + return field; `DecisionWorkingPanel` import + interface flag + mode decode + validity arm + summary arm + body arm (passes `siblingValues`, **no `projectId`**); `workbenchAffordances` MAP entry (advisory: no strips, `showGroups:true`); `DecisionList` MODE_LABELS (5 entries); `ComponentsDebugPage` c1..c5 gallery.

## MODE_LABELS namespace (`si-`)

Following the `li-` (livestock) / `hb-` (husbandry) precedent, the component's generic mode keys (`fertility` / `schedule` / `equipment` / `priority` / `baseline`) are namespaced **`si-`** at the affordance layer (`workbenchAffordances.modeFor` returns `si-${soilImprovementModeFor(itemId)}`), and `DecisionList` carries five matching `si-fertility` / `si-schedule` / `si-equipment` / `si-priority` / `si-baseline` labels. `DecisionWorkingPanel` routes off its own `soilImprovementModeFor` independently. This keeps the badge keys clear of the generic MODE_LABELS even though no collision exists today.

## Verification

- web `tsc --noEmit` EXIT 0 (8 GB heap, from worktree `apps/web`); `@ogden/shared` `tsc --noEmit` EXIT 0.
- The dynamic CSS-module template-literal key access (`` css[`zone_${z.tone}`] ``, `` css[`status_${e.tone}`] ``, `` css[`prio_${p.tone}`] ``) type-checks cleanly -- matches widespread existing repo precedent (BlockingIssueCard, ScoreMetric, VerdictCard, etc.); no explicit-lookup-map conversion needed.
- Bounded vitest (`--pool=forks --no-file-parallelism --testTimeout=20000`, [[feedback-vitest-bounded-runs]]): full tier-shell suite **976 tests / 43 files green**, including the 13 new `SoilImprovementCapture` tests (mode mapper c1..c5 + null, defensive decode -> `{kind, notes:''}`, lossless encode roundtrip, always-valid for all modes, non-empty summaries, and 5 render tests asserting verbatim mockup strings: "On-site thermophilic compost", "60 kg/ha", "Subsoiler / deep ripper", "non-negotiable", "Year 0 data from: soil profile survey (Tier 2)").
- **Live-preview limitation (honest):** a dedicated cold worktree dev server (`web-husbandry-wt`, port 5211) was wedged in the Vite cold-start dep-optimization reload loop across three attempts (cold + warm cache, with restarts) -- `preview_eval` timed out, console showed a perpetual `connecting...` cycle. The main-tree server rendered the same `/v3/components` route fine (47 sections), so this is the documented transient preview hang ([[project-screenshot-hang]]) isolated to the freshly-spawned worktree server, not a code fault. Sign-off rests on the 13 render unit tests (real React DOM via happy-dom) + the verbatim mockup diff, consistent with prior audit/merge precedent.

## Amanah

**CLEAN.** Soil fertility is an environmental-stewardship surface (Maqsid: Environment). No sale-channel, advance-purchase, riba/gharar, or CSRA/salam content anywhere in the authored data or copy ([[fiqh-csra-erased-2026-05-04]]). The pig working-role ruling ([[fiqh-pigs-working-role-not-meat]]) does not touch this surface.

## State

Worktree `claude/husbandry-capture` based on `origin/main` (was 0 ahead / 0 behind at start). Slice committed with explicit pathspec (6 modified wiring files + 3 new soil files + this log) and pushed to `origin/main` via `git push origin claude/husbandry-capture:main`. A `web-husbandry-wt` entry was added to the main-tree `.claude/launch.json` for future worktree preview verification (mirrors `web-forage-wt` / `web-silv-wt`); that file is in the main tree, not this slice.

## Next session

Phase 3e (water / energy / settlement) -- ecovillage batch + any in-slice objective; re-verify slice-resolution per the universal-vs-secondary lesson (silvopasture-secondary objectives do NOT resolve in the Homestead-primary slice; universal ones do). Then Phase 3f finance (`ev-s4-financial-model` + `ev-s7-financial-plan`, **Amanah-screened at kickoff**). Entity [[entities/act-tier-shell]].
