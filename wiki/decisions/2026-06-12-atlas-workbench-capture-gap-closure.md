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
