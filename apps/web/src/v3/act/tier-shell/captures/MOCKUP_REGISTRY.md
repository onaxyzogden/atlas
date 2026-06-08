# Mockup Triage Registry

> **Task 0.1 deliverable** (see plan `launch-selected-element-…shore.md`). Authoritative
> mapping of the 49 HTML mockups in `C:\Users\MY OWN AXIS\Documents\OLOS UI` to workbench
> third-column captures. Classifies each file as **Phase-1 (S1)**, **Phase-3+ (S2–S7)**, or
> **Deferred (not third-column / objective absent)**. Source-of-truth for Phases 1–3.

## Legend

- **Arm** — the `DecisionWorkingPanel` router arm that owns the panel: an existing capture to
  re-skin, `VisionFormFields` (structured `fields`), or a **NEW** capture to build.
- **Action** — `Re-skin` (existing capture exists), `Build` (new capture), `Defer`.
- **Amanah** — ⚠ flags panels touching capital/finance/cultural copy requiring the
  `bayʿ mā laysa ʿindak` / riba / gharar / verbatim-transcription review per CLAUDE.md
  **before** that panel's phase begins.
- **Control primitives** — the Phase-0 `captures/controls/` components the panel composes from.

---

## Phase 1 — Tier-0 / S1 (objectives already in `TIER_ZERO_OBJECTIVE_IDS`)

These objectives are already routed into the workbench. Phase 1 is **capture re-skin / build only** —
no `TIER_ZERO_OBJECTIVE_IDS` change needed.

| # | Mockup | Objective / item id | Arm | Action | Control primitives | Amanah |
|---|---|---|---|---|---|---|
| 1 | `olos_primary_purpose_panel.html` | `s1-vision` / c1 | `VisionFormFields` → maybe new `PurposeCapture` | Re-skin | ChoiceCardGrid (type), InterpretationBlock, textarea | |
| 2 | `olos_act_tier0_prescribed_options.html` | `s1-vision` / c2 | `SuccessCriteriaCapture` | Re-skin | ChipSelect, RegisterList (numbered criteria) | |
| 3 | `olos_constraints_decision_surface.html` | `s1-vision` / constraints | `VisionFormFields` → new `ConstraintsCapture` | Build | ChipSelect (tabbed register), StatusPill (severity) | |
| 4 | `olos_assumptions_panel.html` | `s1-vision` / assumptions | `VisionFormFields` → new `AssumptionsCapture` | Build | RegisterList (category-badged), ChipSelect | |
| 5 | `olos_labour_inventory_decision.html` | `s1-vision` / labour | `LabourInventoryCapture` | Re-skin | ChoiceCardGrid (who), Stepper (hours), BarChartStrip (rhythm), ChipSelect (skills) | |
| 6 | `olos_stewards_decision_surface.html` | `s1-vision` / steward | `StewardCapture` | Re-skin | ChoiceCardGrid (role), RegisterList (invite form) | |
| 7 | `olos_vision_classify_decision.html` | `s1-vision` / classify | `VisionClassifyCapture` | Re-skin | ChoiceCardGrid (suggestion/committed/aspirational columns) | |
| 8 | `olos_boundary_legal_survey.html` | `s1-boundaries` / register, RoW, tenancy | `BoundaryCapture` (`boundaryModeFor`) | Re-skin | RegisterList, ChipSelect (tenure), StatusPill | |
| 9 | `olos_boundaries_legal_mixed_surface.html` | `s1-boundaries` / title tri-state gate, history | `BoundaryCapture` (`boundaryModeFor`) | Re-skin | RegisterList, ChoiceCardGrid (tri-state), gate-note | |
| 10 | `olos_stakeholders_mixed_surface.html` | `s1-stakeholders` / neighbours, authorities, annotate | `StakeholderCapture` (`stakeholderModeFor`) | Re-skin | RegisterList, MapStrip affordance, ChipSelect | |
| 11 | `olos_social_fabric_survey.html` | `s1-stakeholders` / cultural cards | `StakeholderCapture` (`stakeholderModeFor`) | Re-skin | ChoiceCardGrid (CULTURAL_STATUSES — **verbatim copy**) | ⚠ cultural copy |
| 12 | `olos_legal_entity_tenure_financial.html` | `ev-s1-legal-governance` / entity, tenure | `EvLegalGovernanceCapture` (`legalGovernanceModeFor`) | Re-skin | ChoiceCardGrid (entity type), ChipSelect (tenure), AmountRow | ⚠ finance |
| 13 | `olos_governance_structure.html` | `ev-s1-legal-governance` / governance model | `EvLegalGovernanceCapture` (`legalGovernanceModeFor`) | Re-skin | ChoiceCardGrid (governance model) | |
| 14 | `olos_governance_decision_dispute.html` | `ev-s1-legal-governance` / dispute, c7 advice gate | `EvLegalGovernanceCapture` (`legalGovernanceModeFor`) | Re-skin | EscalationLadder, gate-note (c7 hard advice gate) | |

