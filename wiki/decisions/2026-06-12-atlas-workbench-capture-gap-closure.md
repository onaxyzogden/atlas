# 2026-06-12 — Universal gap closure via `workbench-capture` classification + workbench routing

**Status:** Accepted · Implemented · Committed `329c7da4` on `main`, not pushed.
**Follows:** [[decisions/2026-06-11-atlas-completion-path-audit-ratchet]] (the audit this closes the first tier of) and [[decisions/2026-06-11-atlas-workbench-act-to-plan]] (the workbench mechanics relied on).

## Context

The 2026-06-11 audit pinned 610 `no-path` items, 23 of them **universal-prefix** across 4 objectives: `s1-boundaries` c1–c7, `s4-direction` c1–c6, `s7-phase1` c1–c5, `s7-resource-plan` c1–c5. Operator: "begin gap closure with the universal-prefix no-path items (largest shared payoff across all four of your project types), using `--write-baseline` to ratchet the count down as captures land."

Investigation split the 23 into two distinct problems:

1. **7 already solved, classifier blind** — `s1-boundaries` is a Tier-0 workbench objective with a full boundary capture, but `objectiveActTools.ts` maps it to `[]`, so the arm-based classifier saw nothing. The gap was in the *classifier*, not the app.
2. **16 genuinely unrouted** — `s4-direction`, `s7-phase1`, `s7-resource-plan` had neither tools nor workbench membership. All three are non-spatial decision objectives (strategic direction, phasing, resourcing) — exactly the shape the Tier-0 workbench exists for.

**Load-bearing fact** (verified in code): every item of every Tier-0 workbench objective is per-item evidence-backed. `PlanTierShell.handleFormDataSave` calls `saveVisionFormData` + `setItemComplete` per item, and `DecisionWorkingPanel`'s body router guarantees at minimum a textarea fallback + Record button for any item with no bespoke arm and no matching form fields. So workbench membership ⇒ a real per-item capture path, mechanically.

## Decision

1. **New `workbench-capture` classification** in the shared classifier (`objectiveCompletionPaths.ts`), ranked `auto-answer → auto-formula → form-capture → workbench-capture → objective-map/log/flow → no-path` (a matching form arm is the sharper signal, so it outranks membership). Counted **evidence-backed** (`EVIDENCE_BACKED_CLASSES`), justified by the load-bearing fact above.
2. **Injected membership** — `ClassifyOptions.workbenchObjectiveIds?: ReadonlySet<string>`. The set lives in the app layer (`tierZeroObjectives.ts`), same layering reason as the injected arm index; the ratchet test and the report script both inject `TIER_ZERO_OBJECTIVE_IDS`. Omitted ⇒ prior behaviour (hermetic fixtures unaffected).
3. **Route the 3 unrouted objectives through the workbench** — `s4-direction`, `s7-phase1`, `s7-resource-plan` appended to `TIER_ZERO_OBJECTIVE_IDS` (26 → 29). No descriptor entries: `workbenchAffordancesFor` returns `EMPTY_AFFORDANCES`, so they get the generic 2-pane workbench with the textarea fallback. **The generic capture is the honest v1**; bespoke captures (direction classifier, phasing worksheet, Amanah-clean capital worksheet for `s7-resource-plan-c4`) are deferred pending **operator-provided mockups** — capture content is never invented ([[project-slice-rescope]]).
4. **Baseline regenerated** via `--write-baseline` (the only sanctioned ratchet move).

## The numbers (2026-06-12 baseline)

- **`no-path`: 610 → 546** (universal prefix **23 → 0** — Definition of Done met).
- **`workbench-capture`: 136 items** (6.7%) — evidence-backed total 232 → 368. The 64-item no-path reduction exceeds the 23 universal because items of *other* Tier-0 objectives (`ev-`, `silv-sec-`, `nur-sec-`, …) also flipped; some `objective-map` items reclassified too (1187 → 1115 objective-level-only). Honest improvement, not churn.
- Next priority tier per the committed report: **`ev-` (62 no-path)** → `orch-` (34+10) → `silv-` (21) → `nur-sec-` (5) → `hms-` (32).

## Consequences

- Adding an objective to `TIER_ZERO_OBJECTIVE_IDS` now *automatically* closes its items' no-path gaps in the audit — membership is the cheapest honest closure for non-spatial decision objectives. Spatial objectives should still get map/form arms, not workbench membership.
- `s1-boundaries`'s `objectiveActTools.ts` `[]` mapping stays (operator-WIP file; and the workbench route now covers it anyway).
- Render tests pin that all 3 newly-routed objectives mount the generic workbench and that the textarea fallback fires `onRecord` with the item id (`ActTierZeroWorkbench.test.tsx`).

## Amanah

