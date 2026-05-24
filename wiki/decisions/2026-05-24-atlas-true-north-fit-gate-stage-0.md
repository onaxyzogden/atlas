# ADR: True North / Fit Gate — Stage 0 before Observe

**Date:** 2026-05-24
**Status:** accepted

**Context:**
Atlas dropped every new project straight into **Observe**
(`/project/$id` → `/v3/project/$id/compass`). A steward could spend hours
mapping slope, water, sectors and constraints on a property that was never
viable for their actual goal. The architecture-upgrade brief argued for a
**Stage 0 before Observe** that (1) captures the steward's intent and
non-negotiables, (2) screens the property for disqualifiers on a
Green→Yellow→Orange→Red→Black severity scale, (3) returns a
Proceed/Caution/Pause/Reject verdict, and (4) tailors Observe to the chosen
goal. Per the source doc the stage is **True North** (user-facing) /
**Fit Gate** (functional mechanic).

This was not greenfield. Intent already existed scattered: `lib/visionFit.ts`
(deterministic projectType → required GIS scores → strong/moderate/challenge),
`computeAssessmentScores` in `packages/shared`, the Plan-stage **Goal Compass**
(archetype + goal tree in `goalTreeStore`, an 11-facet **Site Profile** in
`siteProfileStore`), and the Observe **compass + center-unlock + Command Centre**
UI pattern. Stage 0 reuses/relocates these rather than rebuilding.

**Decision:**
Four locked choices (steward-confirmed):

1. **Full Stage 0** — all 8 Goal Compass segments + Green→Black disqualifiers +
   goal-tailors-Observe. Named **True North** / **Fit Gate**.
2. **Advisory soft-gate** — the Fit Gate verdict *warns*; the steward can always
   proceed (steward-sovereign, never an automated hard block — same precedent as
   the Observe→Plan soft gate [[2026-05-23-atlas-observe-data-derived-progress-gate]]
   and the livestock gate).
3. **Absorb the capture half of the Plan Goal Compass** into Stage 0; the stores
   (`goalTreeStore`, `siteProfileStore`) stay put — only the capture UI relocates.
   The generation half stays in Plan and now *reads* Stage-0-captured data.
4. **Steward-attested questionnaire + GIS scores** — segments fold in
   `computeVisionFit` GIS results for the soft factors.

Architecture (`apps/web/src/v3/true-north/`, mirrors `v3/compass/` + `command/`):

- **`trueNorthStore`** (Zustand + persist, per-project) + `data/trueNorthTypes.ts`
  — the 8-segment questionnaire. `siteProfileStore` extended with four Fit-Gate
  facets (`zoningFit`, `legalAccess`, `conservationOverlay`, `floodplainExtent`)
  via a v3 idempotent migration.
- **`fit-gate/engine/fitGate.ts`** — pure, deterministic (the `visionFit.ts`
  idiom: no AI, no side effects). Maps each segment's answers to a severity
  `green | yellow | orange | red | black`; deal-breaker answers (segment 8) can
  force `red`/`black`; folds in `computeVisionFit` GIS results; aggregates to an
  overall verdict `proceed | caution | pause | reject` (worst-severity-weighted —
  black anywhere caps at `pause`/`reject` but **never auto-blocks**). Returns
  per-segment severity + rationale + verdict + unknowns-to-confirm. Unit-tested
  (`tests/fitGate.test.ts`, 10 specs).
- **`TrueNorthCompassPage` + wheel + 8 segment panels + `FitGatePage`** — the
  Stage-0 surfaces. Routes `true-north` and `true-north/fit-gate` are full-screen
  (bypass `LandOsShell` like `compass`/`command-centre`). Default project entry
  redirect and post-create flow now land on **True North**, not Observe. A
  dismissible advisory banner on Observe entry covers the incomplete-Stage-0 case.

**Goal tailors Observe (Phase 5, additive / low-risk):**
`v3/observe/observeGoalAffinity.ts` — `getObserveModulesForGoal(archetype)`
returns a filtered/reordered subset of `OBSERVE_MODULES` per archetype.
Invariants: `topography`, `earth-water-ecology`, `swot-synthesis` are always
present; `swot-synthesis` is always last; a null archetype returns the full set
(pre-Stage-0 behavior unchanged). Wired at the two existing call sites only —
`observeCompassConfig.objectivesForArchetype` (consumed by `useCompassData`,
which reads the archetype from `goalTreeStore`) and `ModuleDashboardsPanel`.
`compassGating.ts` is goal-agnostic and auto-adapts (fewer objectives ⇒ adjusted
progress %). Verified live: homestead → 7 modules (tailored order);
conservation → 5 modules (human-context + built-environment dropped). Both the
compass wheel and the Command-Centre dashboards respond.

**Covenant constraints (held):**
- The **Financial Fit** segment introduces no CSRA / salam / advance-purchase
  framing. Capital channels stay charitable/restricted donation, qard ḥasan,
  in-kind, sponsorship; public label "capital partners & allies." Verdict copy
  is riba/gharar-free.
- The gate is advisory; the engine surfaces severity, the steward decides.

**Consequences:**
- New projects open on True North; the steward completes 8 segments + site
  profile; the Fit Gate returns an advisory Green→Black verdict; the chosen
  archetype reshapes the Observe compass and Command-Centre dashboards.
- The Plan Goal Compass still generates phases — it now reads Stage-0-captured
  `goalTreeStore` + `siteProfileStore` instead of capturing them. Downstream
  Plan consumers read the stores (not the relocated tabs), so they are
  unaffected.
- The Fit Gate engine is pure + table-driven, so retuning a severity mapping is
  a one-line edit + unit test.
- Relevant commits on `feat/atlas-permaculture`: `18403923`, `6ed79b4f`
  (Phase 4 — slim Plan Goal Compass to generation-only), `a1d2b516` (compass core
  made stage-parametric + Observe goal-affinity at the compass call sites),
  `0aa74efc` (Phase 5 — Command-Centre dashboards tailored to archetype).
