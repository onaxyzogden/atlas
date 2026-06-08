# OLOS HTML Prototype → Atlas Wiring Map

**Source directory:** `C:\Users\MY OWN AXIS\Documents\OLOS UI\`
**Target codebase:** `apps/web/src/` + `packages/shared/src/`
**Status column key:** `todo` · `in-progress` · `done`

---

## ⚠️ Architecture reinterpretation (2026-06-07 — read before using this table)

This map was authored against an architecture that **no longer matches the codebase**.
A literal reading would produce ~20 throwaway bespoke `features/act/<Objective>Card.tsx`
files that duplicate and contradict the catalogue-driven system currently shipping.

What the map assumes vs. what actually exists:

| Wiring map says | Reality in `apps/web` + `packages/shared` |
|---|---|
| Create `features/act/<Objective>Card.tsx` per objective | Decisions are **catalogue data** in `packages/shared/src/constants/plan/catalogues/*.ts`, authored via `obj()` / `ck()` / `ckA()` / `ckF()` / `dg()` |
| `InterventionChecklistItem` | `PlanStratumObjective.checklist[]` (`PlanDecisionChecklistItem`) |
| `MODULE_CARDS` / `ActModuleId` per objective | `MODULE_CARDS` is keyed by 16 `UniversalDomain`s for legacy ops-log cards — unrelated |
| Extend `Badge.tsx` with 16 mode variants | Mode badges = per-decision resolvers (`boundaryModeFor`) + `MODE_LABELS` in `DecisionList.tsx`, **Tier-0 only** |
| Plan `v3/plan/modules/` slide-up cards (Batch C) | Plan lives in `v3/plan/cards/`; `DecisionChecklist.tsx` already renders the **same catalogue** read-only with an "Open in Act →" CTA |

**Decision:** the map is treated as a **content source**, not a component spec. The HTML's
decisions / hints / decision-groups / completion-gates are wired into the existing
catalogue objects. Both Plan (`DecisionChecklist`, read-only, all tiers) and Act
(Tier-0 `ActTierZeroWorkbench`; Tier-1+ `ActTierExecutionPanel`) read this catalogue
automatically — **one catalogue edit lights up every surface**.

**Ceiling for "wire Batch A":** the prototypes' rich right-panels (DSE calculator,
WHO/FAO water thresholds, zone-conflict resolver, vegetation-community recorder) are
**bespoke work surfaces** that exist **only at Tier 0** (`DecisionWorkingPanel` body-router
→ `BoundaryCapture` etc.). Batch A rows 1, 3–9 are Tier 1–3, which render through the
generic `ActTierExecutionPanel` (checklist + photo/confirm/note evidence). Bespoke
Tier-1+ calculators/recorders and Tier-1+ mode-badge rendering are a **separate
architectural workstream, explicitly deferred** (see bottom).

**Batch A outcome (gap-fill audit, 2026-06-07):** every Batch A objective was **already
encoded verbatim** in the catalogues — they were authored from the same source docs as
the HTML prototypes. **Zero content gaps; no catalogue edits required.** The "done"
status below records that the catalogue content matches the prototype, with the
target objective id given in place of the stale `features/act/*Card.tsx` path.

---

## How to use this table

For each `todo` row:
1. Read the HTML file from the source directory above.
2. Extract the items listed in the **Extract** column.
3. Locate the **target catalogue objective** (not a `features/act` card) in
   `packages/shared/src/constants/plan/catalogues/`.
4. Diff its `checklist` / `decisionGroups` / `completionGate` against the HTML; reconcile
   genuine content gaps only, via the authoring helpers in `catalogues/authoring.ts`.
5. Run `pnpm --filter @ogden/shared test` (catalogue conformance) + `npx tsc --noEmit`.
6. Mark the row `done` and commit: `feat(atlas): wire [objective-slug] decisions from HTML prototype`.

**Never paste HTML verbatim.** Extract the semantic content (decision text, badge type,
gate conditions) and express it in the catalogue (`obj`/`ck`/`dg`) pattern.

---

## Batch A — Act stage · Universal / RegenFarm objectives

| # | HTML file | Tier | Catalogue objective (target) | Audit result | Status |
|---|---|---|---|---|---|
| 1 | `olos_spatial_framework.html` | 3 | `s4-zones` (universal.ts) | 6 decisions + 2 groups + gate match (`legacyCardSectionId: plan-zone-overview`) | done |
| 2 | `olos_boundary_legal_survey.html` | 0 | `s1-boundaries` (universal.ts) | 5 decisions + 3 groups + BoundaryCapture work surface (SP1 BR1–BR9) | done |
| 3 | `olos_landscape_context.html` | 0 | `ev-s2-landscape-vectors` (ecovillage.ts) | Verbatim match; **ecovillage S2 content — reclassified to Batch B** | done |
| 4 | `olos_ecology_habitat.html` | 1 | `s2-ecology` (universal.ts) + `ORCHARD_SECONDARY_PATCHES` | 5 base decisions + 2 orchard pollinator patches (`s2-ecology-orch-1/-2`) | done |
| 5 | `olos_forage_carrying_capacity.html` | 2 | `silv-sec-s3-forage-survey` (silvopasture.ts) | 5 decisions; c3 `ckF` carrying-capacity-seasonal (DSE calc data layer) | done |
| 6 | `olos_water_systems_strategy.html` | 2 | `s4-water-strategy` (universal.ts) + orchard/silvopasture patches | 6 base (c1–c6); +orchard `…-orch-1/-2`, +silvopasture `…-silv-1/-2` | done |
| 7 | `olos_biosecurity_risk.html` | 2 | `nur-sec-s2-biosecurity-survey` (nursery.ts) | 5 decisions verbatim — **out-of-slice (nursery)** | done |
| 8 | `olos_propagation_infra.html` | 2 | `nur-sec-s1-propagation-infra-survey` (nursery.ts) | 5 decisions verbatim — **out-of-slice (nursery)** | done |
| 9 | `olos_propagation_water.html` | 2 | `nur-sec-s1-water-survey` (nursery.ts) | 5 decisions verbatim — **out-of-slice (nursery)** | done |

---

## Batch B — Act stage · Intentional Community objectives

| # | HTML file | Tier | Catalogue objective (target) | Extract | Status |
|---|---|---|---|---|---|
| 3 | `olos_landscape_context.html` | 0 | `ev-s2-landscape-vectors` (ecovillage.ts) | reclassified here from Batch A — already encoded | done |
| 10 | `olos_social_fabric_survey.html` | 0 | ecovillage.ts (social fabric) | survey decisions; founding-relationship profile; feeds Tier-3 feasibility | todo |
| 11 | `olos_legal_entity_tenure_financial.html` | 0 | ecovillage.ts (legal entity) | entity-structure + tenure-model; gate blocks Tier 1 until entity confirmed | todo |
| 12 | `olos_governance_decision_dispute.html` | 0 | ecovillage.ts (governance dispute) | decision-framework picker + dispute-resolution protocol | todo |
| 13 | `olos_governance_structure.html` | 3 | ecovillage.ts (governance structure) | governance-structure options matrix | todo |
| 14 | `olos_communal_infra_survey.html` | 2 | ecovillage.ts (communal infra survey) | infrastructure-condition survey per system | todo |
| 15 | `olos_communal_infra_strategy.html` | 4 | ecovillage.ts (communal infra strategy) | tension-map shared vs private; dep: phased settlement | todo |
| 16 | `olos_energy_systems.html` | 2 | ecovillage.ts (energy systems) | energy-source assessment matrix | todo |
| 17 | `olos_communal_provision.html` | 3 | ecovillage.ts (communal provision) | communal vs private provision balance per system | todo |
| 18 | `olos_livestock_intent.html` | 0 | livestockOperation.ts (livestock intent) | candidate species + enterprise intent; Tier-0 foundation gate | todo |
| 19 | `olos_housing_cluster_design.html` | 4 | ecovillage.ts (housing cluster) | cluster-siting + 30m watercourse setback gate; dep: spatial framework + entitlement | todo |
| 20 | `olos_food_system_design.html` | 5 | ecovillage.ts (food system) | approach selector (communal/individual/hybrid); dep: provision balance + spatial | todo |
| 21 | `olos_financial_contribution_model.html` | 6 | ecovillage.ts (financial contribution) | buy-in tier table + hardship protocol; feeds Tier-6 capital phasing — **Amanah: no advance-purchase/CSRA framing** | todo |
| 22 | `olos_phased_settlement.html` | 6 | ecovillage.ts (phased settlement) | cohort + population-ceiling + milestone-sequencing | todo |
| 23 | `olos_nursery_propagation_strategy.html` | 3 | `nur-sec-s3-propagation-strategy` (nursery.ts) | production-mix + philosophy statement — likely already encoded | todo |

---

## Batch C — Plan stage right-panel wiring (three-panel shell)

| # | HTML file | Tier | Target | Extract | Status |
|---|---|---|---|---|---|
| 24 | `olos_plan_feasible_direction.html` | 3 | `v3/plan/.../DecisionChecklist.tsx` (read-only) | decision list + gate-check display + "Open in Act" CTA — largely already satisfied | todo |
| 25 | `olos_plan_phased_settlement.html` | 6 | `DecisionChecklist` | decision list + map strip + field-actions + accordion | todo |
| 26 | `olos_plan_communal_infra.html` | 4 | `DecisionChecklist` | decision list + map strip + field-actions + accordion | todo |
| 27 | `olos_plan_community_health.html` | 5 | `DecisionChecklist` | decision list + act-tasks list + "Open in Act" CTA | todo |
| 28 | `olos_plan_infra_maintenance.html` | 5 | `DecisionChecklist` | decision list + act-tasks + maintenance gate logic | todo |

> Batch C is largely already satisfied: `DecisionChecklist.tsx` renders the catalogue
> read-only with an "Open in Act →" CTA today. Remaining work is per-row confirmation,
> not new component construction.

---

## Deferred (separate workstream — not the Batch A content pass)

- Bespoke Tier-1+ right-panel work surfaces (DSE calculator, WHO/FAO water thresholds,
  zone-conflict resolver, vegetation-community recorder) + a `DecisionWorkingPanel`-style
  router for Tier 1+.
- Tier-1+ per-decision mode-badge rendering (`MODE_LABELS` currently Tier-0 only).
- Batch B (rows 10–23, Intentional Community → `ecovillage.ts` / `livestockOperation.ts`).
- Batch C (rows 24–28) per-row confirmation against `DecisionChecklist`.

---

## Wiring conventions (catalogue-driven)

- **Decision items** → `ck('<objId>-cN', '<dt text>')` in the objective `checklist[]`.
  `dt` text → label; `df` "→ Feeds …" lines → `feedsInto` / group `observeFeeds` labels.
- **Decision groups** → `dg('<objId>-dgN', '<label>', [itemIds], [observeFeeds])`; itemIds
  must be a mutually-exclusive full partition of the checklist (conformance test enforces).
- **Upstream-captured answers** → `ckA(...)`; **formula bindings** (e.g. DSE carrying
  capacity) → `ckF(..., { formulaId, satisfiesWhenComputed, resultLabel })`.
- **Secondary-layer additions** (orchard pollinator, silvopasture livestock water) →
  `patch({ targetObjectiveId, ... })` in the type catalogue, not a new universal decision.
- **Mode badges** → per-decision resolvers + `MODE_LABELS` in `DecisionList.tsx`,
  **Tier-0 only**. Not a `Badge.tsx` variant.
- **Gate logic** → `completionGate` text on the objective; prerequisite gating via
  `STRATUM_PREREQS` (universal objective ids only) in `authoring.ts`.
- **ASCII-only copy** — em-dash → " - ", curly quotes → straight (project escaping rule).
- **Amanah** — encode CSA / sale-channel refs verbatim with a `scopeNotes` flag
  (`bayʿ mā laysa ʿindak`); never reintroduce CSRA / salam-style advance-purchase framing.