### Phase-1 boundary cases (verify objective tier during Phase 1 kickoff)

`ev-s1-provision-balance` and `ev-s1-conflict-framework` exist in the catalogue but are **NOT** in
`TIER_ZERO_OBJECTIVE_IDS`. If their mockups (below) are pulled into Phase 1, their ids must be added
to the set as the final Phase-1 task (exactly as Phase 2 does for S2–S7). Otherwise move to Phase 3.

| # | Mockup | Objective / item id | Arm | Action | Control primitives | Amanah |
|---|---|---|---|---|---|---|
| 15 | `olos_communal_private_provision.html` | `ev-s1-provision-balance` | new `ProvisionBalanceCapture` | Build | ChoiceCardGrid (communal/private split), ChipSelect | ⚠ finance |
| 16 | `olos_communal_provision.html` | `ev-s1-provision-balance` | new `ProvisionBalanceCapture` | Build | ChoiceCardGrid, AmountRow | ⚠ finance |
| 17 | `olos_financial_contribution_model.html` | `ev-s1-provision-balance` / `ev-s4-financial-model` | new `ProvisionBalanceCapture` / `FinancialModelCapture` | Build | AmountRow (buy-in), InterpretationBlock, Stepper | ⚠⚠ capital — **no CSRA / salam / advance-purchase framing**; permitted channels only (donation, restricted donation, qard ḥasan, in-kind, sponsorship); label "capital partners & allies" |

---

## Phase 3+ — S2–S7 (objectives NOT yet in `TIER_ZERO_OBJECTIVE_IDS`)

These require Phase 2 routing (add objective id to the workbench set) **and** a new capture.
Grouped by the plan's sub-phases 3a–3f. Item ids are c1–c5/c6 within each objective unless noted.

### 3a — Land reading (S2, universal)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_terrain_survey.html` | `s2-terrain` | NEW `TerrainCapture` | InterpretationBlock (slope/aspect), ChipSelect | |
| `olos_climate_sectors.html` | `s2-climate` | NEW `ClimateCapture` | AmountRow (rainfall/temp), InterpretationBlock ("620mm = sub-humid"), MonthCalendarGrid (frost), BarChartStrip (seasonal rain) | |
| `olos_ecology_habitat.html` | `s2-ecology` | NEW `EcologyCapture` | ChipSelect (habitat), RegisterList (species) | |
| `olos_landscape_context.html` | `s2-landscape-vectors` / `ev-s2-landscape-vectors` | NEW `LandscapeContextCapture` | ChipSelect (vectors), MapStrip | |

### 3b — Capacity (S2/S5)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_carrying_capacity.html` | `ev-s2-carrying-capacity` | NEW `CarryingCapacityCapture` | CapacityCeilingBlock, AmountRow, InterpretationBlock | |
| `olos_forage_carrying_capacity.html` | silvopasture `s2-*forage*` | NEW `ForageCapacityCapture` | CapacityCeilingBlock, BarChartStrip, InterpretationBlock | |

