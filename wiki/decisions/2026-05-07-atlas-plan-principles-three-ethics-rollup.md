# Atlas Plan Module 8 — Three-Ethics rollup enhancement

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 8 — Principle Verification
**Type:** Additive enhancement following the 2026-05-07 KEEP_ATLAS verdict
**Parent ADR:** [[2026-05-07-atlas-plan-principles-scholar-keep-atlas]]

## Why

The Module 8 KEEP_ATLAS verdict (filed earlier today) flagged three deferred enhancements. The first — *three-Ethics rollup wrapping the 12 principles* — is the highest-leverage of the three because it directly addresses the Scholar's core observation: *"Permaculture is fundamentally an ethically based design system"* with the three ethics at its core. Without an Ethics layer, the principle-by-principle checklist is missing the umbrella semantic the Scholar explicitly cited. The other two follow-ups (Mission Statement cross-check; missing-principle warnings + coverage matrix) remain deferred.

## What

### 1. `PERMACULTURE_ETHICS` constant + `PermacultureEthic` type

`apps/web/src/data/holmgrenPrinciples.ts` gains a new exported constant alongside `HOLMGREN_PRINCIPLES`. Each ethic carries a label, blurb, and a list of Holmgren `principleIds` assigned primarily to that ethic. A defensible simplification: each principle is mapped to one primary ethic (the actual Holmgren flower-diagram allows overlap, but a single primary mapping makes a 4 / 4 / 4-ish rollup tractable and pedagogically clean). The mapping:

- **Earth Care** — p1 (Observe), p2 (Catch & Store), p7 (Patterns to Details), p10 (Diversity), p11 (Edges)
- **People Care** — p3 (Yield), p4 (Self-Regulation), p8 (Integrate), p9 (Small & Slow)
- **Fair Share** — p5 (Renewables), p6 (No Waste), p12 (Respond to Change)

Total: 5 + 4 + 3 = 12.

### 2. New sub-tab `plan-three-ethics-rollup`

`MODULE_CARDS['principle-verification']` in `apps/web/src/v3/plan/types.ts` adds a second tab `Three Ethics`.

### 3. New card `ThreeEthicsRollupCard`

`apps/web/src/v3/plan/cards/principle-verification/ThreeEthicsRollupCard.tsx` reads `principleCheckStore.byProject[projectId]` (no new persistence) and the new `PERMACULTURE_ETHICS` constant. For each ethic it surfaces:

- the constituent principles with their per-principle status pill (Met / Partial / Unmet, sourced live from the existing checklist);
- a per-ethic running tally (`{met} met · {partial} partial · {unmet} unmet`) with a coloured pill computed as `score = (met + 0.5 × partial) / total` thresholded into Met (≥70 %) / Partial (≥30 %) / Unmet;
- a coverage hint — if an ethic has zero met principles, prompt the steward to record evidence for at least one principle below.
- ✅ **Evidence depth (added 2026-05-07)** — each per-principle row now reads `checks[pid].linkedFeatureIds.length` and renders a "· N linked" meta-chip alongside the title; each ethic section gains an "Evidence depth: N linked features across M / 4 principles" caption below the blurb. Surfaces the "performative met" failure mode (status pill set without feature evidence) without leaving the rollup view.

A top-level "Overall health" section shows the same score across all 12 principles plus met / partial / unmet running counts.

### 4. Wiring

`PlanModuleSlideUp.tsx` lazy-imports the card and adds the `case 'plan-three-ethics-rollup'` branch to `renderCard`.

## Verification

- `npm run typecheck` (with `NODE_OPTIONS=--max-old-space-size=8192`) passes for all touched files. The pre-existing `elementCatalog.ts` error from unrelated WIP Vision-Layout work is unchanged.
- No store changes — the rollup reads existing `principleCheckStore` data; legacy projects that have never opened the Holmgren checklist render correctly with all 12 principles defaulting to Unmet.

## Follow-ups still deferred

From the parent ADR:

- **Mission Statement / Goals cross-check** — needs a project-goals store first; deferred until the Observe stage's project-survey scaffolding lands.
- ✅ **Breadth radar visualisation** — landed 2026-05-07.
  `PrincipleCoverageMatrixCard` now renders a 12-spoke SVG radar
  above the matrix. Each spoke is one Holmgren principle; the radius
  is the share of feature types (typesUsed / 9) the steward has
  linked as evidence for that principle, normalised to [0, 1].
  Concentric reference rings at 0.25 / 0.5 / 0.75 / 1.0 give a
  visual scale; spoke labels show the principle number; vertices
  for non-zero values are dotted in gold so a single-type-only
  principle is visible against an empty spoke. A spiky shape
  signals lopsided design (Holmgren P4 *Apply Self-Regulation and
  Accept Feedback* — surface the imbalance the matrix hides in row
  scanning); a balanced polygon is P8 *Integrate rather than
  segregate* made visible. The matrix's per-cell heatmap intensity
  (existing `cellBg` ramp) remains the second half of the
  "radar / heatmap" pairing the parent ADR asked for. Pure render
  addition, no schema or store change.
- **Mission Statement / Goals cross-check** — still deferred (needs a project-goals store first).

Both remain on the iteration ADR's deferred-follow-up list.

## Sources cited by Scholar

Holmgren D. *Permaculture: Principles & Pathways Beyond Sustainability* (the canonical 12 + the Permaculture Flower diagram); Mollison B. *Permaculture Designer's Manual* (the 3 Ethics); OSU Permaculture Design Course final-portfolio rubric (Application / Further Applied / Lessons Learned + photo-evidence).
