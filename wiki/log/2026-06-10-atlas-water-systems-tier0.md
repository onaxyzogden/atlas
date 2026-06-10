# 2026-06-10 -- WaterSystemsCapture (Phase 3e-i) wired into Tier-0 Act

**Objective:** Build and wire an advisory Tier-0 `WaterSystemsCapture` for the universal `s4-water-strategy` objective (U-S4.2), following the same advisory build-then-wire recipe as SoilImprovementCapture ([[log/2026-06-10-atlas-soil-improvement-tier0]]). Water is the in-slice priority of the Phase 3e (water / energy / settlement) batch -- built first because, being `source: 'universal'`, it resolves for the Homestead-primary vertical slice.

## What landed

**WaterSystemsCapture (`s4-water-strategy`, universal U-S4.2, 6 modes)** -- an S4 foundation-decision advisory capture answering "how will this project collect, store, distribute, and conserve water?". Modes c1..c6: `demand` (per-enterprise + domestic demand register) / `sources` (source-option evaluation -- bore / rooftop / creek-dam / municipal, with reliability) / `strategy` (primary + backup supply strategy cards) / `storage` (storage-capacity sizing calc + gap) / `harvesting` (site harvesting approaches) / `drought` (tiered drought-response protocol).

- **Universal objective => in-slice.** Like soil and unlike the silvopasture-secondary captures, `s4-water-strategy` is `source: 'universal'`, so it resolves for the Homestead-primary slice and is genuinely live-relevant (not ecovillage-only).
- **New component, authored not cherry-picked.** `WaterSystemsCapture.tsx` + `.module.css` + `.test.tsx` (14 tests). Pure/controlled: `decode(mode,value)` models each render, `onChange(encode(next))`, decode never throws/fabricates (text fields default to `""`). Advisory contract mirrors Soil/Grazing/LivestockIntent: **no `projectId`, no store adapter**; passes `siblingValues` for cross-mode summary only (currently `void`-ed).
- **No covenant gate.** A water strategy carries no halal/financial gate. `isWaterSystemsValid` returns `true` for all 6 modes -- every mode is an always-recordable advisory input.
- **Verbatim mockup content.** All data constants transcribed byte-for-verbatim from `OLOS UI/olos_water_systems_strategy.html` base panels p1-p6: demand register (Domestic 800 / Market garden 1,500 / Nursery 320 -> 2,620 L/day base); 4 source rows (Bore 5,000 L/day High; Rooftop ~600 kL/year Seasonal; Creek/dam Variable Seasonal; Municipal Unlimited Very high); 3 strategy cards (bore-primary selected); storage sizing (peak 3,941 L/day x 60 days / 0.8 util = 295,575 L required, 150,000 existing, ~146,000 gap, "3 x 100,000 L polyethylene tanks recommended"); 4 harvesting approaches (Keyline / Swales / Rooftop selected, Dam not); 4 drought tiers (Normal / Alert / Restriction / Emergency). The p7-p10 orchard/silvopasture-secondary injections were OUT of base scope (universal objective). No fabricated data ([[project-slice-rescope]]). ASCII-only transcription (>= <= x -> m2 ~, en-dash -> "-").
- **6-site workbench wiring:** `ActTierShell` `TIER_ZERO_OBJECTIVE_IDS`; `ActTierZeroWorkbench` `isWater` derivation + return field (flows through `buildDecisionTarget` -> `DecisionPanelTarget`); `DecisionWorkingPanel` import + interface flag + mode decode + validity arm + summary arm + body arm (passes `siblingValues`, **no `projectId`**); `workbenchAffordances` MAP entry (advisory: no strips, `showGroups:true`, returns `wt-${m}`); `DecisionList` MODE_LABELS (6 entries); `ComponentsDebugPage` c1..c6 gallery.

## MODE_LABELS namespace (`wt-`)