### 3c — Livestock / silvopasture (S2–S4, silvopasture + livestockOperation)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_livestock_intent.html` | silvopasture/livestock `s*-livestock*` | NEW `LivestockIntentCapture` | ChoiceCardGrid (species/intent), Stepper | |
| `olos_husbandry_framework.html` | livestock `s*-husbandry*` | NEW `HusbandryCapture` | ChoiceCardGrid (method), ChipSelect | |
| `olos_grazing_system_design.html` | silvopasture `s4-grazing*` | NEW `GrazingSystemCapture` | ChoiceCardGrid (rotation), Stepper, BarChartStrip | |
| `olos_biosecurity_risk.html` | livestock `s*-biosecurity*` | NEW `BiosecurityCapture` | ChoiceCardGrid (risk level), InterpretationBlock | |

### 3d — Soil & food / nursery (S3/S4)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_soil_fertility_programme.html` | `s3-soil` / `ev-s3-*` | NEW `SoilFertilityCapture` | ChipSelect (amendments), AmountRow, BarChartStrip | ⚠ finance (input budget) |
| `olos_food_system_design.html` | `ev-s4-food-system` | NEW `FoodSystemCapture` | ChoiceCardGrid (zones), ChipSelect | |
| `olos_cultivar_rootstock_plan.html` | orchard `s4-cultivar*` | NEW `CultivarCapture` | RegisterList (cultivar/rootstock), ChipSelect | |
| `olos_nursery_propagation_strategy.html` | nursery `s4-propagation*` | NEW `PropagationStrategyCapture` | ChoiceCardGrid (method), ChipSelect | |
| `olos_nursery_growing_media.html` | nursery `s*-media*` | NEW `GrowingMediaCapture` | AmountRow (mix ratios), RegisterList | |
| `olos_propagation_infra.html` | nursery `s5-*infra*` | NEW `PropagationInfraCapture` | ChoiceCardGrid, ChipSelect | |
| `olos_propagation_water.html` | nursery `s5-water*` | NEW `PropagationWaterCapture` | AmountRow, InterpretationBlock | |

### 3e — Water / energy / settlement (S4/S5, ecovillage + universal)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_water_systems_strategy.html` | `s4-water-strategy` / `ev-s3-water-yield` | NEW `WaterStrategyCapture` | AmountRow (yield/demand), InterpretationBlock, BarChartStrip | ⚠ finance (infra budget) |
| `olos_energy_systems.html` | `ev-s3-energy-potential` / `ev-s5-energy-system` | NEW `EnergyCapture` | ChipSelect (fuel-type), AmountRow, InterpretationBlock | |
| `olos_housing_cluster_design.html` | `ev-s4-housing-cluster` / `ev-s5-cluster-layout` | NEW `HousingClusterCapture` | ChoiceCardGrid (cluster pattern), Stepper (population) | |
| `olos_spatial_framework.html` | `s4-zones` / `ev-s4-settlement-strategy` | NEW `SpatialFrameworkCapture` | ChipSelect (zones), MapStrip | |
| `olos_project_direction.html` | `s4-direction` | NEW `DirectionCapture` | ChipSelect (directions), ChoiceCardGrid | |
| `olos_plan_feasible_direction.html` | `s4-direction` | NEW `DirectionCapture` (shared) | ChipSelect, InterpretationBlock | |

### 3f — Communal infra & finance (S4/S5, ecovillage)

| Mockup | Objective id | Arm | Control primitives | Amanah |
|---|---|---|---|---|
| `olos_communal_infra_strategy.html` | `ev-s4-infra-strategy` / `ev-s5-communal-systems` | NEW `CommunalInfraCapture` | ChoiceCardGrid, AmountRow | ⚠ finance |
| `olos_communal_infra_survey.html` | `ev-s3-infra-condition` | NEW `InfraConditionCapture` | RegisterList, StatusPill | |
| `olos_communal_waste.html` | `ev-s3-waste-cycling` / `ev-s5-sanitation-waste` | NEW `WasteCyclingCapture` | ChoiceCardGrid (method), InterpretationBlock | |

