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

**Batch B outcome (full 14-row HTML diff, 2026-06-07):** every Batch B prototype's
decisions / decision-groups / completion-gate was diffed against its mapped catalogue
objective. **All already encoded — zero decision-level gaps, no catalogue edits.** The
catalogues were authored from the same source docs as the prototypes, so the match is
verbatim except where noted. Like Batch A, this was an audit + documentation pass.
Covenant-relevant right-panel content (which has no catalogue home) is logged in the
**Covenant-content inventory** below for the operator's review — **not** added to the
catalogue (per the approved Batch B scope). **Out-of-slice:** rows 10-22 land in
`ecovillage.ts`, which is not in the current Homestead+Silvopasture vertical slice, so
these objectives do not render in the active slice project (no preview spot-check). Row
18 (`lvs-sec-s1-enterprise-intent`) and row 23 (`nur-sec-s3-propagation-strategy`) are
secondary-additive objectives (silvopasture livestock / nursery), in-slice via secondary.

Two one-to-many mappings and one prototype-file mismatch were resolved during the diff
(see the **Audit result** column).

| # | HTML file | Tier | Catalogue objective (confirmed) | Audit result | Status |
|---|---|---|---|---|---|
| 3 | `olos_landscape_context.html` | 0 | `ev-s2-landscape-vectors` (ecovillage.ts) | reclassified here from Batch A — already encoded | done |
| 10 | `olos_social_fabric_survey.html` | 0 | `ev-s2-social-fabric` (ecovillage.ts) | 6 decisions + 2 groups + gate verbatim match. Covenant: P4 cohesion-map faith domain (inventory #1) | done |
| 11 | `olos_legal_entity_tenure_financial.html` | 0 | `ev-s1-legal-governance` (ecovillage.ts) | 8 decisions + 3 groups + gate verbatim match (catalogue c-ids ordered c1,c8,c2,c3,c4,c5,c6,c7) | done |
| 12 | `olos_governance_decision_dispute.html` | 0 | `ev-s1-conflict-framework` (ecovillage.ts) | 7 decisions + 3 groups + gate verbatim match | done |
| 13 | `olos_governance_structure.html` | 3 | `ev-s1-conflict-framework` (ecovillage.ts) | **resolved one-to-many:** identical 7 decisions/groups/gate to row 12 — a Tier-3 re-render of the *same* objective, **not a distinct decision set**. No new objective. | done |
| 14 | `olos_communal_infra_survey.html` | 2 | `ev-s3-infra-condition` (ecovillage.ts) | 5 decisions + 3 groups + gate verbatim match | done |
| 15 | `olos_communal_infra_strategy.html` | 4 | `ev-s4-infra-strategy` (ecovillage.ts) | **prototype-file mismatch:** the HTML file's content is the nursery propagation-strategy prototype (duplicate of row 23), not communal-infra-strategy. Catalogue objective `ev-s4-infra-strategy` exists and is well-formed (5 decisions, 3 groups, gate); the HTML could not be diffed against it. No catalogue gap inferable. | done (flagged) |
| 16 | `olos_energy_systems.html` | 2 | `ev-s3-energy-potential` (ecovillage.ts) | **resolved one-to-many:** HTML is the Tier-2 *survey* (6 decisions "Assess... potential"), matches `ev-s3-energy-potential` verbatim — **not** the s5 `ev-s5-energy-system` design objective | done |
| 17 | `olos_communal_provision.html` | 3 | `ev-s1-provision-balance` (ecovillage.ts) | 6 decisions + 2 groups + gate verbatim match (catalogue stratum is s1; prototype Tier-3 badge is cosmetic) | done |
| 18 | `olos_livestock_intent.html` | 0 | `lvs-sec-s1-enterprise-intent` (livestockOperation.ts, **secondary**) | 5 decisions + 3 groups + gate semantic match. Maps to the livestock-as-secondary *host-integration* objective, **not** primary `lvs-s1-enterprise-vision` | done |
| 19 | `olos_housing_cluster_design.html` | 4 | `ev-s4-housing-cluster` (ecovillage.ts) | 5 decisions (c1-c5) + 3 groups + gate verbatim match. Watercourse-setback gate + faith provisions are bespoke right-panel (inventory #2) | done |
| 20 | `olos_food_system_design.html` | 5 | `ev-s4-food-system` (ecovillage.ts) | 6 decisions + 3 groups + gate verbatim match. Covenant: halal variety-selection hint (inventory #3) | done |
| 21 | `olos_financial_contribution_model.html` | 6 | `ev-s4-financial-model` (ecovillage.ts) | 6 decisions + 3 groups + gate verbatim match. **Amanah: clean** — member cost-sharing among co-owners (buy-in, levy, hardship-deferral, reserve), not advance sale of yield; no riba, no CSRA framing (inventory #4) | done |
| 22 | `olos_phased_settlement.html` | 6 | `ev-s4-settlement-strategy` (ecovillage.ts) | **resolved one-to-many:** 6 decisions + 3 groups + gate match `ev-s4-settlement-strategy` (s4-foundation-decisions) verbatim — **not** a separate s7 settlement-plan. Prototype Tier-6 badge is cosmetic | done |
| 23 | `olos_nursery_propagation_strategy.html` | 3 | `nur-sec-s3-propagation-strategy` (nursery.ts, **secondary**) | 6 decisions + 3 groups + gate verbatim match — out-of-slice (nursery secondary) | done |

---

## Covenant-content inventory (Batch B — for operator review; NOT in catalogue)

Per the approved Batch B scope (user decision: "log faith/covenant provisions for review,
do not add to catalogue now"), the following covenant-relevant content was found in the
prototypes' **bespoke right-panel work surfaces**. None of it has a catalogue decision home
today; it would live in a Tier-0 `DecisionWorkingPanel`-style surface (see Deferred). It is
recorded here **verbatim** for the operator to decide whether to promote into catalogue
decisions / scopeNotes. **No catalogue change has been made.**

1. **Row 10 — `olos_social_fabric_survey.html`** (cohesion-map panel P4, domain "Faith,
   spirituality & practice", HIGH alignment): "All households share a Muslim faith
   foundation. Significant alignment on daily rhythms, halal food practices, and Ramadan
   observance." — captured cohesion data, not a decision.

2. **Row 19 — `olos_housing_cluster_design.html`** ("Halal & faith-specific provisions"
   std-group, right-panel verification items):
   - "Outdoor prayer space accessible from dwelling without crossing shared lane - or
     screening provided for prayer in private outdoor area" (Required)
   - "Women's outdoor areas screened from cluster lane where requested by household"
     (Required)
   These are bespoke Tier-0 work-surface standards tied to `ev-s4-housing-cluster` c2/c3
   (private zones / transitional zones), expressed as design-standard checks, not catalogue
   decisions.

3. **Row 20 — `olos_food_system_design.html`** (Decision 2 "Crop commitments" right-panel
   hint): "Halal food priorities should shape variety selection - no pork products in
   growing media, no animal-derived inputs without provenance." — a right-panel guidance
   note on `ev-s4-food-system` c2.

4. **Row 21 — `olos_financial_contribution_model.html`** (member-contribution mechanisms,
   right-panel figures). **Amanah assessment: clean.** The mechanisms are member
   cost-sharing among households who collectively own the asset - buy-in (land-purchase
   share + Phase-1 infrastructure share + community-fund seed deposit), monthly levy
   (maintenance, insurance, capital-reserve, operations), a three-tier hardship protocol
   (deferral "repaid over 6 months" *without penalty* / reduction / waiver), and a capital
   reserve fund. This is **not** advance sale of future yield; there is **no riba** (no
   interest on buy-in or levy; hardship deferral is penalty-free, qard-hasan-consistent)
   and **no CSRA / salam-style advance-purchase framing**. This matches the catalogue's
   existing 2026-05-29 verbatim-encode authorisation note (`ecovillage.ts` header, lines
   30-36). The specific dollar figures and per-household tables are bespoke right-panel
   data with no catalogue home; logged here as reference only.

> All four items belong to the **deferred Tier-1+ / Tier-0 bespoke right-panel workstream**,
> not to this content audit. Promotion of any of them into catalogue decisions or
> `scopeNotes` awaits operator review.

---

## Batch C — Plan stage right-panel wiring (three-panel shell)

**Batch C outcome (5-row Plan-prototype diff, 2026-06-07):** each Plan-stage prototype is a
**read-only render of an existing catalogue objective** (universal or ecovillage). Every
prototype's decisions / decision-groups / completion-gate matches its catalogue objective
**verbatim**, and each prototype confirms the target architecture: a "Read-only preview -
decisions are worked through in Act" lock note plus an "Open in Act" CTA (and "Launch Act
Command Center" footer). This is exactly what `DecisionChecklist.tsx` renders today - so
Batch C required **no component construction and no catalogue edits**; it is a confirmation
pass. No covenant content found in any Batch C prototype.

| # | HTML file | Tier | Catalogue objective (confirmed) | Audit result | Status |
|---|---|---|---|---|---|
| 24 | `olos_plan_feasible_direction.html` | 3 | `s4-direction` (universal.ts) | 6 decisions + 2 groups ("Survey validation" / "Scope & first cycle") + gate verbatim match. Read-only preview + "Approve project direction - unlock Tier 3" CTA | done |
| 25 | `olos_plan_phased_settlement.html` | 6 | `ev-s4-settlement-strategy` (ecovillage.ts) | 6 decisions + 3 groups + gate verbatim match (same objective as Batch B row 22). Read-only + "Open in Act" CTA | done |
| 26 | `olos_plan_communal_infra.html` | 4 | `ev-s4-infra-strategy` (ecovillage.ts) | 5 decisions + 3 groups + gate verbatim match. **Confirms `ev-s4-infra-strategy` is correctly encoded** - the content the row-15 prototype file was missing. Read-only + "Open in Act" CTA | done |
| 27 | `olos_plan_community_health.html` | 5 | `ev-s6-social-monitoring` (ecovillage.ts) | 6 decisions + 3 groups + gate verbatim match. Act-tasks list + Observe feed chips + "Open in Act" CTA | done |
| 28 | `olos_plan_infra_maintenance.html` | 5 | `ev-s6-maintenance-protocol` (ecovillage.ts) | 5 decisions + 3 groups + gate verbatim match. Act-tasks list + "Open in Act" CTA | done |

> Batch C confirmed already satisfied: `DecisionChecklist.tsx` renders the catalogue
> read-only with an "Open in Act →" CTA today, matching all five prototypes. No remaining
> work. (Out-of-slice: rows 25-28 are ecovillage objectives, not in the active
> Homestead+Silvopasture slice; row 24 `s4-direction` is universal and in-slice.)

---

## Deferred (separate workstream — not the Batch A content pass)

- Bespoke Tier-1+ right-panel work surfaces (DSE calculator, WHO/FAO water thresholds,
  zone-conflict resolver, vegetation-community recorder) + a `DecisionWorkingPanel`-style
  router for Tier 1+.
- Tier-1+ per-decision mode-badge rendering (`MODE_LABELS` currently Tier-0 only).
- **Batch B covenant provisions** (inventory #1–#4 above): whether to promote the logged
  faith/halal/financial right-panel content into catalogue decisions or `scopeNotes`
  awaits operator review. The Tier-0 bespoke right-panel surface that would host items
  #2 (housing-cluster prayer/screening standards) is part of the deferred work-surface
  workstream.

> **Batch B audit complete (2026-06-07):** all 14 rows confirmed already-encoded; see the
> Batch B table and Covenant-content inventory above. One prototype-file mismatch flagged
> (row 15 file content = nursery propagation, not communal-infra-strategy).
>
> **Batch C audit complete (2026-06-07):** all 5 Plan-stage prototypes confirmed to be
> read-only renders of existing catalogue objectives, matched verbatim; the read-only +
> "Open in Act" architecture they depict is already shipped in `DecisionChecklist.tsx`.
>
> **All batches (A + B + C, rows 1-28) are now audited and confirmed already-encoded.**
> The entire HTML-prototype wiring effort required zero catalogue edits: the catalogues
> were authored from the same source docs as the prototypes. The only open items are the
> deferred bespoke Tier-1+ right-panel work surfaces, the covenant-content inventory
> (operator review), and the row-15 prototype-file mismatch (re-export needed).

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
