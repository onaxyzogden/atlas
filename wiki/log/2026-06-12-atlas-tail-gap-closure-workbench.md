# 2026-06-12 — Un-prioritized tail (`ag-`/`ofg-`/`well-`/`edu-`/`con-`/`lvs-`/`mgd-`/`rf-`/`res-`) no-path gap closure — AUDIT AT 0

**Objective:** Close the entire remaining no-path tail of the completion-path audit — 382 items / 68 objectives across 10 prefixes — in one slice via workbench membership, completing the audit's gap-closure arc.
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `8bb95559`** (6 files, +667/−1826), not pushed; operator WIP (`objectiveActTools.ts`, `actToolCatalog.ts`, `DesignElementLayers.tsx`, untracked sync/WorkConflictSection tests) left unstaged.
**ADR:** [[decisions/2026-06-12-atlas-workbench-capture-gap-closure]] (fourth follow-on section). **Entity:** [[entities/shared-package]].
**Execution:** Sonnet 4.6 (membership/drift-guard, 58 → 126) and Opus 4.8 (tail render-test block) sub-agents in parallel on disjoint files; Step-0 precondition script / baseline regen / bounded tests / typecheck / commit on the main thread.

## Operator rulings (the explicit Amanah review)

Two AskUserQuestion rulings this session: **(1) entire tail in one slice** (not tier-by-tier); **(2) include both fiqh-flagged objectives — `ag-s4-revenue-model` (c7–c11 Scholar Council-gated membership/season-pass guardrails) and `lvs-s7-marketing` (c3 herd-share/CSA flag) — with catalogue guardrails verbatim.** The c7–c11 items *are* the guardrails (c7 default-none, c8 membership-benefit not nights-purchase, c9 delivered-not-prepaid per MGD CSA guardrail, c10 carrying-capacity bound, c11 mandatory Scholar Council routing); the textarea records decisions against them, it does not create or sell an instrument. The c11 label is pinned verbatim by render test. Catalogue text byte-untouched.

## The determination

Step-0 tsx verification against `allCatalogueObjectives()`: all 68 exist, **all plain `ck()` — zero special-kind items** (the Explore-stage `ckF` claim for lvs- was wrong), all with non-empty `decisionGroups` (2–4), none in `workbenchAffordances.ts`. Fifth consecutive tier where "map arm" report vocabulary dissolved on catalogue read. Survey-flavored members (`res-s1-household-needs`, `ag-s2-seasonal-patterns`) covered by the [[2026-06-12-atlas-silv-nur-hms-gap-closure-workbench|water-survey precedent]].

## What shipped

- 68 ids → `TIER_ZERO_OBJECTIVE_IDS` (58 → 126) + `EXPECTED_IDS`, ten tier comment blocks; **no render-code change**.
- Tail render-test block: `it.each` mount ×68, textarea `onRecord` (`res-s1-household-needs`), divider assertion + c11 Amanah pin (`ag-s4-revenue-model`).
- **New rendering fact:** `DecisionList` emits dividers at group-label *transitions* in checklist order; `ag-s4-revenue-model`'s 4 groups are non-contiguous → 6 dividers. The test computes transitions dynamically; prior divider tests used contiguous-group objectives where transitions == group count.
- **Ratchet:** `--write-baseline` → **`no-path` 382 → 0; evidence-backed 532 → 914; ALL prefixes at 0 — the audit's gap-closure arc is COMPLETE.**

## Verification

Web 168/168 (ActTierZeroWorkbench incl. 70 new cases, drift guard at 126, ratchet 5/5); shared classifier 9/9. Typecheck: same 4 pre-existing errors, all in untracked operator-WIP test files — slice files clean.

## Status & deferred

Every in-app checklist item now has a completion path. Remaining work on this front is **bespoke captures only** (Amanah-clean financial worksheet, protocol/calendar captures, water-test log) — pending operator mockups; capture content never invented. Any future membership/season-pass instrument for agritourism goes through Scholar Council per c11; no CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).
