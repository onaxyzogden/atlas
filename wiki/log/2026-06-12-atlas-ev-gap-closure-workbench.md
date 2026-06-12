# 2026-06-12 — Ecovillage (`ev-`) no-path gap closure (workbench membership + generic decision groups)

**Objective:** Close the `ev-` prefix `no-path` tier of the completion-path audit (62 items / 10 objectives) — the next priority after the universal tier — by the same workbench-membership pattern, plus a generic decision-group rendering enhancement the operator requested.
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `ae3a72be`** (8 files, +199/−298), not pushed; operator WIP (`actToolCatalog.ts`, `objectiveActTools.ts`, `DesignElementLayers.tsx`) left unstaged.
**ADR:** [[decisions/2026-06-12-atlas-workbench-capture-gap-closure]] (follow-on section). **Entity:** [[entities/shared-package]].
**Execution:** delegated to Opus 4.8 (design-sensitive `showGroups` derivation + render tests) and Sonnet 4.6 (mechanical membership/roster edits) sub-agents in parallel; verification/commit on the main thread.

## What shipped

- **Workbench membership — 10 ids.** All 62 `ev-` no-path items belong to exactly 10 objectives (`ev-s4-food-system`, `ev-s4-infra-strategy`, the four S6 protocols, the four S7 plans), every one non-spatial, plain `ck()`, `[]` in `objectiveActTools.ts`, no descriptor entry, already grouped. Spatial `ev-` objectives already classify `objective-map` — so the whole tier closes via membership alone (no map/form arms to add). Appended to `TIER_ZERO_OBJECTIVE_IDS` (29 → 39); `EXPECTED_IDS` drift guard updated.
- **Generic decision-group rendering (new vs. universal close).** `DecisionList` already renders group dividers gated only on its `showGroups` prop. The gate is now derived at the `ActTierZeroWorkbench` call site: descriptor objectives keep their authored `affordances.showGroups` (via new `hasWorkbenchAffordanceEntry(id)` predicate, `objectiveId in MAP`); non-descriptor objectives derive `activeObjective.decisionGroups.length > 0`. **Not** a blanket OR — `s1-stakeholders` has groups but is deliberately `showGroups:false` (register-strip narrative), and a blanket OR would wrongly add dividers to it. Crash-safe: `decisionGroups` always an array; `catalogues.test.ts:842` full-partition invariant prevents orphaned items.
- **Ratchet moved.** `--write-baseline` regenerated report + fixture: **`no-path` 546 → 484; `ev-` prefix 62 → 0 (DoD met); `workbench-capture` 136 → 198; evidence-backed 368 → 430.**

## Why the route is honest

Same load-bearing mechanic as the universal close: every Tier-0 item records per-item evidence (`PlanTierShell.handleFormDataSave` → `saveVisionFormData` + `setItemComplete`; `DecisionWorkingPanel` guarantees a textarea fallback keyed to the item's own label + Record button). Generic membership ⇒ a real per-item capture path.

## Verification

Web 75/75 — ActTierZeroWorkbench 63 (incl. 4 new ev- tests: `it.each` mount over 10 real catalogue objectives, textarea-fallback `onRecord(item.id)`, generic divider count == `decisionGroups.length`, `s1-stakeholders` zero-divider regression), tierZero drift guard at 39, ratchet 5/5. Shared classifier 9/9. `pnpm -r typecheck` EXIT 0 (8 GB heap).

## Deferred

- Bespoke captures for the 10 objectives (food-system worksheet, protocol/schedule captures, Amanah-clean capital worksheet) — pending operator mockups; capture content never invented.
- Next gap tier: **`orch-`**, then `silv-`, `nur-sec-`, `hms-` per the committed report.

## Amanah

Classification/routing + a render toggle only — no capital/sale/financing surface. `ev-s7-financial-plan` routed through the generic textarea (narrative decision capture, not a contribution instrument); a bespoke Amanah-clean financial worksheet stays deferred under donation / restricted donation / qard ḥasan / in-kind / sponsorship channels only, no CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Catalogue EV-S4.8 / EV-S7.5 member-contribution framing left verbatim.
