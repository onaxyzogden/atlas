# 2026-05-30 -- OLOS spec intake: Decision Groups + Graduation (wiki-ingest only)

**Branch.** `feat/atlas-permaculture` (wiki-only commit; no code). Documentation
session -- no source, schema, test, or engine change.

The operator attached three OLOS architecture specs with no implementation
instruction:
- `OLOS_Project_Type_Secondary_Layer_Spec_v1.2` -- adds `decision_groups[]`
  (sections 9.3-9.4), updates the design-tension register, confirms
  Residential as project type #13 (secondary-only).
- `OLOS_Decision_Groups_Reference_v1.0` -- canonical decision-group data for
  all 18 catalogues (Part 1 primaries; Part 2 the six Secondary Type
  Catalogues Residential RS / Off-Grid OGS / Homestead HMS / Ecovillage EVS
  / Conservation Zone COS / Nursery-secondary NRS).
- `OLOS_Project_Type_Graduation_Spec_v1.0` -- the grow-into-types model
  (`type_history[]` append-only, derived `active_primary_types[]`, graduation
  engine semantics, P1-P5 primary+primary tension register).

**Scope set by the operator via AskUserQuestion:** Q1 = **Wiki-ingest only**
(capture the specs, encode nothing yet); Q2 = **Flag in wiki, keep code as-is**
(document the discrepancies, treat the encoded model as canonical, no code
churn).

**What shipped (wiki only):**
- New concept page [[concepts/decision-groups]] -- the `decision_groups[]`
  field shape (9.3) + authoring rules (9.4: 1-6 groups/objective, mutually
  exclusive items, valid Observe feeds, patch-injected groups amber-attributed
  via `source_secondary_id`, editorial-not-auto-generated, >6 -> graduation
  review).
- New concept page [[concepts/project-type-graduation]] -- the graduation
  model (event enum initial_selection/primary_addition/primary_swap/
  secondary_addition/secondary_removal; two-step de-dup match key
  objective_id -> canonical_key; strata never regress; Observe
  source_objective_id/source_type immutable; steward-only/deliberate; UX
  graduation banner + 14-day "New" badge + "Primary . [Type]" / "Also in
  [Type]" tags).
- ADR [[decisions/2026-05-30-olos-spec-intake-decision-groups-graduation]]
  recording the intake + the keep-code-canonical decision + four flagged
  doc-vs-code deltas.
- Entity note appended to [[shared-package]] ("Per-type objective model"
  section) marking decision_groups[] + graduation planned-not-encoded and
  listing the deltas.

**Four flagged doc-vs-code deltas (code canonical):**
1. Universal count -- spec v1.2 section 4 says "Sixteen objectives are
   universal"; encoded model carries **19** (`universal.ts`).
2. Ref scheme -- Decision Groups Reference uses `XX.S{stratum}.{n}` type
   prefixes (`RF.S1.1`, `RS.S2.1`); encoded catalogues use `SILV-/ORCH-/U-`.
3. Tensions -- docs reference 13; `relationshipMatrix.ts` encodes 10.
4. `decision_groups[]` is a new unencoded schema field.

**Not unblocked:** the deferred Silvopasture/Orchard **secondary** catalogues
(prior task #13) -- neither type appears as a secondary in the Decision Groups
Reference (both are primaries), and no secondary `{additive[], patches[]}`
source files were provided. Still blocked on operator files.

**Deferred follow-ons (each a future session):** (a) `decision_groups[]`
schema field + data wiring across catalogues; (b) graduation engine/store
(builds on the deferred mid-project add/remove seam, Sub-slice F);
(c) tension-register expansion as secondary types are encoded.

**Covenant:** documentation-only; no economic surface; CSRA prohibition
([[fiqh-csra-erased-2026-05-04]]) untouched. ASCII-only copy.
