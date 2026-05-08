# Atlas Plan Stage — 8-Module Permaculture Scholar Iteration

**Date:** 2026-05-07
**Stage:** Atlas / Plan (all 8 modules)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`)
**Branch:** `feat/atlas-permaculture`

## Purpose

Run every Plan-stage module through the Permaculture Scholar to determine, per module, whether (a) the existing Atlas card stays, (b) the OGDEN prototype's counterpart should be ported, or (c) a fresh design is needed. The goal: Plan-stage cards that are *permaculturally orthodox* by external authority, not by author intuition.

Per-module verdicts and follow-ups live in 8 sibling ADRs (one per module, all dated 2026-05-07). This ADR is the iteration's index + retrospective.

## Verdicts at a glance

| # | Module | Verdict | Code change | Detail ADR |
|---|---|---|---|---|
| 1 | Plant systems | **BUILD_FRESH** | New cards (canopy / guild / database) ported from OGDEN with Scholar guidance | `2026-05-07-atlas-plan-plants-scholar-build-fresh.md` |
| 2 | Water management | **BUILD_FRESH (scope b)** | New cards (runoff / swale / storage) re-grounded in Capture-Slow-Spread-Sink-Store hierarchy | `2026-05-07-atlas-plan-water-scholar-build-fresh.md` |
| 3 | Zones & circulation | **BUILD_FRESH (additive)** | New `ZoneCirculationOverviewCard` (SVG mini-map + bbox-overlap validation); legacy zone/path cards retained as data entry | `2026-05-07-atlas-plan-zones-scholar-build-fresh.md` |
| 4 | Dynamic layering | **BUILD_FRESH (additive)** | New `PermanenceLadderCard` (9-rank Yeomans bars + ordering-violation checks); legacy `PermanenceScalesCard` retained | `2026-05-07-atlas-plan-layering-scholar-build-fresh.md` |
| 5 | Soil fertility | **BUILD_FRESH (additive)** | New `SoilBaselineCard` (USDA texture-triangle + limiting-factor remedies) + `ClosedLoopGraphCard` (ring-layout SVG + Holmgren P6 validations); legacy soil cards retained as data entry | `2026-05-07-atlas-plan-soil-scholar-build-fresh.md` |
| 6 | Cross-section & solar geometry | **KEEP_ATLAS** | None — Atlas's `TransectVerticalEditorCard` already meets OSU PDC Assignment 15 | `2026-05-07-atlas-plan-cross-section-scholar-keep-atlas.md` |
| 7 | Phasing & budgeting | **KEEP_ATLAS** | None — Atlas's three-card phasing module already mirrors the OSU PDC Pro 5-year × 4-season template | `2026-05-07-atlas-plan-phasing-scholar-keep-atlas.md` |
| 8 | Principle verification | **KEEP_ATLAS** | None — Atlas's `HolmgrenChecklistCard` already mirrors the OSU PDC final-portfolio reflective rubric | `2026-05-07-atlas-plan-principles-scholar-keep-atlas.md` |

**Tally:** 5 BUILD_FRESH (3 additive, 2 net-new), 3 KEEP_ATLAS, 0 PORT_OGDEN.

The original plan anticipated several PORT_OGDEN verdicts — none materialised. In every module where OGDEN had a candidate, the Scholar either (a) found Atlas's existing framing more orthodox (Modules 3, 6) or (b) demanded a fresh additive build because *both* Atlas and OGDEN were missing the orthodox visualisation/validation layer (Modules 1, 2, 4, 5).

## Pattern observations

1. **Atlas's data models held up well.** In every "additive build" verdict (3, 4, 5), the existing Zustand stores were sufficient — the new cards are *visualisation/validation surfaces over the same data*. Only Module 5 introduced new ephemeral derived state (soil-baseline texture/limits), and even there the closed-loop graph reads exclusively from existing stores.
2. **Scholar consistently rejected automated/algorithmic verification** where contextual reflection is the orthodox mechanic (Module 8 explicitly: P6 "must have ≥1 closed-loop edge" cross-checks "run counter to the contextual, observation-heavy nature of permaculture"). Validations that *did* survive were geometric/structural (Module 3 bbox-overlap, Module 4 prerequisite-empty, Module 5 orphan-fertility) rather than semantic.
3. **OGDEN's strongest contributions were visual richness.** Where Atlas was thin on visualisation (Plants, Water), OGDEN's pages were ported wholesale. Where Atlas already had sophisticated visualisation (Cross-section's solstice-altitude overlay, Phasing's matrix), OGDEN had nothing competitive.
4. **Yeomans Keyline appears in three modules but means different things.** Module 4 = ladder of 9 ranks; Module 7 = chronological sequencing on `PhaseTask`; Module 8 explicitly *rejects* it as a verification rubric. Cross-referencing these three ADRs is necessary when adding any Keyline-derived feature.

## Follow-up tickets logged across the 8 ADRs

Each KEEP_ATLAS / additive-build ADR ends with deferred enhancements; the iteration deliberately did not implement them in-loop to keep verdict-vs-implementation separable. Aggregated:

**Module 3 — Zones:** integrate movement-frequency heatmap once sensor data exists; subdivide-by-paddock module.

**Module 4 — Layering:** wire ordering-violation warnings to actually link to the offending feature in the map; integrate Sector Compass entries as an additional Scale-of-Permanence row.

**Module 5 — Soil:** persist `SoilBaseline` to a store; add resource-inventory tab; add chronological soil-building plan row.

**Module 6 — Cross-section:** microclimate bracket labels; succession-stage bands; explicit slope-% annotations; sector-response (wind/flow deflection) callouts.

**Module 7 — Phasing:** optional `designLayer` / `scaleOfPermanence` enum on `PhaseTask` (Earthworks/Water/Vegetation/Structures) + matrix regrouping; capacity-validation against Client Survey baselines (weekly hrs, annual budget); cumulative investment rollups (Yearly Running Total + 5-Year Total).

**Module 8 — Principles:** three-Ethics rollup wrapping the 12 (Earth Care / People Care / Fair Share); Mission Statement / goals cross-check at the top of the verification screen; missing-principle warnings + feature-type coverage matrix (radar / heatmap).

**Cross-cutting:** wire ported OGDEN cards (Modules 1, 2) to real Zustand stores — currently still operating on mock inputs per the original plan's "visual-first port" cadence.

## Verification across the iteration

- Per-module: typecheck (`npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=8192`) clean after each additive build (Modules 1–5). KEEP_ATLAS modules (6–8) required no code change so no per-module typecheck cycle.
- Each module shipped as a discrete commit on `feat/atlas-permaculture` (see `git log` 706d0ca → 3efaec7); branch sequence is replayable in verdict order.
- Each module has its own ADR + log entry + index entry. The 8 ADRs are listed under [Decisions] in `wiki/index.md`.

## Sources cited across the iteration

OSU Permaculture Design Course (Andrew Millison) — Assignments 7 (Plant Systems), 15 (Cross-section), the Pro Phasing Plan template, the final-portfolio reflective rubric (Application / Further Applied / Lessons Learned). Holmgren D. *Permaculture: Principles & Pathways Beyond Sustainability* (the canonical 12 — Module 8 backbone; P6 Produce No Waste — Module 5; P8 Integrate rather than Segregate — multiple). Mollison B. *Permaculture Designer's Manual* (Z0–Z5 zone ladder — Module 3; 3 Ethics — Module 8; sector + zone integration — Module 6). Yeomans *The Keyline Plan* (9-rank Scale of Permanence — Module 4; chronological sequencing for `PhaseTask` — Module 7). USDA Soil Texture Triangle (12 classes — Module 5). Lawton G. (capture-slow-spread-sink-store hydrology hierarchy — Module 2).
