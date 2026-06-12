# 2026-06-12 — Orchard (`orch-`/`orch-sec-`) no-path gap closure (workbench membership)

**Objective:** Close the `orch-` (34) + `orch-sec-` (10) `no-path` tier of the completion-path audit — 44 items / 8 objectives, the next priority after `ev-` — after first answering the operator's up-front question: are orchard no-path items non-spatial decisions (membership closes them) or spatial (need map/form arms)?
**Branch:** `main` ([[project-structured-capture-on-main]]). **Committed `a4197f40`** (6 files, +134/−217), not pushed; operator WIP (incl. newly-appeared `syncManifest`/`syncService`/`ActWorkPanel`/`WorkConflictSection` files) left unstaged.
**ADR:** [[decisions/2026-06-12-atlas-workbench-capture-gap-closure]] (second follow-on section). **Entity:** [[entities/shared-package]].
**Execution:** delegated to Opus 4.8 (orch render-test block) and Sonnet 4.6 (mechanical membership/drift-guard edits) sub-agents in parallel; baseline regen / bounded tests / typecheck / commit on the main thread.

## The determination (the point of this slice)

Orchards skew spatial **in vocabulary, not in mechanism**. The audit's per-item heuristic flagged ~8 items "map arm (per-item bridge)" (ev- had zero), but the flags fire on items that *reference* spatial context ("for bare or degraded zones", "on site", "in all planting zones") while the captured artifact is always a decision (`Define…`), a readiness confirmation (`Confirm… before tree arrival`), or a temporal/financial estimate — **never geometry**. Even `orch-s7-planting-establishment` (3/5 map-flagged) is a pre-planting readiness gate. Genuinely spatial orchard objectives (siting, blocks, zones) already classify `objective-map` and are not in the no-path set — the same structural fact as ev-. So: **membership alone, no map/form arms for v1**. Recorded principle: the report's "suggested capture" column is a vocabulary heuristic, not a routing decision; the catalogue read is authoritative.

## What shipped

- **Workbench membership — 8 ids** (`orch-s4-species-mix`, `orch-s4-succession-management`, `orch-sec-s4-species-pollination`, `orch-s6-adaptive-management`, `orch-sec-s6-perennial-care`, `orch-s7-financial-viability`, `orch-s7-planting-establishment`, `orch-s7-succession-plan`) appended to `TIER_ZERO_OBJECTIVE_IDS` (39 → 47) + `EXPECTED_IDS` drift guard. All 8 verified plain `ck()`, non-empty `decisionGroups`, `[]` in `objectiveActTools.ts`, no descriptor entry — preconditions identical to ev-.
- **No render-code change.** The ev- slice's generic decision-group rendering (`hasWorkbenchAffordanceEntry` + derived `showGroups`) covers these 8 automatically.
- **Render tests:** new orch describe block — `it.each` generic mount over all 8 real catalogue objectives, textarea-fallback `onRecord` (`orch-s7-planting-establishment`), divider count == `decisionGroups.length` (`orch-s7-succession-plan`). The `s1-stakeholders` zero-divider regression already pins the other side.
- **Ratchet moved:** `--write-baseline` → **`no-path` 484 → 440 (`orch-` 34 → 0, `orch-sec-` 10 → 0 — DoD met); evidence-backed 430 → 474.**

## Verification

Web 85/85 — ActTierZeroWorkbench 73 (incl. 10 new orch cases), tierZero drift guard at 47, ratchet 5/5. Shared classifier 9/9. `pnpm -r typecheck` EXIT 0 (8 GB heap).

## Deferred

- Bespoke captures (schedule/protocol captures for succession items, log/review flows, Amanah-clean financial worksheet) — pending operator mockups; capture content never invented.
- Next gap tiers: **`silv-` (21)**, then `nur-sec-` (5), `hms-` (32).

## Amanah

Classification/routing only — no capital/sale/financing surface. Three financial items (`orch-s7-financial-viability-c3/-c4`, `orch-sec-s6-perennial-care-c3`) route through the generic textarea (narrative capture). `orch-s7-financial-viability-c4` ("cash flow gap … bridge strategy required") is the tier's highest-risk capital surface — flagged ahead: any bespoke worksheet must use donation / restricted donation / qard ḥasan / in-kind / sponsorship only, no CSRA/salam/advance-purchase ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Catalogue scopeNotes left verbatim.
