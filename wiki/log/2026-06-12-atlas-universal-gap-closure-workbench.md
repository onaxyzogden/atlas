# 2026-06-12 — Universal no-path gap closure (workbench-capture)

**Objective:** Close the universal-prefix `no-path` tier of the completion-path audit (23 items / 4 objectives) using `--write-baseline` to ratchet the count down.
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `329c7da4`** (10 files, +310/−675), not pushed; operator WIP (`actToolCatalog.ts`, `objectiveActTools.ts`, `DesignElementLayers.tsx`, new `WorkCalendarTakeover.tsx`) left unstaged.
**ADR:** [[decisions/2026-06-12-atlas-workbench-capture-gap-closure]].

## What shipped

- **Phase 1 — classifier learns the workbench route.** Shared `objectiveCompletionPaths.ts` gains a `workbench-capture` class (evidence-backed; ranked below `form-capture`, above objective-level arms) driven by an injected `workbenchObjectiveIds: ReadonlySet<string>` (`ClassifyOptions`), because the membership set lives in the app layer. The ratchet test and `scripts/audit-checklist-completion-paths.ts` inject `TIER_ZERO_OBJECTIVE_IDS`; the report's `CLASS_ORDER` + evidence-backed column updated. 2 new unit tests (membership ⇒ workbench-capture for bare items; form arm outranks membership, objective-level arms don't, auto-* outranks all) — shared suite 9/9.
- **Phase 2 — 3 objectives routed.** `s4-direction`, `s7-phase1`, `s7-resource-plan` appended to `TIER_ZERO_OBJECTIVE_IDS` (26 → 29); roster pin updated. New `ActTierZeroWorkbench.test.tsx` describe: each of the 3 REAL catalogue objectives (looked up via `allCatalogueObjectives()`) mounts the generic 2-pane workbench (no strips, item label heading), and on `s4-direction` typing into the per-item textarea fallback enables Record, which fires `onRecord('s4-direction-c1', …)` — web suite 57/57.
- **Phase 3 — ratchet moved.** `--write-baseline` regenerated report + fixture: **no-path 610 → 546; universal 23 → 0; `workbench-capture` 136; evidence-backed 232 → 368** (other Tier-0 objectives' items flipped too — honest reclassification, accepted). Ratchet 5/5; full `pnpm -r typecheck` EXIT 0 (8 GB heap).

## Why the route is honest

Every item of a Tier-0 objective records per-item evidence mechanically: `PlanTierShell.handleFormDataSave` → `saveVisionFormData` + `setItemComplete`, and `DecisionWorkingPanel` guarantees at minimum a textarea + Record for unrouted items. The 7 `s1-boundaries` no-path items were *already* covered this way (classifier blindness, not an app gap); the 16 others are non-spatial decision items the generic capture genuinely serves.

## Deferred

- Bespoke captures for the 3 objectives (direction classifier, phasing worksheet, Amanah-clean capital worksheet for `s7-resource-plan-c4`) — pending operator mockups; never invent capture content.
- Next gap tier: **`ev-` (62 no-path)**, then `orch-`, `silv-`, `nur-sec-`, `hms-` per the committed report.