---

## Deferred — NOT workbench third-column (Plan-stage surfaces / objective triage needed)

These mockups read as **Plan-stage** surfaces (left-pane planning canvases, not the Act
third-column working panel) in the agent reads, OR map to objectives whose third-column ownership
is ambiguous. **Listed here explicitly — not silently dropped.** Reconcile stage ownership before
any are pulled in; some `olos_plan_*` may already be Act-wired in current code and need a stage
decision, not an assumption.

| Mockup | Apparent stage | Reason deferred | Amanah |
|---|---|---|---|
| `olos_plan_community_health.html` | Plan | Plan-stage settlement-health surface, not a decision capture | |
| `olos_plan_food_system.html` | Plan | Plan-stage; `olos_food_system_design` (3d) is the Act capture | |
| `olos_plan_infra_maintenance.html` | Plan | Plan-stage maintenance protocol surface | ⚠ finance |
| `olos_plan_phased_settlement.html` | Plan | Plan-stage phasing surface | |
| `olos_plan_communal_infra.html` | Plan | Plan-stage; `olos_communal_infra_strategy` (3f) is the Act capture | ⚠ finance |
| `olos_phased_settlement.html` | Plan/ambiguous | Phasing surface — duplicate of plan variant; stage decision needed | ⚠ finance |
| `olos_communal_infra_strategy` (Plan variant, if distinct) | ambiguous | Verify against the Act-stage file of same name in 3f | ⚠ finance |

> **Open triage items** (resolve at Phase 2/3 kickoff, do not assume):
> - Several `olos_plan_*` files showed **Plan** stage in agent reads but the current code already
>   Act-wires panels of the same concept. Decide per-file whether the mockup re-skins an existing
>   Act capture or belongs to a future Plan-stage surface — **do not** auto-route a Plan mockup into
>   the third column.
> - Silvopasture / livestock / orchard / nursery objective ids above are **approximate** (grep
>   cutoff in the catalogue index). Confirm exact ids against
>   `packages/shared/src/constants/plan/catalogues/{silvopasture,livestockOperation,orchard,nursery}.ts`
>   at each 3c/3d sub-phase kickoff before wiring `buildDecisionTarget`.

---

## Amanah summary (review BEFORE the owning phase)

Panels carrying capital/finance or cultural copy that require explicit review per CLAUDE.md:

- **⚠⚠ Capital (highest)** — `olos_financial_contribution_model.html`: buy-in / contribution
  framing. **No CSRA, no salam, no advance-purchase.** Permitted channels only: charitable
  donation, restricted donation, qard ḥasan, in-kind, sponsorship. Public label: "capital partners
  & allies." Future yield-share only as a membership benefit under Scholar Council review.
- **⚠ Finance** — `olos_legal_entity_tenure_financial`, `olos_communal_private_provision`,
  `olos_communal_provision`, `olos_soil_fertility_programme`, `olos_water_systems_strategy`,
  `olos_communal_infra_strategy`, `olos_plan_infra_maintenance`, `olos_plan_communal_infra`,
  `olos_phased_settlement`: budget/cost copy — screen for riba/gharar before build.
- **⚠ Cultural copy** — `olos_social_fabric_survey.html`: CULTURAL_STATUSES must be transcribed
  **verbatim** with scope-note flags (existing `StakeholderCapture` precedent). Never reword or
  silently omit.

---

## Counts

- **49** mockup files total.
- **Phase 1 (S1):** 14 mapped + 3 boundary (`ev-s1-provision-balance` — verify tier) = **17**.
- **Phase 3+ (S2–S7):** **25** (3a:4, 3b:2, 3c:4, 3d:7, 3e:6, 3f:3 — minus shared `DirectionCapture` dedupe).
- **Deferred (Plan-stage / triage):** **7** (with open triage items above).