Classification/routing only — no capital, sale, or financing surface. The deferred `s7-resource-plan-c4` capital worksheet is flagged ahead of time: it must be designed Amanah-clean (donation / restricted donation / qard ḥasan / in-kind / sponsorship channels only, no CSRA/salam — [[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

---

## Follow-on 2026-06-12 — `ev-` tier closed + generic decision-group rendering (commit `ae3a72be`)

The same pattern was applied to the **next priority tier, `ev-` (62 no-path)**. All 62 items belong to exactly **10 objectives** — `ev-s4-food-system`, `ev-s4-infra-strategy`, the four S6 protocols (`coordination-feedback`, `external-relations`, `maintenance-protocol`, `social-monitoring`), and the four S7 plans (`financial-plan`, `launch-sequence`, `onboarding`, `settlement-plan`). Every one is **non-spatial, plain `ck()`, `[]` in `objectiveActTools.ts`, no descriptor entry, and already carries non-empty `decisionGroups`**. The spatial `ev-` objectives already classify `objective-map` (not `no-path`), so this tier closed via **workbench membership alone** — no map/form arms to add. The 10 ids were appended to `TIER_ZERO_OBJECTIVE_IDS` (29 → 39).

**New decision — generic decision-group rendering.** Operator asked that the generic 2-pane workbench render decision-group dividers for *any* grouped objective, not only descriptor objectives. `DecisionList` already reads `objective.decisionGroups` and renders dividers; the only gate was its `showGroups` prop, sourced solely from `affordances.showGroups` (always `false` for `EMPTY_AFFORDANCES` objectives). The fix derives the gate at the `ActTierZeroWorkbench` call site:

```ts
const showGroups = hasWorkbenchAffordanceEntry(activeObjective.id)
  ? affordances.showGroups                      // descriptor objectives keep their authored boolean
  : activeObjective.decisionGroups.length > 0;  // non-descriptor objectives derive from group presence
```

A new `hasWorkbenchAffordanceEntry(id)` predicate (`objectiveId in MAP`) distinguishes the two. **Why not a blanket `affordances.showGroups || groups.length>0`:** `s1-stakeholders` has non-empty `decisionGroups` but is authored `showGroups: false` on purpose (it uses a register-strip narrative, not dividers) — a blanket OR would wrongly add dividers to it. Crash-safety is guaranteed: `decisionGroups` is always an array (defaulted in `stratumObjectives.ts`), and `catalogues.test.ts:842`'s full-partition invariant means a grouped objective can never orphan an item. Render tests pin both the generic divider rendering (count == `decisionGroups.length`) and the `s1-stakeholders` flat-rendering regression.

**Numbers (2026-06-12 ev- baseline):** `no-path` **546 → 484** (`ev-` prefix **62 → 0**); `workbench-capture` **136 → 198**; evidence-backed **368 → 430**. Web suites 75/75 (ActTierZeroWorkbench 63 inc. 4 new ev- tests; tierZero drift guard at 39; ratchet), shared classifier 9/9, `pnpm -r typecheck` EXIT 0. `ev-s7-financial-plan` routed through the generic textarea (narrative capture, not a contribution instrument); the bespoke Amanah-clean financial worksheet stays deferred under the same channel constraints above. **Next tier: `orch-`.**

---

## Follow-on 2026-06-12 — `orch-`/`orch-sec-` tier closed (commit `a4197f40`)

The next priority tier, **`orch-` 34 + `orch-sec-` 10 = 44 no-path items across 8 objectives**, closed the same way — but only after an up-front spatial-vs-non-spatial determination the operator explicitly requested ("orchards skew more spatial than ecovillage governance did").

**The determination.** The skew is real **in vocabulary but not in mechanism**: the audit's per-item heuristic flagged ~8 orch items as "map arm (per-item bridge)" (ev- had zero), but those flags fire on items that *reference* spatial context ("pioneer species for bare or degraded zones", "self-fertile on site", "soil improvement complete in all planting zones") while the captured artifact is always a **decision (`Define…`), readiness confirmation (`Confirm… before tree arrival`), or temporal/financial estimate** — never geometry. Even the most spatial-flavored objective, `orch-s7-planting-establishment` (3/5 items map-flagged), is a pre-planting readiness gate. The genuinely spatial orchard objectives (siting, block layout, zones) are not in the no-path set — they already classify `objective-map`, the same structural fact that held in ev-. **Conclusion: membership alone closes the tier; no map/form arms for v1.** The audit's "suggested capture" column is a vocabulary heuristic, not a routing decision — the catalogue read is authoritative.

**What shipped.** The 8 ids (`orch-s4-species-mix`, `orch-s4-succession-management`, `orch-sec-s4-species-pollination`, `orch-s6-adaptive-management`, `orch-sec-s6-perennial-care`, `orch-s7-financial-viability`, `orch-s7-planting-establishment`, `orch-s7-succession-plan`) appended to `TIER_ZERO_OBJECTIVE_IDS` (39 → 47) + `EXPECTED_IDS`. All 8 verified plain `ck()`, non-empty `decisionGroups`, `[]` in `objectiveActTools.ts`, no descriptor entry. **No render-code change** — the generic decision-group rendering from the ev- follow-on applies automatically. New orch render tests: 8-id generic mount, textarea `onRecord` (`orch-s7-planting-establishment`), divider count == `decisionGroups.length` (`orch-s7-succession-plan`).

**Numbers (2026-06-12 orch baseline):** `no-path` **484 → 440** (`orch-` **34 → 0**, `orch-sec-` **10 → 0**); evidence-backed **430 → 474**. Web 85/85 (ActTierZeroWorkbench 73; drift guard at 47; ratchet 5/5), shared classifier 9/9, typecheck EXIT 0.

**Amanah.** Three financial items (`orch-s7-financial-viability-c3/-c4`, `orch-sec-s6-perennial-care-c3`) route through the generic textarea (narrative capture). `-c4`'s "cash flow gap … bridge strategy required" is the highest-risk capital surface in the tier — flagged ahead: any bespoke worksheet must use donation / restricted donation / qard ḥasan / in-kind / sponsorship channels only, no CSRA/salam/advance-purchase ([[fiqh-csra-erased-2026-05-04]]). **Next tier: `silv-` (21), then `nur-sec-` (5), `hms-` (32).**