Following the `si-` (soil) / `li-` (livestock) / `hb-` (husbandry) precedent, the component's generic mode keys (`demand` / `sources` / `strategy` / `storage` / `harvesting` / `drought`) are namespaced **`wt-`** at the affordance layer (`workbenchAffordances.modeFor` returns `wt-${waterSystemsModeFor(itemId)}`), and `DecisionList` carries six matching labels (`wt-demand` "Water demand" / `wt-sources` "Source options" / `wt-strategy` "Supply strategy" / `wt-storage` "Storage sizing" / `wt-harvesting` "Harvesting approach" / `wt-drought` "Drought protocol"). `DecisionWorkingPanel` routes off its own `waterSystemsModeFor` independently.

## Verification

- web `tsc --noEmit` EXIT 0 (8 GB heap, from worktree `apps/web`); `@ogden/shared` `tsc --noEmit` EXIT 0.
- The dynamic CSS-module template-literal key access (`` css[`rel_${s.relTone}`] ``, `` css[`drought_${t.tone}`] ``) type-checks cleanly -- matches widespread existing repo precedent.
- Bounded vitest (`--pool=forks --no-file-parallelism --testTimeout=20000`, [[feedback-vitest-bounded-runs]]): full tier-shell suite **990 tests / 44 files green**, including the 14 new `WaterSystemsCapture` tests (mode mapper c1..c6 + null/foreign-prefix, defensive decode -> `{kind, notes:''}` with no throw on garbage, lossless encode roundtrip, always-valid for all modes, non-empty summaries, and 6 render tests asserting verbatim mockup strings: "2,620 L/day", "80mm bore, submersible pump" / "High reliability", "Best balance of cost, reliability and sovereignty", "295,575 L" / "~146,000 L" / "3 x 100,000 L polyethylene tanks recommended", the four harvesting titles, and "Tier 1 - Normal" / "Dam >= 60% capacity and bore performing normally" / "Begin destocking assessment if bore failure is sustained").
- **Live-preview limitation (honest):** the running `web` preview server (port 5200) has its cwd on the **main atlas repo**, not this worktree, so it serves main's `/v3/components` gallery (no water sections) and cannot reflect the worktree edits; a dedicated worktree dev server is the documented Vite cold-start wedge ([[project-screenshot-hang]]). Sign-off rests on the 14 render unit tests (real React DOM via happy-dom) + the verbatim mockup diff, consistent with the soil and prior merge precedent.

## Amanah

**CLEAN.** A water strategy is an environmental-stewardship surface (Maqsid: Environment). No sale-channel, advance-purchase, riba/gharar, or CSRA/salam content anywhere in the authored data or copy ([[fiqh-csra-erased-2026-05-04]]). Water-sovereignty framing in the mockup ("cost, reliability and sovereignty") is operational, not a capital/sale construct.

## State

Worktree `claude/husbandry-capture`. Slice **wired + verified but NOT yet committed/pushed** (commit/push only on explicit instruction, [[project-structured-capture-on-main]]). 3 new files (`WaterSystemsCapture.tsx` / `.module.css` / `__tests__/WaterSystemsCapture.test.tsx`) + 5 modified wiring files (`ActTierShell.tsx`, `ActTierZeroWorkbench.tsx`, `DecisionWorkingPanel.tsx`, `workbenchAffordances.ts`, `DecisionList.tsx`) + `ComponentsDebugPage.tsx` + this log.

## Next session

Phase 3e-ii EnergyCapture (`ev-s3-energy-potential`, ecovillage, `en-` namespace, from `olos_energy_systems.html`) and 3e-iii SettlementCapture (`ev-s4-settlement-strategy`, ecovillage, `st-` namespace, honor habitability hard-gate scopeNotes, from `olos_phased_settlement.html`) -- both ecovillage => out-of-slice, test + verbatim-diff sign-off. Then Phase 3f finance (`ev-s4-financial-model` + `ev-s7-financial-plan`, **Amanah-screened at kickoff**). Entity [[entities/act-tier-shell]].
