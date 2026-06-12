# 2026-06-12 — Silvopasture/Nursery/Homestead (`silv-`/`nur-sec-`/`hms-`) no-path gap closure (workbench membership) — priority list COMPLETE

**Objective:** Close the final three priority tiers of the completion-path audit in one slice — `silv-` (21) + `nur-sec-` (5) + `hms-` (32) = 58 items / 11 objectives — by the same workbench-membership pattern as universal/ev-/orch-.
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `59869ce8`** (6 files, +161/−287), not pushed; operator WIP (`objectiveActTools.ts`, `actToolCatalog.ts`, `DesignElementLayers.tsx`, untracked sync/WorkConflictSection tests) left unstaged.
**ADR:** [[decisions/2026-06-12-atlas-workbench-capture-gap-closure]] (third follow-on section). **Entity:** [[entities/shared-package]].
**Execution:** delegated to Sonnet 4.6 (membership/drift-guard edits) and Opus 4.8 (combined silv/nur/hms render-test block) sub-agents in parallel; baseline regen / bounded tests / typecheck / commit on the main thread.

## The determination

Same verdict as orch-, verified per-objective (tsx one-off against `allCatalogueObjectives()`): every no-path item captures a decision, readiness confirmation, protocol/calendar design, or estimate — never geometry. "Map" vocabulary in labels ("Map revenue timeline", "Map household food needs against the site") is temporal/analytical, not spatial. One flagged judgment call: `nur-sec-s1-water-survey` is the membership set's first **measurement/survey-flavored** objective — the generic textarea is still an honest capture for recorded test results; a bespoke log/test capture stays deferred pending operator mockups. Operator approved with no holdout.

## What shipped

- **Workbench membership — 11 ids** (`silv-s4-animal-health`, `silv-s6-animal-health-monitoring`, `silv-s7-financial-viability`, `silv-s7-livestock-establishment`, `nur-sec-s1-water-survey`, `hms-s4-energy-shelter-resilience`, `hms-s4-food-production-strategy`, `hms-s6-self-sufficiency-feedback`, `hms-s7-adaptive-management`, `hms-s7-budget-input-reduction`, `hms-s7-provision-phasing`) appended to `TIER_ZERO_OBJECTIVE_IDS` (47 → 58) + `EXPECTED_IDS` drift guard, under three tier comment blocks.
- **No render-code change** — the ev- slice's generic decision-group rendering covers all 11 automatically. `silv-s7-financial-viability-c4` already had a better-ranked path; membership never downgrades.
- **Render tests:** one combined describe block — `it.each` generic mount over all 11 real catalogue objectives, textarea-fallback `onRecord` (`silv-s7-livestock-establishment`), divider count == `decisionGroups.length` (`hms-s4-food-production-strategy`, 3 groups).
- **Ratchet moved:** `--write-baseline` → **`no-path` 440 → 382 (`silv-` 21 → 0, `nur-sec-` 5 → 0, `hms-` 32 → 0 — DoD met); evidence-backed 474 → 532.**

## Verification

Web 98/98 — ActTierZeroWorkbench 86 (incl. 13 new cases), tierZero drift guard at 58, ratchet 5/5. Shared classifier 9/9. Typecheck: 4 errors, **all in untracked operator-WIP test files** (`syncServiceWorkItemsFallback.test.ts`, `WorkConflictSection.test.tsx`) — slice files clean; WIP untouched per standing rule.

## Status: committed priority list COMPLETE

universal → `ev-` → `orch-` → `silv-` → `nur-sec-` → `hms-` all at 0. Remaining ~382 no-path is the un-prioritized tail (`ag-` 76, `ofg-` 66, `well-` 55, `edu-` 48, `con-` 44, `lvs-` 40, `mgd-` 16, `rf-` 10, `res-` 6, `lvs-sec-` 6) — **next-tier selection is a fresh operator decision**, out of scope here.

## Deferred

- Bespoke captures (water-test log capture for `nur-sec-s1-water-survey`, Amanah-clean financial worksheet, protocol/calendar captures) — pending operator mockups; capture content never invented.
- `ag-s4-revenue-model` c7–c11 (membership/season-pass instrument, Scholar Council-gated, bayʿ mā laysa ʿindak guardrails in labels) — flagged ahead for whoever picks the `ag-` tier; must NOT be closed via generic textarea without explicit Amanah review.

## Amanah

Classification/routing only. Financial items (`silv-s7-financial-viability` c1/c2/c5/c6, `hms-s6-self-sufficiency-feedback-c2`, `hms-s7-budget-input-reduction` c4/c5) route through the generic textarea (narrative estimates); any bespoke worksheet must use donation / restricted donation / qard ḥasan / in-kind / sponsorship channels only, no CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). `silv-s7-financial-viability-c3` ("first sales") is surplus/possessed-stock sale — clean per [[fiqh-surplus-sale-clean]]. Catalogue text left verbatim.
